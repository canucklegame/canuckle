// Canuckle Canolitaire: six daily deals (Draw 1 / Draw 3 x Easy / Medium / Hard).
//
// Source: solitaireSourceCode/lib/model/daily.dart (day 1 = launch date, LAUNCH_DATE in config.js) and
// data/{stats,user}.dart. solitaireUserData/{id} holds {d1, d3, st, ms, ld,
// cd}; cd lists days ATTEMPTED (the streak counts playing, not winning).
// Game documents in games/ carry {day, dm (draw index), df (tier index),
// st (0 playing, 1 won, 2 abandoned), sec, updatedAt}; updatedAt is the last
// write, which for a finished deal is when it finished.

import { launchDaily, pct, historyStart, readJsonPref } from './common.js?v=202610141420';
import { duration, edOfMillis } from '../dates.js?v=202610141420';
import { toMillis } from '../firebase.js?v=202610141420';
import { launchEd } from '../config.js?v=202610141420';
import { readPref } from '../local.js?v=202610141420';
import {
  SOLVED, PLAYED, PROGRESS, emptyProgress, mark, storedStreak, intList, num, minEd, maxEd, noteFinish,
} from '../status.js?v=202610141420';

const DRAWS = ['1', '3'];
const LEVELS = ['e', 'm', 'h'];
const LEVEL_LABEL = { e: 'Easy', m: 'Medium', h: 'Hard' };

const TIERS = DRAWS.flatMap((d) => LEVELS.map((l) => ({
  key: d + l, label: LEVEL_LABEL[l], group: `Draw ${d}`,
})));

const tierKey = (drawIndex, levelIndex) => `${DRAWS[drawIndex] ?? '1'}${LEVELS[levelIndex] ?? 'e'}`;

/**
 * Daily deals as this browser last saved them: one slot per draw and level
 * (solDailyGame_<draw>_<level>, a JSON string with the deal's day and st: 0
 * playing, 1 won, 2 abandoned), plus a finished deal still waiting to upload.
 * The game writes both before its Firestore write, so a deal won a moment ago
 * shows as won before the server has it.
 */
function localDeals() {
  const deals = [];
  const add = (o) => {
    if (!o || !Number.isInteger(o.day) || o.day <= 0) return;
    deals.push({ day: o.day, dm: num(o.dm), df: num(o.df), st: num(o.st), sec: num(o.sec), at: null });
  };
  for (let dm = 0; dm < DRAWS.length; dm++) {
    for (let df = 0; df < LEVELS.length; df++) add(readJsonPref(`solDailyGame_${dm}_${df}`));
  }
  add(readJsonPref('solPendingUpload'));
  return deals;
}

export const canolitaire = {
  id: 'canolitaire',
  name: 'Canolitaire',
  logo: 'images/canolitaire.svg',
  color: '#1E5A3C',
  blurb: 'Six daily deals of Canadian solitaire.',
  card: { tint: ['#DFEFE6', '#15291F'], frame: ['#9CCBB0', '#24503A'] },
  ...launchDaily('canolitaire'),
  get firstEd() { return launchEd('canolitaire'); },
  tiers: TIERS,
  resultLabel(entry) {
    const won = Object.values(entry?.tiers || {}).filter((s) => s === SOLVED).length;
    if (won > 0) return `${won} OF 6 WON`;
    if (entry?.status === PLAYED) return 'PLAYED';
    if (entry?.status === PROGRESS) return 'IN PROGRESS';
    return null;
  },
  label: (i) => `#${i}`,

  // Clean Sweep's checklist for one day's entry (p.days), for the badge sheet.
  sweepParts(entry) {
    const won = (t) => entry?.tiers?.[t.key] === SOLVED;
    return {
      items: TIERS.map((t) => ({ label: `${t.group} · ${t.label}`, done: won(t) })),
      note: 'Win all three Draw 1 deals, or all three Draw 3 deals.',
      complete: DRAWS.some((d) => TIERS.filter((t) => t.group === `Draw ${d}`).every(won)),
    };
  },

  link(index, tier, isToday) {
    const params = new URLSearchParams();
    if (!isToday) params.set('day', String(index));
    if (tier) params.set('tier', tier);
    const q = params.toString();
    return `/canolitaire/${q ? '?' + q : ''}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['solitaireUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['solitaireUserData', uid, 'games'], 'day',
          historyStart(recent, full));
        games = docs.map(({ data }) => ({
          day: num(data.day), dm: num(data.dm), df: num(data.df), st: num(data.st), sec: num(data.sec),
          at: toMillis(data.updatedAt),
        }));
      } catch {
        // Fall back to day-level status.
      }
    }
    return { d1: doc.d1 || {}, d3: doc.d3 || {}, st: doc.st, ms: doc.ms, ld: doc.ld, cd: intList(doc.cd), games };
  },

  derive(raw, { todayIdx }) {
    const p = emptyProgress();
    raw = { d1: {}, d3: {}, cd: [], games: [], ...(raw || {}) };
    for (const i of raw.cd) {
      mark(p, i, PLAYED);
      p.doneIdx.add(i);
    }
    const won = new Map(); // day -> Map of tier key won -> epoch day won
    for (const g of [...raw.games, ...localDeals()]) {
      if (!g.day) continue;
      const key = tierKey(g.dm, g.df);
      const status = g.st === 1 ? SOLVED : g.st === 2 ? PLAYED : PROGRESS;
      mark(p, g.day, status, key);
      // The streak counts attempts, so a day counts from its first deal.
      noteFinish(p, g.day, g.at);
      if (status === SOLVED) {
        mark(p, g.day, SOLVED);
        if (!won.has(g.day)) won.set(g.day, new Map());
        const on = edOfMillis(g.at) ?? this.edForIndex(g.day);
        won.get(g.day).set(key, on);
        if (g.dm === 1) p.flagOn.draw3Win = minEd(p.flagOn.draw3Win, on);
      }
    }
    // Puzzles started on this device ("d.<day>.<drawIndex>.<levelIndex>").
    for (const id of readPref('solCountedGames') || []) {
      const [kind, day, dm, df] = String(id).split('.');
      if (kind === 'd' && Number(day) >= todayIdx - 7) mark(p, Number(day), PROGRESS, tierKey(Number(dm), Number(df)));
    }
    let sweep = false;
    p.sweepIdx = [];
    for (const [day, tiers] of won) {
      for (const d of DRAWS) {
        if (!LEVELS.every((l) => tiers.has(d + l))) continue;
        sweep = true;
        if (!p.sweepIdx.includes(day)) p.sweepIdx.push(day);
        p.flagOn.sweep = minEd(p.flagOn.sweep, LEVELS.reduce((on, l) => maxEd(on, tiers.get(d + l)), -Infinity));
      }
    }

    const daily1 = raw.d1.dl || {};
    const daily3 = raw.d3.dl || {};
    p.played = raw.cd.length;
    p.solved = num(daily1.w) + num(daily3.w);
    p.streak = storedStreak(num(raw.st), num(raw.ld), todayIdx);
    p.maxStreak = Math.max(num(raw.ms), p.streak);
    p.flags = {
      sweep,
      draw3Win: num(raw.d3.dl?.w) + num(raw.d3.rd?.w) > 0,
      dailyPlayed: num(daily1.p) + num(daily3.p),
    };
    p.draws = { d1: raw.d1, d3: raw.d3 };
    return p;
  },

  summary(p) {
    return {
      headline: { label: 'Daily win rate', value: `${pct(p.solved, p.flags.dailyPlayed || 0)}%` },
      winRate: pct(p.solved, p.flags.dailyPlayed || 0),
    };
  },

  detail(p) {
    const section = (label, d = {}) => ({
      title: label,
      rows: [
        ['Daily deals', `${num(d.dl?.w)} won of ${num(d.dl?.p)}`],
        ['Random deals', `${num(d.rd?.w)} won of ${num(d.rd?.p)}`],
        ['Best time', d.bs ? duration(d.bs) : '–'],
        ['Fewest moves', d.fm || '–'],
        ['Best score', d.sc || '–'],
      ],
    });
    return [section('Draw 1', p.draws?.d1), section('Draw 3', p.draws?.d3),
      { title: 'Record', rows: [['Days played', p.played]] }];
  },
};
