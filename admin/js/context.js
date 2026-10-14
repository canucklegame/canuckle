// The loaded data the views share, and lookups derived from it.

import { loadPuzzles } from './store.js?v=202610141429';
import { storedUpperCase } from './codec.js?v=202610141429';
import { GAMES, isAvailable } from './dates.js?v=202610141429';
import { WORD_LIST_URLS } from './config.js?v=202610141429';

export const ctx = {
  puzzles: { canuckle: new Map(), plus: new Map(), duo: new Map() },
  words: { five: null, plus: null },
  upper: { canuckle: false, plus: false },
  loaded: false,
};

export async function loadGame(gameId) {
  const map = await loadPuzzles(gameId);
  ctx.puzzles[gameId] = map;
  if (gameId !== 'duo') {
    ctx.upper[gameId] = storedUpperCase([...map.values()].map((p) => p.data.answer));
  }
}

export async function loadAll() {
  await Promise.all(['canuckle', 'plus', 'duo'].map(loadGame));
  ctx.loaded = true;
}

async function fetchWords(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const list = await res.json();
      if (Array.isArray(list)) return new Set(list.map((w) => String(w).toLowerCase()));
    } catch {
      // try the next copy
    }
  }
  return null;
}

/** Loads the word lists; validation skips the word-list check without them. */
export async function loadWords() {
  const [five, plus] = await Promise.all([fetchWords(WORD_LIST_URLS.five), fetchWords(WORD_LIST_URLS.plus)]);
  ctx.words = { five, plus };
}

export function wordsFor(gameId) {
  return gameId === 'plus' ? ctx.words.plus : ctx.words.five;
}

/** Map<ANSWER, index[]> for one game. */
export function answerUses(gameId) {
  const out = new Map();
  for (const p of ctx.puzzles[gameId].values()) {
    if (!p.answer) continue;
    if (!out.has(p.answer)) out.set(p.answer, []);
    out.get(p.answer).push(p.index);
  }
  for (const list of out.values()) list.sort((a, b) => a - b);
  return out;
}

/** Map<canuckleIndex, duoIndex[]>. */
export function duoUses() {
  const out = new Map();
  for (const d of ctx.puzzles.duo.values()) {
    for (const i of d.puzzles) {
      if (!out.has(i)) out.set(i, []);
      out.get(i).push(d.index);
    }
  }
  return out;
}

export function maxIndex(gameId) {
  let max = null;
  for (const i of ctx.puzzles[gameId].keys()) if (max == null || i > max) max = i;
  return max;
}

/**
 * Why changing these puzzles may reach players: each one that is available,
 * and (for Canuckle) each available Duo day built on it.
 */
export function availabilityMessages(gameId, indexes) {
  const g = GAMES[gameId];
  const out = [];
  for (const i of indexes) {
    if (isAvailable(gameId, i)) out.push(`${g.name} ${g.label(i)} is available now.`);
  }
  if (gameId === 'canuckle') {
    const uses = duoUses();
    for (const i of indexes) {
      for (const d of uses.get(i) || []) {
        if (isAvailable('duo', d)) out.push(`Canuckle #${i} is one of the words in Duo ${GAMES.duo.label(d)}, which is available now.`);
      }
    }
  }
  return out;
}
