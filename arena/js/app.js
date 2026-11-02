// Boot, routing and the shared app state.

import { IS_SANDBOX, IS_DEMO, isLive } from './config.js?v=202611012056';
import { demoRaw } from './demo.js?v=202611012056';
import { initAnalytics, track } from './analytics.js?v=202611012056';
import { loadAds } from './ads.js?v=202611012056';
import { todayEpochDay } from './dates.js?v=202611012056';
import { playerId } from './local.js?v=202611012056';
import { initialTheme, initialContrast, applyTheme, applyContrast } from './theme.js?v=202611012056';
import { ALL_GAMES, liveGames, gameById } from './games/registry.js?v=202611012056';
import { computeOrder } from './gameOrder.js?v=202611012056';
import { readFavourites, setFavourite } from './favourites.js?v=202611012056';
import { loadProgress, loadFullHistory } from './progress.js?v=202611012056';
import { evaluateBadges } from './badges/rules.js?v=202611012056';
import {
  loadStoredBadges, needsDating, planSync, applySync, markAnnounced, markAnnouncedMany, markShared,
} from './badges/store.js?v=202611012056';
import { h, ICONS, closeSheet } from './ui.js?v=202611012056';
import { renderGames } from './views/gamesTab.js?v=202611012056';
import { renderArchive } from './views/archive.js?v=202611012056';
import { renderStats, renderStatsDetail } from './views/statsTab.js?v=202611012056';
import { renderBadgesPage, announce, announceMany, unlockStyle } from './views/badgesView.js?v=202611012056';
import { openSettings, openSync, safeReturnPath } from './views/settings.js?v=202611012056';
import { takeLeftForGame } from './views/play.js?v=202611012056';

const app = {
  uid: IS_DEMO ? 'DEMO' : playerId(),
  todayEd: todayEpochDay(),
  games: liveGames(),
  // Sandbox only: games not launched yet (at this offset), shown as coming soon.
  upcoming: IS_SANDBOX ? ALL_GAMES.filter((g) => !isLive(g.id)) : [],
  progress: {},
  badges: { results: [], stored: {}, synced: false },
  syncing: true,
  syncError: false,
  onShared(id) {
    if (!app.uid || IS_DEMO) return;
    markShared(app.uid, id).catch(() => {});
  },
  // Settings calls this after the games are rearranged.
  reorder() {
    app.order = computeOrder(app.games);
    refresh();
  },
  // The Games tab's stars.
  setFavourite(id, on) {
    app.favourites = setFavourite(id, on);
    track(on ? 'favourite_add' : 'favourite_remove', { target_game: id });
    refresh();
  },
};
// Game ids in the order they're listed; see gameOrder.js.
app.order = computeOrder(app.games);
// Game ids they starred as favourites; see favourites.js.
app.favourites = readFavourites();

// ---- Theme ----------------------------------------------------------------
// Light/dark and high contrast are set from Settings; see theme.js.

applyTheme(initialTheme());
applyContrast(initialContrast());

// ---- Header ---------------------------------------------------------------

// Scattered background tiles: [logo, left %, top px, size px, rotation].
// The wide layout, for the 180px banner.
const SCATTER = [
  ['canominoes', -4, -12, 87, -13],
  ['canoggle', 9.8, 119, 82, 3],
  ['canolitaire', 19.9, -42, 81, -4],
  ['canuckle-duo', 24.9, 147, 63, 3],
  ['canuckle', 40.8, -44, 61, 8],
  ['canolitaire', 50.5, 149, 69, -5],
  ['canuckle', 61.5, -44, 61, 10],
  ['canagrams', 72, 137, 96, -1],
  ['canuckle-plus', 81.8, -8, 76, 13],
  ['canoku', 92.5, 100, 87, 10],
];

// The phone layout, for the 156px banner. Its own positions rather than the
// wide ones scaled down: those sit mostly above and below a banner this
// short, which left only slivers showing. These keep to the space round the
// lockup (about 46-110px tall, the middle ~70% wide) and clear the settings
// button: a band along the top, a band along the bottom, and the two sides.
const SCATTER_PHONE = [
  ['canuckle', -2, 6, 50, -10],
  ['canoku', -4, 92, 56, 8],
  ['canagrams', 21, -12, 52, 6],
  ['canolitaire', 40, -8, 46, -6],
  ['canominoes', 60, -14, 54, 10],
  ['canuckle-plus', 86, 56, 50, 12],
  ['canuckle-duo', 24, 114, 48, -4],
  ['canuckle', 46, 118, 44, 9],
  ['canolitaire', 65, 112, 50, -12],
  ['canoggle', 88, 110, 48, -8],
];

const scatterTiles = (layout, cls) => layout.map(([logo, left, top, size, rot]) => h('img', {
  class: `tile ${cls}`,
  src: `images/${logo}.svg`,
  alt: '',
  style: { left: `${left}%`, top: `${top}px`, '--s': String(size), '--r': String(rot) },
}));

function renderHeader() {
  const settings = h('button', {
    class: 'header-btn',
    'aria-label': 'Settings',
    html: ICONS.gear,
    onClick: () => openSettings(app),
  });
  const banner = h('header', { class: 'banner' },
    scatterTiles(SCATTER, 'wide'),
    scatterTiles(SCATTER_PHONE, 'phone'),
    h('a', { class: 'lockup', href: '#games', 'aria-label': 'Canuckle Games Arena home' },
      h('img', { src: 'images/arena.svg', alt: '' }),
      h('span', { class: 'wordmark' },
        h('span', { class: 'wm-name', text: 'Canuckle' }),
        ' ',
        h('span', { class: 'wm-sub', text: 'Games Arena' }))),
    settings);
  document.getElementById('header').replaceChildren(banner);
}

// ---- Routing --------------------------------------------------------------

function route() {
  const [name, arg] = (location.hash.replace(/^#/, '') || 'games').split('/');
  return { name, arg };
}

function renderTabs(r) {
  const current = r.name === 'stats' || r.name === 'badges' ? r.name : 'games';
  const note = app.uid
    ? app.syncing ? 'Syncing…' : app.syncError ? 'Showing saved progress' : ''
    : '';
  const tab = (id, label) => h('a', { class: 'tab', href: `#${id}`, 'aria-current': current === id ? 'page' : null, text: label });
  document.getElementById('tabs').replaceChildren(h('nav', { class: 'tabs', 'aria-label': 'Arena sections' },
    h('div', { class: 'wrap' },
      tab('games', 'Games'),
      tab('stats', 'Stats'),
      tab('badges', 'Badges'),
      h('span', { class: 'sync-note', role: 'status', text: note }))));
}

let lastRouteKey = '';

function render() {
  const r = route();
  renderTabs(r);
  const game = r.arg ? gameById(r.arg) : null;
  let view;
  if (r.name === 'archive' && game && app.games.includes(game)) view = renderArchive(app, game);
  else if (r.name === 'stats' && game && app.games.includes(game)) view = renderStatsDetail(app, game);
  else if (r.name === 'stats') view = renderStats(app);
  else if (r.name === 'badges') view = renderBadgesPage(app);
  else view = renderGames(app);

  const main = document.getElementById('view');
  // Keep scroll position on data refreshes; reset it on navigation.
  const key = location.hash;
  const sameRoute = key === lastRouteKey;
  const scroll = window.scrollY;
  main.replaceChildren(view);
  if (sameRoute) window.scrollTo(0, scroll);
  else if (lastRouteKey) window.scrollTo(0, 0);
  lastRouteKey = key;
}

// Re-render in place when data arrives. The archive remembers which month it
// was showing, so a refresh doesn't move it.
function refresh() {
  render();
}

// ---- Badges ---------------------------------------------------------------

function evaluate() {
  app.badges.results = evaluateBadges(app.games, app.progress, new Set(Object.keys(app.badges.stored)),
    { stored: app.badges.stored, todayEd: app.todayEd });
}

async function syncBadges() {
  evaluate();
  if (!app.uid) return;
  if (IS_DEMO) {
    // ?demo&unlock previews the unlock announcement with one badge,
    // ?demo&unlock=level a tier family's level up, and ?demo&unlock=many the
    // summary of several; nothing is saved.
    const unlock = new URLSearchParams(location.search).get('unlock');
    if (unlock == null) return;
    const earned = app.badges.results.filter((b) => b.earned);
    if (unlock === 'many') {
      if (earned.length) announceMany(app, earned, () => {}, { firstVisit: true });
      return;
    }
    // A level up is any level of a family but its first.
    const levelUp = (b) => b.family && app.badges.results.find((o) => o.family === b.family) !== b;
    const sample = (unlock === 'level' && earned.find(levelUp)) || earned.find((b) => b.tier === 'gold') || earned[0];
    if (sample) announce(app, [sample], () => {});
    return;
  }
  try {
    const stored = await loadStoredBadges(app.uid);
    app.badges.stored = stored.badges;
    // Badges about to be backfilled are dated from the games' whole history,
    // not just the recent window the arena normally reads.
    if (needsDating(stored)) {
      app.progress = await loadFullHistory(app.games, app.progress, { uid: app.uid, todayEd: app.todayEd });
    }
    evaluate();
    const plan = planSync(app.badges.results, stored, app.todayEd);
    app.badges.stored = await applySync(app.uid, plan, stored);
    app.badges.synced = true;
    evaluate();
    refresh();
    // A first visit summarises what the history already earned; later visits
    // announce what's new, one badge on its own or several as a summary.
    const ids = plan.firstVisit ? plan.summary : plan.announce;
    const toAnnounce = ids
      .map((id) => app.badges.results.find((b) => b.id === id))
      .filter(Boolean);
    const style = unlockStyle(toAnnounce.length);
    if (style === 'summary') {
      announceMany(app, toAnnounce, (shown) => {
        for (const id of shown) if (app.badges.stored[id]) app.badges.stored[id].announcedAt = Date.now();
        markAnnouncedMany(app.uid, shown).catch(() => {});
      }, { firstVisit: plan.firstVisit });
    } else if (style === 'single' && !plan.firstVisit) {
      announce(app, toAnnounce, (id) => {
        if (app.badges.stored[id]) app.badges.stored[id].announcedAt = Date.now();
        markAnnounced(app.uid, id).catch(() => {});
      });
    }
  } catch (e) {
    console.warn('arena: badge sync failed', e);
  }
}

// ---- Boot -----------------------------------------------------------------

/**
 * A game's Settings opens /arena/?return=<its path>#sync to switch User ID.
 * Opens the sync sheet and strips the link from the address, so a reload
 * shows the arena rather than the sync sheet again.
 */
function openSyncLink() {
  if (location.hash !== '#sync') return false;
  const returnTo = safeReturnPath(new URLSearchParams(location.search).get('return'));
  history.replaceState(null, '', location.pathname);
  openSync(app, { returnTo });
  return true;
}

// ---- Progress -------------------------------------------------------------

let loading = null;

/** Reads every game's progress, repainting as each one lands. */
function loadAll() {
  if (loading) return loading;
  app.syncing = true;
  loading = loadProgress(app.games, {
    uid: app.uid,
    todayEd: app.todayEd,
    demo: IS_DEMO ? demoRaw : null,
    onUpdate(next) {
      app.progress = next;
      evaluate();
      refresh();
    },
  }).then((state) => {
    app.syncing = false;
    app.syncError = Object.values(state).some((s) => s.status === 'error');
    refresh();
  }).finally(() => {
    loading = null;
  });
  return loading;
}

/**
 * Coming back from a game: Back usually restores this page from the
 * browser's back/forward cache, so boot() doesn't run again and the page
 * would show what it had before the player left. Re-read progress then, and
 * also when the tab is shown again after a while (a game in another tab, or
 * switching apps on a phone).
 */
function watchForReturn() {
  const comeBack = () => {
    if (todayEpochDay() !== app.todayEd) {
      location.reload();
      return;
    }
    loadAll().then(followUpAfterGame);
  };
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    closeSheet();
    comeBack();
  });
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt >= 60000) comeBack();
  });
}

/**
 * Back from a game: a puzzle just finished may not have reached Firestore yet
 * (the game saves it as the player leaves), so the first read can miss it.
 * Look twice more, a few seconds apart. Only after going into a game from
 * here, so an ordinary visit costs no extra reads.
 */
function followUpAfterGame() {
  if (!takeLeftForGame()) return;
  setTimeout(() => loadAll(), 3000);
  setTimeout(() => loadAll(), 10000);
}

async function boot() {
  initAnalytics();
  renderHeader();
  window.addEventListener('hashchange', () => {
    closeSheet();
    render();
  });
  const syncing = openSyncLink();

  await loadAll();
  // After the first full render, as the games inject 2 s after runApp().
  loadAds();
  followUpAfterGame();
  track('arena_open', { returning: app.uid ? 1 : 0 });
  watchForReturn();

  // Only sync badges once every game has loaded fresh: evaluating against a
  // half-loaded state could record a badge late or announce one twice. Not
  // while switching User ID: an unlock announcement would replace the sync
  // sheet, and these badges belong to the id about to be left.
  if (!app.syncError && !syncing) await syncBadges();

  // A tab left open past midnight rolls over to the new day.
  setInterval(() => {
    if (todayEpochDay() !== app.todayEd) location.reload();
  }, 60000);
}

boot();
