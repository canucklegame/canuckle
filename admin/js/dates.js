// Puzzle numbering for Canuckle, Canuckle+ and Canuckle Duo, in "epoch days"
// (whole days since 1970-01-01) built from local calendar dates, like the
// arena's js/dates.js.
//
// Source: canuckleSourceCode/lib/words.dart dateForIndex / todayIndex /
// plusIndex / duoIndex. Canuckle #1-142 ran 2022-02-10 to 2022-07-01, then
// #143 restarted on 2022-10-04. Canuckle+ is weekly from Monday 2025-03-31
// (index 60001). Duo is daily from its launch date (index 120001; see launch.js,
// moved earlier on the sandbox).

import { launchEd } from './launch.js?v=202610141429';

const MS_PER_DAY = 86400000;

export function epochDay(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function todayEpochDay(now = new Date()) {
  return epochDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function ymd(ed) {
  const dt = new Date(ed * MS_PER_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), weekday: dt.getUTCDay() };
}

export function isoDate(ed) {
  const { y, m, d } = ymd(ed);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Thu Oct 8, 2026" */
export function longDate(ed) {
  const { y, m, d, weekday } = ymd(ed);
  return `${WEEKDAYS[weekday]} ${MONTHS[m - 1]} ${d}, ${y}`;
}

const ORIGINAL_START = epochDay(2022, 2, 10);
const ORIGINAL_END = epochDay(2022, 7, 1);
const CANUCKLE_START = epochDay(2022, 10, 4);
const PLUS_START = epochDay(2025, 3, 31);
const DUO_START = launchEd('duo');

const FIVE = [5];

export const GAMES = {
  canuckle: {
    id: 'canuckle',
    name: 'Canuckle',
    collection: 'canuckleGameData',
    firstIndex: 1,
    step: 1,
    answerLengths: FIVE,
    distKeys: ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'losses'],
    edForIndex: (i) => (i <= 142 ? ORIGINAL_START + i - 1 : CANUCKLE_START + i - 143),
    indexForEd(ed) {
      if (ed < ORIGINAL_START) return null;
      if (ed <= ORIGINAL_END) return ed - ORIGINAL_START + 1;
      if (ed < CANUCKLE_START) return null;
      return ed - CANUCKLE_START + 143;
    },
    label: (i) => `#${i}`,
  },
  plus: {
    id: 'plus',
    name: 'Canuckle+',
    collection: 'canucklePlusGameData',
    firstIndex: 60001,
    step: 7,
    answerLengths: [6, 7],
    distKeys: ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'losses'],
    edForIndex: (i) => PLUS_START + (i - 60001) * 7,
    indexForEd: (ed) => (ed < PLUS_START ? null : Math.floor((ed - PLUS_START) / 7) + 60001),
    label: (i) => `#${i - 60000}`,
  },
  duo: {
    id: 'duo',
    name: 'Canuckle Duo',
    collection: 'canuckleDuoGameData',
    firstIndex: 120001,
    step: 1,
    answerLengths: FIVE,
    distKeys: ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'losses'],
    edForIndex: (i) => DUO_START + i - 120001,
    indexForEd: (ed) => (ed < DUO_START ? null : ed - DUO_START + 120001),
    label: (i) => `#${i - 120000}`,
  },
};

/** The puzzle a player in this time zone gets today (not capped by data). */
export function todayIndex(gameId, todayEd = todayEpochDay()) {
  return GAMES[gameId].indexForEd(todayEd);
}

/**
 * Whether players may already have this puzzle: its first day is on or before
 * tomorrow, so time zones up to a day ahead (Australia) are covered. A
 * Canuckle+ puzzle stays available for its whole week and every week after.
 */
export function isAvailable(gameId, index, todayEd = todayEpochDay()) {
  return GAMES[gameId].edForIndex(index) <= todayEd + 1;
}

/**
 * How many puzzles exist after today's, given the highest index (days for
 * Canuckle and Duo, weeks for Canuckle+). Negative when even today's is
 * missing.
 */
export function puzzlesAfterToday(gameId, maxIndex, todayEd = todayEpochDay()) {
  return maxIndex - todayIndex(gameId, todayEd);
}

/** The next index to add after the highest existing one. */
export function nextIndex(gameId, maxIndex) {
  return maxIndex == null ? GAMES[gameId].firstIndex : maxIndex + 1;
}

/**
 * Indices between the lowest and highest saved puzzles ([existing] is a Set or
 * Map of indices) with nothing saved, ascending. Numbers before the lowest
 * saved one don't count: they were never stored, not skipped.
 */
export function missingIndices(gameId, existing, maxIndex) {
  const out = [];
  if (maxIndex == null) return out;
  let min = maxIndex;
  for (const i of existing.keys()) if (i < min) min = i;
  for (let i = Math.max(min, GAMES[gameId].firstIndex); i < maxIndex; i++) {
    if (!existing.has(i)) out.push(i);
  }
  return out;
}

/**
 * An index typed by an admin. Canuckle+ and Duo also accept the number
 * players see (#80 for 60080). Null when it isn't a whole number.
 */
export function parseIndex(gameId, raw) {
  const text = String(raw ?? '').trim().replace(/^#/, '');
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  const offset = GAMES[gameId].firstIndex - 1;
  return offset > 0 && n <= offset ? n + offset : n;
}

export { MS_PER_DAY };
