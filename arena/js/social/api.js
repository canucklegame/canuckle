// Friends and challenges: talking to the server, and the player's social doc.
//
// Only loaded while featureOn('challenges') (see app.js), so production
// downloads none of this until the feature is switched on.
//
// The server is the `arena` Cloud Function (firebase/functions). Every call
// sends {op, pid, ...}; the private player ID never leaves this browser any
// other way. social/{pid} is this player's own view (gamer ID, friends,
// requests, challenges, records), which only the server writes.

import { callArenaFunction, getDocData, setMerge, SERVER_TIME } from '../firebase.js?v=202611200021';
import { playerId, writePref, arenaGet, arenaSet } from '../local.js?v=202611200021';

/** A refusal from the server, with its reason word (see REASON_TEXT). */
export class SocialError extends Error {
  constructor(reason, message) {
    super(message || reason);
    this.reason = reason;
  }
}

/** What to tell the player for each reason the server gives. */
export const REASON_TEXT = {
  'not-available': 'Challenges aren’t open yet.',
  'age-check': 'Set up challenges first.',
  'no-gamer-id': 'Pick a gamer ID first.',
  'unknown-player': 'Play any game first, then come back to set up challenges.',
  'bad-year': 'Pick the year you were born.',
  invalid: 'Use 3–16 letters, numbers or underscores, with at least one letter.',
  reserved: 'That gamer ID is reserved. Try another.',
  'not-allowed': 'That gamer ID isn’t allowed. Try another.',
  // Also a name that only looks like one taken (MapIeMom for MapleMom).
  taken: 'That gamer ID, or one that looks just like it, is taken. Try another.',
  'rename-too-soon': 'You can change your gamer ID once every 30 days.',
  'no-player': 'No player has that gamer ID.',
  self: 'That’s your own gamer ID.',
  'you-blocked': 'You’ve blocked that player. Unblock them first.',
  'bad-link': 'That invite link doesn’t work any more. Ask for a new one.',
  'link-expired': 'That invite link has expired. Ask for a new one.',
  'too-many-friends': 'You’ve reached the most friends you can have.',
  'their-friends-full': 'That player has reached the most friends they can have.',
  'too-many-requests': 'You have too many friend requests waiting. Cancel some first.',
  'no-request': 'That request is gone.',
  'slow-down': 'That’s a lot at once. Try again in a few minutes.',
  network: 'Couldn’t reach the server. Check your connection and try again.',
};

export const reasonText = (reason) => REASON_TEXT[reason] || 'Something went wrong. Try again.';

/**
 * Calls server op [op] for this player. Resolves with the result; rejects
 * with a SocialError.
 */
export async function call(op, data = {}) {
  const pid = playerId();
  if (!pid) throw new SocialError('unknown-player');
  try {
    return await callArenaFunction({ ...data, op, pid });
  } catch (e) {
    const reason = e?.details?.reason
      || (String(e?.code || '').includes('unavailable') || String(e?.code || '').includes('internal') ? 'network' : null)
      || (e instanceof TypeError || /network|fetch|timed? ?out/i.test(String(e?.message)) ? 'network' : 'error');
    throw new SocialError(reason, e?.message);
  }
}

// ---- The social doc -------------------------------------------------------------

const cacheKey = (pid) => `social.${pid}`;
// Set once this browser has started setting up challenges, so the Arena only
// reads social/{pid} for players who use the feature.
const SET_UP_KEY = 'socialSetUp';

export const hasStartedSocial = () => arenaGet(SET_UP_KEY, false) === true;

/** The last social doc read on this browser for [pid], or null. */
export function cachedSocial(pid = playerId()) {
  return pid ? arenaGet(cacheKey(pid), null) : null;
}

/**
 * Reads social/{pid} fresh (one read), caches it, and returns it (null when
 * there is none yet).
 */
export async function loadSocial(pid = playerId()) {
  if (!pid) return null;
  const doc = await getDocData(['social', pid]);
  cacheSocial(pid, doc);
  return doc;
}

/**
 * On a game's page: the social doc from the server (the `mySocial` op)
 * rather than a Firestore read, which there would load a second Firestore
 * SDK alongside the game's own (and failed to, on Canagrams). Cached like
 * loadSocial().
 */
export async function loadSocialViaServer(pid = playerId()) {
  if (!pid) return null;
  const { social } = await call('mySocial', {});
  cacheSocial(pid, social ?? null);
  return social ?? null;
}

function cacheSocial(pid, doc) {
  try {
    arenaSet(cacheKey(pid), doc);
    arenaSet(`socialAt.${pid}`, Date.now());
    if (doc) arenaSet(SET_UP_KEY, true);
    // The games read this to decide whether to show the challenge cover,
    // without a Firestore read of their own.
    arenaSet('hasGamerId', !!doc?.gamerId);
  } catch {
    // No storage: just this page then.
  }
}

export function markStartedSocial() {
  try {
    arenaSet(SET_UP_KEY, true);
  } catch {
    // No storage: the doc is read when the tab is opened instead.
  }
}

// ---- Player IDs ------------------------------------------------------------------

// Same shape as the games make (randomAlphaNumeric(8).toUpperCase()).
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** A new player ID, as the games make them. */
export function newPlayerId(random = Math.random) {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  return id;
}

/**
 * This browser's player ID. Someone who has never played anything (opening a
 * friend's invite link, say) gets one, saved where every game will find it,
 * with an arenaUserData doc so the server knows it's a real player.
 */
export async function ensurePlayerId() {
  const existing = playerId();
  if (existing) return existing;
  const id = newPlayerId();
  writePref('FirestoreUsername', id);
  await setMerge(['arenaUserData', id], { createdAt: SERVER_TIME, updatedAt: SERVER_TIME });
  return id;
}

// ---- What needs attention ---------------------------------------------------------

/** How many things wait on the player: friend requests and challenge invites. */
export function waitingCount(social) {
  if (!social) return 0;
  const requests = Object.keys(social.requestsIn ?? {}).length;
  const invites = Object.values(social.challenges ?? {})
    .filter((c) => c.status === 'open' && c.me === 'invited').length;
  return requests + invites;
}
