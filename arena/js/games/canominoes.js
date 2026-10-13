// Canominoes: three daily domino puzzles (Easy / Medium / Hard).
//
// Source: pipsSourceCode/lib/model/daily.dart (day 1 = LAUNCH_DATE in config.js, fixed at
// launch) and data/{stats,user,prefs_keys}.dart. dominoUserData/{id} is the
// stats blob {e,m,h: {p,w,bs,fm,ts}, st, ms, ld, sd}; games/{day}.{tier}
// holds {day, tier, sec, mc, ht, solved, done, updatedAt}, written on a solve
// (so updatedAt is when it was solved). A board left unfinished when its day
// ended is uploaded on the next launch with solved: false, done: false (done is
// absent on older solved records) and reads as in progress, on any device.
// Today's in-progress boards come from this browser's domGame_{day}_{tier}
// saves.

import { launchDaily, pct, historyStart, readJsonPref } from './common.js?v=202610131208';
import { duration, edOfMillis } from '../dates.js?v=202610131208';
import { toMillis } from '../firebase.js?v=202610131208';
import { launchEd } from '../config.js?v=202610131208';
import { readPref } from '../local.js?v=202610131208';
import {
  SOLVED, PROGRESS, emptyProgress, mark, storedStreak, intList, num, minEd, maxEd, noteFinish,
} from '../status.js?v=202610131208';

const LEVELS = [
  { key: 'e', label: 'Easy' },
  { key: 'm', label: 'Medium' },
  { key: 'h', label: 'Hard' },
];

/**
 * [raw] with this browser's own records folded in. Canominoes keeps its whole
 * stats record locally (domStats, the same shape as dominoUserData) and saves
 * a solve to domPendingUpload before it uploads, so a puzzle solved a moment
 * ago shows before Firestore has it. Solved days are unioned; the streak and
 * per-level counts come from whichever copy is further along.
 */
function withLocal(raw) {
  const r = { tiers: {}, sd: [], games: [], ...(raw || {}) };
  const local = readJsonPref('domStats');
  if (local) {
    r.sd = [...new Set([...r.sd, ...intList(local.sd)])];
    const tiers = { ...r.tiers };
    for (const l of LEVELS) {
      const mine = local[l.key];
      if (mine && num(mine.p) > num(tiers[l.key]?.p)) tiers[l.key] = mine;
    }
    r.tiers = tiers;
    if (num(local.ld) >= num(r.ld)) {
      r.st = local.st;
      r.ld = local.ld;
    }
    r.ms = Math.max(num(r.ms), num(local.ms));
  }
  const pending = readJsonPref('domPendingUpload');
  if (pending && pending.solved === true && Number.isInteger(pending.day)) {
    r.games = [...r.games, { day: pending.day, tier: pending.tier, solved: true, at: null }];
  }
  return r;
}

export const canominoes = {
  id: 'canominoes',
  name: 'Canominoes',
  logo: 'images/canominoes.svg',
  color: '#2A2A33',
  blurb: 'Fill the board with dominoes, three puzzles a day.',
  card: { tint: ['#E9E9EE', '#24242B'], frame: ['#C4C4CF', '#3A3A45'] },
  ...launchDaily('canominoes'),
  get firstEd() { return launchEd('canominoes'); },
  tiers: LEVELS,
  resultLabel(entry) {
    const solved = Object.values(entry?.tiers || {}).filter((s) => s === SOLVED).length;
    if (solved > 0) return `${solved} OF 3 SOLVED`;
    if (entry?.status === SOLVED) return 'SOLVED';
    if (entry?.status === PROGRESS) return 'IN PROGRESS';
    return null;
  },
  label: (i) => `#${i}`,

  // Clean Sweep's checklist for one day's entry (p.days), for the badge sheet.
  sweepParts(entry) {
    const items = LEVELS.map((l) => ({ label: l.label, done: entry?.tiers?.[l.key] === SOLVED }));
    return { items, complete: items.every((i) => i.done) };
  },

  link(index, tier, isToday) {
    const params = new URLSearchParams();
    if (!isToday) params.set('day', String(index));
    if (tier) params.set('tier', tier);
    const q = params.toString();
    return `/canominoes/${q ? '?' + q : ''}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['dominoUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['dominoUserData', uid, 'games'], 'day', historyStart(recent, full));
        games = docs.map(({ data }) => ({
          day: num(data.day), tier: data.tier, solved: data.solved === true, done: data.done !== false,
          at: toMillis(data.updatedAt),
        }));
      } catch {
        // Fall back to day-level status.
      }
    }
    const tiers = {};
    for (const l of LEVELS) tiers[l.key] = doc[l.key] || {};
    return { tiers, st: doc.st, ms: doc.ms, ld: doc.ld, sd: intList(doc.sd), games };
  },

  derive(raw, { todayIdx, recent = [] }) {
    const p = emptyProgress();
    raw = withLocal(raw);
    for (const i of raw.sd) {
      mark(p, i, SOLVED);
      p.doneIdx.add(i);
    }
    // Boards started on this device, then server-confirmed solves on top.
    for (const id of readPref('domPlayedGames') || []) {
      const [day, tier] = String(id).split('.');
      if (Number(day) >= todayIdx - 7) mark(p, Number(day), PROGRESS, tier);
    }
    for (const i of recent) {
      for (const l of LEVELS) {
        if (readPref(`domGame_${i}_${l.key}`) != null) mark(p, i, PROGRESS, l.key);
      }
    }
    const solvedTiers = new Map(); // day -> Map of tier -> epoch day solved
    for (const g of raw.games || []) {
      if (!g.day) continue;
      if (g.done === false) {
        // Left unfinished: started, not finished, and nothing to badge.
        mark(p, g.day, PROGRESS, g.tier);
        continue;
      }
      if (!g.solved) continue;
      mark(p, g.day, SOLVED, g.tier);
      noteFinish(p, g.day, g.at);
      const on = edOfMillis(g.at) ?? this.edForIndex(g.day);
      if (!solvedTiers.has(g.day)) solvedTiers.set(g.day, new Map());
      solvedTiers.get(g.day).set(g.tier, on);
      if (g.tier === 'h') p.flagOn.hardSolved = minEd(p.flagOn.hardSolved, on);
    }
    p.sweepIdx = [];
    for (const [day, tiers] of solvedTiers) {
      if (!LEVELS.every((l) => tiers.has(l.key))) continue;
      p.sweepIdx.push(day);
      p.flagOn.sweep = minEd(p.flagOn.sweep, LEVELS.reduce((on, l) => maxEd(on, tiers.get(l.key)), -Infinity));
    }
    let played = 0;
    let solved = 0;
    for (const l of LEVELS) {
      played += num(raw.tiers[l.key]?.p);
      solved += num(raw.tiers[l.key]?.w);
    }
    p.played = played;
    p.solved = solved;
    p.streak = storedStreak(num(raw.st), num(raw.ld), todayIdx);
    p.maxStreak = Math.max(num(raw.ms), p.streak);
    p.flags = {
      sweep: [...solvedTiers.values()].some((s) => LEVELS.every((l) => s.has(l.key))),
      hardSolved: num(raw.tiers.h?.w) > 0,
      daysSolved: raw.sd.length,
    };
    p.tierStats = raw.tiers;
    return p;
  },

  summary(p) {
    return {
      headline: { label: 'Puzzles solved', value: String(p.solved) },
      winRate: pct(p.solved, p.played),
    };
  },

  detail(p) {
    return LEVELS.map((l) => {
      const t = p.tierStats?.[l.key] || {};
      return {
        title: l.label,
        rows: [
          ['Solved', `${num(t.w)} of ${num(t.p)}`],
          ['Best time', t.bs ? duration(t.bs) : '–'],
          ['Average time', t.w ? duration(Math.round(num(t.ts) / num(t.w))) : '–'],
          ['Fewest moves', t.fm || '–'],
        ],
      };
    });
  },
};
