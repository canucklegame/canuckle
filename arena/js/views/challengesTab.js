// The Challenges tab: #challenges (Active), #challenges/record and
// #challenges/friends. Only loaded while featureOn('challenges').
//
// Everything shown comes from the player's social doc (app.social), which
// only the server writes. Actions call the server, then re-read the doc.

import { h, openSheet, sheetHead, toast, ICONS } from '../ui.js?v=202611200021';
import { call, loadSocial, reasonText, waitingCount, hasStartedSocial } from '../social/api.js?v=202611200021';
import { setUpChallenges, gamerIdStep } from '../social/onboarding.js?v=202611200021';
import { arenaGet, arenaSet, playerId } from '../local.js?v=202611200021';
import { seenResults, markResultsSeen } from '../social/seen.js?v=202611200021';
import { track } from '../analytics.js?v=202611200021';
import { gameById } from '../games/registry.js?v=202611200021';
import { fromPuzzle, puzzleTitle, canChallenge, CHALLENGE_GAMES } from '../social/puzzles.js?v=202611200021';
import {
  avatarParts, trophyCase, trophySvg, gameLine, recentLine, whenText, PLACE_NAMES,
} from '../social/podium.js?v=202611200021';
import * as sheets from './challengeSheets.js?v=202611200021';
import { openTutorial, tutorialLink, tutorialSeen } from './challengeTutorial.js?v=202611200021';

export { canChallenge };

function timeLeft(ms, now = Date.now()) {
  const mins = Math.max(0, Math.round((ms - now) / 60000));
  if (mins < 60) return `${mins} min left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h left`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h left`;
}

// ---- Shared state -------------------------------------------------------------

let app = null;
let loadingSocial = null;

/** Wires the tab to the app (app.js calls this once). */
export function initChallenges(theApp) {
  app = theApp;
}

/** Re-reads the social doc and repaints. Resolves with it. */
// collectResult at most this often from the Arena (the games' Next up hook
// covers the moment a puzzle is finished).
const COLLECT_EVERY_MS = 60000;
let lastCollect = 0;

/**
 * Whether the server has anything to collect for this player: an open
 * challenge they're still to play, or one past its expiry (which any
 * member's call closes).
 */
export function needsCollect(social, now = Date.now()) {
  return Object.values(social?.challenges ?? {}).some((v) => v.status === 'open'
    && (['invited', 'accepted'].includes(v.me) || now >= v.expiresAt));
}

/** Asks the server to record finished results (and close expired challenges); re-reads if anything changed. */
async function collect(doc) {
  if (!needsCollect(doc) || Date.now() - lastCollect < COLLECT_EVERY_MS) return;
  lastCollect = Date.now();
  try {
    const { updated } = await call('collectResult', {});
    if (updated) {
      app.social = await loadSocial(app.uid);
      app.refresh();
    }
  } catch {
    // Offline or refused: the next visit, the game's own hook, or the
    // server's daily cleanup catches it.
  }
}

/**
 * Back from a game: the result may still be on its way to Firestore, so ask
 * twice, a few seconds apart, whatever the usual once-a-minute limit says.
 */
export function afterGame() {
  if (!app.social) return;
  for (const ms of [4000, 12000]) {
    setTimeout(() => {
      lastCollect = 0;
      refreshSocial();
    }, ms);
  }
}

export function refreshSocial() {
  if (loadingSocial) return loadingSocial;
  loadingSocial = loadSocial(app.uid)
    .then((doc) => {
      app.social = doc;
      app.socialError = false;
      collect(doc);
      return doc;
    })
    .catch(() => {
      app.socialError = true;
      return app.social;
    })
    .finally(() => {
      loadingSocial = null;
      app.socialLoaded = true;
      app.refresh();
    });
  return loadingSocial;
}

// ---- Results not seen yet -----------------------------------------------------
//
// Finished challenges the player played in (or missed) but hasn't looked at
// on this browser. They count on the tab's badge, and opening the tab pops
// them up: one opens its results, several a summary.

const seenSet = () => seenResults(app?.uid);
const markSeen = (cids) => markResultsSeen(app?.uid, cids);

/** [[cid, view]] finished, played in (or missed), and not seen yet: newest first. */
export function unseenResults(social, seen = seenSet()) {
  return Object.entries(social?.challenges ?? {})
    .filter(([cid, v]) => v.status === 'final' && ['done', 'expired'].includes(v.me) && !seen.has(cid))
    .sort(([, a], [, b]) => (b.closedAt ?? 0) - (a.closedAt ?? 0));
}

/** Opens one challenge's results and remembers they've been seen. */
function showResult(cid) {
  markSeen([cid]);
  sheets.openResults(app, cid);
  app.refresh();
}

/** Several new results at once: a summary to tap through. */
function resultsSummary(list) {
  let close;
  close = openSheet(h('div', { class: 'soc-step' },
    sheetHead(`${list.length} challenges finished`, () => close()),
    h('p', { class: 'muted', text: 'Here’s how you did. Tap one for the full results.' }),
    h('div', { class: 'soc-list' }, list.map(([cid, v]) => {
      const row = resultRow(cid, v, app.social);
      row.addEventListener('click', () => close(), { capture: true });
      return row;
    }))),
  { label: 'New challenge results', className: 'soc-sheet' });
}

/** Opening the tab: pop up results not seen yet (never over another sheet). Seen ones never pop again. */
function popUnseen() {
  if (document.querySelector('.sheet-backdrop')) return;
  const list = unseenResults(app.social);
  if (!list.length) return;
  markSeen(list.map(([cid]) => cid));
  if (list.length === 1) sheets.openResults(app, list[0][0]);
  else resultsSummary(list);
  app.refresh();
}

/** The count on the Challenges tab: things waiting on the player, plus results not seen yet. */
export const badgeCount = () => waitingCount(app?.social) + unseenResults(app?.social).length;

/** Runs server op [op], then re-reads the doc. Shows a toast on failure. Resolves with the result or null. */
async function act(op, data, done) {
  try {
    const result = await call(op, data);
    await refreshSocial();
    if (done) toast(typeof done === 'function' ? done(result) : done);
    return result;
  } catch (e) {
    toast(reasonText(e.reason));
    return null;
  }
}

async function setUp() {
  const social = await setUpChallenges();
  // Setup makes a player ID for someone who had none
  app.uid = app.uid || playerId();
  if (social) app.social = social;
  else if (app.uid) await refreshSocial();
  app.socialLoaded = true;
  app.refresh();
  return social;
}

/** At boot: read the social doc only for players who have started setting up challenges. */
export function bootSocial() {
  if (app.uid && hasStartedSocial()) refreshSocial();
  else app.socialLoaded = !app.uid ? true : app.socialLoaded;
}

/** Settings → Delete my social data. */
export function deleteMySocialData() {
  confirmSheet('Delete your social data?',
    'This removes your gamer ID, your friends and friend requests, and your challenge history, and takes you out of open challenges. Your games, stats and badges stay.',
    'Delete', () => act('deleteSocialData', {}, 'Your social data is deleted.'));
}

// ---- Small pieces ---------------------------------------------------------------

function avatar(pub, gamerId, size = 'md') {
  const { initials, colour } = avatarParts(pub, gamerId);
  return h('span', {
    class: `soc-avatar ${size}`, 'aria-hidden': 'true', text: initials, style: { background: colour },
  });
}

const shortDay = (ms) => new Date(ms).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });

const record = (r) => `${r?.w ?? 0}–${r?.l ?? 0}–${r?.t ?? 0}`;

function segment(current) {
  const seg = (id, href, label) => h('a', {
    class: 'soc-seg-btn', href, 'aria-current': current === id ? 'page' : null, text: label,
  });
  return h('nav', { class: 'soc-seg', 'aria-label': 'Challenges sections' },
    seg('active', '#challenges', 'Active'),
    seg('record', '#challenges/record', 'Record'),
    seg('friends', '#challenges/friends', 'Friends'));
}

function sectionHead(title, count) {
  return h('h2', { class: 'soc-h2' }, title, count ? h('span', { class: 'muted', text: ` · ${count}` }) : null);
}

function confirmSheet(title, text, yes, onYes) {
  let close;
  const go = h('button', { class: 'btn', type: 'button', text: yes });
  go.addEventListener('click', async () => {
    go.disabled = true;
    await onYes();
    close();
  });
  close = openSheet(h('div', { class: 'soc-step' },
    sheetHead(title, () => close()),
    h('p', { class: 'muted', text }),
    h('div', { class: 'actions' },
      h('button', { class: 'btn secondary', type: 'button', text: 'Cancel', onClick: () => close() }),
      go)), { label: title });
}

// ---- Not set up yet -------------------------------------------------------------

function intro() {
  return h('div', { class: 'card soc-intro' },
    h('span', { class: 'soc-intro-icon', html: ICONS.trophy }),
    h('h2', { text: 'Challenge your friends' }),
    h('p', { class: 'muted', text: 'Send friends the same puzzle, play whenever you like, and see who did best. Pick a gamer ID to get started. Only friends you accept see your challenges and results.' }),
    h('button', { class: 'btn', type: 'button', text: 'Set up challenges', onClick: () => setUp() }),
    tutorialLink(() => showTutorial()));
}

// The walkthrough, and where its last button leads
function showTutorial() {
  openTutorial(app.social, (kind) => {
    if (kind === 'setup') setUp();
    else if (kind === 'friends') location.hash = '#challenges/friends';
    else sheets.openCreate(app, { onSent: refreshSocial });
  });
}

function under() {
  return h('div', { class: 'card soc-intro' },
    h('h2', { text: 'Challenges are for players 14 and up' }),
    h('p', { class: 'muted', text: 'You can still play every game, track your stats and earn badges right here in the Arena.' }));
}

// ---- Friend requests (shown on Active and Friends) ----------------------------------

function requestRows(social) {
  const incoming = Object.entries(social.requestsIn ?? {}).sort(([, a], [, b]) => (b.at ?? 0) - (a.at ?? 0));
  const outgoing = Object.entries(social.requestsOut ?? {}).sort(([, a], [, b]) => (b.at ?? 0) - (a.at ?? 0));
  const rows = [
    ...incoming.map(([pub, r]) => h('div', { class: 'soc-row-item' },
      avatar(pub, r.gamerId),
      h('span', { class: 'soc-who' }, h('strong', { text: r.gamerId }), h('span', { class: 'muted', text: 'Wants to be friends' })),
      h('button', {
        class: 'btn small', type: 'button', text: 'Accept',
        onClick: () => act('respondFriendRequest', { pub, accept: true }, `You and ${r.gamerId} are friends.`),
      }),
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': `Deny ${r.gamerId}`, html: ICONS.close,
        onClick: () => act('respondFriendRequest', { pub, accept: false }),
      }))),
    ...outgoing.map(([pub, r]) => h('div', { class: 'soc-row-item' },
      avatar(pub, r.gamerId),
      h('span', { class: 'soc-who' }, h('strong', { text: r.gamerId }), h('span', { class: 'muted', text: `You asked · ${shortDay(r.at)}` })),
      h('button', {
        class: 'text-btn', type: 'button', text: 'Cancel',
        onClick: () => act('cancelFriendRequest', { pub }),
      }))),
  ];
  return { rows, incoming: incoming.length, outgoing: outgoing.length };
}

// ---- Active ---------------------------------------------------------------------

/** Friends who joined through this player's invite link since they last looked. */
function newLinkJoins(social) {
  const seen = arenaGet('linkJoinsSeen', 0) || 0;
  return Object.entries(social.friends ?? {})
    .filter(([, f]) => f.via === 'link' && (f.since ?? 0) > seen)
    .map(([pub, f]) => ({ pub, ...f }));
}

function markLinkJoinsSeen() {
  try {
    arenaSet('linkJoinsSeen', Date.now());
  } catch {
    // No storage: shown again next time.
  }
}

/**
 * The friend to suggest challenging: the one played least against, then the
 * newest friend. Among equals it changes day to day ([dayNumber]), so the
 * same name isn't always first.
 */
export function suggestFriend(friends, dayNumber = Math.floor(Date.now() / 86400000)) {
  const list = Object.entries(friends ?? {}).map(([pub, f]) => ({
    pub, ...f, played: (f.record?.w ?? 0) + (f.record?.l ?? 0) + (f.record?.t ?? 0),
  }));
  if (!list.length) return null;
  const fewest = Math.min(...list.map((f) => f.played));
  const tied = list.filter((f) => f.played === fewest)
    .sort((a, b) => (b.since ?? 0) - (a.since ?? 0) || a.gamerId.localeCompare(b.gamerId));
  return tied[dayNumber % tied.length];
}

/** Has friends, no challenges yet: suggest one by name. */
function suggestionCard(social) {
  const f = suggestFriend(social.friends);
  const others = Object.keys(social.friends).length - 1;
  return h('div', { class: 'card soc-suggestion' },
    avatar(f.pub, f.gamerId, 'lg'),
    h('div', { class: 'soc-who' },
      h('strong', { text: `Challenge ${f.gamerId}` }),
      h('span', { class: 'muted', text: f.played
        ? `You’ve played ${f.played} ${f.played === 1 ? 'challenge' : 'challenges'} together (${record(f.record)}).`
        : 'You haven’t played a challenge together yet.' })),
    h('button', {
      class: 'btn small', type: 'button', text: 'Challenge',
      onClick: () => sheets.openCreate(app, { friendPub: f.pub, onSent: refreshSocial }),
    }),
    others > 0 ? h('a', { class: 'text-btn soc-suggestion-more', href: '#challenges/friends', text: `or one of your ${others} other ${others === 1 ? 'friend' : 'friends'}` }) : null);
}

/** A challenge's game, puzzle title and the Arena's index/tier (and Canoggle's limit). */
function about(view) {
  const game = gameById(view.game);
  const { index, tier, limit = null } = fromPuzzle(view.game, view.puzzle);
  return { game, index, tier, limit, title: game ? puzzleTitle(game, index, tier, limit) : view.game };
}

const byNewest = (key) => ([, a], [, b]) => (b[key] ?? 0) - (a[key] ?? 0);

function inviteCard(cid, v) {
  const { game, title } = about(v);
  return h('div', { class: 'card soc-challenge' },
    h('div', { class: 'soc-challenge-head' },
      game ? h('img', { src: game.logo, alt: '' }) : null,
      h('span', { class: 'soc-who' },
        h('strong', { text: `${v.from} challenged you` }),
        h('span', { class: 'muted', text: title }))),
    h('div', { class: 'soc-meta' },
      h('span', {}, h('span', { html: ICONS.people }), `${v.players.length} players`),
      h('span', {}, h('span', { html: ICONS.clock }), timeLeft(v.expiresAt)),
      v.played ? h('span', {}, h('span', { html: ICONS.check }), 'You’ve already played it') : null),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn', type: 'button', text: v.played ? 'Accept & see results' : 'Accept & Play',
        onClick: () => sheets.openChallenge(app, cid),
      }),
      h('button', {
        class: 'btn secondary', type: 'button', text: 'Decline',
        onClick: () => act('respondChallenge', { cid, accept: false }, 'Challenge declined.'),
      })));
}

function progressCard(cid, v, social) {
  const { game, index, tier, limit, title } = about(v);
  const mine = v.me === 'done';
  const done = v.players.filter((p) => p.state === 'done').length;
  const waiting = v.players.filter((p) => ['invited', 'accepted'].includes(p.state) && p.pub !== social.pub);
  return h('div', { class: 'card soc-challenge' },
    h('button', { class: 'soc-challenge-head as-btn', type: 'button', onClick: () => sheets.openChallenge(app, cid) },
      game ? h('img', { src: game.logo, alt: '' }) : null,
      h('span', { class: 'soc-who' },
        h('strong', { text: title }),
        h('span', { class: 'muted', text: `${v.fromPub === social.pub ? 'You started it' : `From ${v.from}`} · ${v.expiresAt > Date.now() ? `ends in ${timeLeft(v.expiresAt).replace(' left', '')}` : 'ending soon'}` })),
      h('span', { html: ICONS.chevron })),
    mine
      ? h('ol', { class: 'soc-standings compact' }, v.players.map((p) => h('li', { class: p.pub === social.pub ? 'me' : '' },
        h('span', { class: 'soc-rank', text: p.rank ?? '–' }),
        h('span', { class: 'soc-who' }, h('strong', { text: p.pub === social.pub ? 'You' : p.gamerId })),
        h('span', { class: 'soc-score muted', text: p.score ?? (['invited', 'accepted'].includes(p.state) ? 'Hasn’t played' : p.state === 'declined' ? 'Declined' : '') }))))
      : h('div', { class: 'soc-stack' },
        sheets.playerChips(v, social.pub),
        h('p', { class: 'soc-hint' }, h('span', { class: 'soc-inline-icon', html: ICONS.lock }),
          `${done} of ${v.players.length} done. Their results stay hidden until you finish.`),
        game ? h('button', { class: 'btn soc-wide', type: 'button', text: 'Play now', onClick: () => sheets.launch(app, game, index, tier, limit) }) : null),
    mine && waiting.length ? h('p', { class: 'soc-hint', text: `Waiting on ${waiting.map((p) => p.gamerId).join(', ')}.` }) : null);
}

function resultRow(cid, v, social) {
  const { game, title } = about(v);
  const place = sheets.placeText(v, social.pub);
  const won = /^1st of/.test(place);
  return h('button', { class: 'soc-row-item as-btn', type: 'button', onClick: () => showResult(cid) },
    game ? h('img', { class: 'soc-game-icon', src: game.logo, alt: '' }) : null,
    h('span', { class: 'soc-who' },
      h('strong', { text: title }),
      h('span', { class: 'muted', text: `${shortDay(v.closedAt ?? v.expiresAt)} · ${v.players.length} players` })),
    h('span', { class: `soc-place${won ? ' won' : ''}` }, won ? h('span', { html: ICONS.trophy }) : null, place),
    h('span', { html: ICONS.chevron }));
}

function activeView(social) {
  const { rows, incoming } = requestRows(social);
  const joins = newLinkJoins(social);
  if (joins.length) setTimeout(markLinkJoinsSeen, 0);
  const all = Object.entries(social.challenges ?? {});
  const invites = all.filter(([, v]) => v.status === 'open' && v.me === 'invited').sort(byNewest('createdAt'));
  const going = all.filter(([, v]) => v.status === 'open' && ['accepted', 'done'].includes(v.me))
    .sort(([, a], [, b]) => (a.me === 'accepted' ? 0 : 1) - (b.me === 'accepted' ? 0 : 1) || a.expiresAt - b.expiresAt);
  const results = all.filter(([, v]) => v.status === 'final' || (v.status === 'open' && ['declined', 'ineligible'].includes(v.me)))
    .sort(([, a], [, b]) => (b.closedAt ?? b.expiresAt) - (a.closedAt ?? a.expiresAt)).slice(0, 10);
  const hasFriends = Object.keys(social.friends ?? {}).length > 0;
  const waitingCountHere = incoming + invites.length;
  return h('div', { class: 'soc-stack soc-active' },
    joins.length ? h('div', { class: 'card soc-notice', role: 'status' },
      joins.map((f) => h('p', {}, h('strong', { text: f.gamerId }), ' joined through your invite link. You’re friends now.'))) : null,
    waitingCountHere ? h('section', { class: 'soc-stack' },
      sectionHead('Waiting for you', waitingCountHere),
      invites.map(([cid, v]) => inviteCard(cid, v)),
      incoming ? h('div', { class: 'card soc-list' }, rows.slice(0, incoming)) : null) : null,
    going.length ? h('section', { class: 'soc-stack' },
      sectionHead('In progress', going.length),
      going.map(([cid, v]) => progressCard(cid, v, social))) : null,
    !invites.length && !going.length ? h('section', { class: 'soc-stack' },
      sectionHead('Challenges'),
      hasFriends
        ? suggestionCard(social)
        : h('div', { class: 'card soc-empty soc-cta' },
          h('span', { class: 'soc-intro-icon', html: ICONS.people }),
          h('p', {}, h('strong', { text: 'Add friends to start challenging.' }),
            ' Send a request by gamer ID, or share your invite link with family and friends.'),
          h('a', { class: 'btn', href: '#challenges/friends', text: 'Add friends' }))) : null,
    results.length ? h('section', { class: 'soc-stack' },
      h('div', { class: 'soc-between' }, sectionHead('Recent results'),
        h('a', { class: 'text-btn', href: '#challenges/record', text: 'Record' })),
      h('div', { class: 'card soc-list' }, results.map(([cid, v]) => resultRow(cid, v, social)))) : null);
}

// ---- Record -------------------------------------------------------------------------

const played = (r) => (r?.w ?? 0) + (r?.l ?? 0) + (r?.t ?? 0);
const winRate = (r) => (played(r) ? `${Math.round((100 * (r.w ?? 0)) / played(r))}%` : '–');

function recordBar(r, colours = ['var(--text)', 'var(--muted)', 'var(--border)']) {
  const n = played(r);
  if (!n) return null;
  // Only the parts that have any: an empty part would still leave its gap,
  // and the bar would end square short of its rounded end.
  const parts = [[r.w ?? 0, colours[0]], [r.t ?? 0, colours[1]], [r.l ?? 0, colours[2]]]
    .filter(([count]) => count > 0);
  return h('div', {
    class: 'soc-bar', role: 'img',
    'aria-label': `${r.w ?? 0} won, ${r.t ?? 0} tied, ${r.l ?? 0} lost`,
  }, parts.map(([count, colour]) => h('span', { style: { flex: String(count), background: colour } })));
}

// ---- Trophy case ----------------------------------------------------------------
//
// Gold, silver and bronze from final challenges, overall or per game, from
// the social doc's trophies, challengesPlayed and recentTrophies (written by
// the server when a challenge closes). No reads of its own.

let caseFilter = 'all';

function recentTrophyRow(e, social) {
  const game = gameById(e.game);
  const { index, tier, limit = null } = fromPuzzle(e.game, e.puzzle);
  const title = game ? puzzleTitle(game, index, tier, limit) : e.game;
  const inner = [
    h('span', { class: 'tro-rec-art', html: trophySvg(e.place) }),
    h('span', { class: 'soc-who' }, h('strong', { text: title }),
      h('span', { class: 'muted', text: `${recentLine(e)} · ${whenText(e.at)}` })),
  ];
  // Still in the doc: tap for its results
  return social.challenges?.[e.cid]
    ? h('button', { class: 'tro-rec as-btn', type: 'button', onClick: () => showResult(e.cid) }, ...inner, h('span', { html: ICONS.chevron }))
    : h('div', { class: 'tro-rec' }, ...inner);
}

export function trophyCaseCard(social, ids = CHALLENGE_GAMES.filter((id) => gameById(id))) {
  const card = h('section', { class: 'card tro-case', 'aria-label': 'Trophy case' });
  const draw = () => {
    if (caseFilter !== 'all' && !ids.includes(caseFilter)) caseFilter = 'all';
    const c = trophyCase(social, ids, caseFilter);
    const chips = [{ id: 'all', name: 'All games' }, ...ids.map((id) => ({ id, name: gameById(id).name }))];
    card.replaceChildren(
      h('div', { class: 'tro-head' },
        h('h2', { class: 'soc-h2', text: 'Trophy case' }),
        h('span', { class: 'muted', text: `${c.total} ${c.total === 1 ? 'trophy' : 'trophies'} · ${c.played} ${c.played === 1 ? 'challenge' : 'challenges'}` })),
      h('div', { class: 'tro-filters', role: 'tablist', 'aria-label': 'Game' }, chips.map((g) => h('button', {
        class: 'tro-chip', type: 'button', role: 'tab', 'aria-selected': String(g.id === caseFilter), text: g.name,
        onClick: () => { caseFilter = g.id; draw(); },
      }))),
      // Silver, gold, bronze, like the podium
      h('div', { class: 'tro-shelf' }, [2, 1, 3].map((place) => {
        const n = c.totals[place - 1];
        return h('div', {
          class: `tro-slot${place === 1 ? ' big' : ''}${n ? '' : ' none'}`, role: 'img',
          'aria-label': `${n} ${PLACE_NAMES[place].toLowerCase()}`,
        },
        h('span', { class: 'tro-art', html: trophySvg(place) }),
        h('span', { class: 'tro-n', text: String(n) }),
        h('span', { class: 'tro-l', text: PLACE_NAMES[place] }));
      })),
      h('h3', { class: 'tro-h', text: 'By game' }),
      h('div', { class: 'tro-games' }, c.games.map((g) => {
        const game = gameById(g.id);
        return h('div', { class: 'tro-game' },
          h('img', { class: 'soc-game-icon', src: game.logo, alt: '' }),
          h('span', { class: 'soc-who' }, h('strong', { text: game.name }), h('span', { class: 'muted', text: gameLine(g) })),
          h('span', { class: 'tro-tally', role: 'img', 'aria-label': `${g.t[0]} gold, ${g.t[1]} silver, ${g.t[2]} bronze` },
            g.t.map((n, i) => h('span', { class: n ? '' : 'zero' }, h('span', { html: trophySvg(i + 1) }), String(n)))));
      })),
      h('h3', { class: 'tro-h', text: 'Recent trophies' }),
      c.recent.length
        ? h('div', { class: 'tro-recent' }, c.recent.map((e) => recentTrophyRow(e, social)))
        : h('p', {
          class: 'muted tro-empty',
          text: caseFilter === 'all' ? 'No trophies yet. Finish in the top three of a challenge to win one.'
            : 'No trophies in this game yet. Challenge a friend to win one.',
        }));
  };
  draw();
  return card;
}

function recordView(social) {
  const o = social.overall ?? {};
  const friends = Object.entries(social.friends ?? {}).sort(([, a], [, b]) => played(b.record) - played(a.record)
    || a.gamerId.localeCompare(b.gamerId));
  const games = Object.entries(social.byGame ?? {}).filter(([id]) => gameById(id))
    .sort(([, a], [, b]) => played(b) - played(a));
  return h('div', { class: 'soc-stack' },
    h('div', { class: 'card soc-record' },
      h('span', { class: 'soc-kicker', text: 'Against everyone' }),
      h('div', { class: 'soc-big' }, h('strong', { text: record(o) }), h('span', { class: 'muted', text: 'won · lost · tied' })),
      recordBar(o),
      h('div', { class: 'soc-tiles' },
        h('div', {}, h('strong', { text: winRate(o) }), h('span', { text: 'Win rate' })),
        h('div', {}, h('strong', { text: String(played(o)) }), h('span', { text: 'Challenges' })),
        h('div', {}, h('strong', { text: String(o.bestStreak ?? 0) }), h('span', { text: 'Best win streak' })))),
    trophyCaseCard(social),
    games.length ? h('section', { class: 'soc-stack' },
      sectionHead('By game'),
      h('div', { class: 'card soc-list' }, games.map(([id, r]) => {
        const g = gameById(id);
        return h('div', { class: 'soc-row-item' },
          h('img', { class: 'soc-game-icon', src: g.logo, alt: '' }),
          h('span', { class: 'soc-who' }, h('strong', { text: g.name }), recordBar(r, [g.color, 'var(--muted)', 'var(--border)'])),
          h('span', { class: 'soc-score', text: record(r) }));
      }))) : null,
    friends.length ? h('section', { class: 'soc-stack' },
      sectionHead('Head-to-head'),
      h('div', { class: 'card soc-list' }, friends.map(([pub, f]) => h('a', { class: 'soc-row-item as-link', href: `#challenges/friend/${pub}` },
        avatar(pub, f.gamerId),
        h('span', { class: 'soc-who' }, h('strong', { text: f.gamerId }),
          h('span', { class: 'muted', text: `${played(f.record)} played` })),
        h('span', { class: 'soc-score', text: record(f.record) }),
        h('span', { html: ICONS.chevron }))))) : null,
    !played(o) ? h('p', { class: 'muted soc-center', text: 'Your record fills in as challenges finish.' }) : null);
}

// ---- One friend -----------------------------------------------------------------------

/** The challenges in this player's doc that [pub] was part of, newest first. */
function sharedWith(social, pub) {
  return Object.entries(social.challenges ?? {})
    .filter(([, v]) => v.players.some((p) => p.pub === pub))
    .sort(([, a], [, b]) => (b.closedAt ?? b.createdAt ?? 0) - (a.closedAt ?? a.createdAt ?? 0));
}

function friendView(social, pub) {
  const f = social.friends?.[pub];
  const back = h('a', { class: 'soc-back', href: '#challenges/record' }, h('span', { html: ICONS.back }), 'Record');
  if (!f) {
    return h('div', { class: 'soc-stack' }, back,
      h('div', { class: 'card soc-empty' }, h('p', { class: 'muted', text: 'That player isn’t one of your friends.' })));
  }
  const r = f.record ?? {};
  const shared = sharedWith(social, pub);
  return h('div', { class: 'soc-stack' },
    back,
    h('div', { class: 'soc-friend-head' },
      avatar(pub, f.gamerId, 'lg'),
      h('span', { class: 'soc-who' },
        h('h2', { class: 'soc-title', text: f.gamerId }),
        h('span', { class: 'muted', text: `Friends since ${shortDay(f.since)}${f.via === 'link' ? ' · joined through your link' : ''}` }))),
    h('div', { class: 'card soc-h2h' },
      h('div', {}, h('strong', { text: String(r.w ?? 0) }), h('span', { text: 'You' })),
      h('div', {}, h('strong', { class: 'tie', text: String(r.t ?? 0) }), h('span', { text: 'Tied' })),
      h('div', {}, h('strong', { text: String(r.l ?? 0) }), h('span', { text: f.gamerId })),
      recordBar(r, ['var(--text)', 'var(--muted)', 'var(--accent)'])),
    h('button', {
      class: 'btn soc-wide', type: 'button', text: `Challenge ${f.gamerId}`,
      onClick: () => sheets.openCreate(app, { friendPub: pub, onSent: refreshSocial }),
    }),
    h('section', { class: 'soc-stack' },
      sectionHead('Your challenges together', shared.length),
      shared.length
        ? h('div', { class: 'card soc-list' }, shared.map(([cid, v]) => (v.status === 'final'
          ? resultRow(cid, v, social)
          : h('button', { class: 'soc-row-item as-btn', type: 'button', onClick: () => sheets.openChallenge(app, cid) },
            gameById(v.game) ? h('img', { class: 'soc-game-icon', src: gameById(v.game).logo, alt: '' }) : null,
            h('span', { class: 'soc-who' }, h('strong', { text: about(v).title }), h('span', { class: 'muted', text: 'In progress' })),
            h('span', { html: ICONS.chevron })))))
        : h('div', { class: 'card soc-empty' }, h('p', { class: 'muted', text: 'No challenges together yet.' }))),
    h('div', { class: 'actions soc-center' },
      h('button', { class: 'text-btn', type: 'button', text: 'More…', onClick: () => friendMenu(pub, f) })));
}

// ---- Friends ------------------------------------------------------------------------

async function shareInvite(reset = false) {
  const result = await act('getInviteLink', reset ? { reset: true } : {});
  if (!result?.code) return;
  const url = `${location.origin}${location.pathname}?friend=${result.code}`;
  const until = shortDay(result.expiresAt);
  const text = `Be my friend on the Canuckle Games Arena, and let's challenge each other! This link works until ${until}.`;
  track('challenge_invite_share', { reset: reset ? 1 : 0 });
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Canuckle Games Arena', text, url });
      return;
    }
  } catch {
    // Cancelled or unsupported: fall back to copying.
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast(`Invite link copied. It works until ${until}.`);
  } catch {
    toast(url);
  }
}

function friendMenu(pub, f) {
  let close;
  const item = (label, onClick, danger) => h('button', {
    class: `set-row link-row${danger ? ' danger' : ''}`, type: 'button', onClick: () => { close(); onClick(); },
  }, h('span', { class: 'set-text' }, h('span', { class: 'set-label', text: label })));
  close = openSheet(h('div', { class: 'soc-step' },
    sheetHead(f.gamerId, () => close()),
    h('p', { class: 'muted', text: `Friends since ${shortDay(f.since)} · ${record(f.record)} against each other` }),
    h('div', { class: 'set-card' },
      item(`Challenge ${f.gamerId}`, () => sheets.openCreate(app, { friendPub: pub, onSent: refreshSocial })),
      item('Head-to-head', () => { location.hash = `#challenges/friend/${pub}`; }),
      item('Remove friend', () => confirmSheet('Remove friend?', `${f.gamerId} won’t see your gamer ID or challenges any more. Your open challenges carry on.`, 'Remove',
        () => act('removeFriend', { pub }, `${f.gamerId} removed.`))),
      item('Block', () => confirmSheet(`Block ${f.gamerId}?`, 'They’re removed from your friends and can’t send you requests. They aren’t told.', 'Block',
        () => act('blockPlayer', { pub }, `${f.gamerId} blocked.`)), true),
      item('Report gamer ID', () => confirmSheet('Report this gamer ID?', `Tell us ${f.gamerId} is offensive or impersonating someone. We’ll take a look.`, 'Report',
        () => act('reportGamerId', { pub }, 'Thanks, we’ll take a look.')), true))), { label: f.gamerId });
}

function friendsView(social) {
  const { rows, incoming, outgoing } = requestRows(social);
  const friends = Object.entries(social.friends ?? {}).sort(([, a], [, b]) => a.gamerId.localeCompare(b.gamerId));
  const blocked = Object.entries(social.blocked ?? {});

  const input = h('input', {
    id: 'soc-add', type: 'text', placeholder: 'e.g. MapleMoose', maxlength: '16',
    autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
  });
  const send = h('button', { class: 'btn small', type: 'submit', text: 'Send' });
  const form = h('form', { class: 'inline-form' }, input, send);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gamerId = input.value.trim();
    if (!gamerId) return;
    send.disabled = true;
    const r = await act('sendFriendRequest', { gamerId }, (res) => (res.status === 'friends'
      ? `You and ${gamerId} are friends.` : `Request sent to ${gamerId}.`));
    send.disabled = false;
    if (r) input.value = '';
  });

  return h('div', { class: 'soc-stack' },
    h('div', { class: 'card soc-me' },
      h('div', { class: 'soc-me-row' },
        h('span', { class: 'soc-who' },
          h('span', { class: 'soc-kicker', text: 'Your gamer ID' }),
          h('strong', { class: 'soc-gid', text: social.gamerId })),
        h('button', {
          class: 'btn secondary small', type: 'button', text: 'Change',
          onClick: async () => { if (await gamerIdStep({ current: social.gamerId })) refreshSocial(); },
        })),
      h('p', { class: 'soc-hint' }, h('span', { class: 'soc-inline-icon', html: ICONS.lock }),
        'Anyone who knows your gamer ID can send you a friend request. Only friends you accept see your challenges and results. Your private User ID is never shown.')),

    incoming + outgoing ? h('section', { class: 'soc-stack' },
      sectionHead('Requests', incoming + outgoing),
      h('div', { class: 'card soc-list' }, rows)) : null,

    h('section', { class: 'soc-stack' },
      sectionHead('Add a friend'),
      h('div', { class: 'card soc-add' },
        h('label', { for: 'soc-add', class: 'set-label', text: 'Their gamer ID' }),
        form,
        h('div', { class: 'soc-or' }, h('span', { text: 'or' })),
        h('button', {
          class: 'btn secondary soc-wide', type: 'button', onClick: () => shareInvite(false),
        }, h('span', { html: ICONS.share }), 'Share my invite link'),
        h('p', { class: 'soc-hint' }, 'Anyone who opens your link becomes your friend straight away. It works for 3 days. ',
          h('button', { class: 'text-btn', type: 'button', text: 'Make a new link', onClick: () => shareInvite(true) }),
          ' if you shared it somewhere you shouldn’t have.'))),

    h('section', { class: 'soc-stack' },
      sectionHead('Friends', friends.length),
      friends.length
        ? h('div', { class: 'card soc-list' }, friends.map(([pub, f]) => h('div', { class: 'soc-row-item' },
          avatar(pub, f.gamerId),
          h('span', { class: 'soc-who' }, h('strong', { text: f.gamerId }), h('span', { class: 'muted', text: `${record(f.record)} against each other` })),
          h('button', {
            class: 'icon-btn', type: 'button', 'aria-label': `More for ${f.gamerId}`, html: ICONS.more,
            onClick: () => friendMenu(pub, f),
          }))))
        : h('div', { class: 'card soc-empty' }, h('p', { class: 'muted', text: 'No friends yet. Add one by gamer ID, or share your invite link.' }))),

    blocked.length ? h('section', { class: 'soc-stack' },
      sectionHead('Blocked', blocked.length),
      h('div', { class: 'card soc-list' }, blocked.map(([pub, b]) => h('div', { class: 'soc-row-item' },
        avatar(pub, b.gamerId),
        h('span', { class: 'soc-who' }, h('strong', { text: b.gamerId })),
        h('button', {
          class: 'text-btn', type: 'button', text: 'Unblock',
          onClick: () => act('unblockPlayer', { pub }, `${b.gamerId} unblocked.`),
        }))))) : null);
}

// ---- The tab ------------------------------------------------------------------------

/** Renders the tab for route arg [sub] ('' | 'record' | 'friends'). */
export function renderChallenges(sub = '', extra = '') {
  const social = app.social;
  // The Games tab's "New: challenges" promotion stops once the tab is seen
  if (!arenaGet('challengesSeen', false)) {
    try {
      arenaSet('challengesSeen', true);
    } catch {
      // No storage: the promotion just shows again.
    }
  }
  if (!app.socialLoaded && !loadingSocial && app.uid) refreshSocial();
  const page = h('div', { class: 'wrap soc-page' });

  if (!app.socialLoaded && app.uid) {
    page.append(h('p', { class: 'muted', text: 'Loading…' }));
    return page;
  }
  if (app.socialError && !social) {
    page.append(h('div', { class: 'card soc-empty' },
      h('p', { class: 'muted', text: 'Couldn’t load your challenges.' }),
      h('button', { class: 'btn secondary small', type: 'button', text: 'Try again', onClick: () => refreshSocial() })));
    return page;
  }
  if (social?.challengeAge === 'under') {
    page.append(under());
    return page;
  }
  // First visit: how challenges work, once this render is on screen (the
  // unseen-results popup waits for another visit rather than open over it)
  const firstVisit = !tutorialSeen();
  if (firstVisit) setTimeout(showTutorial, 300);
  if (!social?.gamerId) {
    page.append(intro());
    return page;
  }

  if (sub === 'friend') {
    page.append(friendView(social, extra));
    return page;
  }
  const current = sub === 'record' || sub === 'friends' ? sub : 'active';
  const hasFriends = Object.keys(social.friends ?? {}).length > 0;
  page.append(
    h('div', { class: 'soc-top' },
      h('div', {},
        h('h1', { class: 'soc-h1', text: 'Challenges' }),
        h('p', { class: 'muted' }, 'Playing as ', h('strong', { text: social.gamerId })),
        tutorialLink(() => showTutorial())),
      hasFriends ? h('button', {
        class: 'btn', type: 'button', text: 'New challenge',
        onClick: () => sheets.openCreate(app, { onSent: refreshSocial }),
      }) : null),
    segment(current),
    current === 'record' ? recordView(social) : current === 'friends' ? friendsView(social) : activeView(social));
  // After this render is on screen
  if (!firstVisit) setTimeout(popUnseen, 350);
  return page;
}

/** The Games tab's Challenge button: New challenge on [gameId], or setup first. */
export async function challengeFromGame(gameId) {
  const social = app.social?.gamerId ? app.social : await setUp();
  if (!social?.gamerId) return;
  if (!Object.keys(social.friends ?? {}).length) {
    toast('Add a friend first.');
    location.hash = '#challenges/friends';
    return;
  }
  sheets.openCreate(app, { gameId, onSent: refreshSocial });
}

/** Whether to show the Games tab's Challenge button for [gameId]. */
export const showChallengeButton = (gameId) => canChallenge(gameId) && app.social?.challengeAge !== 'under';

// ---- Links -------------------------------------------------------------------------

/**
 * /arena/?friend=CODE: someone's invite link. Takes the visitor through setup
 * if needed (making them a player ID if they've never played), then makes
 * them friends. Strips the code from the address first, so a reload doesn't
 * repeat it.
 */
export async function openFriendLink(code) {
  history.replaceState(null, '', `${location.pathname}#challenges/friends`);
  const social = app.social?.gamerId ? app.social : await setUp();
  if (!social?.gamerId) return;
  track('challenge_invite_open');
  await act('sendFriendRequest', { code }, (res) => (res.status === 'friends'
    ? 'You’re friends now. Send them a challenge!' : 'Request sent.'));
  location.hash = '#challenges';
}

/**
 * /arena/?challenge=CID: a link a challenger shared. Opens it once the
 * player's challenges have loaded (setting up first if needed).
 */
export async function openChallengeLink(cid) {
  history.replaceState(null, '', `${location.pathname}#challenges`);
  const social = app.social?.gamerId ? await refreshSocial() : await setUp();
  if (!social?.gamerId) return;
  track('challenge_link_open');
  // A finished one (e.g. from a game's "recent results") opens its podium, and is seen
  if (social.challenges?.[cid]?.status === 'final') markSeen([cid]);
  sheets.openChallenge(app, cid);
}
