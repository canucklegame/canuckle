// Canuckle Admin: sign-in gate, header and tabs.

import { h, clear, toast } from './ui.js?v=202610141429';
import { ADMIN_EMAILS, SITE_LABEL, IS_SANDBOX } from './config.js?v=202610141429';
import { OFFSET_WEEKS } from './launch.js?v=202610141429';
import { onUser, signIn, signOut } from './firebase.js?v=202610141429';
import { ctx, loadAll, loadWords } from './context.js?v=202610141429';
import { renderPuzzles } from './views/puzzles.js?v=202610141429';
import { renderDuo } from './views/duo.js?v=202610141429';
import { renderRunway } from './views/runway.js?v=202610141429';
import { renderCleanup } from './views/cleanup.js?v=202610141429';
import { renderLog } from './views/log.js?v=202610141429';
import { renderRepair } from './views/repair.js?v=202610141429';
import { renderCanagrams } from './views/canagrams.js?v=202610141429';
import { renderVersions } from './views/versions.js?v=202610141429';

const TABS = [
  ['canuckle', 'Canuckle'],
  ['plus', 'Canuckle+'],
  ['duo', 'Duo'],
  ['canagrams', 'Canagrams'],
  ['runway', 'Days left'],
  ['cleanup', 'Cleanup'],
  ['repair', 'Repair'],
  ['versions', 'Versions'],
  ['log', 'Log'],
];

const app = document.getElementById('app');
let user = null;

function tab() {
  const t = location.hash.slice(1);
  return TABS.some(([id]) => id === t) ? t : 'canuckle';
}

// ---- Theme (per-viewer convenience only) -------------------------------------

function storedTheme() {
  try {
    return localStorage.getItem('admin.theme');
  } catch {
    return null;
  }
}

function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark'
    || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem('admin.theme', next);
  } catch {
    // fine without it
  }
}

applyTheme(storedTheme());

// ---- Rendering ----------------------------------------------------------------

function header() {
  return h('header', { class: 'top' },
    h('div', { class: 'brand' },
      h('img', { src: 'images/canuckle.svg', alt: '', width: 28, height: 28 }),
      h('span', {}, 'Canuckle Admin'),
      h('span', {
        class: `env env-${SITE_LABEL.toLowerCase()}`,
        title: IS_SANDBOX ? "New games' launch dates, moved by flutter.sandboxOffsetWeeks (?sandboxOffsetWeeks=N)" : null,
      }, OFFSET_WEEKS ? `${SITE_LABEL} · preview dates ${OFFSET_WEEKS < 0 ? '+' + -OFFSET_WEEKS : '−' + OFFSET_WEEKS} wk` : SITE_LABEL)),
    h('span', { class: 'spacer' }),
    h('button', { class: 'icon-btn', title: 'Light / dark', 'aria-label': 'Toggle light or dark', onclick: toggleTheme }, '◐'),
    user ? h('span', { class: 'who' }, user.email) : null,
    user ? h('button', { class: 'btn small', onclick: () => signOut() }, 'Sign out') : null);
}

function signInScreen(message) {
  clear(app, header(), h('main', { class: 'center' },
    h('div', { class: 'card narrow' },
      h('h2', {}, 'Sign in'),
      h('p', {}, 'Use the admin Google account. Other accounts can\'t read or change anything here.'),
      message ? h('p', { class: 'err' }, message) : null,
      h('button', {
        class: 'btn primary',
        onclick: async () => {
          try {
            await signIn();
          } catch (e) {
            if (e.code !== 'auth/popup-closed-by-user') toast(`Sign-in failed: ${e.message}`, { error: true });
          }
        },
      }, 'Sign in with Google'))));
}

const main = h('main', { id: 'main' });
const nav = h('nav', { class: 'tabs' });

function paintNav() {
  const current = tab();
  clear(nav, TABS.map(([id, label]) => h('a', { href: `#${id}`, class: id === current ? 'on' : '' }, label)));
}

function rerender() {
  paintNav();
  const t = tab();
  if (t === 'canuckle' || t === 'plus') renderPuzzles(main, t, rerender);
  else if (t === 'duo') renderDuo(main, rerender);
  else if (t === 'canagrams') renderCanagrams(main, rerender);
  else if (t === 'runway') renderRunway(main, rerender);
  else if (t === 'cleanup') renderCleanup(main, rerender);
  else if (t === 'repair') renderRepair(main, rerender);
  else if (t === 'versions') renderVersions(main, rerender);
  else renderLog(main, rerender);
}

async function start() {
  clear(app, header(), nav, main);
  paintNav();
  clear(main, h('p', { class: 'muted' }, 'Loading puzzles…'));
  try {
    await Promise.all([loadAll(), loadWords()]);
  } catch (e) {
    clear(main, h('p', { class: 'err' }, `Couldn't load puzzles: ${e.message}`),
      h('p', { class: 'small muted' }, 'If this says "permission", the Firestore rules (firebase/firestore.rules) may not be published yet, or this account isn\'t the admin.'));
    return;
  }
  if (!ctx.words.five || !ctx.words.plus) toast('Word lists didn\'t load; answers won\'t be checked against them.', { error: true });
  rerender();
}

window.addEventListener('hashchange', () => {
  if (user && ctx.loaded) rerender();
});

onUser(async (u) => {
  if (!u) {
    user = null;
    signInScreen();
    return;
  }
  if (!u.emailVerified || !ADMIN_EMAILS.includes((u.email || '').toLowerCase())) {
    const email = u.email;
    await signOut();
    signInScreen(`${email || 'That account'} isn't an admin.`);
    return;
  }
  user = u;
  start();
}).catch((e) => {
  clear(app, h('p', { class: 'err' }, `Couldn't load Firebase: ${e.message}`));
});
