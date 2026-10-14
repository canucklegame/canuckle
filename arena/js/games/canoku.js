// Canoku: the daily sudoku with Canadian symbols, at /canoku/.
//
// Source: Canoku/lib/game_board.dart (startDate 2023-10-16, 15 GameModes)
// and user.dart. canokuUserData/{id} holds completedIndices (days with any
// mode solved), completedAt {day: millis first solved} (newer solves only),
// streaks, per-mode {totalTime,totalGames,totalHints} and completedModes
// {day: {MODE: [seconds, hints]}} for every solved board. Unfinished boards
// live only in the browser (canokuGame_{day}_{MODE}). Players not yet
// migrated (savesVersion < 2) still have per-day subcollections
// canokuUserData/{id}/{dayIndex}, one document per mode, {gameData: <JSON>}.

import { daily } from './common.js?v=202610141420';
import { readPref, prefKeys } from '../local.js?v=202610141420';
import { duration } from '../dates.js?v=202610141420';
import {
  SOLVED, PROGRESS, emptyProgress, mark, currentStreak, longestStreak, intList, num, minEd, noteFinish,
} from '../status.js?v=202610141420';

const SIZES = [
  { suffix: '', label: '9×9', stat: '' },
  { suffix: '6X6', label: '6×6', stat: '6x6' },
  { suffix: '4X4', label: '4×4', stat: '4x4' },
];
const LEVELS = [
  { key: 'VEASY', label: 'Beginner', stat: 'vEasy' },
  { key: 'EASY', label: 'Easy', stat: 'easy' },
  { key: 'MED', label: 'Medium', stat: 'med' },
  { key: 'HARD', label: 'Hard', stat: 'hard' },
  { key: 'VHARD', label: 'Expert', stat: 'vHard' },
];

const TIERS = SIZES.flatMap((s) => LEVELS.map((l) => ({
  key: l.key + s.suffix,
  label: l.label,
  group: s.label,
  statKey: `${l.stat}${s.stat}Stats`,
})));

/**
 * Unfinished puzzles saved in this browser, by day: Canoku keeps them in
 * shared_preferences as canokuGame_{day}_{MODE} = {savedAt, game}.
 */
export function localCanokuGames() {
  const out = {};
  for (const key of prefKeys()) {
    const m = /^canokuGame_(\d+)_([A-Z0-9]+)$/.exec(key);
    if (!m) continue;
    let saved = readPref(key);
    try { if (typeof saved === 'string') saved = JSON.parse(saved); } catch { continue; }
    const game = saved && typeof saved === 'object' ? saved.game : null;
    if (!game || typeof game !== 'object') continue;
    (out[Number(m[1])] ||= []).push({ mode: m[2], complete: boardComplete(game), time: num(game.time) });
  }
  return out;
}

/** True when every cell holds exactly one placed (non-note) value. */
export function boardComplete(game) {
  const board = Array.isArray(game.gameBoard) ? game.gameBoard : [];
  if (board.length === 0) return false;
  return board.every((row) => Array.isArray(row) && row.every((cell) =>
    cell && !cell.isNote && Array.isArray(cell.values) && cell.values.length === 1 && cell.values[0] !== -1));
}

export const canoku = {
  id: 'canoku',
  name: 'Canoku',
  logo: 'images/canoku.svg',
  color: '#1F5E96',
  blurb: 'Daily sudoku with Canadian symbols, in three sizes.',
  card: { tint: ['#E1ECF7', '#17283A'], frame: ['#A9C6E3', '#2A4C6E'] },
  ...daily(2023, 10, 16),
  tiers: TIERS,
  resultLabel(entry) {
    const sizes = SIZES.filter((s) => TIERS.some((t) =>
      t.group === s.label && entry?.tiers?.[t.key] === SOLVED)).length;
    if (sizes === SIZES.length) return 'ALL 3 SIZES';
    if (sizes > 0) return `${sizes} OF 3 SIZES`;
    if (entry?.status === SOLVED) return 'SOLVED';
    if (entry?.status === PROGRESS) return 'IN PROGRESS';
    return null;
  },
  label: (i) => `#${i}`,

  // Clean Sweep's checklist for one day's entry (p.days), for the badge sheet.
  sweepParts(entry) {
    const items = SIZES.map((s) => {
      const won = TIERS.find((t) => t.group === s.label && entry?.tiers?.[t.key] === SOLVED);
      return { label: s.label, done: !!won, detail: won ? won.label : 'any level' };
    });
    return { items, complete: items.every((i) => i.done) };
  },

  // Always pass the day: Canoku remembers the last archive date it showed, so
  // a bare ?mode= could reopen an old puzzle instead of today's.
  link(index, tier) {
    const params = new URLSearchParams();
    params.set('day', String(index));
    if (tier) params.set('mode', tier);
    const q = params.toString();
    return `/canoku/${q ? '?' + q : ''}`;
  },

  async fetch({ uid, reader, recent }) {
    const doc = await reader.getDoc(['canokuUserData', uid]);
    if (!doc) return null;
    const solvedModes = doc.completedModes && typeof doc.completedModes === 'object'
      ? doc.completedModes : {};
    // Players not yet moved to completedModes still have per-puzzle documents
    const legacy = num(doc.savesVersion) < 2;
    const local = localCanokuGames();
    const days = {};
    await Promise.all(recent.map(async (i) => {
      const modes = [];
      const solved = solvedModes[i];
      if (solved && typeof solved === 'object') {
        for (const [mode, rec] of Object.entries(solved)) {
          modes.push({ mode, complete: true, time: num(Array.isArray(rec) ? rec[0] : 0) });
        }
      }
      if (legacy) {
        try {
          const docs = await reader.listDocs(['canokuUserData', uid, String(i)]);
          for (const { id, data } of docs) {
            let game = {};
            try { game = JSON.parse(data.gameData || '{}'); } catch { /* skip */ }
            const mode = game.mode || id;
            if (modes.some((m) => m.mode === mode)) continue;
            modes.push({ mode, complete: boardComplete(game), time: num(game.time) });
          }
        } catch {
          // A day we can't read just shows its day-level status.
        }
      }
      for (const g of local[i] || []) {
        if (!modes.some((m) => m.mode === g.mode)) modes.push(g);
      }
      if (modes.length) days[i] = modes;
    }));
    const stats = {};
    for (const t of TIERS) stats[t.key] = doc[t.statKey] || null;
    return {
      completed: intList(doc.completedIndices),
      completedAt: doc.completedAt && typeof doc.completedAt === 'object' ? doc.completedAt : {},
      streak: doc.streak,
      maxStreak: doc.maxStreak,
      stats,
      days,
    };
  },

  derive(raw, { todayIdx }) {
    const p = emptyProgress();
    raw = raw || {};
    const done = new Set(raw.completed || []);
    for (const i of done) {
      mark(p, i, SOLVED);
      p.doneIdx.add(i);
      noteFinish(p, i, num(raw.completedAt?.[i]));
    }
    // This browser's own records, read here rather than at fetch time so the
    // instant paint from cache is current too. Canoku deletes a board when it
    // is solved and writes "<day>:<MODE>" to canokuLastSolves (the last solve
    // of each day) before it uploads, so a puzzle finished a moment ago shows
    // as solved before Firestore has it.
    for (const entry of readPref('canokuLastSolves') || []) {
      const [d, mode] = String(entry).split(':');
      const idx = Number(d);
      if (!Number.isInteger(idx) || idx <= 0 || !mode) continue;
      mark(p, idx, SOLVED, mode);
      mark(p, idx, SOLVED);
      done.add(idx);
      p.doneIdx.add(idx);
    }
    for (const [i, boards] of Object.entries(localCanokuGames())) {
      for (const b of boards) mark(p, Number(i), b.complete ? SOLVED : PROGRESS, b.mode);
    }
    let sweep = false;
    p.sweepIdx = [];
    for (const [i, modes] of Object.entries(raw.days || {})) {
      const idx = Number(i);
      for (const m of modes) mark(p, idx, m.complete ? SOLVED : PROGRESS, m.mode);
      const sizesDone = new Set(modes.filter((m) => m.complete)
        .map((m) => TIERS.find((t) => t.key === m.mode)?.group));
      if (SIZES.every((s) => sizesDone.has(s.label))) {
        sweep = true;
        p.sweepIdx.push(idx);
        // Boards carry no finish time; the day's first solve is the best date.
        p.flagOn.sweep = minEd(p.flagOn.sweep, p.finishedOn.get(idx) ?? this.edForIndex(idx));
      }
    }
    let solvedGames = 0;
    for (const t of TIERS) solvedGames += num(raw.stats?.[t.key]?.totalGames);
    p.played = done.size;
    p.solved = done.size;
    p.streak = currentStreak(done, todayIdx);
    p.maxStreak = Math.max(num(raw.maxStreak), longestStreak(done), p.streak);
    p.flags = {
      sweep,
      expert9: num(raw.stats?.VHARD?.totalGames) > 0,
      solvedGames,
    };
    p.stats = raw.stats || {};
    return p;
  },

  summary(p) {
    return {
      headline: { label: 'Boards solved', value: String(p.flags.solvedGames || 0) },
      winRate: null,
    };
  },

  detail(p) {
    return SIZES.map((s) => ({
      title: `${s.label} boards`,
      rows: LEVELS.map((l) => {
        const st = p.stats?.[l.key + s.suffix];
        const games = num(st?.totalGames);
        const avg = games ? duration(Math.round(num(st.totalTime) / games)) : '–';
        return [l.label, games ? `${games} solved · avg ${avg}` : '–'];
      }),
    })).concat([{
      title: 'Record',
      rows: [['Days with a solve', p.solved], ['Boards solved', p.flags.solvedGames || 0]],
    }]);
  },
};
