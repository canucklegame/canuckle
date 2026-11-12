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
    case 'canatiles':
      return {
        tiers: {
          e: { p: 6, w: 6, bs: 74, ts: 620, bp: 372, tp: 2010, pf: 3 },
          m: { p: 4, w: 4, bs: 241, ts: 1210, bp: 798, tp: 2860, pf: 1 },
          h: { p: 3, w: 2, bs: 655, ts: 1420, bp: 1302, tp: 2350, pf: 0 },
        },
        st: 5, ms: 5, ld: k, sd: range(k - 4, k),
        games: [
          { day: k, tier: 'e', solved: true, ud: 0, ht: 0 }, { day: k, tier: 'm', solved: true, ud: 1, ht: 0 },
          { day: k - 1, tier: 'e', solved: true, ud: 0, ht: 0 }, { day: k - 1, tier: 'm', solved: true, ud: 0, ht: 0 },
          { day: k - 1, tier: 'h', solved: true, ud: 2, ht: 0 },
        ],
      };
    case 'canundrum':
      return {
        ds: 6, pl: 7, pt: 5480, bp: 1430, ft: 74000, st: 3, mx: 4, ld: k, sd: [k - 6, k - 5, k - 4, k - 2, k - 1, k],
        games: [
          { day: k, pts: 1430, pp: 860, tb: 150, mb: 120, pz: 300, pr: 'high', pairs: 2, wrong: 0, solved: true, done: true },
          { day: k - 1, pts: 1280, pp: 620, tb: 90, mb: 70, pz: 500, pr: 'top', pairs: 4, wrong: 1, solved: true, done: true },
          { day: k - 3, pts: 0, pr: 'none', pairs: 9, wrong: 3, solved: false, done: true },
        ],
      };
    case 'canamaze':
      return {
        tiers: {
          e: { p: 5, w: 5, bs: 41, ts: 380, bp: 1000, tp: 4720, pf: 4, ap: 5 },
          m: { p: 4, w: 4, bs: 96, ts: 610, bp: 960, tp: 3600, pf: 2, ap: 3 },
          h: { p: 3, w: 2, bs: 230, ts: 690, bp: 880, tp: 1640, pf: 0, ap: 1 },
        },
        st: 4, ms: 4, ld: k, sd: range(k - 3, k),
        games: [
          { day: k, tier: 'e', solved: true, mv: 14, best: 14, par: 16 }, { day: k, tier: 'm', solved: true, mv: 25, best: 21, par: 24 },
          { day: k - 1, tier: 'e', solved: true, mv: 13, best: 12, par: 13 }, { day: k - 1, tier: 'h', solved: true, mv: 45, best: 38, par: 43 },
        ],
      };
    case 'canadrift':
      return {
        tiers: {
          e: { p: 4, w: 4, bs: 22, ts: 140, bp: 1000, tp: 3900, pf: 3, ap: 4 },
          m: { p: 4, w: 3, bs: 65, ts: 300, bp: 950, tp: 2750, pf: 1, ap: 3 },
          h: { p: 2, w: 2, bs: 140, ts: 320, bp: 1000, tp: 1900, pf: 1, ap: 2 },
        },
        st: 2, ms: 3, ld: k, sd: range(k - 1, k),
        games: [
          { day: k, tier: 'e', solved: true, mv: 8, best: 8, par: 9, bu: 0 }, { day: k, tier: 'm', solved: true, mv: 16, best: 15, par: 17, bu: 1 },
          { day: k - 1, tier: 'h', solved: true, mv: 20, best: 20, par: 22, bu: 0 },
        ],
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
