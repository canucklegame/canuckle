// Switching this browser to another player's User ID.
//
// Changing the shared FirestoreUsername alone is NOT safe. Each game keeps
// this device's stats and unsent results in its own prefs, and on the next
// load several of them would push those into the new account:
//
//   Canuckle     replays pendingGameJson into the new id's document.
//   Canolitaire  replays solPendingUpload, then merges this device's stats
//                with the server's -- and its running screen keeps the
//                pre-merge numbers in memory and writes them over the server
//                on the first move. Clearing is not enough: the new account's
//                stats must be SEEDED so memory and server agree.
//   Canominoes,  replay their pending result and union this device's stats
//   Canoggle     into the new account's.
//   Canoku       copies this device's streak into a new account's document.
//
// So the switch seeds or clears every game's local state first and sets the
// id LAST: a switch that stops halfway leaves the old id in place.
//
// planIdSwitch is pure (data in, operations out) so the order and the encoding
// are unit-tested; applyIdSwitch performs the operations.

import { writePref, removePref } from './local.js?v=202610131208';

/** Collections read for the new id, by game. */
export const ID_DOCS = {
  canuckle: 'newUserData',
  canoku: 'canokuUserData',
  canolitaire: 'solitaireUserData',
  canominoes: 'dominoUserData',
  canoggle: 'chainUserData',
  canagrams: 'anagramUserData',
};

/** What an id must look like before it is used in a document path. */
export function isValidUserId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const s = (v) => (typeof v === 'string' ? v : '');

/**
 * The prefs operations that switch this browser from [oldId] to [newId].
 *
 * docs: { canuckle, canoku, canolitaire, canominoes, canoggle }, each the new
 * id's document data or null when it has none. keys: the pref keys stored now
 * (to clear per-puzzle saves by prefix). oldIds: flutter.oldFirestoreUsernames.
 *
 * Returns [{op: 'set'|'remove', key, value?}] in the order to apply them.
 */
export function planIdSwitch({ oldId, newId, docs, keys = [], oldIds = [] }) {
  const ops = [];
  const set = (key, value) => ops.push({ op: 'set', key, value });
  const remove = (key) => ops.push({ op: 'remove', key });
  const removePrefixed = (prefix) => {
    for (const k of keys) if (k.startsWith(prefix)) remove(k);
  };

  // Canuckle: its games live on the server; locally it keeps counts and stats
  // strings, which it would upload. Seed them as its own sync does.
  remove('pendingGameJson');
  remove('pendingDuoGameJson');
  remove('duoArchiveIndex');
  const cu = docs.canuckle;
  if (cu) {
    set('gamesCount', n(cu.gamesCount));
    set('hardModeStats', s(cu.hardModeStats));
    set('normalStats', s(cu.normalStats));
    set('plusStats', s(cu.plusStats));
    set('duoStats', s(cu.duoStats));
    set('archiveGame', s(cu.archiveGame));
  } else {
    for (const k of ['gamesCount', 'hardModeStats', 'normalStats', 'plusStats', 'duoStats', 'archiveGame']) remove(k);
  }

  // Canoku: everything else is on the server; only the streak is local.
  const ck = docs.canoku;
  if (ck) {
    set('canokuStreak', n(ck.streak));
    set('canokuMaxStreak', n(ck.maxStreak));
  } else {
    remove('canokuStreak');
    remove('canokuMaxStreak');
  }

  // Canolitaire: seeded, not cleared -- see the note at the top.
  const so = docs.canolitaire;
  if (so) {
    set('solStatsDraw1', JSON.stringify(so.d1 && typeof so.d1 === 'object' ? so.d1 : {}));
    set('solStatsDraw3', JSON.stringify(so.d3 && typeof so.d3 === 'object' ? so.d3 : {}));
    set('solStreak', n(so.st));
    set('solMaxStreak', n(so.ms));
    set('solLastDailyIndex', n(so.ld));
    set('solCompletedDailies', (Array.isArray(so.cd) ? so.cd : []).filter(Number.isInteger).map(String));
  } else {
    for (const k of ['solStatsDraw1', 'solStatsDraw3', 'solStreak', 'solMaxStreak', 'solLastDailyIndex', 'solCompletedDailies']) remove(k);
  }
  remove('solPendingUpload');
  remove('solCountedGames');
  remove('solFreeGame');
  removePrefixed('solDailyGame_');

  // Canominoes, Canoggle and Canagrams merge local stats into the server's, so an empty
  // local copy simply takes the new account's.
  remove('domStats');
  remove('domPendingUpload');
  remove('domPlayedGames');
  removePrefixed('domGame_');
  remove('chnStats');
  remove('chnPendingUpload');
  remove('chnPlayedGames');
  removePrefixed('chnGame_');
  remove('cgmStats');
  remove('cgmPendingUpload');
  remove('cgmPlayedGames');
  remove('cgmProgressUploaded');
  removePrefixed('cgmGame_');
  // Canoku's unfinished boards belong to the old account
  removePrefixed('canokuGame_');
  // The old account's recent solves, or they would show as this one's.
  remove('canokuLastSolves');

  // Keep the old id on record, as the feedback email reports them.
  if (oldId && oldId !== newId && !oldIds.includes(oldId)) {
    set('oldFirestoreUsernames', [...oldIds, oldId]);
  }

  set('FirestoreUsername', newId);
  return ops;
}

/** Applies [ops] in order. Throws if storage refuses a write. */
export function applyIdSwitch(ops) {
  for (const o of ops) {
    if (o.op === 'set') writePref(o.key, o.value);
    else removePref(o.key);
  }
}
