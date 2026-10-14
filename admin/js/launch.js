// Launch dates (puzzle #1) of the games that number their puzzles from a
// launch day, and the sandbox offset that moves them.
//
// The same table and rule as the arena's js/config.js (LAUNCH_DATE,
// launchEd); the admin ships on its own, so they are repeated here. Keep the
// two in step.
//
// Unlike the games and the arena, the admin does NOT follow the shared
// sandbox offset (flutter.sandboxOffsetWeeks): it edits the one production
// Firestore project, so runway, "days left" and Duo's spoiler/recent-gap
// checks must use the real launch dates. On the sandbox (and localhost) an
// explicit ?sandboxOffsetWeeks=N on the admin URL previews shifted dates for
// that page load only; it is never read from or saved to localStorage.

import { IS_SANDBOX } from './config.js?v=202610141429';

export const LAUNCH_DATE = {
  duo: [2026, 11, 4],
  canolitaire: [2026, 11, 6],
  canagrams: [2026, 11, 10], // a Tuesday: rungOf() relies on it
  canoggle: [2026, 11, 12], // a Thursday
  canominoes: [2026, 11, 16],
};


/** A whole number of weeks from a stored or typed value, or null if it isn't one. */
export function parseOffsetWeeks(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim();
  if (/^"-?\d+"$/.test(s)) s = s.slice(1, -1);
  return /^-?\d+$/.test(s) ? Number(s) : null;
}

function initialOffsetWeeks() {
  if (!IS_SANDBOX) return 0;
  try {
    return parseOffsetWeeks(new URLSearchParams(location.search).get('sandboxOffsetWeeks')) ?? 0;
  } catch {
    return 0;
  }
}

/** Weeks this page previews launch dates earlier; 0 unless the admin URL asks. */
export const OFFSET_WEEKS = initialOffsetWeeks();

// dates.js imports this file, so the epoch day is worked out here, not imported.
/** A game's launch day (epoch day) on this site. */
export function launchEd(gameId, offset = OFFSET_WEEKS) {
  const [y, m, d] = LAUNCH_DATE[gameId];
  return Math.round(Date.UTC(y, m - 1, d) / 86400000) - 7 * offset;
}
