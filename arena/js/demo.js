// Sample progress for previewing the arena on the sandbox (?demo). Shaped
// exactly like each adapter's fetch() result, relative to today.

const range = (from, to) => {
  const out = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
};

function canuckleGames(todayIdx) {
  const list = [];
  for (let i = todayIdx - 40; i < todayIdx; i++) {
    if (i === todayIdx - 9) list.push({ answer: 'MAPLE', index: i, userGuesses: ['A', 'B', 'C', 'D', 'E', 'F'] });
    else if (i % 9 === 0) continue;
    else list.push({ answer: 'MAPLE', index: i, userGuesses: ['MOOSE', 'TOQUE', 'MAPLE'].slice(i % 3) });
  }
  list.push({ answer: 'MAPLE', index: 900, userGuesses: ['MAPLE'], isFromArchive: true });
  return list.map((g) => JSON.stringify(g));
}

export function demoRaw(game, todayEd) {
  const k = game.todayIndex(todayEd);
  switch (game.id) {
    case 'canuckle':
      return {
        games: canuckleGames(k),
        maxStreak: 23,
        normalStats: JSON.stringify({ oneGuessWins: 1, twoGuessWins: 9, threeGuessWins: 41, fourGuessWins: 38, fiveGuessWins: 17, sixGuessWins: 6, losses: 4 }),
      };
    case 'plus':
      return {
        games: range(k - 10, k - 1).map((i) => JSON.stringify({ answer: 'BEAVER', index: i, userGuesses: ['CANOES', 'BEAVER'] })),
        maxStreak: 10,
        plusStats: JSON.stringify({ oneGuessWins: 0, twoGuessWins: 3, threeGuessWins: 4, fourGuessWins: 2, fiveGuessWins: 1, sixGuessWins: 0, losses: 0 }),
      };
    case 'duo':
      return {
        games: range(k - 6, k - 1).map((i) => JSON.stringify({
          answers: ['MAPLE', 'TOQUE'], index: i, isFromArchive: false,
          userGuesses: i === k - 3 ? ['A', 'B', 'C', 'D', 'E', 'F', 'G'] : ['MOOSE', 'MAPLE', 'TOQUE'].slice(i % 2),
        })),
        maxStreak: 4,
        duoStats: JSON.stringify({ twos: 1, threes: 2, fours: 1, fives: 0, sixes: 0, sevens: 0, losses: 1 }),
      };
    case 'canoku':
      return {
        completed: range(k - 20, k - 1),
        maxStreak: 20,
        stats: { EASY: { totalGames: 14, totalTime: 5600 }, MED6X6: { totalGames: 6, totalTime: 1500 }, VHARD: { totalGames: 1, totalTime: 1800 } },
        days: {
          [k]: [{ mode: 'EASY', complete: false }],
          [k - 1]: [{ mode: 'EASY', complete: true }, { mode: 'MED6X6', complete: true }],
        },
      };
    case 'canolitaire':
      return {
        d1: { dl: { p: 9, w: 6 }, rd: { p: 4, w: 2 }, bs: 212, fm: 98, sc: 640 },
        d3: { dl: { p: 2, w: 0 } },
        st: 6, ms: 6, ld: k - 1, cd: range(k - 6, k - 1),
        games: [
          { day: k - 1, dm: 0, df: 0, st: 1 }, { day: k - 1, dm: 0, df: 1, st: 1 },
          { day: k - 2, dm: 1, df: 2, st: 2 }, { day: k, dm: 0, df: 0, st: 0 },
        ],
      };
    case 'canominoes':
      return {
        tiers: { e: { p: 5, w: 5, bs: 48, fm: 12, ts: 400 }, m: { p: 4, w: 3, bs: 95, fm: 18, ts: 420 }, h: { p: 2, w: 1, bs: 260, fm: 25, ts: 260 } },
        st: 4, ms: 4, ld: k, sd: range(k - 3, k),
        games: [{ day: k, tier: 'e', solved: true }, { day: k - 1, tier: 'e', solved: true }, { day: k - 1, tier: 'm', solved: true }],
      };
    case 'canoggle':
      return {
        ms: 12, mn: 9, mr: 1, wf: 640, bf: 88, cw: 7, bc: 14, st: 12, mx: 12, ld: k, sd: range(k - 11, k),
        games: [{ day: k, kind: 'd', solved: true }, { day: k, kind: 'm', solved: true }, { day: k - 1, kind: 'd', solved: true }, { day: k - 1, kind: 'm', solved: true }],
      };
    case 'canagrams':
      return {
        ds: 9, nh: 4, pt: 8640, bp: 1312, ft: 151000, wf: 96, bf: 31, cw: 8, sn: 1, fe: 104000,
        st: 9, mx: 9, ld: k, sd: range(k - 8, k),
        games: [
          { day: k, pts: 1104, ms: 214000, hints: 0, cw: true, solved: true },
          { day: k - 1, pts: 1312, ms: 260000, hints: 0, cw: true, solved: true },
          { day: k - 2, pts: 702, ms: 151000, hints: 2, cw: false, solved: true },
        ],
      };
    default:
      return null;
  }
}
