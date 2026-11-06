// The games a player starred as their favourites on the Games tab. Saved in
// this browser only, like the game order; the games' "Next up" reads the same
// key to suggest favourites first.

import { arenaGet, arenaSet } from './local.js?v=202611060005';

const KEY = 'favourites';

/** Favourite game ids, in the order they were added. */
export function readFavourites() {
  const v = arenaGet(KEY, []);
  return Array.isArray(v) ? [...new Set(v.filter((id) => typeof id === 'string' && id))] : [];
}

/** Adds [id] to the favourites, or takes it off. Returns the new list. */
export function setFavourite(id, on) {
  const now = readFavourites();
  if (on === now.includes(id)) return now;
  const ids = on ? [...now, id] : now.filter((x) => x !== id);
  arenaSet(KEY, ids);
  return ids;
}

/**
 * [games] with the favourites first, each group keeping the order it was
 * given in (the player's own order, if they set one): favourite beats order.
 */
export function favouritesFirst(games, favIds) {
  const favs = new Set(Array.isArray(favIds) ? favIds : []);
  return [...games.filter((g) => favs.has(g.id)), ...games.filter((g) => !favs.has(g.id))];
}
