// Canuckle Duo: two five-letter words in seven shared guesses, daily, served
// from the Canuckle app.
//
// Source: canuckleSourceCode/lib/words.dart duoIndex (day 1 = the launch date,
// LAUNCH_DATE in config.js, index 120001, shown to players as index - 120000) and lib/duo/duo_models.dart.
// Progress is `duoGames` in the same newUserData/{id} document as Canuckle: a
// list of JSON strings {answers: [a, b], index, userGuesses, startTimestamp,
// isFromArchive}. Each guess is played on both boards; the puzzle is won once
// both answers have been guessed and lost after seven guesses without both.

import { edOfMillis } from '../dates.js?v=202610131208';
import { launchEd } from '../config.js?v=202610131208';
import { parseJsonList, readJsonPref, pct } from './common.js?v=202610131208';
import {
  SOLVED, FAILED, PROGRESS, emptyProgress, mark, currentStreak, longestStreak, num, minEd, noteFinish,
} from '../status.js?v=202610131208';

const BASE = 120001;
export const DUO_MAX_GUESSES = 7;

/** Outcome of one stored Duo game. */
export function readDuoGame(g) {
  const answers = (Array.isArray(g?.answers) ? g.answers : []).map((a) => String(a || '').toUpperCase());
  const guesses = (Array.isArray(g?.userGuesses) ? g.userGuesses : []).map((x) => String(x || '').toUpperCase());
  const solvedAt = answers.map((a) => (a ? guesses.indexOf(a) : -1));
  const won = answers.length === 2 && solvedAt.every((i) => i >= 0);
  let status = null;
  if (won) status = SOLVED;
  else if (guesses.length >= DUO_MAX_GUESSES) status = FAILED;
  else if (guesses.length > 0) status = PROGRESS;
  return {
    index: num(g?.index),
    status,
    // The guess the second board fell on (2-7), as the game counts it.
    finishedOn: won ? Math.max(...solvedAt) + 1 : null,
    guesses: guesses.length,
    archive: g?.isFromArchive === true,
    startedAt: num(g?.startTimestamp) || null,
  };
}

/**
 * The account's Duo games, plus the one this browser has just played and not
 * yet seen saved: the app writes it to pendingDuoGameJson before it uploads.
 */
function duoGamesWithPending(list) {
  const games = parseJsonList(list);
  const pending = readJsonPref('pendingDuoGameJson');
  const index = num(pending?.index);
  if (!index) return games;
  const at = games.findIndex((g) => num(g?.index) === index);
  if (at < 0) games.push(pending);
  else if (readDuoGame(pending).guesses > readDuoGame(games[at]).guesses) games[at] = pending;
  return games;
}

const DIST_KEYS = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens'];

function duoDistribution(s) {
  let o = null;
  try {
    o = typeof s === 'string' ? JSON.parse(s) : s;
  } catch {
    o = null;
  }
  return {
    dist: DIST_KEYS.map((k) => num(o?.[k])),
    losses: num(o?.losses),
  };
}

export const canuckleDuo = {
  id: 'duo',
  name: 'Canuckle Duo',
  logo: 'images/canuckle-duo.svg',
  color: '#6B3FA0',
  blurb: 'Two words, seven guesses, every day.',
  card: { tint: ['#EFE7F8', '#2B2140'], frame: ['#CDB6EA', '#4A3670'] },
  cadence: 'daily',
  step: 1,
  get firstEd() { return launchEd('duo'); },
  tiers: [],

  indexForEd(ed) {
    const start = launchEd('duo');
    return ed < start ? null : ed - start + BASE;
  },
  edForIndex(i) {
    return launchEd('duo') + i - BASE;
  },
  todayIndex(todayEd) {
    return this.indexForEd(todayEd);
  },
  label: (i) => `#${i - 120000}`,
  resultLabel(entry) {
    switch (entry?.status) {
      case SOLVED: return entry.finishedOn ? `SOLVED IN ${entry.finishedOn}` : 'SOLVED';
      case FAILED: return 'NOT THIS TIME';
      case PROGRESS: return 'IN PROGRESS';
      default: return null;
    }
  },

  link(index, _tier, isToday) {
    return isToday ? '/?duo=true' : `/?game=${index}`;
  },

  async fetch({ uid, reader }) {
    // The same document Canuckle reads; the reader fetches it once.
    const doc = await reader.getDoc(['newUserData', uid]);
    if (!doc) return null;
    return {
      games: doc.duoGames || [],
      maxStreak: doc.maxDuoStreak,
      duoStats: doc.duoStats,
    };
  },

  derive(raw, { todayIdx }) {
    const p = emptyProgress();
    // No account record yet still shows a game finished in this browser.
    raw = raw || {};
    const winDays = new Set();
    let archive = 0;
    let perfects = 0;
    let twice = false;
    let lucky = false;
    const perfectDays = new Map(); // daily puzzles won perfectly -> day finished
    // The day a finish happened, when it can be known: an archive game's
    // startTimestamp is the puzzle's own date, so it can't date the finish.
    const dayOf = (g) => (g.archive ? null : edOfMillis(g.startedAt) ?? this.edForIndex(g.index));
    for (const g of duoGamesWithPending(raw.games).map(readDuoGame)) {
      if (g.index < BASE || !g.status) continue;
      mark(p, g.index, g.status);
      if (g.status === PROGRESS) continue;
      p.days.get(g.index).finishedOn = g.finishedOn;
      p.played++;
      p.doneIdx.add(g.index);
      // An archive game's startTimestamp is the puzzle's own date, not the
      // day it was played, so only daily games date a finish.
      if (!g.archive) noteFinish(p, g.index, g.startedAt);
      if (g.archive) archive++;
      if (g.status === SOLVED) {
        p.solved++;
        if (!g.archive) winDays.add(g.index);
        const on = dayOf(g);
        if (g.finishedOn <= 4) {
          perfects++;
          p.flagOn.perfect = minEd(p.flagOn.perfect, on);
          if (!g.archive) perfectDays.set(g.index, on);
        }
        if (g.finishedOn === 2) {
          twice = true;
          p.flagOn.twice = minEd(p.flagOn.twice, on);
        }
        if (g.finishedOn === DUO_MAX_GUESSES) {
          lucky = true;
          p.flagOn.lucky = minEd(p.flagOn.lucky, on);
        }
      }
    }
    const { dist, losses } = duoDistribution(raw.duoStats);
    p.streak = currentStreak(winDays, todayIdx);
    p.maxStreak = Math.max(num(raw.maxStreak), longestStreak(winDays), p.streak);
    p.streakIdx = winDays;
    // Double Double: a Perfect Duo on two days in a row (daily puzzles).
    let doubleDouble = false;
    p.doubleDoubleIdx = []; // the second day of each pair, one per Double Double
    for (const [i, on] of perfectDays) {
      if (!perfectDays.has(i + 1)) continue;
      doubleDouble = true;
      p.doubleDoubleIdx.push(i + 1);
      p.flagOn.doubleDouble = minEd(p.flagOn.doubleDouble, Math.max(on, perfectDays.get(i + 1)));
    }
    p.flags = { perfect: perfects > 0, perfects, twice, lucky, doubleDouble, archive };
    p.flagOn.perfectDays = [...perfectDays.values()];
    p.dist = dist;
    p.losses = losses;
    return p;
  },

  summary(p) {
    const wins = p.dist ? p.dist.reduce((a, b) => a + b, 0) : 0;
    const total = wins > 0 ? p.dist.reduce((a, n, i) => a + n * (i + 2), 0) : 0;
    return {
      headline: { label: 'Avg guesses', value: wins ? (total / wins).toFixed(1) : '–' },
      winRate: pct(p.solved, p.played),
    };
  },

  detail(p) {
    const dist = p.dist || [0, 0, 0, 0, 0, 0];
    return [
      {
        title: 'Both words solved by guess',
        bars: [...dist.map((v, i) => ({ label: String(i + 2), value: v })),
          { label: 'X', value: p.losses || 0 }],
      },
      {
        title: 'Record',
        rows: [
          ['Puzzles finished', p.played],
          ['Wins', p.solved],
          ['Win rate', `${pct(p.solved, p.played)}%`],
          ['Archive puzzles', p.flags.archive || 0],
        ],
      },
    ];
  },
};
