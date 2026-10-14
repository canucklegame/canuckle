// Badge definitions, evaluated from everyone's derived progress.
//
// Pure functions: given the games and their progress, say which badges are
// earned, how close the locked ones are, and the day each earned badge was
// first earned according to the games' own history (since()). Recording a
// badge (and announcing it) is store.js's job, which is also why a badge that
// depends on a recent window (Clean Sweep) only needs to be seen once.
//
// A badge that can be earned again says how often, one of two ways: times()
// counts from a game's own all-time stats, and occurrences() lists a stable
// key per earning (a puzzle index or calendar day), which store.js keeps so
// the count survives history scrolling out of the recent window. parts() is
// the checklist behind a badge that needs several things at once.

import { SOLVED, minEd, finishOn, num } from '../status.js?v=202610141420';
import { todayEpochDay, weekdayName, shortDate } from '../dates.js?v=202610141420';
import { LAUNCH_DATE } from '../config.js?v=202610141420';

function finishDays(game, p) {
  return [...p.doneIdx].map((i) => finishOn(game, p, i));
}

/** The [n]th earliest of [days] (nulls ignored), or null if there are fewer. */
function nthEarliest(days, n) {
  const sorted = days.filter((d) => d != null).sort((a, b) => a - b);
  return sorted.length >= n ? sorted[n - 1] : null;
}

/** Earliest day by which [n] consecutive indices of [set] had all been done. */
function runReachedOn(set, n, dayOf) {
  const idx = [...set].sort((a, b) => a - b);
  let best = null;
  let start = 0;
  for (let k = 0; k < idx.length; k++) {
    if (k > 0 && idx[k] !== idx[k - 1] + 1) start = k;
    if (k - start + 1 < n) continue;
    let on = -Infinity;
    for (let j = k - n + 1; j <= k; j++) on = Math.max(on, dayOf(idx[j]));
    best = minEd(best, on);
  }
  return best;
}

/** One key per separate run of [n] or more consecutive members of [set]: the member that reached [n]. */
function runKeys(set, n) {
  const idx = [...set].sort((a, b) => a - b);
  const keys = [];
  let start = 0;
  for (let k = 0; k < idx.length; k++) {
    if (k > 0 && idx[k] !== idx[k - 1] + 1) start = k;
    if (k - start + 1 === n) keys.push(idx[k]);
  }
  return keys;
}

function streakReachedOn(game, p, n) {
  return runReachedOn(p.streakIdx || p.doneIdx, n, (i) => finishOn(game, p, i));
}

const DAILY_STREAKS = [
  { n: 7, name: 'On a Roll', tier: 'bronze' },
  { n: 30, name: 'Month Strong', tier: 'silver' },
  { n: 100, name: 'Centurion', tier: 'gold' },
  { n: 365, name: 'Year Round', tier: 'gold' },
];
const WEEKLY_STREAKS = [
  { n: 4, name: 'Monthly Regular', tier: 'bronze' },
  { n: 12, name: 'Season Pass', tier: 'silver' },
  { n: 52, name: 'Full Year', tier: 'gold' },
];
const DAILY_TOTALS = [
  { n: 10, name: 'Getting Going', tier: 'bronze' },
  { n: 50, name: 'Regular', tier: 'silver' },
  { n: 250, name: 'Devoted', tier: 'gold' },
];
const WEEKLY_TOTALS = [
  { n: 5, name: 'Getting Going', tier: 'bronze' },
  { n: 20, name: 'Regular', tier: 'silver' },
  { n: 52, name: 'Devoted', tier: 'gold' },
];

const SWEEP_DESC = {
  canoku: 'Solve a 9×9, a 6×6 and a 4×4 board on the same day.',
  canolitaire: 'Win all three Draw 1 deals, or all three Draw 3 deals, on the same day.',
  canominoes: 'Solve the Easy, Medium and Hard puzzles on the same day.',
  canoggle: 'Solve both the Daily board and the Mini on the same day.',
};

const SPECIALS = {
  canuckle: [
    { key: 'quick', name: 'Two and Through', glyph: 'star', tier: 'gold',
      desc: 'Win a Canuckle in two guesses or fewer.',
      check: (p) => [p.flags.quickWin ? 1 : 0, 1],
      since: (p) => p.flagOn?.quickWin,
      times: (p) => num(p.dist?.[0]) + num(p.dist?.[1]) },
    { key: 'archive', name: 'Time Traveller', glyph: 'clock', tier: 'silver',
      desc: 'Finish 10 Canuckle games from the archive.',
      check: (p) => [p.flags.archive || 0, 10],
      since: (p) => nthEarliest(p.flagOn?.archive || [], 10) },
  ],
  duo: [
    { key: 'perfect', name: 'Perfect Duo', glyph: 'star', tier: 'silver',
      desc: 'Solve both Canuckle Duo words by your fourth guess.',
      check: (p) => [p.flags.perfect ? 1 : 0, 1],
      since: (p) => p.flagOn?.perfect,
      times: (p) => num(p.flags.perfects) },
    { key: 'perfect10', name: 'Perfect Ten', glyph: 'star', tier: 'gold',
      desc: 'Get 10 Perfect Duos.',
      check: (p) => [Math.min(p.flags.perfects || 0, 10), 10],
      since: (p) => nthEarliest(p.flagOn?.perfectDays || [], 10) },
    { key: 'doubledouble', name: 'Double Double', glyph: 'cup', tier: 'gold',
      desc: 'Get a Perfect Duo two days in a row.',
      check: (p) => [p.flags.doubleDouble ? 1 : 0, 1],
      since: (p) => p.flagOn?.doubleDouble,
      occurrences: (p) => p.doubleDoubleIdx || [] },
    { key: 'twice', name: 'Twice as Nice', glyph: 'star', tier: 'gold',
      desc: 'Solve both Canuckle Duo words in just two guesses.',
      check: (p) => [p.flags.twice ? 1 : 0, 1],
      since: (p) => p.flagOn?.twice,
      times: (p) => num(p.dist?.[0]) },
    { key: 'lucky', name: 'Lucky Hoser', glyph: 'star', tier: 'bronze',
      desc: 'Win a Canuckle Duo on your seventh and final guess.',
      check: (p) => [p.flags.lucky ? 1 : 0, 1],
      since: (p) => p.flagOn?.lucky,
      times: (p) => num(p.dist?.[5]) },
    { key: 'archive', name: 'Time Traveller', glyph: 'clock', tier: 'silver',
      desc: 'Finish 10 Canuckle Duo puzzles from the archive.',
      check: (p) => [Math.min(p.flags.archive || 0, 10), 10] },
  ],
  canoku: [
    { key: 'expert', name: 'Expert, Eh?', glyph: 'star', tier: 'gold',
      desc: 'Solve a 9×9 Expert board.',
      check: (p) => [p.flags.expert9 ? 1 : 0, 1],
      times: (p) => num(p.stats?.VHARD?.totalGames) },
  ],
  canolitaire: [
    { key: 'draw3', name: "Three's Company", glyph: 'star', tier: 'silver',
      desc: 'Win a Draw 3 deal.',
      check: (p) => [p.flags.draw3Win ? 1 : 0, 1],
      since: (p) => p.flagOn?.draw3Win,
      times: (p) => num(p.draws?.d3?.dl?.w) + num(p.draws?.d3?.rd?.w) },
  ],
  canominoes: [
    { key: 'hard', name: 'Hard Case', glyph: 'star', tier: 'silver',
      desc: 'Solve a Hard Canominoes puzzle.',
      check: (p) => [p.flags.hardSolved ? 1 : 0, 1],
      since: (p) => p.flagOn?.hardSolved,
      times: (p) => num(p.tierStats?.h?.w) },
  ],
  canoggle: [
    { key: 'canuckle', name: 'Canuckle Connection', glyph: 'leaf', tier: 'silver',
      desc: 'Find the hidden Canuckle word on 10 boards.',
      check: (p) => [p.flags.canuckleWords || 0, 10] },
  ],
  // Picked on the Canagrams design page (2026-10-13). Some come in bronze,
  // silver and gold; each level is its own badge, the way the streaks are.
  canagrams: [
    ...[[10, 'bronze'], [25, 'silver'], [100, 'gold']].map(([n, tier]) => ({
      key: `canuckle${n}`, name: 'Canuckle Connection', glyph: 'leaf', tier,
      desc: `Spell the Canuckle word on ${n} Canagrams boards.`,
      check: (p) => [Math.min(p.flags.canuckleWords || 0, n), n],
      since: (p) => nthEarliest(p.flagOn?.canuckleDays || [], n),
    })),
    ...[[1, 'bronze'], [5, 'silver'], [20, 'gold']].map(([n, tier]) => ({
      key: `fullweek${n}`, name: 'Full Week', glyph: 'star', tier,
      desc: n === 1
        ? 'Solve every Canagrams puzzle from Monday to Sunday of one week.'
        : `Solve every Canagrams puzzle from Monday to Sunday, ${n} weeks over.`,
      check: (p) => [Math.min(p.flags.fullWeeks || 0, n), n],
      since: (p) => nthEarliest(p.flagOn?.fullWeekDays || [], n),
      ...(n === 1 ? { occurrences: (p) => p.fullWeekIdx || [] } : {}),
    })),
    { key: 'sunday', name: 'Sunday Best', glyph: 'star', tier: 'gold',
      desc: 'Solve 10 Sunday Canagrams puzzles without a hint.',
      check: (p) => [Math.min(p.flags.sundayNoHint || 0, 10), 10] },
    ...[[25, 'bronze'], [100, 'silver'], [250, 'gold']].map(([n, tier]) => ({
      key: `nopeek${n}`, name: 'No Peeking', glyph: 'star', tier,
      desc: `Solve ${n} Canagrams puzzles without a hint.`,
      check: (p) => [Math.min(p.flags.noHint || 0, n), n],
      since: (p) => nthEarliest(p.flagOn?.noHintDays || [], n),
    })),
    { key: 'speed', name: 'Speed Speller', glyph: 'clock', tier: 'silver',
      desc: 'Solve a Monday, Tuesday or Wednesday Canagrams in under 2 minutes.',
      check: (p) => [p.flags.fastestEarlyMs > 0 && p.flags.fastestEarlyMs < 120000 ? 1 : 0, 1] },
    ...[[50, 'bronze'], [250, 'silver'], [1000, 'gold']].map(([n, tier]) => ({
      key: `bonus${n}`, name: 'Bonus Hunter', glyph: 'star', tier,
      desc: `Find ${n} Canagrams bonus words.`,
      check: (p) => [Math.min(p.flags.bonusWords || 0, n), n],
    })),
    { key: 'score', name: 'High Scorer', glyph: 'star', tier: 'gold',
      desc: 'Score 1,500 points or more on one Canagrams puzzle.',
      check: (p) => [p.flags.bestPoints >= 1500 ? 1 : 0, 1] },
  ],
};

function gameBadges(game) {
  const weekly = game.cadence === 'weekly';
  const unit = weekly ? 'week' : 'day';
  const list = [{
    id: `${game.id}.first`, game: game.id, name: 'First Finish', glyph: 'leaf', tier: null,
    desc: `Finish your first ${game.name} puzzle.`,
    check: (p) => [Math.min(p.doneIdx.size, 1), 1],
    since: (p) => nthEarliest(finishDays(game, p), 1),
  }];
  for (const s of weekly ? WEEKLY_STREAKS : DAILY_STREAKS) {
    list.push({
      id: `${game.id}.streak${s.n}`, game: game.id, name: s.name, glyph: 'flame', tier: s.tier,
      desc: `Reach a ${s.n}-${unit} ${game.name} streak.`,
      check: (p) => [Math.min(p.maxStreak, s.n), s.n],
      since: (p) => streakReachedOn(game, p, s.n),
      // Each separate streak that reaches the length counts once.
      occurrences: (p) => runKeys(p.streakIdx || p.doneIdx, s.n),
    });
  }
  for (const t of weekly ? WEEKLY_TOTALS : DAILY_TOTALS) {
    list.push({
      id: `${game.id}.total${t.n}`, game: game.id, name: t.name, glyph: 'stack', tier: t.tier,
      desc: `Finish ${t.n} ${game.name} puzzles.`,
      check: (p) => [Math.min(p.doneIdx.size, t.n), t.n],
      since: (p) => nthEarliest(finishDays(game, p), t.n),
    });
  }
  if (SWEEP_DESC[game.id]) {
    list.push({
      id: `${game.id}.sweep`, game: game.id, name: 'Clean Sweep', glyph: 'sweep', tier: 'silver',
      desc: SWEEP_DESC[game.id],
      check: (p) => [p.flags.sweep ? 1 : 0, 1],
      since: (p) => p.flagOn?.sweep ?? null,
      occurrences: (p) => p.sweepIdx || [],
      parts: (p, todayEd) => ({
        title: 'Today',
        ...game.sweepParts(p.days.get(game.todayIndex(todayEd))),
      }),
    });
  }
  for (const s of SPECIALS[game.id] || []) {
    list.push({ ...s, id: `${game.id}.${s.key}`, game: game.id });
  }
  return list;
}

/**
 * Daily games finished for each calendar day: epoch day -> the days those
 * games were actually finished on (one entry per game; its length is the count).
 */
export function finishesByDate(games, state) {
  const byDate = new Map();
  for (const g of games) {
    if (g.cadence !== 'daily') continue;
    const p = state[g.id]?.progress;
    if (!p) continue;
    for (const i of p.doneIdx) {
      const ed = g.edForIndex(i);
      if (!byDate.has(ed)) byDate.set(ed, []);
      byDate.get(ed).push(finishOn(g, p, i));
    }
  }
  return byDate;
}

/** Earliest day any calendar day reached [k] finished daily games. */
function sameDayReachedOn(byDate, k) {
  let best = null;
  for (const days of byDate.values()) best = minEd(best, nthEarliest(days, k));
  return best;
}

const most = (byDate) => Math.max(0, ...[...byDate.values()].map((d) => d.length));

function longestRunOfDates(dates) {
  let best = 0;
  for (const d of dates) {
    if (dates.has(d - 1)) continue;
    let n = 1;
    while (dates.has(d + n)) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Calendar days on which at least [k] daily games were finished. */
const sameDayKeys = (byDate, k) => [...byDate].filter(([, d]) => d.length >= k).map(([ed]) => ed);

const names = (list) => list.map((g) => g.name).join(', ');

const gameItem = (g, done, detail) => ({ label: g.name, logo: g.logo, done, detail });

/**
 * True when [games] is every game in config.js's LAUNCH_DATE, i.e. the arena
 * is showing every game because they have all launched.
 */
export function coversEveryGame(games) {
  const ids = new Set(games.map((g) => g.id));
  return Object.keys(LAUNCH_DATE).every((id) => ids.has(id));
}

/**
 * [allLaunched]: every game is live. Explorer and Full Slate only exist from
 * then on, so their targets (every game, every daily game) are set once and
 * never move as games launch. A badge already recorded stays in the store.
 */
function familyBadges(games, allLaunched) {
  const dailies = games.filter((g) => g.cadence === 'daily');
  const dailyCount = dailies.length;
  /** Today's daily games, each ticked once finished, with the count done. */
  const today = (state, todayEd) => {
    const isDone = (g) => state[g.id]?.progress?.doneIdx.has(g.todayIndex(todayEd)) === true;
    return {
      done: dailies.filter(isDone).length,
      missing: dailies.filter((g) => !isDone(g)),
      items: dailies.map((g) => gameItem(g, isDone(g))),
    };
  };
  const everPlayed = (state) => (g) => state[g.id]?.progress?.doneIdx.size > 0;
  const list = [];
  if (allLaunched) list.push({
    id: 'family.explorer', game: null, name: 'Explorer', glyph: 'compass', tier: 'bronze',
    desc: 'Finish a puzzle in every Canuckle game.',
    check: ({ state }) => [games.filter(everPlayed(state)).length, games.length],
    parts: ({ state }) => {
      const tried = everPlayed(state);
      const missing = games.filter((g) => !tried(g));
      return {
        title: `${games.length - missing.length} of ${games.length} games`,
        items: games.map((g) => gameItem(g, tried(g))),
        note: missing.length ? `Still to try: ${names(missing)}` : null,
      };
    },
    since: ({ state }) => games.reduce((on, g) => {
      const p = state[g.id]?.progress;
      const first = p ? nthEarliest(finishDays(g, p), 1) : null;
      return on == null || first == null ? null : Math.max(on, first);
    }, -Infinity),
  });
  if (dailyCount >= 3) {
    list.push(
      {
        id: 'family.hattrick', game: null, name: 'Hat Trick', glyph: 'toque', tier: 'bronze',
        desc: 'Finish three different daily games on the same day.',
        check: ({ byDate }) => [Math.min(most(byDate), 3), 3],
        since: ({ byDate }) => sameDayReachedOn(byDate, 3),
        occurrences: ({ byDate }) => sameDayKeys(byDate, 3),
        bestDay: true,
        parts: ({ state }, todayEd) => {
          const t = today(state, todayEd);
          const left = Math.max(0, 3 - t.done);
          return {
            title: `Today · ${Math.min(t.done, 3)} of 3`,
            items: t.items,
            note: left ? `${left} more to go, from ${names(t.missing)}` : null,
            complete: !left,
          };
        },
      },
      {
        id: 'family.hattrickweek', game: null, name: 'Hat Trick Week', glyph: 'toque', tier: 'gold',
        desc: 'Score a Hat Trick seven days in a row.',
        check: ({ byDate }) => {
          const days = new Set([...byDate].filter(([, d]) => d.length >= 3).map(([ed]) => ed));
          return [Math.min(longestRunOfDates(days), 7), 7];
        },
        since: ({ byDate }) => {
          const days = new Set([...byDate].filter(([, d]) => d.length >= 3).map(([ed]) => ed));
          return runReachedOn(days, 7, (ed) => nthEarliest(byDate.get(ed), 3));
        },
        occurrences: ({ byDate }) => runKeys(sameDayKeys(byDate, 3), 7),
        parts: ({ byDate }, todayEd) => {
          const hat = new Set(sameDayKeys(byDate, 3));
          // The run still alive: through today, or through yesterday while
          // today's Hat Trick is still to play.
          const end = hat.has(todayEd) ? todayEd : todayEd - 1;
          let run = 0;
          while (hat.has(end - run)) run++;
          const items = [];
          for (let ed = todayEd - 6; ed <= todayEd; ed++) {
            items.push({ label: `${weekdayName(ed)} ${shortDate(ed)}`, done: hat.has(ed) });
          }
          return {
            title: `Current run · ${Math.min(run, 7)} of 7 days`,
            items,
            note: hat.has(todayEd) ? null : 'A Hat Trick today keeps the run going.',
            complete: hat.has(todayEd) && run >= 7,
          };
        },
      },
    );
  }
  if (allLaunched && dailyCount >= 4) {
    list.push({
      id: 'family.fullslate', game: null, name: 'Full Slate', glyph: 'slate', tier: 'gold',
      desc: 'Finish every daily game on the same day.',
      check: ({ byDate }) => [Math.min(most(byDate), dailyCount), dailyCount],
      since: ({ byDate }) => sameDayReachedOn(byDate, dailyCount),
      occurrences: ({ byDate }) => sameDayKeys(byDate, dailyCount),
      bestDay: true,
      parts: ({ state }, todayEd) => {
        const t = today(state, todayEd);
        return {
          title: `Today · ${t.done} of ${dailyCount}`,
          items: t.items,
          note: t.missing.length ? `Still to play: ${names(t.missing)}` : null,
          complete: t.missing.length === 0,
        };
      },
    });
  }
  if (dailyCount >= 3) {
    list.push({
      id: 'family.truenorth', game: null, name: 'True North', glyph: 'north', tier: 'gold',
      desc: 'Reach a 30-day streak in three different games.',
      check: ({ state }) => [Math.min(games.filter((g) =>
        g.cadence === 'daily' && (state[g.id]?.progress?.maxStreak || 0) >= 30).length, 3), 3],
      since: ({ state }) => nthEarliest(games.filter((g) => g.cadence === 'daily' && state[g.id]?.progress)
        .map((g) => streakReachedOn(g, state[g.id].progress, 30)), 3),
      parts: ({ state }) => {
        const best = (g) => state[g.id]?.progress?.maxStreak || 0;
        return {
          title: `${Math.min(dailies.filter((g) => best(g) >= 30).length, 3)} of 3 games`,
          items: dailies.map((g) => gameItem(g, best(g) >= 30, `best streak ${Math.min(best(g), 30)} of 30`)),
        };
      },
    });
  }
  return list;
}

const COLLECTOR = {
  id: 'family.collector', game: null, name: 'Badge Collector', glyph: 'trophy', tier: 'silver',
  desc: 'Earn 10 other badges.',
};

/**
 * Daily Double: win Canuckle and Canuckle Duo on the same day. A Duo badge
 * that needs Canuckle's progress too, so it is evaluated against everyone's
 * state ([cross]) rather than Duo's alone.
 */
function dailyDouble(canuckle, duo) {
  // One entry per calendar day both were won: { ed, on }, with on the day
  // the second of the two was finished.
  const pairs = (state) => {
    const pc = state[canuckle.id]?.progress;
    const pd = state[duo.id]?.progress;
    if (!pc || !pd) return [];
    const wonOn = new Map(); // calendar day of a won Canuckle -> day it was finished
    for (const [i, d] of pc.days) {
      if (d.status === SOLVED) wonOn.set(canuckle.edForIndex(i), finishOn(canuckle, pc, i));
    }
    const out = [];
    for (const [i, d] of pd.days) {
      const ed = duo.edForIndex(i);
      if (d.status === SOLVED && wonOn.has(ed)) out.push({ ed, on: Math.max(wonOn.get(ed), finishOn(duo, pd, i)) });
    }
    return out;
  };
  const wonToday = (state, g, todayEd) =>
    state[g.id]?.progress?.days.get(g.todayIndex(todayEd))?.status === SOLVED;
  return {
    id: `${duo.id}.dailydouble`, game: duo.id, cross: true, name: 'Daily Double', glyph: 'pair', tier: 'silver',
    desc: 'Win Canuckle and Canuckle Duo on the same day.',
    check: ({ state }) => [Math.min(pairs(state).length, 1), 1],
    since: ({ state }) => nthEarliest(pairs(state).map((x) => x.on), 1),
    occurrences: ({ state }) => pairs(state).map((x) => x.ed),
    parts: ({ state }, todayEd) => {
      const items = [canuckle, duo].map((g) => gameItem(g, wonToday(state, g, todayEd)));
      return { title: 'Today · win both', items, complete: items.every((i) => i.done) };
    },
  };
}

/**
 * Every badge definition for the given (live) games. [allLaunched] defaults to
 * whether [games] is every game there is.
 */
export function badgeDefinitions(games, allLaunched = coversEveryGame(games)) {
  const list = [...familyBadges(games, allLaunched), COLLECTOR, ...games.flatMap(gameBadges)];
  const canuckle = games.find((g) => g.id === 'canuckle');
  const duo = games.find((g) => g.id === 'duo');
  if (canuckle && duo) list.push(dailyDouble(canuckle, duo));
  return list;
}

/**
 * Evaluates every badge. Returns [{ ...definition, earned, have, need,
 * earnedOn, earnedBy }]. For a badge the progress earns, earnedOn is the
 * epoch day it was first earned, or null when the history can't say; earnedBy
 * is then the latest day the player finished a puzzle it counts, a day it was
 * earned by. [alreadyEarned] (ids recorded in the store) keeps a badge earned
 * even if the progress that earned it has since scrolled out of view.
 */
export function evaluateBadges(games, state, alreadyEarned = new Set(),
  { stored = {}, todayEd = todayEpochDay(), allLaunched = coversEveryGame(games) } = {}) {
  const byDate = finishesByDate(games, state);
  const ctx = { state, byDate };
  const lastActive = {};
  for (const g of games) {
    const p = state[g.id]?.progress;
    const days = p ? finishDays(g, p) : [];
    lastActive[g.id] = days.length ? Math.max(...days) : null;
  }
  const active = Object.values(lastActive).filter((d) => d != null);
  const anyActive = active.length ? Math.max(...active) : null;

  const results = [];
  for (const def of badgeDefinitions(games, allLaunched)) {
    if (def === COLLECTOR) continue;
    const p = def.game ? state[def.game]?.progress : null;
    if (def.game && !p) continue;
    const arg = def.game && !def.cross ? p : ctx;
    const [have, need] = def.check(arg);
    const reached = have >= need;
    const on = reached && def.since ? def.since(arg) : null;
    const earned = reached || alreadyEarned.has(def.id);
    const keys = def.occurrences ? [...new Set(def.occurrences(arg))] : [];
    let times = earned ? 1 : 0;
    if (earned && def.times) times = Math.max(1, def.times(arg));
    // Counted from the keys seen now plus the ones stored on earlier visits,
    // which may have scrolled out of the recent window since.
    if (earned && def.occurrences) times = Math.max(1, new Set([...keys, ...(stored[def.id]?.on || [])]).size);
    results.push({
      ...def,
      have,
      need,
      earned,
      earnedOn: Number.isFinite(on) ? on : null,
      earnedBy: reached ? (def.game ? lastActive[def.game] : anyActive) : null,
      times,
      occurrenceKeys: keys,
      repeatable: !!(def.times || def.occurrences),
      parts: def.parts ? def.parts(arg, todayEd) : null,
    });
  }
  const earned = results.filter((b) => b.earned);
  const reached = earned.length >= 10;
  results.unshift({
    ...COLLECTOR,
    have: Math.min(earned.length, 10),
    need: 10,
    earned: reached || alreadyEarned.has(COLLECTOR.id),
    // Exact only when every badge it counts is dated; otherwise the tenth
    // known date could be later than the real tenth.
    earnedOn: reached && earned.every((b) => b.earnedOn != null)
      ? nthEarliest(earned.map((b) => b.earnedOn), 10) : null,
    earnedBy: reached ? anyActive : null,
    times: reached || alreadyEarned.has(COLLECTOR.id) ? 1 : 0,
    occurrenceKeys: [],
    repeatable: false,
    parts: null,
  });
  return results;
}
