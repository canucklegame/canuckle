// Challenge results as a podium, the text to share them, and the trophy case.
// Pure: no DOM, so the tests can run it. The sheet that animates it is in
// views/challengeSheets.js; the trophy case card in views/challengesTab.js.
//
// A trophy (gold, silver, bronze) goes to each player who played and placed
// 1st to 3rd in a final challenge, as long as someone else played too. Ties
// share a place. The server counts them (functions/src/views.js standing).

import { ordinal } from './bars.js?v=202611200021';

export { ordinal };

const OPEN = ['invited', 'accepted'];

/** Step heights in px, by place. */
export const STEP_HEIGHTS = { 1: 150, 2: 112, 3: 84 };

// ---- Artwork -------------------------------------------------------------------

// The flag's maple leaf in a 24-unit box: the outline the games draw
// (squaredleSourceCode lib/ui/celebration.dart _kLeafSteps).
export const LEAF = 'M12.54 24l-0.27 -5.14a0.57 0.57 0 0 1 0.66 -0.58l5.12 0.9l-0.69 -1.91a0.39 0.39 0 0 1 0.12 -0.43l5.6 -4.54l-1.26 -0.59a0.39 0.39 0 0 1 -0.2 -0.47l1.11 -3.41l-3.23 0.68a0.39 0.39 0 0 1 -0.43 -0.23l-0.63 -1.47l-2.52 2.7a0.39 0.39 0 0 1 -0.66 -0.34l1.21 -6.27l-1.95 1.13a0.39 0.39 0 0 1 -0.54 -0.16l-1.98 -3.88l-1.98 3.88a0.39 0.39 0 0 1 -0.54 0.16l-1.95 -1.13l1.21 6.27a0.39 0.39 0 0 1 -0.66 0.34l-2.52 -2.7l-0.63 1.47a0.39 0.39 0 0 1 -0.43 0.23l-3.23 -0.68l1.11 3.41a0.39 0.39 0 0 1 -0.2 0.47l-1.26 0.59l5.6 4.54a0.39 0.39 0 0 1 0.12 0.43l-0.69 1.91l5.12 -0.9a0.57 0.57 0 0 1 0.66 0.58l-0.27 5.14z';

export const PLACE_NAMES = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' };

let gradientId = 0;

/**
 * The trophy for [place] as SVG markup: a two-handled gold cup with the
 * maple leaf, a silver goblet with a star, a bronze medal on a red ribbon.
 * Each copy gets its own gradient id, so one hidden copy never blanks another.
 */
export function trophySvg(place, cls = '') {
  const id = `trg${++gradientId}`;
  const open = `<svg class="trophy-art ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">`;
  if (place === 1) {
    return `${open}<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#f7d76b"/><stop offset=".5" stop-color="#e4b53a"/><stop offset="1" stop-color="#b9861a"/></linearGradient></defs>
      <path d="M28 22h-14c0 22 10 32 22 34M92 22h14c0 22-10 32-22 34" fill="none" stroke="#b9861a" stroke-width="7" stroke-linecap="round"/>
      <path d="M28 14h64v20c0 24-14 40-32 40S28 58 28 34z" fill="url(#${id})" stroke="#9a6d10" stroke-width="2"/>
      <rect x="53" y="72" width="14" height="16" fill="#c99a2a"/>
      <path d="M38 88h44l6 14H32z" fill="url(#${id})" stroke="#9a6d10" stroke-width="2"/>
      <rect x="28" y="102" width="64" height="10" rx="3" fill="#6b4a12"/>
      <g transform="translate(45 24) scale(1.25)"><path d="${LEAF}" fill="#d52b1e"/></g></svg>`;
  }
  if (place === 2) {
    return `${open}<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#eef2f6"/><stop offset=".5" stop-color="#b9c1ca"/><stop offset="1" stop-color="#7f8a96"/></linearGradient></defs>
      <path d="M34 18h52l-6 30c-3 14-12 22-20 22s-17-8-20-22z" fill="url(#${id})" stroke="#5f6a76" stroke-width="2"/>
      <rect x="55" y="70" width="10" height="20" fill="#9aa4ae"/>
      <path d="M40 90h40l4 12H36z" fill="url(#${id})" stroke="#5f6a76" stroke-width="2"/>
      <rect x="32" y="102" width="56" height="9" rx="3" fill="#4a535c"/>
      <path d="M60 28l4.5 9 10 1.4-7.2 7 1.7 9.9L60 50.6l-9 4.7 1.7-9.9-7.2-7 10-1.4z" fill="#ffffff" opacity=".9"/></svg>`;
  }
  return `${open}<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#e6aa78"/><stop offset=".5" stop-color="#c98551"/><stop offset="1" stop-color="#8e5528"/></linearGradient></defs>
    <path d="M36 8h18l12 34H48z" fill="#d52b1e"/><path d="M84 8H66L54 42h18z" fill="#a91f15"/>
    <circle cx="60" cy="74" r="34" fill="url(#${id})" stroke="#6e3f1b" stroke-width="3"/>
    <circle cx="60" cy="74" r="25" fill="none" stroke="#f0c39b" stroke-width="2" opacity=".7"/>
    <text x="60" y="86" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="34" fill="#5a3214">3</text></svg>`;
}

const AVATAR_COLOURS = ['#1F5E96', '#6B3FA0', '#0E7C7B', '#7B4A22', '#1E5A3C', '#B3241A', '#2A2A33'];

/** A player's avatar: two initials and a colour that stays the same for them. */
export function avatarParts(pub, gamerId) {
  let n = 0;
  for (const c of pub || gamerId || '') n = (n * 31 + c.charCodeAt(0)) >>> 0;
  const caps = (gamerId || '?').replace(/[^A-Z]/g, '');
  const initials = (caps.length >= 2 ? caps.slice(0, 2) : (gamerId || '?').slice(0, 2)).toUpperCase();
  return { initials, colour: AVATAR_COLOURS[n % AVATAR_COLOURS.length] };
}

// ---- The podium --------------------------------------------------------------

const byRank = (players) => players.filter((p) => p.rank != null).sort((a, b) => a.rank - b.rank);

/** "A", "A and B", "A, B and C". */
export function listNames(names) {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** A row under the podium: what it says for a player who isn't on a step. */
export function restText(p) {
  if (p.score) return p.score;
  return {
    invited: 'Hasn’t played yet', accepted: 'Hasn’t played yet', declined: 'Declined',
    expired: 'Didn’t play', ineligible: 'Played on other terms', done: 'Played',
  }[p.state] ?? '';
}

/**
 * How [view] stands as a podium for player [myPub]:
 *   steps: left to right (2nd, 1st, 3rd; head to head 2nd, 1st), each
 *     {place, players, score, ghost, height}. Tied players share a step. A
 *     final podium has only the places someone holds; one still open also
 *     has dashed "ghost" steps for places players still to play could reach.
 *   rest: everyone not on a step, ranked first, then who hasn't played.
 *   trophy: the place of the player's trophy, or null (not final, not on the
 *     podium, or nobody else played).
 */
export function podiumLayout(view, myPub) {
  const final = view.status === 'final';
  const players = view.players ?? [];
  const ranked = byRank(players);
  const pending = players.filter((p) => OPEN.includes(p.state));
  const size = players.length === 2 ? 2 : 3;
  const steps = [];
  for (let place = 1; place <= size; place++) {
    const on = ranked.filter((p) => p.rank === place);
    if (on.length) {
      steps.push({ place, players: on, score: on[0].score ?? '', ghost: false, height: STEP_HEIGHTS[place] });
    } else if (!final && place > ranked.length && place <= ranked.length + pending.length) {
      steps.push({ place, players: [], score: 'Still to play', ghost: true, height: STEP_HEIGHTS[place] });
    }
  }
  const order = (size === 2 ? [2, 1] : [2, 1, 3]).map((pl) => steps.find((s) => s.place === pl)).filter(Boolean);
  const onPodium = new Set(steps.flatMap((s) => s.players.map((p) => p.pub)));
  const rest = [...ranked.filter((p) => !onPodium.has(p.pub)), ...players.filter((p) => p.rank == null)];
  const me = players.find((p) => p.pub === myPub);
  const trophy = final && me?.rank != null && me.rank <= 3 && onPodium.has(me.pub) && ranked.length >= 2 ? me.rank : null;
  return { final, steps: order, rest, trophy, ranked: ranked.length, pending: pending.length, size };
}

/** The sheet's headline and the line under it, for player [myPub]. */
export function headline(view, myPub) {
  const players = view.players ?? [];
  const ranked = byRank(players);
  const me = players.find((p) => p.pub === myPub);
  const of = ranked.length;
  if (view.status !== 'final') {
    const waiting = players.filter((p) => OPEN.includes(p.state) && p.pub !== myPub).map((p) => p.gamerId);
    const played = `${of} of ${players.length} have played.`;
    if (me?.rank != null) {
      return [`You’re ${ordinal(me.rank)} so far`, waiting.length ? `${played} Waiting on ${listNames(waiting)}.` : played];
    }
    if (me?.state === 'declined') return ['Results so far', 'You declined this one.'];
    if (me?.state === 'ineligible') return ['Results so far', 'Your game was played on other terms, so it doesn’t count.'];
    return ['Results so far', played];
  }
  if (me?.rank == null) {
    if (me?.state === 'expired') return ['You didn’t play', `${of} of ${players.length} played.`];
    if (me?.state === 'declined') return ['Final results', 'You declined this one.'];
    if (me?.state === 'ineligible') return ['Final results', 'Your game was played on other terms, so it didn’t count.'];
    return ['Final results', ''];
  }
  const tied = ranked.filter((p) => p.rank === me.rank).length > 1;
  if (of < 2) return ['You won!', 'Nobody else played, so there’s no trophy this time.'];
  if (me.rank === 1) return tied ? ['Tied for the win!', `You share 1st of ${of}.`] : ['You won!', `1st of ${of}. Well played.`];
  if (me.rank === 2) return ['Silver!', tied ? `Tied for 2nd of ${of}.` : `2nd of ${of}. So close.`];
  if (me.rank === 3) return ['On the podium!', tied ? `Tied for 3rd of ${of}.` : `3rd of ${of}.`];
  return [`You finished ${ordinal(me.rank)}`, `${ordinal(me.rank)} of ${of}. Next one’s yours.`];
}

// ---- Sharing -----------------------------------------------------------------

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** "https://www.canucklegame.ca/arena/" -> "www.canucklegame.ca/arena". */
export const arenaLink = (href) => href.replace(/^https?:\/\//, '').replace(/\/(index\.html)?$/, '');

/**
 * The final results as text anyone can read: the player's own gamer ID
 * rather than "You" (the readers don't know who "You" is), medals for the
 * podium and numbers after it, and who didn't play. [title]: the puzzle
 * ("Canoku #1126 · Hard 9×9"); [arenaUrl]: this site's Arena.
 */
export function shareText(view, myPub, myGamerId, title, arenaUrl) {
  const players = view.players ?? [];
  const name = (p) => (p.pub === myPub ? myGamerId : p.gamerId);
  const lines = [
    ...byRank(players).map((p) => `${MEDALS[p.rank] ?? `${p.rank}.`} ${name(p)} · ${p.score ?? ''}`),
    ...players.filter((p) => p.state === 'expired').map((p) => `– ${name(p)} · Didn’t play`),
  ];
  const kind = lines.length === 2 ? 'head-to-head' : `${lines.length}-player`;
  return [`🏆 ${title} ${kind} challenge, final results`, ...lines, '', `Play the Canuckle Games Arena: ${arenaUrl}`].join('\n');
}

// ---- The trophy case -----------------------------------------------------------

/**
 * The trophy case from the social doc, for games [gameIds] (the challengeable
 * ones, in order) or just [filter]: totals [gold, silver, bronze], challenges
 * played, one row per game {id, t, played, won (% gold, or null)}, and the
 * recent trophies in those games.
 */
export function trophyCase(social, gameIds, filter = 'all') {
  const ids = filter === 'all' ? gameIds : gameIds.filter((id) => id === filter);
  const games = ids.map((id) => {
    const t = [0, 1, 2].map((i) => social?.trophies?.[id]?.[i] ?? 0);
    const played = social?.challengesPlayed?.[id] ?? 0;
    return { id, t, played, won: played ? Math.round((100 * t[0]) / played) : null };
  });
  const totals = [0, 1, 2].map((i) => games.reduce((n, g) => n + g.t[i], 0));
  const recent = (social?.recentTrophies ?? []).filter((e) => ids.includes(e.game));
  return {
    totals, total: totals[0] + totals[1] + totals[2], played: games.reduce((n, g) => n + g.played, 0), games, recent,
  };
}

/** A game row's second line: "12 challenges · 25% won", or "· no trophy yet". */
export function gameLine(g) {
  if (!g.played) return 'No challenges yet';
  const n = `${g.played} ${g.played === 1 ? 'challenge' : 'challenges'}`;
  return g.t.some(Boolean) ? `${n} · ${g.won}% won` : `${n} · no trophy yet`;
}

/** What a recent trophy says: who you beat, or where you finished. */
export function recentLine(e) {
  const others = (e.of ?? 0) - 1;
  if (e.place === 1) {
    if (e.tie) return `Shared 1st of ${e.of}`;
    const names = e.beat ?? [];
    if (!names.length) return `1st of ${e.of}`;
    const more = others - names.length;
    return `Beat ${listNames(more > 0 ? [...names, `${more} more`] : names)}`;
  }
  if (e.place === 2) {
    if (e.tie || !e.beat?.length) return `${e.tie ? 'Tied for 2nd' : '2nd'} of ${e.of}`;
    return `2nd of ${e.of}, behind ${e.beat[0]}`;
  }
  return `${e.tie ? 'Tied for 3rd' : '3rd'} of ${e.of}`;
}

/** "Today", "Yesterday" or "Nov 14", by the local calendar. */
export function whenText(ms, now = Date.now()) {
  const day = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = Math.round((day(now) - day(ms)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(ms).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}
