// Firestore access, loaded lazily so the page paints before the SDK arrives.

import { FIREBASE_CONFIG, FIREBASE_SDK } from './config.js?v=202611200021';

const TIMEOUT_MS = 10000;

let sdkPromise = null;
let appPromise = null;

/** The Arena's Firebase app alone, without Firestore (server calls need no more). */
function firebaseApp() {
  if (!appPromise) {
    appPromise = import(`${FIREBASE_SDK}/firebase-app.js`).then((app) => {
      const existing = app.getApps().find((a) => a.name === 'arena');
      return existing ?? app.initializeApp(FIREBASE_CONFIG, 'arena');
    });
    appPromise.catch(() => {
      appPromise = null;
    });
  }
  return appPromise;
}

function sdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const instance = await firebaseApp();
      const fs = await import(`${FIREBASE_SDK}/firebase-firestore.js`);
      return { fs, db: fs.getFirestore(instance), instance };
    })();
    // A failed load (offline, blocked CDN) should be retryable on next call.
    sdkPromise.catch(() => {
      sdkPromise = null;
    });
  }
  return sdkPromise;
}

// The Cloud Functions behind friends and challenges run in Montreal, next to
// Firestore (firebase/functions/src/index.js).
const FUNCTIONS_REGION = 'northamerica-northeast1';
let arenaCallable = null;

/**
 * Calls the `arena` Cloud Function with [data] and returns its result. Loads
 * the Functions SDK on first use only, so pages that never call it never
 * download it. Throws the SDK's FirebaseError (code 'functions/...',
 * details.reason) on a refusal.
 */
export async function callArenaFunction(data) {
  if (!arenaCallable) {
    // The app alone: a game's page calling the server never loads Firestore.
    const instance = await firebaseApp();
    const fn = await import(`${FIREBASE_SDK}/firebase-functions.js`);
    arenaCallable = fn.httpsCallable(fn.getFunctions(instance, FUNCTIONS_REGION), 'arena', { timeout: 20000 });
  }
  const res = await arenaCallable(data);
  return res.data;
}

function withTimeout(promise, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timed out: ${what}`)), TIMEOUT_MS)),
  ]);
}

/** One document's data, or null when it does not exist. */
export async function getDocData(path) {
  const { fs, db } = await sdk();
  const snap = await withTimeout(fs.getDoc(fs.doc(db, ...path)), path.join('/'));
  return snap.exists() ? snap.data() : null;
}

/** Every document in a collection, as [{id, data}]. */
export async function listDocs(path) {
  const { fs, db } = await sdk();
  const snap = await withTimeout(fs.getDocs(fs.collection(db, ...path)), path.join('/'));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

/** Documents in a collection whose numeric [field] is >= [min]. */
export async function queryAtLeast(path, field, min) {
  const { fs, db } = await sdk();
  const q = fs.query(fs.collection(db, ...path), fs.where(field, '>=', min));
  const snap = await withTimeout(fs.getDocs(q), path.join('/'));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

/** Merges [data] into a document. A value of SERVER_TIME becomes the server timestamp. */
export async function setMerge(path, data) {
  const { fs, db } = await sdk();
  const resolved = resolveServerTime(data, fs.serverTimestamp);
  await withTimeout(fs.setDoc(fs.doc(db, ...path), resolved, { merge: true }), path.join('/'));
}

export const SERVER_TIME = Symbol('serverTime');

function resolveServerTime(value, serverTimestamp) {
  if (value === SERVER_TIME) return serverTimestamp();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveServerTime(v, serverTimestamp);
    return out;
  }
  return value;
}

/** Firestore Timestamp (or millis) to millis. */
export function toMillis(t) {
  if (t == null) return null;
  if (typeof t === 'number') return t;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return null;
}

/**
 * A per-load reader that shares one fetch per document path, so two adapters
 * reading the same document (Canuckle and Canuckle+) cost one read.
 */
export function createReader() {
  const docs = new Map();
  return {
    getDoc(path) {
      const key = path.join('/');
      if (!docs.has(key)) docs.set(key, getDocData(path));
      return docs.get(key);
    },
    listDocs,
    queryAtLeast,
  };
}
