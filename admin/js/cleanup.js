// Which stale accounts may be deleted. Pure functions, so every rule is
// unit-tested (admin/tests/run.mjs); the Firestore side is in store.js.
//
// The rule: an account with N games in total (Canuckle + Canuckle+ + Duo),
// N <= 10, may go once its newUserData hasn't been updated for
// 10 + (N - 1) * 5 days. No games counts as one (10 days).
//
// Always kept, whenever in doubt:
//  - a linked email in any of the ID's docs
//  - any sign of play in Canoku, Canolitaire, Canominoes, Canoggle or Canagrams
//  - Canoku accounts whose old per-day saves haven't been migrated
//    (savesVersion < 2): those saves can't be inspected from here
//  - anything with a missing or unreadable lastUpdated

export const MAX_GAMES = 10;
export const DAY_MS = 86400000;
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

/** Every collection that holds a player's doc under their ID. */
export const PLAYER_COLLECTIONS = [
  'newUserData',
  'canokuUserData',
  'solitaireUserData',
  'dominoUserData',
  'chainUserData',
  'anagramUserData',
  'arenaUserData',
];

/** Games whose finished puzzles live in a `games` subcollection. */
export const GAMES_SUBCOLLECTION_PARENTS = ['solitaireUserData', 'dominoUserData', 'chainUserData', 'anagramUserData'];

export function thresholdDays(totalGames) {
  return 10 + (Math.max(totalGames, 1) - 1) * 5;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const count = (v) => (isNum(v) && v > 0 ? v : 0);
const len = (v) => (Array.isArray(v) ? v.length : 0);

// The stored counts and the game lists should agree (user.dart keeps them in
// step); the larger is used so a stale count never costs a real player.
export function totalGames(doc) {
  return Math.max(count(doc.gamesCount), len(doc.games))
    + Math.max(count(doc.plusGamesCount), len(doc.plusGames))
    + Math.max(count(doc.duoGamesCount), len(doc.duoGames));
}

/** The cutoff the Firestore query uses: nothing newer than this can qualify. */
export function queryCutoff(nowMs) {
  return nowMs - thresholdDays(1) * DAY_MS;
}

/** Whether any number above zero appears anywhere in [value], skipping [skipKeys]. */
export function hasPositiveNumber(value, skipKeys = []) {
  if (isNum(value)) return value > 0;
  if (Array.isArray(value)) return value.some((v) => hasPositiveNumber(v));
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.entries(value).some(([k, v]) => !skipKeys.includes(k) && hasPositiveNumber(v));
  }
  return false;
}

const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0
  : v && typeof v === 'object' ? Object.keys(v).length > 0 : false);

/** Whether a Canoku doc shows any play, or might hold saves we can't see. */
export function hasCanokuProgress(doc) {
  if (!doc) return false;
  if (!isNum(doc.savesVersion) || doc.savesVersion < 2) return true;
  if (nonEmpty(doc.completedIndices) || nonEmpty(doc.completedModes) || nonEmpty(doc.completedAt)) return true;
  return hasPositiveNumber(doc, ['savesVersion']);
}

/** Whether a Canolitaire / Canominoes / Canoggle / Canagrams parent doc shows any play. */
export function hasStatsProgress(doc) {
  return !!doc && hasPositiveNumber(doc, ['settings', 'updatedAt']);
}

function hasEmail(doc) {
  return !!doc && typeof doc.email === 'string' && doc.email.trim() !== '';
}

/**
 * The decision for one ID.
 * @param docs {newUserData, canokuUserData, solitaireUserData, dominoUserData,
 *   chainUserData, anagramUserData, arenaUserData}: each doc's data, or null when missing
 * @param hasSubGames whether any `games` subcollection has a doc (or null when
 *   it wasn't checked, which keeps the account)
 * @returns {{eligible: boolean, reason: string, total: number, days: number, idleDays: number|null}}
 */
export function accountVerdict(docs, nowMs, hasSubGames) {
  const user = docs.newUserData;
  if (!user) return { eligible: false, reason: 'no account', total: 0, days: 0, idleDays: null };
  const total = totalGames(user);
  const days = thresholdDays(total);
  const last = user.lastUpdated;
  const idleDays = isNum(last) && last > 0 ? Math.floor((nowMs - last) / DAY_MS) : null;
  const base = { total, days, idleDays };
  const keep = (reason) => ({ ...base, eligible: false, reason });

  if (idleDays === null) return keep('no lastUpdated');
  if (total > MAX_GAMES) return keep('more than 10 games');
  if (nowMs - last <= days * DAY_MS) return keep('recent');
  if (PLAYER_COLLECTIONS.some((c) => hasEmail(docs[c]))) return keep('email');
  if (hasCanokuProgress(docs.canokuUserData)) return keep('other games');
  if (GAMES_SUBCOLLECTION_PARENTS.some((c) => hasStatsProgress(docs[c]))) return keep('other games');
  if (hasSubGames !== false) return keep('other games');
  return { ...base, eligible: true, reason: 'stale' };
}

/**
 * The first pass on a newUserData doc alone, so most accounts are settled
 * without reading anything else. Never says "eligible" by itself: the full
 * accountVerdict decides.
 */
export function quickVerdict(user, nowMs) {
  const v = accountVerdict({ newUserData: user }, nowMs, false);
  return v.reason === 'stale' ? { ...v, eligible: false, reason: 'check other games' } : v;
}

/** Problem with the browser clock, or null when it agrees with the server. */
export function clockProblem(localMs, serverMs) {
  if (!isNum(serverMs)) return 'Couldn\'t read the server\'s clock, so idle times can\'t be trusted.';
  const skew = localMs - serverMs;
  if (Math.abs(skew) > MAX_CLOCK_SKEW_MS) {
    return `This computer's clock is ${Math.round(Math.abs(skew) / 60000)} minutes ${skew > 0 ? 'ahead of' : 'behind'} the server. Fix it before cleaning up.`;
  }
  return null;
}

/** Counts for the dry-run summary. */
export function summarize(verdicts) {
  const byTotal = {};
  const byReason = {};
  for (const v of verdicts) {
    byReason[v.reason] = (byReason[v.reason] || 0) + 1;
    if (v.eligible) byTotal[v.total] = (byTotal[v.total] || 0) + 1;
  }
  return { byTotal, byReason };
}
