// Site-wide constants for the admin page. The Firebase values are the same as
// the arena's (js/config.js at the gamesHub root); the admin ships on its own,
// so they are repeated here rather than imported.

const host = typeof location === 'undefined' ? '' : location.hostname;

export const IS_LOCAL = host === 'localhost' || host === '127.0.0.1';
export const IS_SANDBOX = IS_LOCAL || host.endsWith('github.io');

// ?emulator on localhost points the page at the Firebase emulators
// (firebase/ in gamesHub) instead of the real project.
export const USE_EMULATOR =
  IS_LOCAL && typeof location !== 'undefined' && new URLSearchParams(location.search).has('emulator');

export const SITE_LABEL = USE_EMULATOR ? 'EMULATOR' : IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCKMCGkDrYFUIAe67sgg1lw0CbkTH02F9A',
  authDomain: 'canuckle-c2157.firebaseapp.com',
  projectId: USE_EMULATOR ? 'demo-canuckle' : 'canuckle-c2157',
  storageBucket: 'canuckle-c2157.appspot.com',
  messagingSenderId: '696912074479',
  appId: '1:696912074479:web:c1a785ef5bcd76c58c6d1a',
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/11.0.2';

// Must match isAdmin() in firebase/firestore.rules. The rules are what
// actually protect the data; this only gives other accounts a clear message.
export const ADMIN_EMAILS = ['jrog86@gmail.com', 'rogerscentral@gmail.com'];

// Word lists, same origin on canucklegame.ca and the sandbox. Local dev falls
// back to the sandbox copy (GitHub Pages allows cross-origin reads).
export const WORD_LIST_URLS = {
  five: ['/data/words.json', 'https://jeffrrogers.github.io/data/words.json'],
  plus: ['/data/words_plus.json', 'https://jeffrrogers.github.io/data/words_plus.json'],
};

// Where the Flutter games' daily puzzle files are served, tried in order: this
// site, then the sandbox (for local dev, and for games not yet on production).
export const GAME_SITES = ['/', 'https://jeffrrogers.github.io/'];
