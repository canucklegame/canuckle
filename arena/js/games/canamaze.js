// Canamaze: a push-block maze. Collect every maple key, then reach the cabin
// door, past a polar bear and a moose on the harder levels.
// Three puzzles a day (Easy / Medium / Hard), scored in points against par.
//
// Source: canamazeSourceCode/lib/model/daily.dart (day 1 = LAUNCH_DATE in
// config.js, fixed at launch) and data/{stats,user,prefs_keys}.dart, copied
// from Canatiles'. mazeUserData/{id} is the stats blob {e,m,h: {p,w,bs,ts,bp,tp,pf,ap},
// st, ms, ld, sd}: bs is the best time (0 = none yet), bp the best score, tp
// the total points, pf the count of Perfect solves (mv == best) and ap
// the count at or under par (older records may lack ap).
// games/{day}.{tier} holds {day, tier, sec, pts, ud, ht: 0, mv, best, par,
// tries, solved, done, updatedAt}: mv is the moves used, best the solver's
// optimum and par best + max(1, round(0.12 * best)); pts is 1000 at best,
// less 40 a move over it (floor 100), plus up to 200 time bonus, less 50 for
// each try after the first (at most 200), never under 100 -- so 0-1200.
// tries is which try the kept result was (the best one; older docs lack it).
// A retry that scores higher replaces the solved doc. A board left unfinished
// when its day ended is uploaded on the next launch with solved: false,
// done: false and reads as in progress. Today's in-progress boards come from
// this browser's cmzGame_{day}_{tier} saves.

import { launchDaily, pct, historyStart, readJsonPref, readPendingList } from './common.js?v=202611121748';
import { duration, edOfMillis } from '../dates.js?v=202611121748';
import { toMillis } from '../firebase.js?v=202611121748';
import { launchEd } from '../config.js?v=202611121748';
import { readPref } from '../local.js?v=202611121748';
import {
  SOLVED, PROGRESS, emptyProgress, mark, currentStreak, longestStreak, intList, num, minEd, maxEd, noteFinish,
} from '../status.js?v=202611121748';

const LEVELS = [
  { key: 'e', label: 'Easy' },
  { key: 'm', label: 'Medium' },
  { key: 'h', label: 'Hard' },
];

/** An undo or hint count as stored, or null when the record doesn't say. */
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : null);

/** Finished in no more moves than par. Local records carry no moves. */
const atPar = (g) => Number.isInteger(g.mv) && Number.isInteger(g.par) && g.mv <= g.par;

/** Finished in the solver's best number of moves (the game's pf). */
const isPerfect = (g) => Number.isInteger(g.mv) && Number.isInteger(g.best) && g.mv === g.best;

/**
 * A finish against best and par, in plain words (no golf terms): "Perfect",
 * "2 under par", "At par" or "3 over par"; null without the numbers.
 */
export function resultFor(mv, best, par) {
  if (!Number.isInteger(mv) || !Number.isInteger(par)) return null;
  if (Number.isInteger(best) && mv === best) return 'Perfect';
  if (mv < par) return `${par - mv} under par`;
  if (mv === par) return 'At par';
  return `${mv - par} over par`;
}


/**
 * [raw] with this browser's own records folded in. Canamaze keeps its whole
 * stats record locally (cmzStats, the same shape as mazeUserData), saves a
 * solve to cmzPendingUpload before it uploads, and keeps every solve made here
 * in cmzResults ("day.tier" -> [seconds, points, undos, hints, moves?,
 * tries?]; only the first four are read here), so a puzzle
 * solved a moment ago shows before Firestore has it. Solved days are unioned;
 * the streak and per-level counts come from whichever copy is further along.
 */
function withLocal(raw) {
  const r = { tiers: {}, sd: [], games: [], ...(raw || {}) };
  const local = readJsonPref('cmzStats');
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
        // ap is newer than the rest: keep it missing when neither copy has it.
        ...(mine.ap != null || theirs.ap != null ? { ap: Math.max(num(mine.ap), num(theirs.ap)) } : {}),
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
  for (const pending of readPendingList('cmzPendingUpload')) {
    if (pending.solved === true && Number.isInteger(pending.day)) {
      extra.push({ day: pending.day, tier: pending.tier, solved: true, done: true,
        ud: count(pending.ud), ht: count(pending.ht), at: null });
    }
  }
  const results = readJsonPref('cmzResults');
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

export const canamaze = {
  id: 'canamaze',
  name: 'Canamaze',
  logo: 'images/canamaze.svg',
  color: '#5C7A14',
  // High contrast: the colour tuned to 3:1 on the card frame, light then dark.
  hc: ['#56721A', '#9CC23F'],
  blurb: 'Push boulders, ice and logs to collect every maple key, three mazes a day.',
  card: { tint: ['#EEF3DC', '#232C12'], frame: ['#C5D69A', '#40521C'] },
  ...launchDaily('canamaze'),
  get firstEd() { return launchEd('canamaze'); },
  tiers: LEVELS,
  resultLabel(entry) {
    const solved = Object.values(entry?.tiers || {}).filter((s) => s === SOLVED).length;
    // One tier finished: how it went, e.g. "HARD · 2 UNDER PAR".
    const results = Object.entries(entry?.results || {});
    if (solved === 1 && results.length === 1) {
      const [tier, text] = results[0];
      return `${LEVELS.find((l) => l.key === tier)?.label || tier} · ${text}`.toUpperCase();
    }
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
    return `/canamaze/${q ? '?' + q : ''}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['mazeUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['mazeUserData', uid, 'games'], 'day', historyStart(recent, full));
        games = docs.map(({ data }) => ({
          day: num(data.day), tier: data.tier, solved: data.solved === true, done: data.done !== false,
          ud: count(data.ud), ht: count(data.ht), mv: count(data.mv), best: count(data.best), par: count(data.par),
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
    for (const id of readPref('cmzPlayedGames') || []) {
      const [day, tier] = String(id).split('.');
      if (Number(day) >= todayIdx - 7) mark(p, Number(day), PROGRESS, tier);
    }
    for (const i of recent) {
      for (const l of LEVELS) {
        if (readPref(`cmzGame_${i}_${l.key}`) != null) mark(p, i, PROGRESS, l.key);
      }
    }
    const solvedTiers = new Map(); // day -> Map of tier -> epoch day solved
    const parTiers = new Map(); // day -> Map of tier -> epoch day, solves at or under par only
    const perfectHard = []; // days with a Hard finished Perfect
    const atParCount = { e: new Set(), m: new Set(), h: new Set() }; // tier -> days at or under par
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
      const text = resultFor(g.mv, g.best, g.par);
      if (text) {
        const day = p.days.get(g.day);
        day.results = { ...day.results, [g.tier]: text };
      }
      if (atPar(g)) {
        if (!parTiers.has(g.day)) parTiers.set(g.day, new Map());
        parTiers.get(g.day).set(g.tier, on);
        atParCount[g.tier]?.add(g.day);
      }
      if (g.tier === 'h') {
        p.flagOn.hardSolved = minEd(p.flagOn.hardSolved, on);
        if (isPerfect(g)) {
          p.flagOn.perfectHard = minEd(p.flagOn.perfectHard, on);
          perfectHard.push(g.day);
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
    p.cleanDayIdx = allThree(parTiers, 'cleanDay', []);
    p.perfectHardIdx = [...new Set(perfectHard)].sort((a, b) => a - b);
    p.atParCount = Object.fromEntries(LEVELS.map((l) => [l.key, atParCount[l.key].size]));
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
      perfectHard: p.perfectHardIdx.length > 0,
      cleanDay: p.cleanDayIdx.length > 0,
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
          ['Perfect', num(t.pf)],
          // The game's own count; without it, the finishes loaded (the full
          // history once badges are dated).
          ['At or under par', t.ap != null ? num(t.ap) : num(p.atParCount?.[l.key])],
        ],
      };
    });
  },
};
