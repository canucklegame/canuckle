// Every Firestore read and write the admin page makes. Puzzle changes run in a
// transaction that also writes an adminLog entry with the docs before and
// after, so any edit, swap or import can be restored from the Log tab.

import { sdk, currentEmail } from './firebase.js?v=202610141429';
import { GAMES } from './dates.js?v=202610141429';
import { decodeAnswer } from './codec.js?v=202610141429';
import {
  PLAYER_COLLECTIONS, GAMES_SUBCOLLECTION_PARENTS, MAX_GAMES, queryCutoff, accountVerdict, quickVerdict,
} from './cleanup.js?v=202610141429';
import { pool } from './pool.js?v=202610141429';
import { repairAccount } from './repair.js?v=202610141429';

// ---- Puzzles --------------------------------------------------------------

/** One puzzle doc in the shape the views use. */
export function toPuzzle(gameId, docId, data) {
  const index = typeof data.index === 'number' ? data.index : Number(docId);
  const base = { gameId, docId, index, data, ed: GAMES[gameId].edForIndex(index) };
  if (gameId === 'duo') {
    const puzzles = Array.isArray(data.puzzles) ? data.puzzles.filter((p) => Number.isInteger(p)) : [];
    return { ...base, puzzles, badge: data.badge || null };
  }
  return {
    ...base,
    answer: decodeAnswer(data.answer),
    fact: Array.isArray(data.fact) ? data.fact : [],
    factUrls: Array.isArray(data.factUrls) ? data.factUrls : [],
    hasFactFields: Array.isArray(data.fact) && Array.isArray(data.factUrls),
  };
}

/** Every puzzle of a game, as Map<index, puzzle>. */
export async function loadPuzzles(gameId) {
  const { fs, db } = await sdk();
  const snap = await fs.getDocs(fs.collection(db, GAMES[gameId].collection));
  const out = new Map();
  for (const d of snap.docs) {
    const p = toPuzzle(gameId, d.id, d.data());
    out.set(p.index, p);
  }
  return out;
}

/**
 * Canoku's puzzleCount (the last puzzle players get before it loops), and
 * whether docs <count> and <count + 1> exist, to catch a count that's out of
 * step with the puzzles. Null count when the doc is missing.
 */
export async function loadCanokuCount() {
  const { fs, db } = await sdk();
  const snap = await fs.getDoc(fs.doc(db, 'canokuNewData', 'puzzleCount'));
  const count = snap.exists() && Number.isInteger(snap.data().count) ? snap.data().count : null;
  if (count == null) return { count };
  const [last, next] = await Promise.all([count, count + 1]
    .map((i) => fs.getDoc(fs.doc(db, 'canokuNewData', String(i)))));
  return { count, lastExists: last.exists(), nextExists: next.exists() };
}

// Firestore rejects undefined anywhere in a document.
function clean(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

/**
 * Reads the docs [ids] of [collection] in a transaction, lets [mutate] return
 * the new data for each (null deletes it), writes them and logs the change.
 * @returns the new data by id
 */
export async function writeWithLog(collection, ids, mutate, { action, note = '' }) {
  const { fs, db } = await sdk();
  const email = await currentEmail();
  return fs.runTransaction(db, async (tx) => {
    const refs = ids.map((id) => fs.doc(db, collection, String(id)));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const before = {};
    snaps.forEach((s, i) => {
      before[ids[i]] = s.exists() ? s.data() : null;
    });
    const after = mutate(structuredClone(before));
    refs.forEach((ref, i) => {
      const next = after[ids[i]];
      if (next === undefined) return;
      if (next === null) tx.delete(ref);
      else tx.set(ref, clean(next));
    });
    tx.set(fs.doc(fs.collection(db, 'adminLog')), {
      at: fs.serverTimestamp(),
      email,
      action,
      note,
      collection,
      ids: ids.map(String),
      before: clean(before),
      after: clean(after),
    });
    return after;
  });
}

/** Creates or edits a puzzle. [changes] are merged over what is stored. */
export function savePuzzle(gameId, index, changes, { isNew }) {
  const collection = GAMES[gameId].collection;
  const id = String(index);
  return writeWithLog(collection, [id], (before) => {
    const current = before[id];
    if (isNew && current) throw new Error(`${GAMES[gameId].name} ${GAMES[gameId].label(index)} already exists.`);
    if (!isNew && !current) throw new Error('That puzzle no longer exists.');
    return { [id]: { ...(current || {}), ...changes, index } };
  }, { action: isNew ? 'add' : 'edit' });
}

/** Swaps two puzzles' content (see swap.js) in one transaction. */
export function swapPuzzles(gameId, a, b, payload) {
  const collection = GAMES[gameId].collection;
  const [ia, ib] = [String(a), String(b)];
  return writeWithLog(collection, [ia, ib], (before) => {
    if (!before[ia] || !before[ib]) throw new Error('Both puzzles must exist.');
    const [na, nb] = payload(before[ia], before[ib]);
    return { [ia]: na, [ib]: nb };
  }, { action: 'swap' });
}

/**
 * Writes [before] back for every doc a logged change wrote. Results players
 * posted since (distribution) are kept: they stay on the doc, or for a swap
 * they move back with the word.
 */
export function restoreLogEntry(entry) {
  const ids = entry.ids.filter((id) => entry.after && id in entry.after);
  return writeWithLog(entry.collection, ids, (current) => {
    const out = {};
    for (const id of ids) {
      const was = entry.before?.[id] ?? null;
      if (!was) {
        out[id] = null;
        continue;
      }
      const dist = current[id]?.distribution ?? was.distribution;
      out[id] = dist === undefined ? { ...was } : { ...was, distribution: dist };
    }
    if (entry.action === 'swap' && ids.length === 2) {
      const [a, b] = ids;
      if (out[a] && out[b]) {
        const da = current[a]?.distribution;
        const db = current[b]?.distribution;
        if (db === undefined) delete out[a].distribution; else out[a].distribution = db;
        if (da === undefined) delete out[b].distribution; else out[b].distribution = da;
      }
    }
    return out;
  }, { action: 'restore', note: entry.id });
}

/** Adds Duo days that don't exist yet. [docs] is {id: data}. */
export async function importDuo(docs, onProgress) {
  const ids = Object.keys(docs);
  const collection = GAMES.duo.collection;
  let done = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    await writeWithLog(collection, chunk, (before) => {
      const out = {};
      for (const id of chunk) if (!before[id]) out[id] = docs[id];
      return out;
    }, { action: 'import' });
    done += chunk.length;
    onProgress?.(done, ids.length);
  }
}

// ---- Game versions ----------------------------------------------------------

/** {doc: version string, or null when the doc or its field is missing}. */
export async function loadGameVersions(docs) {
  const { fs, db } = await sdk();
  const out = {};
  await Promise.all(docs.map(async (id) => {
    const s = await fs.getDoc(fs.doc(db, 'gameVersions', id));
    const v = s.exists() ? s.data().version : null;
    out[id] = typeof v === 'string' && v ? v : null;
  }));
  return out;
}

/**
 * Sets gameVersions/<doc>.version for every change ({doc, from, to}) in one
 * logged transaction, so they all land together and Restore undoes them all.
 * Fails without writing if any doc no longer holds [from] (someone else
 * changed it since the page read it). Other fields on a doc are kept.
 */
export function publishGameVersions(changes) {
  const ids = changes.map((c) => c.doc);
  return writeWithLog('gameVersions', ids, (before) => {
    const out = {};
    for (const c of changes) {
      const now = typeof before[c.doc]?.version === 'string' && before[c.doc].version ? before[c.doc].version : null;
      if (now !== c.from) throw new Error(`gameVersions/${c.doc} changed to ${now ?? '(none)'} since this page read it. Reload and check again.`);
      out[c.doc] = { ...(before[c.doc] || {}), version: c.to };
    }
    return out;
  }, { action: 'versions', note: changes.map((c) => `${c.doc} ${c.from ?? '(none)'} → ${c.to}`).join(', ') });
}

// ---- Log ------------------------------------------------------------------

export async function loadLog(max = 50) {
  const { fs, db } = await sdk();
  const q = fs.query(fs.collection(db, 'adminLog'), fs.orderBy('at', 'desc'), fs.limit(max));
  const snap = await fs.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- Cleanup --------------------------------------------------------------

/** The server's clock, from the Date header of this page, in ms (or null). */
export async function serverNow() {
  try {
    const res = await fetch(`${location.pathname}?clock=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
    const ms = Date.parse(res.headers.get('date') || '');
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/**
 * Pages through newUserData docs with at most 10 Canuckle games that haven't
 * been updated for at least 10 days. Needs the (gamesCount, lastUpdated)
 * index in firebase/firestore.indexes.json.
 */
export async function scanStale(nowMs, onPage, shouldStop) {
  const { fs, db } = await sdk();
  const base = [
    fs.collection(db, 'newUserData'),
    fs.where('gamesCount', '<=', MAX_GAMES),
    fs.where('lastUpdated', '<', queryCutoff(nowMs)),
    fs.orderBy('gamesCount'),
    fs.orderBy('lastUpdated'),
    fs.limit(500),
  ];
  let last = null;
  for (;;) {
    if (shouldStop?.()) return;
    const q = last ? fs.query(...base, fs.startAfter(last)) : fs.query(...base);
    const snap = await fs.getDocs(q);
    if (snap.empty) return;
    await onPage(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) return;
  }
}

/**
 * The whole dry run: pages through the query, settles most accounts from
 * newUserData alone, and reads the other five docs plus the games
 * subcollections for the rest. onPage(verdicts, candidates, scanned) is
 * called after each page. Candidates carry the lastUpdated the delete must
 * still find, and every doc the scan read for them (the backup file).
 */
export async function findStaleAccounts(nowMs, { onPage, shouldStop } = {}) {
  const all = { verdicts: [], candidates: [], scanned: 0 };
  await scanStale(nowMs, async (page) => {
    const rows = page.map((d) => ({ id: d.id, user: d.data, v: quickVerdict(d.data, nowMs) }));
    await pool(rows.filter((r) => r.v.reason === 'check other games'), 8, async (r) => {
      const [docs, subGames] = await Promise.all([readAccount(r.id), hasSubcollectionGames(r.id)]);
      r.v = accountVerdict(docs, nowMs, subGames);
      r.user = docs.newUserData || r.user;
      r.docs = docs;
    });
    const verdicts = rows.map((r) => r.v);
    const candidates = rows.filter((r) => r.v.eligible)
      .map((r) => ({ id: r.id, total: r.v.total, idleDays: r.v.idleDays, lastUpdated: r.user.lastUpdated, docs: r.docs }));
    all.verdicts.push(...verdicts);
    all.candidates.push(...candidates);
    all.scanned += page.length;
    onPage?.(verdicts, candidates, page.length);
  }, shouldStop);
  return all;
}

/** Whether any of the ID's `games` subcollections has a doc. */
export async function hasSubcollectionGames(id) {
  const { fs, db } = await sdk();
  const found = await Promise.all(GAMES_SUBCOLLECTION_PARENTS.map(async (coll) => {
    const q = fs.query(fs.collection(db, coll, id, 'games'), fs.limit(1));
    return !(await fs.getDocs(q)).empty;
  }));
  return found.some(Boolean);
}

/** Every player doc for [id], keyed by collection (null when missing). */
export async function readAccount(id) {
  const { fs, db } = await sdk();
  const out = {};
  await Promise.all(PLAYER_COLLECTIONS.map(async (coll) => {
    const s = await fs.getDoc(fs.doc(db, coll, id));
    out[coll] = s.exists() ? s.data() : null;
  }));
  return out;
}

/**
 * Deletes the accounts the scan picked, as they were when it read them: each
 * one's docs (scan candidates carry them in `docs`) are deleted without being
 * read again, so a player who came back after the scan is deleted too. The
 * backup file holds every doc deleted here.
 *
 * Packed into batched writes of at most DELETE_BATCH_WRITES (Firestore
 * allows 500 per batch; one is the log entry), [parallel] batches at a time.
 * onBatch({deleted}) after each; shouldStop() is checked before each batch.
 */
export const DELETE_BATCH_WRITES = 499;

export function planDeleteBatches(accounts) {
  const batches = [];
  let current = { ids: [], refs: [] };
  for (const a of accounts) {
    const colls = PLAYER_COLLECTIONS.filter((c) => a.docs?.[c]);
    if (!colls.length) continue;
    if (current.refs.length + colls.length > DELETE_BATCH_WRITES) {
      batches.push(current);
      current = { ids: [], refs: [] };
    }
    current.ids.push(a.id);
    for (const c of colls) current.refs.push([c, a.id]);
  }
  if (current.ids.length) batches.push(current);
  return batches;
}

export async function deleteAllAccounts(accounts, { parallel = 4, onBatch, shouldStop } = {}) {
  const { fs, db } = await sdk();
  const email = await currentEmail();
  const deleted = [];
  await pool(planDeleteBatches(accounts), parallel, async (b) => {
    if (shouldStop?.()) return;
    const batch = fs.writeBatch(db);
    for (const [coll, id] of b.refs) batch.delete(fs.doc(db, coll, id));
    batch.set(fs.doc(fs.collection(db, 'adminLog')), {
      at: fs.serverTimestamp(),
      email,
      action: 'cleanup',
      note: `${b.ids.length} accounts deleted (${b.refs.length} docs)`,
      collection: 'newUserData',
      ids: b.ids,
      before: null,
      after: null,
    });
    await batch.commit();
    deleted.push(...b.ids);
    onBatch?.({ deleted: b.ids });
  });
  return { deleted };
}

// ---- Repair: accounts Canuckle can't save ------------------------------------

/**
 * Pages through every newUserData doc (or only those last updated before
 * [beforeMs]), 300 at a time. A full read of the collection: one read per
 * account.
 */
export async function scanAccounts({ beforeMs = null, onPage, shouldStop } = {}) {
  const { fs, db } = await sdk();
  const coll = fs.collection(db, 'newUserData');
  const base = beforeMs
    ? [coll, fs.where('lastUpdated', '<', beforeMs), fs.orderBy('lastUpdated'), fs.limit(300)]
    : [coll, fs.orderBy(fs.documentId()), fs.limit(300)];
  let last = null;
  for (;;) {
    if (shouldStop?.()) return;
    const q = last ? fs.query(...base, fs.startAfter(last)) : fs.query(...base);
    const snap = await fs.getDocs(q);
    if (snap.empty) return;
    await onPage(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 300) return;
  }
}

/**
 * Removes what Canuckle would strip (repair.js) from one account, re-read in
 * the transaction so a save that landed since the scan is never lost. Logs
 * the removed entries (not the whole doc, which can be large).
 * @returns {{repaired: boolean, removed: object|null}}
 */
export async function repairOneAccount(id) {
  const { fs, db } = await sdk();
  const email = await currentEmail();
  return fs.runTransaction(db, async (tx) => {
    const ref = fs.doc(db, 'newUserData', id);
    const snap = await tx.get(ref);
    if (!snap.exists()) return { repaired: false, removed: null };
    const { doc, removed } = repairAccount(snap.data());
    const count = removed.games.length + removed.plusGames.length + removed.duoGames.length;
    if (!count) return { repaired: false, removed: null };
    tx.set(ref, doc);
    tx.set(fs.doc(fs.collection(db, 'adminLog')), {
      at: fs.serverTimestamp(),
      email,
      action: 'repair',
      note: `Removed ${removed.games.length} blank Canuckle, ${removed.plusGames.length} blank Canuckle+ and ${removed.duoGames.length} unreadable Duo games`,
      collection: 'newUserData',
      ids: [id],
      removed,
      before: null,
      after: null,
    });
    return { repaired: true, removed };
  });
}
