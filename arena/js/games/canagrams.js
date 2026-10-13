// Canagrams: the daily anagram crossword. One puzzle a day, easiest on Monday
// and toughest on Sunday, with a shaped "fun board" on Saturday.
//
// Source: canagramsSourceCode/lib/model/daily.dart (day 1 = LAUNCH_DATE in config.js, fixed
// at launch) and data/{stats,user,prefs_keys}.dart. anagramUserData/{id} is
// {ds, nh, pt, bp, ft, wf, bf, cw, sn, fe, st, mx, ld, sd}; sd lists every day
// solved. games/{day} holds {day, pts, ms, hints, words, bonus, cw, solved,
// updatedAt}, written when a board finishes -- every finish is a solve, hints
// cost points, not the result. A board left unfinished when its day ended is
// uploaded on the next launch with done: false and reads as in progress;
// today's in-progress board is local.

import { launchDaily, historyStart, readJsonPref } from './common.js?v=202610131208';
import { toMillis } from '../firebase.js?v=202610131208';
import { launchEd } from '../config.js?v=202610131208';
import { readPref } from '../local.js?v=202610131208';
import {
  SOLVED, PROGRESS, emptyProgress, mark, storedStreak, intList, num, noteFinish,
} from '../status.js?v=202610131208';

const COUNTS = ['ds', 'nh', 'pt', 'bp', 'wf', 'bf', 'cw', 'sn', 'mx'];

/** Monday = 1 .. Sunday = 7, for an epoch day (day 0 was a Thursday). */
const weekdayOfEd = (ed) => ((ed + 3) % 7 + 7) % 7 + 1;

/**
 * [raw] with this browser's own records folded in, so a board finished a
 * moment ago shows before Firestore has it. Canagrams keeps its stats locally
 * (cgmStats, the same shape as anagramUserData) and saves a finished board to
 * cgmPendingUpload before it uploads; a saved board is "v|checksum|finished|
 * elapsedMs|hintCost|finalScore|..." (lib/model/game_serialization.dart).
 */
function withLocal(raw, recent) {
  const r = { sd: [], games: [], ...(raw || {}) };
  const local = readJsonPref('cgmStats');
  if (local) {
    r.sd = [...new Set([...r.sd, ...intList(local.sd)])];
    for (const k of COUNTS) r[k] = Math.max(num(r[k]), num(local[k]));
    // The quickest times are minimums, ignoring zero ("none yet").
    for (const k of ['ft', 'fe']) {
      const a = num(r[k]);
      const b = num(local[k]);
      r[k] = a && b ? Math.min(a, b) : a || b;
    }
    if (num(local.ld) >= num(r.ld)) {
      r.st = local.st;
      r.ld = local.ld;
    }
  }
  const extra = [];
  const pending = readJsonPref('cgmPendingUpload');
  if (pending && Number.isInteger(pending.day) && pending.solved === true) {
    extra.push({
      day: pending.day, pts: num(pending.pts), ms: num(pending.ms), hints: num(pending.hints),
      cw: pending.cw === true, done: true, at: null,
    });
  }
  for (const i of recent) {
    const board = readPref(`cgmGame_${i}`);
    if (typeof board !== 'string') continue;
    const f = board.split('|');
    if (f[2] === '1') extra.push({ day: i, pts: num(Number(f[5])), done: true, at: null, local: true });
  }
  r.games = [...r.games, ...extra.filter((e) => !r.games.some((g) => g.day === e.day && g.done))];
  return r;
}

/** Calendar weeks (Monday to Sunday) with all seven days solved, by their Sunday's index. */
function fullWeeks(game, solvedDays) {
  const out = [];
  for (const i of solvedDays) {
    if (weekdayOfEd(game.edForIndex(i)) !== 7) continue;
    let all = true;
    for (let k = 1; k <= 6; k++) {
      if (!solvedDays.has(i - k)) {
        all = false;
        break;
      }
    }
    if (all) out.push(i);
  }
  return out.sort((a, b) => a - b);
}

export const canagrams = {
  id: 'canagrams',
  name: 'Canagrams',
  logo: 'images/canagrams.svg',
  color: '#0E7C7B',
  blurb: 'Spell words from the wheel to fill the daily crossword.',
  card: { tint: ['#DDF0EF', '#12302F'], frame: ['#9BD3D1', '#1F5554'] },
  ...launchDaily('canagrams'),
  get firstEd() { return launchEd('canagrams'); },
  // One puzzle a day: no tiers, like Canuckle.
  tiers: [],
  resultLabel(entry) {
    if (entry?.status === SOLVED) return 'SOLVED';
    if (entry?.status === PROGRESS) return 'IN PROGRESS';
    return null;
  },
  label: (i) => `#${i}`,

  link(index, _tier, isToday) {
    return isToday ? '/canagrams/' : `/canagrams/?day=${index}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['anagramUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['anagramUserData', uid, 'games'], 'day', historyStart(recent, full));
        games = docs.map(({ data }) => ({
          day: num(data.day), pts: num(data.pts), ms: num(data.ms), hints: num(data.hints),
          cw: data.cw === true, done: data.done !== false, at: toMillis(data.updatedAt),
        }));
      } catch {
        // Fall back to day-level status.
      }
    }
    const out = { sd: intList(doc.sd), games };
    for (const k of [...COUNTS, 'ft', 'fe', 'st', 'ld']) out[k] = doc[k];
    return out;
  },

  derive(raw, { todayIdx, recent = [] }) {
    const p = emptyProgress();
    raw = withLocal(raw, recent);
    const solvedDays = new Set(raw.sd);
    for (const g of raw.games || []) {
      if (g.day && g.done !== false) solvedDays.add(g.day);
    }
    for (const i of solvedDays) {
      mark(p, i, SOLVED);
      p.doneIdx.add(i);
    }
    for (const id of readPref('cgmPlayedGames') || []) {
      const day = Number(id);
      if (day >= todayIdx - 7 && !solvedDays.has(day)) mark(p, day, PROGRESS);
    }
    for (const i of recent) {
      if (!solvedDays.has(i) && readPref(`cgmGame_${i}`) != null) mark(p, i, PROGRESS);
    }

    // Per-game records date the badges (when the full history is loaded) and
    // supply the counts the parent document does not keep.
    const canuckleDays = [];
    const noHintDays = [];
    for (const g of raw.games || []) {
      if (!g.day) continue;
      if (g.done === false) {
        if (!solvedDays.has(g.day)) mark(p, g.day, PROGRESS);
        continue;
      }
      noteFinish(p, g.day, g.at);
      const ed = this.edForIndex(g.day);
      if (g.cw) canuckleDays.push(ed);
      if (!g.local && g.hints === 0) noHintDays.push(ed);
    }
    p.flagOn.canuckleDays = canuckleDays.sort((a, b) => a - b);
    p.flagOn.noHintDays = noHintDays.sort((a, b) => a - b);

    const weeks = fullWeeks(this, solvedDays);
    p.fullWeekIdx = weeks;
    p.flagOn.fullWeekDays = weeks.map((i) => this.edForIndex(i));

    p.streakIdx = new Set(raw.sd);
    p.played = solvedDays.size;
    p.solved = solvedDays.size;
    p.streak = storedStreak(num(raw.st), num(raw.ld), todayIdx);
    p.maxStreak = Math.max(num(raw.mx), p.streak);
    p.flags = {
      canuckleWords: num(raw.cw),
      noHint: num(raw.nh),
      sundayNoHint: num(raw.sn),
      fastestEarlyMs: num(raw.fe),
      bonusWords: num(raw.bf),
      bestPoints: num(raw.bp),
      fullWeeks: weeks.length,
    };
    p.counts = raw;
    return p;
  },

  summary(p) {
    const best = num(p.counts?.bp);
    return {
      headline: { label: 'Best score', value: best ? best.toLocaleString('en-CA') : '—' },
      // Every finished board is a solve, so a win rate would always read 100%.
      winRate: null,
    };
  },

  detail(p) {
    const c = p.counts || {};
    const time = (ms) => {
      if (!num(ms)) return '—';
      const s = Math.round(ms / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    const solved = num(c.ds) || p.solved;
    return [
      {
        title: 'Puzzles',
        rows: [
          ['Puzzles solved', solved],
          ['Solved with no hints', num(c.nh)],
          ['Full weeks (Mon–Sun)', p.flags?.fullWeeks || 0],
          ['Sunday puzzles with no hints', num(c.sn)],
        ],
      },
      {
        title: 'Points',
        rows: [
          ['Best score', num(c.bp).toLocaleString('en-CA')],
          ['Average score', solved ? Math.round(num(c.pt) / solved).toLocaleString('en-CA') : '—'],
          ['Total points', num(c.pt).toLocaleString('en-CA')],
          ['Fastest solve', time(c.ft)],
          ['Fastest Monday–Wednesday', time(c.fe)],
        ],
      },
      {
        title: 'Words',
        rows: [
          ['Words found', num(c.wf)],
          ['Bonus words', num(c.bf)],
          ['Canuckle words spelled', num(c.cw)],
        ],
      },
    ];
  },
};

