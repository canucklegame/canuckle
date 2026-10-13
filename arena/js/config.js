// Environment detection and site-wide constants.
//
// The arena ships the same files to the sandbox (jeffrrogers.github.io) and to
// production (canucklegame.ca). All game links are root-relative, so the only
// thing that differs is which games are visible and whether analytics runs.

import { readPref, writePref } from './local.js?v=202610131208';
import { epochDay, todayEpochDay } from './dates.js?v=202610131208';

const host = typeof location === 'undefined' ? '' : location.hostname;

export const IS_SANDBOX =
  host.endsWith('github.io') || host === 'localhost' || host === '127.0.0.1' || host === '';

// ?demo on the sandbox fills the arena with sample progress and never touches
// Firestore, for previewing layouts.
export const IS_DEMO =
  IS_SANDBOX && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

// Production = canucklegame.ca and its subdomains. Analytics and live ads run
// only there; anywhere else (sandbox, localhost, a Vercel preview) they don't.
export const IS_PROD_HOST = /(^|\.)canucklegame\.ca$/.test(host);

// The Firebase-linked "canuckle (web)" GA4 stream every game reports to.
export const GA_ID = 'G-RPLYG6MC2K';

// Canuckle's web app in the shared canuckle-c2157 project. Swap appId for a
// dedicated "arena" web app once one is registered in the Firebase console.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCKMCGkDrYFUIAe67sgg1lw0CbkTH02F9A',
  authDomain: 'canuckle-c2157.firebaseapp.com',
  projectId: 'canuckle-c2157',
  storageBucket: 'canuckle-c2157.appspot.com',
  messagingSenderId: '696912074479',
  appId: '1:696912074479:web:c1a785ef5bcd76c58c6d1a',
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/11.0.2';

// ---- Launch dates -----------------------------------------------------------
//
// Day 1 (puzzle #1) of each game in production. null = live since before the
// arena existed. A game is live, here and in the game itself, from its launch
// date on; each game's adapter numbers its puzzles from the same date, so this
// table is the one place the dates live (admin/js/launch.js repeats it for the
// admin pages).
export const LAUNCH_DATE = {
  canuckle: null,
  plus: null,
  canoku: null,
  duo: '2026-10-28',
  canolitaire: '2026-10-30',
  canagrams: '2026-11-03', // must be a Tuesday (difficulty ladder)
  canoggle: '2026-11-05', // must be a Thursday (difficulty ladder)
  canominoes: '2026-11-09',
};

// ---- Sandbox offset -----------------------------------------------------------
//
// The sandbox runs every launch date [offset] whole weeks earlier than
// production, so the new games have a history to test against. Stored in the
// shared_preferences key the Flutter games read too (flutter.sandboxOffsetWeeks,
// a JSON int), and set by ?sandboxOffsetWeeks=N on any page, or from Settings.
// Production always uses offset 0 and ignores the parameter.

export const OFFSET_PREF = 'sandboxOffsetWeeks';
export const DEFAULT_OFFSET_WEEKS = 4;

/** A whole number of weeks from a stored or typed value, or null if it isn't one. */
export function parseOffsetWeeks(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim();
  // A string pref holding JSON ("\"4\"") or a plain "4".
  if (/^"-?\d+"$/.test(s)) s = s.slice(1, -1);
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

function initialOffsetWeeks() {
  if (!IS_SANDBOX) return 0;
  if (typeof location !== 'undefined') {
    const param = parseOffsetWeeks(new URLSearchParams(location.search).get(OFFSET_PREF));
    if (param != null) {
      try {
        writePref(OFFSET_PREF, param);
      } catch {
        // No storage: the parameter still applies to this page.
      }
      dropOffsetParam();
      return param;
    }
  }
  return parseOffsetWeeks(readPref(OFFSET_PREF)) ?? DEFAULT_OFFSET_WEEKS;
}

/**
 * Takes ?sandboxOffsetWeeks off the address once saved, so a later reload
 * (after changing the offset in Settings) doesn't put the old value back.
 */
function dropOffsetParam() {
  try {
    const url = new URL(location.href);
    url.searchParams.delete(OFFSET_PREF);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // Not in a browser: nothing to tidy.
  }
}

let offsetWeeks = initialOffsetWeeks();

/** The sandbox offset in weeks for this page (always 0 in production). */
export function sandboxOffsetWeeks() {
  return offsetWeeks;
}

/**
 * Saves a new sandbox offset (sandbox only). The page should reload after, so
 * every game is numbered from the new dates; tests use it directly.
 */
export function setSandboxOffsetWeeks(n) {
  if (!IS_SANDBOX || !Number.isInteger(n)) return;
  offsetWeeks = n;
  try {
    writePref(OFFSET_PREF, n);
  } catch {
    // No storage: in effect for this page only.
  }
}

/** The sandbox banner's text for an offset. */
export function offsetBannerText(n) {
  if (n === 0) return 'Sandbox · launch dates matching production';
  const w = Math.abs(n);
  return `Sandbox · launch dates shifted ${w} week${w === 1 ? '' : 's'} ${n > 0 ? 'earlier' : 'later'}`;
}

const isoEd = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return epochDay(y, m, d);
};

/** A game's production launch day (epoch day), or null if always live. */
export function productionLaunchEd(gameId) {
  const iso = LAUNCH_DATE[gameId];
  return iso ? isoEd(iso) : null;
}

/** A game's launch day here: production's, moved [offset] weeks earlier. */
export function launchEd(gameId, offset = offsetWeeks) {
  const ed = productionLaunchEd(gameId);
  return ed == null ? null : ed - 7 * offset;
}

/** Whether a game is live on [todayEd] with the given sandbox offset. */
export function isLiveOn(gameId, todayEd, offset = offsetWeeks) {
  if (!(gameId in LAUNCH_DATE)) return false;
  const ed = launchEd(gameId, offset);
  return ed == null || todayEd >= ed;
}

export function isLive(gameId) {
  return isLiveOn(gameId, todayEpochDay());
}

/** True once every game has launched (the family badges then have fixed targets). */
export function allLaunched(todayEd = todayEpochDay(), offset = offsetWeeks) {
  return Object.keys(LAUNCH_DATE).every((id) => isLiveOn(id, todayEd, offset));
}

export const ARENA_URL = 'https://www.canucklegame.ca/arena/';

export const ARENA_VERSION = '1.0.0';
