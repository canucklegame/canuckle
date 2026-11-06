// The order the Games, Stats and Badges tabs list the games in: release order
// (see registry.js), or an order the player arranged themselves in Settings,
// with their favourites first.

import { arenaGet, arenaSet } from './local.js?v=202611060005';
import { favouritesFirst } from './favourites.js?v=202611060005';

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

// 'sortByPlay' is false once the player arranges the games. It used to be a
// "Sort by most played" switch (on by default), so a customOrder saved while
// it was on is stale and ignored.
export function hasCustomOrder() {
  return arenaGet('sortByPlay', true) === false;
}

/** An order arranged by hand. */
export function saveCustomOrder(ids) {
  arenaSet('customOrder', ids);
  arenaSet('sortByPlay', false);
}

/** Back to release order. */
export function resetOrder() {
  arenaSet('customOrder', []);
  arenaSet('sortByPlay', true);
}

// ---- The app's order --------------------------------------------------------

export function computeOrder(games) {
  const ids = hasCustomOrder() ? arenaGet('customOrder', []) : [];
  return applyCustomOrder(games, ids).map((g) => g.id);
}

export function orderedGames(app) {
  return applyCustomOrder(app.games, app.order);
}

/** What every tab lists: favourites first, then the rest, each in their order. */
export function listedGames(app) {
  return favouritesFirst(orderedGames(app), app.favourites);
}
