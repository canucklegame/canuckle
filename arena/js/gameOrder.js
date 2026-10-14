// The order the Games and Stats tabs list the games in: most played lately
// first, or an order the player arranged themselves in Settings.
//
// The order is settled once per visit (see app.js) rather than on every
// repaint, so rows don't jump around while each game's progress lands.

import { finishOn } from './status.js?v=202610141420';
import { arenaGet, arenaSet } from './local.js?v=202610141420';

export const RECENT_DAYS = 30;
// A weekly puzzle (Canuckle+) counts as this many plays, so a game played
// every week isn't buried under the daily ones.
export const WEEKLY_WEIGHT = 4;

/** Puzzles finished in the last RECENT_DAYS days, today included. */
export function recentPlays(game, p, todayEd) {
  if (!p) return 0;
  let n = 0;
  for (const i of p.doneIdx) {
    const ed = finishOn(game, p, i);
    if (ed != null && ed <= todayEd && ed > todayEd - RECENT_DAYS) n++;
  }
  return n;
}

export function playScore(game, p, todayEd) {
  return recentPlays(game, p, todayEd) * (game.cadence === 'weekly' ? WEEKLY_WEIGHT : 1);
}

/**
 * Most played first. Ties go to the game with more finished all-time, then
 * to the default order, so a new player sees the games as listed.
 */
export function sortByPlay(games, progress, todayEd) {
  const rows = games.map((g, i) => {
    const p = progress[g.id]?.progress;
    return { g, i, score: playScore(g, p, todayEd), total: p ? p.doneIdx.size : 0 };
  });
  rows.sort((a, b) => b.score - a.score || b.total - a.total || a.i - b.i);
  return rows.map((r) => r.g);
}

/**
 * [games] in the order of [ids]. Games the list doesn't name (a game that
 * went live after it was saved) follow in default order; unknown ids are
 * ignored.
 */
export function applyCustomOrder(games, ids) {
  const list = Array.isArray(ids) ? ids : [];
  const named = list.map((id) => games.find((g) => g.id === id)).filter(Boolean);
  const unique = [...new Set(named)];
  return [...unique, ...games.filter((g) => !unique.includes(g))];
}

// ---- Preferences ------------------------------------------------------------

export function sortsByPlay() {
  return arenaGet('sortByPlay', true) !== false;
}

/**
 * Turning the sort off keeps the games where they are now ([currentIds]),
 * so nothing moves until the player arranges them.
 */
export function setSortByPlay(on, currentIds) {
  if (!on) arenaSet('customOrder', currentIds);
  arenaSet('sortByPlay', on);
}

/** An order arranged by hand, which also turns the sort off. */
export function saveCustomOrder(ids) {
  arenaSet('customOrder', ids);
  arenaSet('sortByPlay', false);
}

// ---- The app's order --------------------------------------------------------

/** The order to show before progress has loaded: the one shown last visit. */
export function initialOrder(games) {
  const ids = sortsByPlay() ? arenaGet('lastOrder', []) : arenaGet('customOrder', []);
  return applyCustomOrder(games, ids).map((g) => g.id);
}

/** The order from the progress loaded now, remembered for the next visit. */
export function computeOrder(games, progress, todayEd) {
  if (!sortsByPlay()) return applyCustomOrder(games, arenaGet('customOrder', [])).map((g) => g.id);
  const ids = sortByPlay(games, progress, todayEd).map((g) => g.id);
  arenaSet('lastOrder', ids);
  return ids;
}

export function orderedGames(app) {
  return applyCustomOrder(app.games, app.order);
}
