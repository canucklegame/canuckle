// Which finished challenges' results this browser has shown the player
// (resultsSeen.<player id>): the Challenges tab pops up and counts the ones
// not seen yet, and the games' pre-start cover marks them "new".

import { arenaGet, arenaSet } from '../local.js?v=202611200021';

const key = (uid) => `resultsSeen.${uid}`;

export const seenResults = (uid) => new Set(arenaGet(key(uid), []) || []);

export function markResultsSeen(uid, cids) {
  if (!cids.length) return;
  const seen = seenResults(uid);
  for (const c of cids) seen.add(c);
  try {
    // Only finished challenges in the doc matter; keep the list short.
    arenaSet(key(uid), [...seen].slice(-200));
  } catch {
    // No storage: shown again next time.
  }
}
