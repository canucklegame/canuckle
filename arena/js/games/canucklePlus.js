// Canuckle+: the weekly 6-7 letter word, served from the Canuckle app.
//
// Source: canuckleSourceCode/lib/words.dart plusIndex: weeks start Monday
// 2025-03-31, index = weeks + 60001, shown to players as index - 60000.
// Progress is `plusGames` in the same newUserData/{id} document as Canuckle.

import { epochDay } from '../dates.js?v=202610131208';
import { pct } from './common.js?v=202610131208';
import { readGame, distribution, guessLabel, gamesWithPending } from './canuckle.js?v=202610131208';
import {
  SOLVED, PROGRESS, emptyProgress, mark, currentStreak, longestStreak, num, noteFinish,
} from '../status.js?v=202610131208';

const START = epochDay(2025, 3, 31);
const BASE = 60001;

export const canucklePlus = {
  id: 'plus',
  name: 'Canuckle+',
  logo: 'images/canuckle-plus.svg',
  color: '#C08A12',
  blurb: 'A new six or seven-letter word every Monday.',
  card: { tint: ['#FAF0D6', '#33290F'], frame: ['#EBD18F', '#5E4A16'] },
  cadence: 'weekly',
  step: 7,
  firstEd: START,
  tiers: [],

  indexForEd(ed) {
    return ed < START ? null : Math.floor((ed - START) / 7) + BASE;
  },
  edForIndex(i) {
    return START + (i - BASE) * 7;
  },
  todayIndex(todayEd) {
    return this.indexForEd(todayEd);
  },
  label: (i) => `#${i - 60000}`,
  resultLabel: guessLabel,

  link(index, _tier, isToday) {
    return isToday ? '/?plus=true' : `/?game=${index}`;
  },

  async fetch({ uid, reader }) {
    const doc = await reader.getDoc(['newUserData', uid]);
    if (!doc) return null;
    return {
      games: doc.plusGames || [],
      streak: doc.plusStreak,
      maxStreak: doc.maxPlusStreak,
      plusStats: doc.plusStats,
    };
  },

  derive(raw, { todayIdx }) {
    const p = emptyProgress();
    raw = raw || {};
    const winWeeks = new Set();
    for (const g of gamesWithPending(raw.games).map(readGame)) {
      if (g.index <= 50000 || !g.status) continue;
      mark(p, g.index, g.status);
      if (g.status !== PROGRESS) p.days.get(g.index).guesses = g.guesses;
      if (g.status !== PROGRESS) {
        p.played++;
        p.doneIdx.add(g.index);
        noteFinish(p, g.index, g.startedAt);
      }
      if (g.status === SOLVED) {
        p.solved++;
        if (!g.archive) winWeeks.add(g.index);
      }
    }
    const { dist, losses } = distribution(raw.plusStats);
    p.streak = currentStreak(winWeeks, todayIdx);
    p.maxStreak = Math.max(num(raw.maxStreak), longestStreak(winWeeks), p.streak);
    p.streakIdx = winWeeks;
    p.dist = dist;
    p.losses = losses;
    return p;
  },

  summary(p) {
    return {
      headline: { label: 'Win rate', value: `${pct(p.solved, p.played)}%` },
      winRate: pct(p.solved, p.played),
    };
  },

  detail(p) {
    const dist = p.dist || [0, 0, 0, 0, 0, 0];
    return [
      {
        title: 'Guess distribution',
        bars: [...dist.map((v, i) => ({ label: String(i + 1), value: v })),
          { label: 'X', value: p.losses || 0 }],
      },
      {
        title: 'Record',
        rows: [
          ['Weeks finished', p.played],
          ['Wins', p.solved],
          ['Win rate', `${pct(p.solved, p.played)}%`],
        ],
      },
    ];
  },
};
