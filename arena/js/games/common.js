// Calendar helpers shared by the game adapters.
//
// Every adapter exposes the same calendar surface:
//   firstEd            first epoch day with a puzzle
//   indexForEd(ed)     puzzle index for a calendar day, or null for none
//   edForIndex(i)      first calendar day of puzzle i
//   todayIndex(ed)     today's puzzle index
//   step               days per puzzle (1 daily, 7 weekly)

import { readPref } from '../local.js?v=202610131208';
import { epochDay } from '../dates.js?v=202610131208';
import { launchEd } from '../config.js?v=202610131208';

/** A game whose puzzle #1 is on [start] (y, m, d) and changes each day. */
export function daily(y, m, d) {
  const startEd = epochDay(y, m, d);
  return {
    cadence: 'daily',
    step: 1,
    firstEd: startEd,
    indexForEd: (ed) => (ed < startEd ? null : ed - startEd + 1),
    edForIndex: (i) => startEd + i - 1,
    todayIndex(todayEd) {
      return this.indexForEd(todayEd);
    },
  };
}

/**
 * A daily game whose puzzle #1 is on its launch date in config.js (moved by
 * the sandbox offset). The date is looked up on every call rather than copied,
 * so firstEd is a getter the adapter declares itself (a spread would freeze it):
 *   ...launchDaily('canoggle'), get firstEd() { return launchEd('canoggle'); }
 */
export function launchDaily(id) {
  return {
    cadence: 'daily',
    step: 1,
    indexForEd(ed) {
      const startEd = launchEd(id);
      return ed < startEd ? null : ed - startEd + 1;
    },
    edForIndex: (i) => launchEd(id) + i - 1,
    todayIndex(todayEd) {
      return this.indexForEd(todayEd);
    },
  };
}

/** Today's index and the previous [count - 1] puzzles, newest first. */
export function recentIndices(game, todayEd, count = 8) {
  const out = [];
  const today = game.todayIndex(todayEd);
  if (today == null) return out;
  for (let k = 0; k < count; k++) {
    const ed = todayEd - k * game.step;
    const idx = game.indexForEd(ed);
    if (idx != null && !out.includes(idx)) out.push(idx);
  }
  return out;
}

/**
 * First day index a windowed adapter queries its per-puzzle documents from:
 * the recent window normally, or all of history ([full]) when dating badges.
 */
export function historyStart(recent, full) {
  return full ? 1 : Math.min(...recent);
}

/** Parses JSON strings defensively; bad entries are skipped. */
/**
 * A pref the game stores as jsonEncode(...) in a string: decoded twice (once
 * by readPref, once here). Null when missing or unreadable.
 */
export function readJsonPref(key) {
  let v = readPref(key);
  try {
    if (typeof v === 'string') v = JSON.parse(v);
  } catch {
    return null;
  }
  return v && typeof v === 'object' ? v : null;
}

export function parseJsonList(list) {
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    try {
      out.push(typeof s === 'string' ? JSON.parse(s) : s);
    } catch {
      // Ignore a corrupt entry rather than losing the whole history.
    }
  }
  return out;
}

export function pct(n, d) {
  return d > 0 ? Math.round((n * 100) / d) : 0;
}
