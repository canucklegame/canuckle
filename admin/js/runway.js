// How many days of puzzles each daily game has left, for the Days left tab.
//
// Canuckle, Canuckle+ and Duo come from their Firestore collections (see
// dates.js). The others number puzzles from 1 on their first day (launch.js,
// moved earlier on the sandbox; Canoku's is fixed), like the
// arena's daily() in js/games/common.js:
//   Canoku       canokuNewData/<n>, players get up to puzzleCount.count
//                (Canoku/lib/user.dart initializeGameData)
//   Canolitaire  dailies.json "days" (solitaireSourceCode/lib/model/daily.dart)
//   Canominoes   dailies_index.json "days" (pipsSourceCode/lib/model/daily.dart)
//   Canoggle     dailies_index.json "days", the Mini included
//                (squaredleSourceCode/lib/model/daily.dart)
//   Canagrams    dailies_index.json "days"
//                (canagramsSourceCode/lib/model/daily.dart; extend with
//                tools/generate_dailies.dart, see tools/PUZZLE_GENERATION.md)

import { epochDay } from './dates.js?v=202610141429';
import { launchEd } from './launch.js?v=202610141429';

export const DAILY_GAMES = {
  canoku: {
    name: 'Canoku',
    startEd: epochDay(2023, 10, 16),
    source: 'Firestore canokuNewData/puzzleCount',
    afterEnd: 'Players loop through puzzles 336–535 again.',
  },
  canolitaire: {
    name: 'Canolitaire',
    startEd: launchEd('canolitaire'),
    file: 'canolitaire/assets/assets/data/dailies.json',
    afterEnd: 'Deals are no longer checked to be winnable.',
  },
  canominoes: {
    name: 'Canominoes',
    startEd: launchEd('canominoes'),
    file: 'canominoes/assets/assets/data/dailies_index.json',
    afterEnd: 'Puzzles repeat from #1.',
  },
  canoggle: {
    name: 'Canoggle',
    startEd: launchEd('canoggle'),
    file: 'canoggle/assets/assets/data/dailies_index.json',
    afterEnd: 'Puzzles (and the Mini) repeat from #1.',
  },
  canagrams: {
    name: 'Canagrams',
    startEd: launchEd('canagrams'),
    file: 'canagrams/assets/assets/data/dailies_index.json',
    afterEnd: 'Earlier weeks repeat, weekday for weekday.',
  },
};

/** Puzzle number for a calendar day (1 on the first day), or null before it. */
export function dailyIndex(gameId, ed) {
  const start = DAILY_GAMES[gameId].startEd;
  return ed < start ? null : ed - start + 1;
}

export function dailyEd(gameId, index) {
  return DAILY_GAMES[gameId].startEd + index - 1;
}

/**
 * The puzzle count from a dailies.json or dailies_index.json file. Both carry
 * {start, days}; the last puzzle is start + days - 1.
 */
export function daysInFile(json) {
  const start = Number.isInteger(json?.start) ? json.start : 1;
  if (!Number.isInteger(json?.days) || json.days < 0) throw new Error('No "days" count in the file');
  return start + json.days - 1;
}
