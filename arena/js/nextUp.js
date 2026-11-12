// "Next up": which game to suggest on a game's completion screen.
//
// Loaded by every game's index.html as /arena/js/nextUp.js (same origin, so
// it reads the same flutter.* prefs and arena cache the arena itself does)
// and exposed as window.arenaNextUp for the games' Dart code. It never
// touches the network: progress comes from the arena's last Firestore
// snapshot plus this browser's saves, and the games tell it what they finish
// (markPlayed) so a finish shows here before the arena has refreshed.

import { liveGames } from './games/registry.js?v=202611112328';
import { cachedRaw, derive } from './progress.js?v=202611112328';
import { arenaGet, arenaSet, playerId } from './local.js?v=202611112328';
import { todayEpochDay } from './dates.js?v=202611112328';
import { recentIndices } from './games/common.js?v=202611112328';
import { isDone, PROGRESS } from './status.js?v=202611112328';
import { readFavourites } from './favourites.js?v=202611112328';
import { computeOrder } from './gameOrder.js?v=202611112328';

// Discovery order: the games to try first after each kind of game, once their
// favourites are done. Canolitaire leads both lists because its long sessions
// earn the most per player.
const AFTER_WORDS = ['canolitaire', 'canoku', 'canagrams', 'duo', 'canoggle', 'canominoes', 'canuckle', 'plus'];
const AFTER_PUZZLES = ['canolitaire', 'canominoes', 'canoku', 'canagrams', 'canoggle', 'duo', 'canuckle', 'plus'];
const PUZZLE_GAMES = new Set(['canoku', 'canominoes', 'canolitaire']);

// The tier a suggestion opens when nothing is in progress: the gentlest board
// not yet finished today. Games not listed take their first unfinished tier.
const START_TIERS = {
  canoku: ['EASY4X4', 'EASY6X6', 'EASY', 'MED4X4', 'MED6X6', 'MED'],
  canolitaire: ['1e', '3e', '1m', '3m', '1h', '3h'],
};

const PLAYED_KEY = 'playedToday';

/** Game ids this browser finished today, as reported by the games. */
export function playedToday(todayEd) {
  const v = arenaGet(PLAYED_KEY, null);
  return v && v.ed === todayEd && Array.isArray(v.ids) ? v.ids : [];
}

export function markPlayed(gameId, todayEd = todayEpochDay()) {
  if (typeof gameId !== 'string' || !gameId) return;
  const ids = playedToday(todayEd);
  if (!ids.includes(gameId)) arenaSet(PLAYED_KEY, { ed: todayEd, ids: [...ids, gameId] });
}

function tierText(tier) {
  return tier.group ? `${tier.group} ${tier.label}` : tier.label;
}

/**
 * The tiers played on the last 7 days before today, most played first (ties:
 * most recently played first), so a regular is offered the board they play.
 */
function usualTiers(game, p, todayEd) {
  if (!p) return [];
  const today = game.todayIndex(todayEd);
  const seen = new Map(); // key -> {n, last}: days played, newest day's position
  recentIndices(game, todayEd).filter((i) => i !== today).slice(0, 7).forEach((i, age) => {
    for (const [key, s] of Object.entries(p.days.get(i)?.tiers || {})) {
      if (!s) continue;
      const t = seen.get(key) || { n: 0, last: age };
      seen.set(key, { n: t.n + 1, last: Math.min(t.last, age) });
    }
  });
  return [...seen].sort(([, a], [, b]) => (b.n - a.n) || (a.last - b.last))
    .map(([key]) => game.tiers.find((t) => t.key === key)).filter(Boolean);
}

/**
 * The tier to open: one in progress, else the one they play most this week
 * that isn't finished today, else the gentlest not finished today.
 */
function pickTier(game, entry, p, todayEd) {
  const tiers = game.tiers || [];
  if (!tiers.length) return null;
  const status = (t) => entry?.tiers?.[t.key];
  const started = tiers.find((t) => status(t) === PROGRESS);
  if (started) return started;
  const order = (START_TIERS[game.id] || []).map((k) => tiers.find((t) => t.key === k)).filter(Boolean);
  return [...usualTiers(game, p, todayEd), ...order, ...tiers].find((t) => !isDone(status(t))) || tiers[0];
}

function everPlayed(p) {
  return p.played > 0 || p.days.size > 0;
}

/**
 * The arena row's progress for [counted] games, [done] of them finished:
 * {tally, tallyShort, headline}. [mine] when they are the player's favourites.
 * The short tally is for phones, where the card is narrow.
 */
function progressLines(counted, done, mine) {
  const total = counted.length;
  const all = done === total;
  if (!mine) {
    const tally = `${done} of ${total} games done today`;
    return { tally, tallyShort: tally, headline: `Nice! All ${total} daily games are done` };
  }
  if (total === 1) {
    const name = counted[0].name;
    return all
      ? { tally: `Your favourite, ${name}, is done today`, tallyShort: `${name} is done today`, headline: 'Nice! Your favourite is done' }
      : { tally: `${name}, your favourite, is still to play today`, tallyShort: `${name} still to play today`, headline: '' };
  }
  const both = total === 2;
  return {
    tally: all
      ? (both ? 'Both your favourite Canuckle games done today' : `All ${total} of your favourite Canuckle games done today`)
      : `${done} of your ${total} favourite Canuckle games done today`,
    tallyShort: all
      ? (both ? 'Both favourites done today' : `All ${total} favourites done today`)
      : `${done} of ${total} favourites done today`,
    headline: both ? 'Nice! Both your favourites are done' : `Nice! All ${total} of your favourites are done`,
  };
}

/**
 * Picks the game to suggest after [currentId]. Pure: [progress] maps each
 * game id to its derived progress, [favourites] are the game ids they starred
 * on the arena's Games tab and [order] is the arena's game order. Returns null
 * when there is nothing to say, else either {allDone, arenaUrl, ...counts} or a
 * suggestion: {id, name, reason, eyebrow, eyebrowShort, detail, cta, url, hc,
 * celebrate, ...counts}, where counts = {doneCount, totalCount, yours, tally,
 * headline, subline, sublineShort}: the arena row's progress, title and the
 * line under the title (the short ones are for phones).
 */
export function pickNext({
  games: given, progress, currentId, todayEd, played = [], skipped = {}, favourites = [], order = [],
}) {
  // Only games with a puzzle today: during a rollout, a game before its launch
  // day is neither suggested nor counted (suggest() also passes only live games).
  const games = given.filter((g) => g.todayIndex(todayEd) != null);
  const doneToday = (g) => {
    if (g.id === currentId || played.includes(g.id)) return true;
    const p = progress[g.id];
    return !!p && isDone(p.days.get(g.todayIndex(todayEd))?.status);
  };
  const daily = games.filter((g) => g.cadence === 'daily');
  // The tally counts the games they starred, else every daily game.
  const isFav = (g) => favourites.includes(g.id);
  const favs = games.filter(isFav);
  const mine = favs.length > 0;
  const counted = mine ? favs : daily;
  const doneCount = counted.filter(doneToday).length;
  const totalCount = counted.length;
  const lines = progressLines(counted, doneCount, mine);
  // The arena row at the top of the card: its title, and the line under it.
  const celebrate = doneCount === totalCount && totalCount > 0;
  const seeBadges = 'See your streaks and badges';
  const counts = {
    doneCount, totalCount, yours: mine, tally: lines.tally,
    headline: celebrate ? lines.headline : 'Canuckle Games Arena',
    subline: celebrate ? seeBadges : lines.tally,
    sublineShort: celebrate ? seeBadges : lines.tallyShort,
  };

  const open = games.filter((g) => !doneToday(g));
  if (!open.length) {
    if (!daily.length) return null;
    const all = `All ${daily.length} games done today`;
    const sub = `All ${daily.length} games · see your badges`;
    return {
      allDone: true, ...counts, doneCount: daily.length, totalCount: daily.length, tally: all,
      headline: "Today's slate is done", subline: sub, sublineShort: sub,
      // The arena row says "see your badges", so it opens the Badges tab.
      arenaUrl: '/arena/#badges',
    };
  }

  const prefs = PUZZLE_GAMES.has(currentId) ? AFTER_PUZZLES : AFTER_WORDS;
  // Days a game was suggested and not played since: each one moves it behind
  // the others, so a player who never jumps sees the suggestions take turns.
  const skips = (g) => skipped[g.id] || 0;
  const rank = (g) => {
    const r = prefs.indexOf(g.id);
    return skips(g) * 100 + (r < 0 ? prefs.length : r);
  };
  // Where the game sits in the arena's own order (theirs, else release order).
  const place = (g) => {
    const i = order.indexOf(g.id);
    return i < 0 ? order.length : i;
  };
  const entry = (g) => progress[g.id]?.days.get(g.todayIndex(todayEd));
  const started = (g) => entry(g)?.status === PROGRESS;

  // Their favourites first: one in progress, then the next in their order.
  let pick = open.filter(isFav)
    .sort((a, b) => (started(b) - started(a)) || (skips(a) - skips(b)) || (place(a) - place(b)))[0];
  let reason = pick && (started(pick) ? 'progress' : 'favourite');
  if (!pick) {
    reason = 'progress';
    pick = open.filter(started).sort((a, b) => rank(a) - rank(b))[0];
  }
  if (!pick) {
    reason = 'discovery';
    pick = open.filter((g) => !progress[g.id] || !everPlayed(progress[g.id]))
      .sort((a, b) => rank(a) - rank(b))[0];
  }
  if (!pick) {
    reason = 'next';
    pick = [...open].sort((a, b) => rank(a) - rank(b))[0];
  }

  const todayIdx = pick.todayIndex(todayEd);
  const tier = pickTier(pick, entry(pick), progress[pick.id], todayEd);
  const streak = progress[pick.id]?.streak || 0;
  const unit = pick.cadence === 'weekly' ? 'week' : 'day';
  let eyebrow;
  let eyebrowShort;
  let detail;
  let cta;
  if (reason === 'progress') {
    eyebrow = 'Pick up where you left off';
    eyebrowShort = 'Continue';
    detail = tier ? `Your ${tierText(tier)} game is in progress` : "Today's puzzle is in progress";
    cta = 'Finish';
  } else if (reason === 'discovery') {
    eyebrow = 'New for you';
    detail = pick.blurb;
    cta = 'Try it';
  } else {
    eyebrow = 'Next up';
    detail = streak > 0
      ? `Keep your ${streak}-${unit} streak going`
      : (tier ? `Today's ${tierText(tier)} is ready` : `This ${unit}'s puzzle is ready`);
    cta = 'Play';
  }
  eyebrowShort = eyebrowShort || eyebrow;
  if (isFav(pick)) {
    eyebrow += ' · favourite';
    eyebrowShort += ' · favourite';
  }
  // When every one of their favourites is done, the arena row says well
  // done (headline above) and this still offers one more.
  return {
    celebrate,
    id: pick.id,
    name: pick.name,
    reason,
    eyebrow,
    eyebrowShort,
    detail,
    cta,
    url: pick.link(todayIdx, tier?.key ?? null, true),
    // [light, dark]: light takes white text at 4.5:1; dark reads on a dark theme.
    hc: pick.hc,
    ...counts,
  };
}

/**
 * Skip counts: {id: {days, ed}}, where [days] counts the days [id] was
 * suggested without being played since, and [ed] is the last of them.
 */
const SKIP_KEY = 'nextUpSkips';

export function readSkips() {
  const v = arenaGet(SKIP_KEY, null);
  return v && typeof v === 'object' ? v : {};
}

/**
 * Notes that [pickId] was suggested today (once a day, however many end
 * panels show it), and forgets the skips of every game in [doneIds], which
 * the player has now played. Returns {id: days} for pickNext.
 */
export function noteSuggested(skips, pickId, doneIds, todayEd) {
  const next = {};
  for (const [id, s] of Object.entries(skips)) {
    if (!doneIds.includes(id) && s && Number.isInteger(s.days)) next[id] = s;
  }
  if (pickId) {
    const s = next[pickId];
    if (!s || s.ed !== todayEd) next[pickId] = { days: (s?.days || 0) + 1, ed: todayEd };
  }
  return next;
}

/** Derived progress for [games] from the arena cache and this browser's saves. */
function localProgress(games, todayEd) {
  const raw = cachedRaw(playerId());
  const out = {};
  for (const g of games) out[g.id] = derive(g, raw[g.id] ?? null, todayEd);
  return out;
}

/** The suggestion after [currentId] as a JSON string (for Dart), or null. */
export function suggest(currentId) {
  try {
    const todayEd = todayEpochDay();
    const games = liveGames();
    const progress = localProgress(games, todayEd);
    const played = playedToday(todayEd);
    const doneIds = games.filter((g) => g.id === currentId || played.includes(g.id)
      || isDone(progress[g.id]?.days.get(g.todayIndex(todayEd))?.status)).map((g) => g.id);
    // Forget the skips of games played since, before they count against them.
    let skips = noteSuggested(readSkips(), null, doneIds, todayEd);
    const skipped = Object.fromEntries(Object.entries(skips).map(([id, s]) =>
      // Today's own showing doesn't count yet: the day isn't over.
      [id, s.ed === todayEd ? s.days - 1 : s.days]));
    const pick = pickNext({
      games, progress, currentId, todayEd, played, skipped,
      favourites: readFavourites(), order: computeOrder(games),
    });
    skips = noteSuggested(skips, pick && !pick.allDone ? pick.id : null, doneIds, todayEd);
    arenaSet(SKIP_KEY, skips);
    return pick ? JSON.stringify(pick) : null;
  } catch (e) {
    console.warn('arena: no next-up suggestion', e);
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.arenaNextUp = {
    suggest,
    markPlayed: (id) => {
      try {
        markPlayed(id);
      } catch {
        // No storage: the suggestion just won't know about this finish.
      }
    },
  };
}
