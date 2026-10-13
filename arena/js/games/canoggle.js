// Canoggle: the daily word hunt, a main board plus a 3x3 Mini.
//
// Source: squaredleSourceCode/lib/model/daily.dart (day 1 = LAUNCH_DATE in config.js,
// fixed at launch) and data/{stats,user,prefs_keys}.dart. chainUserData/{id}
// is {ms, mn, mr, wf, bf, cw, bc, st, mx, ld, sd}; sd lists days whose MAIN
// board was solved on merit. games/{day}.{d|m} holds {day, kind, req, bonus,
// solved, updatedAt} (solved false = answers revealed), written when a board
// finishes. A board left unfinished when its day ended is uploaded on the next
// launch with done: false (absent on a finished record) and reads as in
// progress; today's in-progress boards are local.

import { launchDaily, pct, historyStart, readJsonPref } from './common.js?v=202610131208';
import { edOfMillis } from '../dates.js?v=202610131208';
import { toMillis } from '../firebase.js?v=202610131208';
import { launchEd } from '../config.js?v=202610131208';
import { readPref } from '../local.js?v=202610131208';
import {
  SOLVED, FAILED, PROGRESS, emptyProgress, mark, storedStreak, intList, num, minEd, maxEd, noteFinish,
} from '../status.js?v=202610131208';

const KINDS = [
  { key: 'd', label: 'Daily' },
  { key: 'm', label: 'Mini' },
];

const COUNTS = ['ms', 'mn', 'mr', 'wf', 'bf', 'cw', 'bc', 'mx'];

/**
 * [raw] with this browser's own records folded in, so a board finished a
 * moment ago shows before Firestore has it. Canoggle keeps its stats locally
 * (chnStats, the same shape as chainUserData) and saves a finished board to
 * chnPendingUpload before it uploads; a saved board whose answers were
 * revealed ("v|checksum|1|...") is finished too.
 */
function withLocal(raw, recent) {
  const r = { sd: [], games: [], ...(raw || {}) };
  const local = readJsonPref('chnStats');
  if (local) {
    r.sd = [...new Set([...r.sd, ...intList(local.sd)])];
    for (const k of COUNTS) r[k] = Math.max(num(r[k]), num(local[k]));
    if (num(local.ld) >= num(r.ld)) {
      r.st = local.st;
      r.ld = local.ld;
    }
  }
  const extra = [];
  const pending = readJsonPref('chnPendingUpload');
  if (pending && Number.isInteger(pending.day) && pending.kind) {
    extra.push({ day: pending.day, kind: pending.kind, solved: pending.solved === true, at: null });
  }
  for (const i of recent) {
    for (const k of KINDS) {
      const board = readPref(`chnGame_${i}_${k.key}`);
      if (typeof board === 'string' && board.split('|')[2] === '1') {
        extra.push({ day: i, kind: k.key, solved: false, at: null });
      }
    }
  }
  // A local "revealed" never hides a solve the server already has.
  r.games = [...r.games, ...extra.filter((e) => e.solved
    || !r.games.some((g) => g.day === e.day && g.kind === e.kind && g.solved))];
  return r;
}

export const canoggle = {
  id: 'canoggle',
  name: 'Canoggle',
  logo: 'images/canoggle.svg',
  color: '#D35F1B',
  blurb: 'Find words in the daily grid, plus a Mini.',
  card: { tint: ['#FCE9DC', '#3A2416'], frame: ['#F1BC97', '#5C351D'] },
  ...launchDaily('canoggle'),
  get firstEd() { return launchEd('canoggle'); },
  tiers: KINDS,
  resultLabel(entry) {
    const daily = entry?.tiers?.d === SOLVED;
    const mini = entry?.tiers?.m === SOLVED;
    if (daily && mini) return 'DAILY + MINI';
    if (daily) return 'DAILY SOLVED';
    if (mini) return 'MINI SOLVED';
    if (entry?.status === FAILED) return 'ANSWERS REVEALED';
    if (entry?.status === SOLVED) return 'SOLVED';
    if (entry?.status === PROGRESS) return 'IN PROGRESS';
    return null;
  },
  label: (i) => `#${i}`,

  // Clean Sweep's checklist for one day's entry (p.days), for the badge sheet.
  sweepParts(entry) {
    const items = KINDS.map((k) => ({ label: k.label, done: entry?.tiers?.[k.key] === SOLVED }));
    return { items, complete: items.every((i) => i.done) };
  },

  link(index, tier, isToday) {
    const params = new URLSearchParams();
    if (!isToday) params.set('day', String(index));
    if (tier) params.set('tier', tier);
    const q = params.toString();
    return `/canoggle/${q ? '?' + q : ''}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['chainUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['chainUserData', uid, 'games'], 'day', historyStart(recent, full));
        games = docs.map(({ data }) => ({
          day: num(data.day), kind: data.kind, solved: data.solved === true, done: data.done !== false,
          at: toMillis(data.updatedAt),
        }));
      } catch {
        // Fall back to day-level status.
      }
    }
    const { ms, mn, mr, wf, bf, cw, bc, st, mx, ld } = doc;
    return { ms, mn, mr, wf, bf, cw, bc, st, mx, ld, sd: intList(doc.sd), games };
  },

  derive(raw, { todayIdx, recent = [] }) {
    const p = emptyProgress();
    raw = withLocal(raw, recent);
    for (const i of raw.sd) {
      mark(p, i, SOLVED, 'd');
      mark(p, i, SOLVED);
      p.doneIdx.add(i);
    }
    for (const id of readPref('chnPlayedGames') || []) {
      const [day, kind] = String(id).split('.');
      if (Number(day) >= todayIdx - 7) mark(p, Number(day), PROGRESS, kind);
    }
    for (const i of recent) {
      for (const k of KINDS) {
        if (readPref(`chnGame_${i}_${k.key}`) != null) mark(p, i, PROGRESS, k.key);
      }
    }
    const fullDays = new Map();
    for (const g of raw.games || []) {
      if (!g.day) continue;
      if (g.done === false) {
        // Left unfinished: started, not finished, and nothing to badge.
        mark(p, g.day, PROGRESS, g.kind);
        continue;
      }
      const status = g.solved ? SOLVED : FAILED;
      mark(p, g.day, status, g.kind);
      // Either board finishes the day: a player who only wants the Mini has
      // still played Canoggle today. mark keeps the better status, so a
      // revealed Daily with a solved Mini reads as solved.
      mark(p, g.day, status);
      if (g.solved) {
        p.doneIdx.add(g.day);
        noteFinish(p, g.day, g.at);
        if (!fullDays.has(g.day)) fullDays.set(g.day, new Map());
        fullDays.get(g.day).set(g.kind, edOfMillis(g.at) ?? this.edForIndex(g.day));
      }
    }
    p.sweepIdx = [];
    for (const [day, kinds] of fullDays) {
      if (kinds.has('d') && kinds.has('m')) {
        p.sweepIdx.push(day);
        p.flagOn.sweep = minEd(p.flagOn.sweep, maxEd(kinds.get('d'), kinds.get('m')));
      }
    }
    // Streaks still run over main-board solves only, as Canoggle's own does;
    // doneIdx now includes Mini-only days.
    p.streakIdx = new Set(raw.sd);
    p.played = num(raw.ms) + num(raw.mr);
    p.solved = num(raw.ms);
    p.streak = storedStreak(num(raw.st), num(raw.ld), todayIdx);
    p.maxStreak = Math.max(num(raw.mx), p.streak);
    p.flags = {
      sweep: [...fullDays.values()].some((s) => s.has('d') && s.has('m')),
      canuckleWords: num(raw.cw),
    };
    p.counts = raw;
    return p;
  },

  summary(p) {
    return {
      headline: { label: 'Words found', value: String(num(p.counts?.wf)) },
      winRate: pct(p.solved, p.played),
    };
  },

  detail(p) {
    const c = p.counts || {};
    return [
      {
        title: 'Boards',
        rows: [
          ['Daily boards solved', num(c.ms)],
          ['Answers revealed', num(c.mr)],
          ['Minis solved', num(c.mn)],
        ],
      },
      {
        title: 'Words',
        rows: [
          ['Words found', num(c.wf)],
          ['Bonus words', num(c.bf)],
          ['Canuckle words found', num(c.cw)],
          ['Most bonus words on one board', num(c.bc)],
        ],
      },
    ];
  },
};
