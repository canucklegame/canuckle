// One active tab per game.
//
// A game open twice (an old tab, or the home-screen app beside a browser
// tab) has two copies of the player's board, stats and played list, each
// read once when its page opened. Whichever saves last wins, which is how a
// Canoggle player lost her progress (2026-11-17). The games now refuse to
// save a board backwards, but stats and an out-of-date board on screen are
// still possible. So only the tab the player is using is active: opening the
// game, or coming back to it, claims it; any other copy of the same game gets
// a cover saying it's open elsewhere, with Play here, which reloads that tab
// (picking up whatever was saved) and makes it the active one.
//
// Nothing is blocked outright: mobile browsers freeze background tabs, so
// "is the other tab still there?" has no reliable answer. The newest wins.
//
// Loaded on every game page through nextUp.js. Needs BroadcastChannel
// (Safari 15.4+); without it the page carries on as before, and the games'
// own save guards are the backstop.

/** Games it's switched on for (tried on Canoggle first, 2026-11-17). */
export const ONE_TAB_GAMES = new Set(['canuckle', 'canoggle', 'canagrams', 'canominoes', 'canolitaire', 'canoku']);

// The first path segment of each game page, to the group of pages that
// share one set of saves. Canuckle, Canuckle+ and Duo are one app with one
// in-progress slot, so they are one group.
const GROUP_OF_PATH = {
  '': 'canuckle',
  plus: 'canuckle',
  duo: 'canuckle',
  canoggle: 'canoggle',
  canagrams: 'canagrams',
  canominoes: 'canominoes',
  canolitaire: 'canolitaire',
  canoku: 'canoku',
};

const NAMES = {
  canuckle: 'Canuckle',
  canoggle: 'Canoggle',
  canagrams: 'Canagrams',
  canominoes: 'Canominoes',
  canolitaire: 'Canolitaire',
  canoku: 'Canoku',
};

/** The game group for a page at [pathname], or null (the Arena, admin, ...). */
export function groupForPath(pathname) {
  const first = String(pathname || '/').split('/').filter(Boolean)[0] ?? '';
  // A file at the root (/index.html) is the root page
  const segment = first.includes('.') ? '' : first;
  return Object.hasOwn(GROUP_OF_PATH, segment) ? GROUP_OF_PATH[segment] : null;
}

const STYLE = `
.one-tab{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(250,247,242,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  font:16px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#17171a}
.one-tab-card{max-width:360px;width:100%;box-sizing:border-box;padding:24px 22px;border-radius:22px;background:#fff;
  box-shadow:0 12px 40px rgba(0,0,0,.18);text-align:center;display:flex;flex-direction:column;gap:10px}
.one-tab h2{margin:0;font-size:20px;font-weight:800}
.one-tab p{margin:0;color:#5e5b57;font-size:15px}
.one-tab button{margin-top:8px;min-height:50px;border:0;border-radius:999px;background:#d52b1e;color:#fff;
  font:700 16px system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer}
.one-tab button:focus-visible{outline:3px solid #17171a;outline-offset:3px}
@media (prefers-color-scheme: dark){
  .one-tab{background:rgba(18,18,20,.72);color:#f4f2ef}
  .one-tab-card{background:#1c1c1f;box-shadow:0 12px 40px rgba(0,0,0,.5)}
  .one-tab p{color:#a8a49e}
  .one-tab button:focus-visible{outline-color:#f4f2ef}
}`;

const KEY_EVENTS = ['keydown', 'keyup', 'keypress'];

/**
 * Starts the one-tab rule on this page, when it's a game page it's switched
 * on for. Returns a handle for tests ({covered(), claim(), stop()}), or null
 * when it isn't running. Everything is passed in so tests can drive it.
 */
export function startOneTab({
  win = typeof window !== 'undefined' ? window : null,
  doc = typeof document !== 'undefined' ? document : null,
  Channel = win?.BroadcastChannel,
  games = ONE_TAB_GAMES,
  reload = () => win.location.reload(),
  makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`,
} = {}) {
  if (!win || !doc || typeof Channel !== 'function') return null;
  const group = groupForPath(win.location?.pathname);
  if (!group || !games.has(group)) return null;

  let channel;
  try {
    channel = new Channel(`canuckle-one-tab:${group}`);
  } catch {
    return null;
  }
  const me = makeId();
  let cover = null;

  // While covered, no key reaches the game underneath (Enter would submit a
  // word, a letter would type one). The cover's own button still works.
  const swallowKey = (e) => {
    if (!cover) return;
    if (e.target && cover.contains?.(e.target)) return;
    e.stopImmediatePropagation();
    e.preventDefault();
  };

  function showCover() {
    if (cover) return;
    if (!doc.getElementById('one-tab-style')) {
      const s = doc.createElement('style');
      s.id = 'one-tab-style';
      s.textContent = STYLE;
      doc.head.append(s);
    }
    const name = NAMES[group] ?? 'This game';
    cover = doc.createElement('div');
    cover.className = 'one-tab';
    cover.setAttribute('role', 'dialog');
    cover.setAttribute('aria-modal', 'true');
    cover.setAttribute('aria-labelledby', 'one-tab-title');
    const card = doc.createElement('div');
    card.className = 'one-tab-card';
    const title = doc.createElement('h2');
    title.id = 'one-tab-title';
    title.textContent = `${name} is open in another tab`;
    const text = doc.createElement('p');
    text.textContent = 'To keep your progress in one place, play in one tab at a time.';
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = 'Play here';
    // A reload picks up everything the other tab saved; the page claims the
    // game as it opens
    button.addEventListener('click', () => reload());
    card.append(title, text, button);
    cover.append(card);
    doc.body.append(cover);
    for (const t of KEY_EVENTS) win.addEventListener(t, swallowKey, true);
    try {
      button.focus();
    } catch {
      // No focus here; the button still works
    }
  }

  // This tab is the one being used: every other copy of the game is told
  function claim() {
    if (cover) return;
    try {
      channel.postMessage({ type: 'claim', id: me });
    } catch {
      // Closed channel: nothing to tell
    }
  }

  channel.onmessage = (e) => {
    const m = e?.data;
    if (m && m.type === 'claim' && m.id !== me) showCover();
  };

  const onVisible = () => {
    if (doc.visibilityState === 'visible') claim();
  };
  doc.addEventListener('visibilitychange', onVisible);
  win.addEventListener('focus', claim);
  // Back from the browser's back/forward cache: the page didn't reload
  win.addEventListener('pageshow', claim);
  claim();

  return {
    covered: () => cover != null,
    claim,
    stop() {
      doc.removeEventListener('visibilitychange', onVisible);
      win.removeEventListener('focus', claim);
      win.removeEventListener('pageshow', claim);
      for (const t of KEY_EVENTS) win.removeEventListener(t, swallowKey, true);
      try {
        channel.close();
      } catch {
        // Already closed
      }
    },
  };
}
