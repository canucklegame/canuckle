// Loads every game's progress.
//
// Each adapter's raw Firestore data is cached in localStorage per player, so
// a returning visit paints instantly from the last snapshot and then refreshes
// game by game as the reads land. Derived progress is never cached: deriving
// is cheap and also folds in this browser's in-progress saves, which change
// between visits.

import { createReader } from './firebase.js?v=202610141420';
import { arenaGet, arenaSet } from './local.js?v=202610141420';
import { recentIndices } from './games/common.js?v=202610141420';
import { emptyProgress } from './status.js?v=202610141420';

const CACHE_VERSION = 1;

export function deriveCtx(game, todayEd) {
  return {
    todayEd,
    todayIdx: game.todayIndex(todayEd),
    recent: recentIndices(game, todayEd),
  };
}

function derive(game, raw, todayEd) {
  try {
    return game.derive(raw, deriveCtx(game, todayEd));
  } catch (e) {
    console.warn(`arena: could not read ${game.id} progress`, e);
    return emptyProgress();
  }
}

/**
 * Calls onUpdate(state) with { [gameId]: { progress, status } } once from
 * cache and again as each game's fetch completes. status is one of
 * 'cached', 'ready', 'error' or 'new' (no player id yet).
 */
export async function loadProgress(games, { uid, todayEd, onUpdate, demo = null }) {
  if (demo) {
    const state = {};
    for (const g of games) state[g.id] = { progress: derive(g, demo(g, todayEd), todayEd), status: 'ready' };
    onUpdate({ ...state });
    return state;
  }
  const state = {};
  if (!uid) {
    for (const g of games) state[g.id] = { progress: derive(g, null, todayEd), status: 'new' };
    onUpdate({ ...state });
    return state;
  }

  const cacheKey = `cache.${uid}`;
  const cache = arenaGet(cacheKey, null);
  const cachedRaw = cache && cache.v === CACHE_VERSION ? cache.games || {} : {};
  for (const g of games) {
    state[g.id] = { progress: derive(g, cachedRaw[g.id] ?? null, todayEd), status: 'cached' };
  }
  onUpdate({ ...state });

  const reader = createReader();
  const fresh = { ...cachedRaw };
  await Promise.all(games.map(async (g) => {
    try {
      const raw = await g.fetch({ uid, reader, recent: recentIndices(g, todayEd) });
      fresh[g.id] = raw;
      state[g.id] = { progress: derive(g, raw, todayEd), status: 'ready' };
    } catch (e) {
      console.warn(`arena: could not load ${g.id}`, e);
      state[g.id] = { ...state[g.id], status: 'error' };
    }
    onUpdate({ ...state });
  }));

  arenaSet(cacheKey, { v: CACHE_VERSION, at: Date.now(), games: fresh });
  return state;
}

/**
 * Re-reads the games whose per-puzzle documents are normally fetched only for
 * the recent window, this time from day 1, so badges already earned can be
 * dated from when they really happened. Used once, on a player's first badge
 * sync; not cached. A game that fails to load keeps its windowed progress.
 */
export async function loadFullHistory(games, state, { uid, todayEd }) {
  const reader = createReader();
  const next = { ...state };
  await Promise.all(games.filter((g) => g.windowed).map(async (g) => {
    try {
      const raw = await g.fetch({ uid, reader, recent: recentIndices(g, todayEd), full: true });
      next[g.id] = { ...state[g.id], progress: derive(g, raw, todayEd) };
    } catch (e) {
      console.warn(`arena: could not load ${g.id} history`, e);
    }
  }));
  return next;
}
