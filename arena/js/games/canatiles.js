// Canatiles: mahjong solitaire, three daily puzzles (Easy / Medium / Hard),
// scored in points.
//
// Source: canatilesSourceCode/lib/model/daily.dart (day 1 = LAUNCH_DATE in
// config.js, fixed at launch), lib/model/scoring.dart and
// data/{stats,user,prefs_keys}.dart. tilesUserData/{id} is the stats blob
// {e,m,h: {p,w,bs,ts,bp,tp,pf}, st, ms, ld, sd}: bs is the best time (0 =
// none yet), bp the best score (higher is better), tp the total points and pf
// the count of perfect solves (no undos, no hints). games/{day}.{tier} holds
// {day, tier, sec, pts, ud, ht, solved, done, updatedAt}, written on a solve
// (so updatedAt is when it was solved). A board left unfinished when its day
// ended is uploaded on the next launch with solved: false, done: false and
// reads as in progress, on any device. Today's in-progress boards come from
// this browser's ctlGame_{day}_{tier} saves.

import { launchDaily, pct, historyStart, readJsonPref, readPendingList } from './common.js?v=202611130802';
import { duration, edOfMillis } from '../dates.js?v=202611130802';
import { toMillis } from '../firebase.js?v=202611130802';
import { launchEd } from '../config.js?v=202611130802';
import { readPref } from '../local.js?v=202611130802';
import {
  SOLVED, PROGRESS, emptyProgress, mark, currentStreak, longestStreak, intList, num, minEd, maxEd, noteFinish,
} from '../status.js?v=202611130802';

const LEVELS = [
  { key: 'e', label: 'Easy' },
  { key: 'm', label: 'Medium' },
  { key: 'h', label: 'Hard' },
];

/** An undo or hint count as stored, or null when the record doesn't say. */
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : null);

/** A solve with no undos and no hints (scoring.dart's isPerfect). */
const isPerfect = (g) => g.ud === 0 && g.ht === 0;

/**
 * [raw] with this browser's own records folded in. Canatiles keeps its whole
 * stats record locally (ctlStats, the same shape as tilesUserData), saves a
 * solve to ctlPendingUpload before it uploads, and keeps every solve made here
 * in ctlResults ("day.tier" -> [seconds, points, undos, hints]), so a puzzle
 * solved a moment ago shows before Firestore has it. Solved days are unioned;
 * the streak and per-level counts come from whichever copy is further along.
 */
function withLocal(raw) {
  const r = { tiers: {}, sd: [], games: [], ...(raw || {}) };
  const local = readJsonPref('ctlStats');
  if (local) {
    r.sd = [...new Set([...r.sd, ...intList(local.sd)])];
    // Field by field, as the game's PlayerStats merge does: counts take the
    // larger, the best time the smaller non-zero (0 means never set), the
    // best score the larger.
    const best = (x, y) => (!x ? y : !y ? x : Math.min(x, y));
    const tiers = { ...r.tiers };
    for (const l of LEVELS) {
      const mine = local[l.key];
      if (!mine) continue;
      const theirs = tiers[l.key] || {};
      tiers[l.key] = {
        ...theirs,
        p: Math.max(num(mine.p), num(theirs.p)),
        w: Math.max(num(mine.w), num(theirs.w)),
        bs: best(num(mine.bs), num(theirs.bs)),
        ts: Math.max(num(mine.ts), num(theirs.ts)),
        bp: Math.max(num(mine.bp), num(theirs.bp)),
        tp: Math.max(num(mine.tp), num(theirs.tp)),
        pf: Math.max(num(mine.pf), num(theirs.pf)),
      };
    }
    r.tiers = tiers;
    if (num(local.ld) >= num(r.ld)) {
      r.st = local.st;
      r.ld = local.ld;
    }
    r.ms = Math.max(num(r.ms), num(local.ms));
  }
  const extra = [];
  for (const pending of readPendingList('ctlPendingUpload')) {
    if (pending.solved === true && Number.isInteger(pending.day)) {
      extra.push({ day: pending.day, tier: pending.tier, solved: true, done: true,
        ud: count(pending.ud), ht: count(pending.ht), at: null });
    }
  }
  const results = readJsonPref('ctlResults');
  if (results && typeof results === 'object' && !Array.isArray(results)) {
    for (const [id, v] of Object.entries(results)) {
      const [day, tier] = String(id).split('.');
      if (!/^\d+$/.test(day) || !LEVELS.some((l) => l.key === tier) || !Array.isArray(v)) continue;
      extra.push({ day: Number(day), tier, solved: true, done: true, ud: count(v[2]), ht: count(v[3]), at: null });
    }
  }
  // Firestore's copy first (it carries when the puzzle was solved); a local
  // record only adds a solve Firestore doesn't have yet.
  const have = new Set(r.games.filter((g) => g.solved).map((g) => `${g.day}.${g.tier}`));
  for (const e of extra) {
    const id = `${e.day}.${e.tier}`;
    if (have.has(id)) continue;
    have.add(id);
    r.games = [...r.games, e];
  }
  return r;
}

export const canatiles = {
  id: 'canatiles',
  name: 'Canatiles',
  logo: 'images/canatiles.svg',
  color: '#B5176E',
  // High contrast: the colour tuned to 3:1 on the card frame, light then dark.
  hc: ['#B5176E', '#E25AA8'],
  blurb: 'Clear the board by matching tiles, three puzzles a day.',
  card: { tint: ['#FBE8F2', '#2E1424'], frame: ['#EBB8D3', '#4D2140'] },
  ...launchDaily('canatiles'),
  get firstEd() { return launchEd('canatiles'); },
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
    return `/canatiles/${q ? '?' + q : ''}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['tilesUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['tilesUserData', uid, 'games'], 'day', historyStart(recent, full));
        games = docs.map(({ data }) => ({
          day: num(data.day), tier: data.tier, solved: data.solved === true, done: data.done !== false,
          ud: count(data.ud), ht: count(data.ht), at: toMillis(data.updatedAt),
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
    for (const id of readPref('ctlPlayedGames') || []) {
      const [day, tier] = String(id).split('.');
      if (Number(day) >= todayIdx - 7) mark(p, Number(day), PROGRESS, tier);
    }
    for (const i of recent) {
      for (const l of LEVELS) {
        if (readPref(`ctlGame_${i}_${l.key}`) != null) mark(p, i, PROGRESS, l.key);
      }
    }
    const solvedTiers = new Map(); // day -> Map of tier -> epoch day solved
    const perfectTiers = new Map(); // day -> Map of tier -> epoch day, perfect solves only
    const noHintHard = []; // days with a Hard solved without a hint
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
      if (isPerfect(g)) {
        if (!perfectTiers.has(g.day)) perfectTiers.set(g.day, new Map());
        perfectTiers.get(g.day).set(g.tier, on);
      }
      if (g.tier === 'h') {
        p.flagOn.hardSolved = minEd(p.flagOn.hardSolved, on);
        if (g.ht === 0) {
          p.flagOn.noHintHard = minEd(p.flagOn.noHintHard, on);
          noHintHard.push(g.day);
        }
      }
    }
    // The day all three of [days]' tiers were done: the latest of the three.
    const allThree = (days, flag, idx) => {
      for (const [day, tiers] of days) {
        if (!LEVELS.every((l) => tiers.has(l.key))) continue;
        idx.push(day);
        p.flagOn[flag] = minEd(p.flagOn[flag], LEVELS.reduce((on, l) => maxEd(on, tiers.get(l.key)), -Infinity));
      }
      return idx.sort((a, b) => a - b);
    };
    p.sweepIdx = allThree(solvedTiers, 'sweep', []);
    p.perfectDayIdx = allThree(perfectTiers, 'perfectDay', []);
    p.noHintHardIdx = [...new Set(noHintHard)].sort((a, b) => a - b);
    let played = 0;
    let solved = 0;
    for (const l of LEVELS) {
      played += num(raw.tiers[l.key]?.p);
      solved += num(raw.tiers[l.key]?.w);
    }
    p.played = played;
    p.solved = solved;
    // A run of consecutive solved days, however they were played: archive
    // solves fill gaps, as the game counts them.
    const solvedDays = new Set([...raw.sd, ...solvedTiers.keys()]);
    p.streak = currentStreak(solvedDays, todayIdx);
    p.maxStreak = Math.max(num(raw.ms), longestStreak(solvedDays), p.streak);
    p.flags = {
      sweep: p.sweepIdx.length > 0,
      hardSolved: num(raw.tiers.h?.w) > 0 || p.flagOn.hardSolved != null,
      noHintHard: p.noHintHardIdx.length > 0,
      perfectDay: p.perfectDayIdx.length > 0,
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
          ['Best score', t.bp ? num(t.bp).toLocaleString('en-CA') : '–'],
          ['Average score', t.w ? Math.round(num(t.tp) / num(t.w)).toLocaleString('en-CA') : '–'],
          ['Best time', t.bs ? duration(t.bs) : '–'],
        ],
      };
    });
  },
};
