// Canundrum: the daily Canadian rebus. Match pairs of cards to uncover a picture
// puzzle, guess it with as little showing as you dare, then play the Bonus Round.
// One puzzle a day, a little harder towards the weekend. Three wrong guesses
// end the day unsolved.
//
// Source: canundrumSourceCode/lib/model/daily.dart (day 1 = LAUNCH_DATE in
// config.js, fixed at launch) and data/{stats,user,prefs_keys}.dart.
// rebusUserData/{id} follows Canagrams' anagramUserData: {ds, pl, pt, bp, ft,
// st, mx, ld, sd}, where ds counts the days solved, pl the days finished
// (solved or not), pt the total points, bp the best score, ft the fastest solve
// in ms, st/mx the current and longest streaks, ld the last day finished and sd
// every day solved. games/{day} holds {day, pts, pp, tb, mb, pz, pr, pairs,
// turns, wrong, sec, solved, done, updatedAt}: pts = pp (puzzle points, up to
// 1000) + tb (time bonus, 0-200) + mb (memory bonus, 0-200) + pz (the prize's
// value, up to 500), so at most 1900; pr the prize tier won (top/high/mid/low/none), pairs the
// pairs cleared before the right guess and wrong the wrong guesses. A finish
// with solved: false is a loss (three wrong guesses). A board left unfinished
// when its day ended is uploaded on the next launch with done: false and reads
// as in progress; today's in-progress board is local (cndGame_{day}).

import { launchDaily, pct, historyStart, readJsonPref, readPendingList } from './common.js?v=202611121748';
import { edOfMillis } from '../dates.js?v=202611121748';
import { toMillis } from '../firebase.js?v=202611121748';
import { launchEd } from '../config.js?v=202611121748';
import { readPref } from '../local.js?v=202611121748';
import {
  SOLVED, FAILED, PROGRESS, emptyProgress, mark, currentStreak, longestStreak, intList, num, minEd, noteFinish,
} from '../status.js?v=202611121748';

const COUNTS = ['ds', 'pl', 'pt', 'bp', 'mx'];

/** Pairs cleared at or below this before the right guess earns Sharp Eye. */
export const SHARP_PAIRS = 2;

const count = (v) => (Number.isInteger(v) && v >= 0 ? v : null);

function gameOf(data, at) {
  return {
    day: num(data.day), pts: num(data.pts), pp: count(data.pp), tb: count(data.tb), mb: count(data.mb), pz: count(data.pz),
    pr: typeof data.pr === 'string' ? data.pr : null,
    pairs: count(data.pairs), wrong: count(data.wrong),
    solved: data.solved !== false, done: data.done !== false, at,
  };
}

/**
 * [raw] with this browser's own records folded in, so a puzzle finished a
 * moment ago shows before Firestore has it: cndStats is the whole stats record
 * (rebusUserData's shape) and cndPendingUpload holds finished games (the
 * games/{day} shape) until they upload.
 */
function withLocal(raw) {
  const r = { sd: [], games: [], ...(raw || {}) };
  const local = readJsonPref('cndStats');
  if (local) {
    r.sd = [...new Set([...r.sd, ...intList(local.sd)])];
    for (const k of COUNTS) r[k] = Math.max(num(r[k]), num(local[k]));
    const a = num(r.ft);
    const b = num(local.ft);
    r.ft = a && b ? Math.min(a, b) : a || b;
    if (num(local.ld) >= num(r.ld)) {
      r.st = local.st;
      r.ld = local.ld;
    }
  }
  const extra = [];
  for (const pending of readPendingList('cndPendingUpload')) {
    if (Number.isInteger(pending.day) && pending.done !== false) extra.push(gameOf(pending, null));
  }
  r.games = [...r.games, ...extra.filter((e) => !r.games.some((g) => g.day === e.day && g.done))];
  return r;
}

export const canundrum = {
  id: 'canundrum',
  name: 'Canundrum',
  logo: 'images/canundrum.svg',
  color: '#7B4A22',
  // High contrast: the colour tuned to 3:1 on the card frame, light then dark.
  hc: ['#7B4A22', '#C98A55'],
  blurb: 'Match cards to uncover the picture puzzle, then guess it early.',
  card: { tint: ['#F5EBE1', '#2E2015'], frame: ['#DDBF9F', '#55391F'] },
  ...launchDaily('canundrum'),
  get firstEd() { return launchEd('canundrum'); },
  // One puzzle a day: no tiers, like Canagrams.
  tiers: [],
  resultLabel(entry) {
    if (entry?.status === SOLVED) return 'SOLVED';
    if (entry?.status === FAILED) return 'NOT THIS TIME';
    if (entry?.status === PROGRESS) return 'IN PROGRESS';
    return null;
  },
  label: (i) => `#${i}`,

  link(index, _tier, isToday) {
    return isToday ? '/canundrum/' : `/canundrum/?day=${index}`;
  },

  windowed: true,

  async fetch({ uid, reader, recent, full = false }) {
    const doc = await reader.getDoc(['rebusUserData', uid]);
    if (!doc) return null;
    let games = [];
    if (recent.length) {
      try {
        const docs = await reader.queryAtLeast(['rebusUserData', uid, 'games'], 'day', historyStart(recent, full));
        games = docs.map(({ data }) => gameOf(data, toMillis(data.updatedAt)));
      } catch {
        // Fall back to day-level status.
      }
    }
    const out = { sd: intList(doc.sd), games };
    for (const k of [...COUNTS, 'ft', 'st', 'ld']) out[k] = doc[k];
    return out;
  },

  derive(raw, { todayIdx, recent = [] }) {
    const p = emptyProgress();
    raw = withLocal(raw);
    const solvedDays = new Set(raw.sd);
    for (const g of raw.games || []) {
      if (g.day && g.done && g.solved) solvedDays.add(g.day);
    }
    for (const i of solvedDays) {
      mark(p, i, SOLVED);
      p.doneIdx.add(i);
    }
    const sharpIdx = [];
    const topIdx = [];
    let finished = solvedDays.size;
    for (const g of raw.games || []) {
      if (!g.day) continue;
      if (!g.done) {
        if (!solvedDays.has(g.day)) mark(p, g.day, PROGRESS);
        continue;
      }
      noteFinish(p, g.day, g.at);
      if (!g.solved) {
        if (!solvedDays.has(g.day)) {
          mark(p, g.day, FAILED);
          p.doneIdx.add(g.day);
          finished++;
        }
        continue;
      }
      const on = edOfMillis(g.at) ?? this.edForIndex(g.day);
      if (g.pairs != null && g.pairs <= SHARP_PAIRS) {
        sharpIdx.push(g.day);
        p.flagOn.sharp = minEd(p.flagOn.sharp, on);
      }
      if (g.pr === 'top') {
        topIdx.push(g.day);
        p.flagOn.topPrize = minEd(p.flagOn.topPrize, on);
      }
    }
    for (const id of readPref('cndPlayedGames') || []) {
      const day = Number(id);
      if (day >= todayIdx - 7 && !p.doneIdx.has(day)) mark(p, day, PROGRESS);
    }
    for (const i of recent) {
      if (!p.doneIdx.has(i) && readPref(`cndGame_${i}`) != null) mark(p, i, PROGRESS);
    }
    p.sharpIdx = [...new Set(sharpIdx)].sort((a, b) => a - b);
    p.topPrizeIdx = [...new Set(topIdx)].sort((a, b) => a - b);

    p.streakIdx = solvedDays;
    p.solved = Math.max(num(raw.ds), solvedDays.size);
    p.played = Math.max(num(raw.pl), finished, p.solved);
    // Archive solves fill gaps, as the game counts them.
    p.streak = currentStreak(solvedDays, todayIdx);
    p.maxStreak = Math.max(num(raw.mx), longestStreak(solvedDays), p.streak);
    p.flags = {
      sharp: p.sharpIdx.length > 0,
      topPrize: p.topPrizeIdx.length > 0,
      bestPoints: num(raw.bp),
    };
    p.counts = raw;
    return p;
  },

  summary(p) {
    return {
      headline: { label: 'Puzzles solved', value: String(p.solved) },
      winRate: pct(p.solved, p.played),
    };
  },

  detail(p) {
    const c = p.counts || {};
    const time = (ms) => {
      if (!num(ms)) return '—';
      const s = Math.round(ms / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    return [
      {
        title: 'Puzzles',
        rows: [
          ['Solved', `${p.solved} of ${p.played}`],
          [`Guessed with ${SHARP_PAIRS} pairs or fewer`, (p.sharpIdx || []).length],
          ['Top prizes won', (p.topPrizeIdx || []).length],
        ],
      },
      {
        title: 'Points',
        rows: [
          ['Best score', num(c.bp) ? num(c.bp).toLocaleString('en-CA') : '—'],
          ['Average score', p.solved ? Math.round(num(c.pt) / p.solved).toLocaleString('en-CA') : '—'],
          ['Fastest solve', time(c.ft)],
        ],
      },
    ];
  },
};
