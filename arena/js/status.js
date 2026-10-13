// Shared vocabulary for puzzle status, and streak arithmetic.

import { edOfMillis } from './dates.js?v=202610131208';

export const SOLVED = 'solved';     // won / completed
export const FAILED = 'failed';     // finished without a win (Canuckle loss, Canoggle reveal)
export const PLAYED = 'played';     // attempted, outcome unknown (Canolitaire's streak counts these)
export const PROGRESS = 'progress'; // started, not finished

const RANK = { [SOLVED]: 4, [FAILED]: 3, [PLAYED]: 2, [PROGRESS]: 1 };

/** The more advanced of two statuses (solved beats failed beats played ...). */
export function better(a, b) {
  return (RANK[a] || 0) >= (RANK[b] || 0) ? a : b;
}

export function isDone(status) {
  return status === SOLVED || status === FAILED || status === PLAYED;
}

export const STATUS_LABEL = {
  [SOLVED]: 'Solved',
  [FAILED]: 'Finished',
  [PLAYED]: 'Played',
  [PROGRESS]: 'In progress',
};

/**
 * Current streak: consecutive indices in [set] ending today, or ending
 * yesterday when today isn't done yet (the day isn't over).
 */
export function currentStreak(set, todayIdx) {
  let i = set.has(todayIdx) ? todayIdx : todayIdx - 1;
  let n = 0;
  while (set.has(i)) {
    n++;
    i--;
  }
  return n;
}

/** Longest run of consecutive indices in [set]. */
export function longestStreak(set) {
  let best = 0;
  for (const i of set) {
    if (set.has(i - 1)) continue;
    let n = 1;
    while (set.has(i + n)) n++;
    if (n > best) best = n;
  }
  return best;
}

/**
 * Streak as the games store it: a run length plus the last index that
 * extended it. The run is only live if it reaches today or yesterday.
 */
export function storedStreak(streak, lastIdx, todayIdx) {
  return lastIdx === todayIdx || lastIdx === todayIdx - 1 ? streak || 0 : 0;
}

export function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function intList(v) {
  return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
}

export function emptyProgress() {
  return {
    days: new Map(),     // index -> { status, tiers: { key: status } }
    doneIdx: new Set(),  // indices that count as "finished the daily" for family badges
    streak: 0,
    maxStreak: 0,
    played: 0,
    solved: 0,
    flags: {},           // game-specific facts badges read
    finishedOn: new Map(), // index -> epoch day it was actually finished, when the game recorded it
    flagOn: {},          // flag -> epoch day it first became true (or sorted days, for counts)
    streakIdx: null,     // indices streaks run over, when not doneIdx
  };
}

/** The earlier of two epoch days, either of which may be null. */
export function minEd(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/** The later of two epoch days, or null if either is unknown. */
export function maxEd(a, b) {
  return a == null || b == null ? null : Math.max(a, b);
}

/** Day puzzle [i] was finished: as the game recorded it, else the puzzle's own day. */
export function finishOn(game, p, i) {
  return p.finishedOn?.get(i) ?? game.edForIndex(i);
}

/** Records that puzzle [index] was finished at [millis], keeping the earliest. */
export function noteFinish(progress, index, millis) {
  const ed = edOfMillis(millis);
  if (ed != null) progress.finishedOn.set(index, minEd(progress.finishedOn.get(index), ed));
}

/**
 * Records [status] for the whole day (tierKey null) or for one tier. A tier
 * on its own only marks the day as in progress; each adapter decides what
 * makes the day itself solved, since that rule differs per game.
 */
export function mark(progress, index, status, tierKey = null) {
  if (!status) return;
  let day = progress.days.get(index);
  if (!day) {
    day = { status: null, tiers: {} };
    progress.days.set(index, day);
  }
  if (tierKey == null) {
    day.status = better(day.status, status);
  } else {
    day.tiers[tierKey] = better(day.tiers[tierKey], status);
    day.status = better(day.status, PROGRESS);
  }
}
