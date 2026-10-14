// Firebase Auth (Google sign-in) and Firestore for the admin page, loaded from
// gstatic like the arena. A named app keeps it apart from anything else on
// the page.

import { FIREBASE_CONFIG, FIREBASE_SDK, USE_EMULATOR } from './config.js?v=202610141429';

let sdkPromise = null;

export function sdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const appMod = await import(`${FIREBASE_SDK}/firebase-app.js`);
      const authMod = await import(`${FIREBASE_SDK}/firebase-auth.js`);
      const fs = await import(`${FIREBASE_SDK}/firebase-firestore.js`);
      const app = appMod.initializeApp(FIREBASE_CONFIG, 'admin');
      const auth = authMod.getAuth(app);
      const db = fs.getFirestore(app);
      if (USE_EMULATOR) {
        authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      }
      return { authMod, auth, fs, db };
    })();
    sdkPromise.catch(() => {
      sdkPromise = null;
    });
  }
  return sdkPromise;
}

/**
 * For firebase/test only: run store.js against an emulator connection made
 * with the npm SDK. [value] is {fs, db, auth: {currentUser: {email}}}.
 */
export function useSdkForTests(value) {
  sdkPromise = Promise.resolve(value);
}

/** Calls [cb] with the signed-in user (or null) now and on every change. */
export async function onUser(cb) {
  const { authMod, auth } = await sdk();
  return authMod.onAuthStateChanged(auth, cb);
}

export async function signIn() {
  const { authMod, auth } = await sdk();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await authMod.signInWithPopup(auth, provider);
}

export async function signOut() {
  const { authMod, auth } = await sdk();
  await authMod.signOut(auth);
}

export async function currentEmail() {
  const { auth } = await sdk();
  return auth.currentUser?.email || '';
}
