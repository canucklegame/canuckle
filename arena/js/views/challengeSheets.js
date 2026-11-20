// The challenge sheets: New challenge, an invite to accept, and results.
// Only loaded while featureOn('challenges') (through challengesTab.js).

import { h, openSheet, sheetHead, toast, statusIcon, ICONS } from '../ui.js?v=202611200021';
import { call, reasonText } from '../social/api.js?v=202611200021';
import {
  canChallenge, puzzleFor, fromPuzzle, puzzleTitle, startedHere, WINNER_RULE, CANOGGLE_LIMITS, limitLabel,
} from '../social/puzzles.js?v=202611200021';
import { gameById } from '../games/registry.js?v=202611200021';
import {
  podiumLayout, headline, shareText, arenaLink, trophySvg, avatarParts, restText, whenText, ordinal, PLACE_NAMES,
} from '../social/podium.js?v=202611200021';
import { fireworks, SHOWS } from '../social/fireworks.js?v=202611200021';
import { arenaGet, arenaSet } from '../local.js?v=202611200021';
import { trackPlay } from './play.js?v=202611200021';
import { track } from '../analytics.js?v=202611200021';

const MAX_FRIENDS = 9;
const when = (ms) => new Date(ms).toLocaleString('en-CA', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function timeLeft(ms, now = Date.now()) {
  const mins = Math.max(0, Math.round((ms - now) / 60000));
  if (mins < 60) return `${mins} min left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h left`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h left`;
}

/**
 * Goes into the game on puzzle [index] / [tier], as the Games tab does.
 * [limit]: a Canoggle challenge's time limit, which the board then plays.
 */
export function launch(app, game, index, tier, limit = null) {
  const isToday = index === game.todayIndex(app.todayEd);
  trackPlay(game, index, tier, isToday);
  location.href = game.link(index, tier, isToday, { limit });
}

// ---- New challenge -----------------------------------------------------------------

/**
 * Opens New challenge. [gameId]: start on that game; [friendPub]: tick that
 * friend. Challenges are for today's puzzle (this week's for Canuckle+), and
 * only one the player hasn't started.
 */
export function openCreate(app, { gameId = null, friendPub = null, onSent } = {}) {
  const social = app.social;
  const friends = Object.entries(social?.friends ?? {}).sort(([, a], [, b]) => a.gamerId.localeCompare(b.gamerId));
  if (!friends.length) {
    toast('Add a friend first, from Challenges → Friends.');
    return;
  }
  const games = app.games.filter((g) => canChallenge(g.id) && g.todayIndex(app.todayEd) != null);
  const state = {
    game: games.find((g) => g.id === gameId) ?? null,
    tier: null,
    // Canoggle: the time limit everyone plays (seconds, 0 for none)
    limit: 0,
    // The friend it was started from; with only one friend, them.
    picked: new Set(friendPub && social.friends[friendPub] ? [friendPub] : friends.length === 1 ? [friends[0][0]] : []),
    sending: false,
  };
  let close;
  const body = h('div', { class: 'soc-step' });

  const entryFor = (game) => app.progress[game.id]?.progress?.days?.get(game.todayIndex(app.todayEd));
  const firstOpenTier = (game) => game.tiers.find((t) => !startedHere(game, entryFor(game), t.key))?.key ?? null;

  function pickGame(game) {
    state.game = game;
    state.tier = game.tiers.length ? firstOpenTier(game) : null;
    state.limit = 0;
    draw();
  }

  // Canoggle: everyone plays the challenger's time limit.
  function limitPart() {
    const options = CANOGGLE_LIMITS[state.tier];
    if (state.game?.id !== 'canoggle' || !options) return null;
    if (!options.includes(state.limit)) state.limit = 0;
    return h('div', { class: 'tier-group' },
      h('h3', { text: 'Time limit' }),
      h('div', { class: 'tier-list' }, options.map((secs) => h('button', {
        class: `tier-btn${state.limit === secs ? ' picked' : ''}`, type: 'button',
        'aria-pressed': state.limit === secs ? 'true' : 'false',
        onClick: () => { state.limit = secs; draw(); },
      }, limitLabel(secs)))),
      h('p', { class: 'soc-hint', text: 'Everyone plays this limit, whatever their own setting.' }));
  }

  function gameList() {
    return h('div', { class: 'soc-game-grid' }, games.map((g) => h('button', {
      class: 'soc-game-btn', type: 'button', onClick: () => pickGame(g),
    }, h('img', { src: g.logo, alt: '' }), h('span', { text: g.name }))));
  }

  function puzzlePart() {
    const g = state.game;
    const index = g.todayIndex(app.todayEd);
    const entry = entryFor(g);
    const weekly = g.cadence === 'weekly';
    const head = h('div', { class: 'soc-picked-game' },
      h('img', { src: g.logo, alt: '' }),
      h('span', { class: 'soc-who' },
        h('strong', { text: `${g.name} ${g.label(index)}` }),
        h('span', { class: 'muted', text: weekly ? 'This week' : 'Today' })),
      games.length > 1 ? h('button', { class: 'text-btn', type: 'button', text: 'Change', onClick: () => { state.game = null; draw(); } }) : null);
    if (!g.tiers.length) {
      const started = startedHere(g, entry, null);
      return [head, started ? h('p', { class: 'soc-error', text: `You’ve already played ${weekly ? 'this week’s' : 'today’s'} ${g.name}. Challenges are for a puzzle you haven’t started.` }) : null];
    }
    const groups = [...new Set(g.tiers.map((t) => t.group || ''))];
    return [head, groups.map((grp) => h('div', { class: 'tier-group' },
      grp ? h('h3', { text: grp }) : null,
      h('div', { class: 'tier-list' }, g.tiers.filter((t) => (t.group || '') === grp).map((t) => {
        const played = startedHere(g, entry, t.key);
        return h('button', {
          class: `tier-btn${state.tier === t.key ? ' picked' : ''}`, type: 'button', disabled: played,
          'aria-pressed': state.tier === t.key ? 'true' : 'false',
          onClick: () => { state.tier = t.key; draw(); },
        }, played ? statusIcon(entry?.tiers?.[t.key]) : null, t.label, played ? h('span', { class: 'soc-played', text: 'Played' }) : null);
      })))),
    h('p', { class: 'soc-hint' }, h('span', { class: 'soc-inline-icon', html: ICONS.lock }),
      'You can only challenge on a puzzle you haven’t started.')];
  }

  function friendsPart() {
    return h('div', { class: 'soc-stack' },
      h('div', { class: 'soc-between' },
        h('h3', { text: friends.length === 1 ? 'Your friend to challenge' : 'Pick the friends to challenge' }),
        h('span', { class: 'muted', text: `${state.picked.size} of ${Math.min(MAX_FRIENDS, friends.length)} picked` })),
      h('div', { class: 'soc-list soc-checks' }, friends.map(([pub, f]) => {
        const box = h('input', { type: 'checkbox', checked: state.picked.has(pub) });
        box.addEventListener('change', () => {
          if (box.checked && state.picked.size >= MAX_FRIENDS) {
            box.checked = false;
            toast(`A challenge can include up to ${MAX_FRIENDS} friends.`);
            return;
          }
          if (box.checked) state.picked.add(pub);
          else state.picked.delete(pub);
          draw();
        });
        return h('label', { class: 'soc-row-item soc-check' },
          h('span', { class: 'soc-who' }, h('strong', { text: f.gamerId })), box);
      })));
  }

  async function send() {
    const g = state.game;
    const index = g.todayIndex(app.todayEd);
    state.sending = true;
    draw();
    try {
      const { cid } = await call('createChallenge', {
        game: g.id, puzzle: puzzleFor(g, index, state.tier, state.limit), friends: [...state.picked],
      });
      track('challenge_create', { target_game: g.id, friends: state.picked.size });
      close();
      if (onSent) onSent();
      sentSheet(app, g, index, state.tier, g.id === 'canoggle' ? state.limit : null, cid,
        [...state.picked].map((p) => social.friends[p].gamerId));
    } catch (e) {
      state.sending = false;
      draw();
      toast(e.reason === 'already-started'
        ? `You’ve already started that ${g.name} puzzle. Pick one you haven’t.`
        : reasonText(e.reason));
    }
  }

  function draw() {
    const g = state.game;
    const ready = g && (!g.tiers.length ? !startedHere(g, entryFor(g), null) : !!state.tier) && state.picked.size > 0;
    const label = state.sending ? 'Sending…'
      : !g ? 'Pick a game'
        : !state.picked.size ? 'Pick a friend to challenge'
          : 'Send & Play';
    // replaceChildren() doesn't unpack lists (it would print them as text),
    // so flatten the parts and drop the empty ones first.
    body.replaceChildren(...[
      sheetHead('New challenge', () => close()),
      g ? puzzlePart() : gameList(),
      g ? limitPart() : null,
      g ? friendsPart() : null,
      g ? h('p', { class: 'soc-hint soc-center' }, h('span', { class: 'soc-inline-icon', html: ICONS.clock }),
        `Open for 3 days. ${WINNER_RULE[g.id]}`) : null,
      h('button', { class: 'btn soc-wide', type: 'button', disabled: !ready || state.sending, text: label, onClick: send }),
    ].flat(Infinity).filter(Boolean));
  }

  if (state.game) state.tier = state.game.tiers.length ? firstOpenTier(state.game) : null;
  draw();
  close = openSheet(body, { label: 'New challenge', className: 'soc-sheet tall', scrollHint: true });
}

/** After sending: play now, or share the news first. */
function sentSheet(app, game, index, tier, limit, cid, names) {
  let close;
  const title = puzzleTitle(game, index, tier, limit);
  const who = names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  const share = async () => {
    const url = `${location.origin}${location.pathname}?challenge=${cid}`;
    const text = `I challenged you to ${title} on the Canuckle Games Arena!`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) return await navigator.share({ title: 'Canuckle challenge', text, url });
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('Link copied.');
    } catch {
      // Cancelled.
    }
    return undefined;
  };
  close = openSheet(h('div', { class: 'soc-step' },
    sheetHead('Challenge sent', () => close(), game.logo),
    h('p', {}, `${who} ${names.length === 1 ? 'has' : 'have'} 3 days to play `, h('strong', { text: title }), '. They’ll see it in their Challenges tab.'),
    h('div', { class: 'actions' },
      h('button', { class: 'btn secondary', type: 'button', onClick: share }, h('span', { html: ICONS.share }), 'Tell them'),
      h('button', { class: 'btn', type: 'button', text: 'Play now', onClick: () => { close(); launch(app, game, index, tier, limit); } }))),
  { label: 'Challenge sent' });
}

// ---- An invite --------------------------------------------------------------------

/** The players as a short line of chips: who has played (✓) and who hasn't. */
export function playerChips(view, myPub) {
  return h('div', { class: 'soc-chips' }, view.players.map((p) => h('span', {
    class: `soc-chip ${p.state === 'done' ? 'done' : p.state}`,
  },
  p.state === 'done' ? h('span', { html: ICONS.check }) : ['invited', 'accepted'].includes(p.state) ? h('span', { html: ICONS.clock }) : null,
  p.pub === myPub ? 'You' : p.gamerId)));
}

/** Opens challenge [cid] for the player: accept an invite, play, or see results. */
export function openChallenge(app, cid) {
  const view = app.social?.challenges?.[cid];
  if (!view) {
    toast('That challenge isn’t in your list. It may have ended, or be for another player.');
    return;
  }
  if (view.status === 'final' || ['done', 'declined', 'expired', 'ineligible'].includes(view.me)) {
    openResults(app, cid);
    return;
  }
  const game = gameById(view.game);
  const { index, tier, limit = null } = fromPuzzle(view.game, view.puzzle);
  const title = game ? puzzleTitle(game, index, tier, limit) : view.game;
  let close;
  // Already finished this puzzle before being invited: accepting counts that
  // result and shows the standings, rather than starting the game.
  const played = view.me === 'invited' && view.played === true;
  const respond = async (accept) => {
    try {
      await call('respondChallenge', { cid, accept });
      track(accept ? 'challenge_accept' : 'challenge_decline', { target_game: view.game });
      close();
      if (accept && played) {
        await (await import('./challengesTab.js?v=202611200021')).refreshSocial();
        openResults(app, cid);
      } else if (accept && game) launch(app, game, index, tier, limit);
      else (await import('./challengesTab.js?v=202611200021')).refreshSocial();
    } catch (e) {
      toast(reasonText(e.reason));
    }
  };
  const invited = view.me === 'invited';
  close = openSheet(h('div', { class: 'soc-step' },
    sheetHead(invited ? `${view.from} challenged you` : 'Your challenge', () => close(), game?.logo),
    h('div', { class: 'soc-picked-game' },
      game ? h('img', { src: game.logo, alt: '' }) : null,
      h('span', { class: 'soc-who' }, h('strong', { text: title }), h('span', { class: 'muted', text: game ? game.blurb : '' }))),
    h('dl', { class: 'soc-facts' },
      h('dt', { text: 'Players' }), h('dd', {}, playerChips(view, app.social.pub)),
      h('dt', { text: 'Ends' }), h('dd', {}, when(view.expiresAt), h('span', { class: 'muted', text: ` · ${timeLeft(view.expiresAt)}` })),
      h('dt', { text: 'Winner' }), h('dd', { text: WINNER_RULE[view.game] ?? '' })),
    played
      ? h('p', { class: 'soc-note' }, h('span', { class: 'soc-inline-icon', html: ICONS.check }),
        'You’ve already played this puzzle. Accept to count your result and see everyone’s.')
      : h('p', { class: 'soc-note' }, h('span', { class: 'soc-inline-icon', html: ICONS.lock }),
        'Everyone’s results stay hidden until you finish.'),
    invited
      ? h('div', { class: 'soc-stack' },
        h('button', { class: 'btn soc-wide', type: 'button', text: played ? 'Accept & see results' : 'Accept & Play', onClick: () => respond(true) }),
        h('div', { class: 'actions' },
          h('button', { class: 'btn secondary', type: 'button', text: 'Decline', onClick: () => respond(false) }),
          h('button', { class: 'text-btn', type: 'button', text: 'Not now', onClick: () => close() })))
      : h('button', { class: 'btn soc-wide', type: 'button', text: 'Play now', onClick: () => { close(); if (game) launch(app, game, index, tier, limit); } })),
  { label: title });
}

// ---- Results --------------------------------------------------------------------
//
// A podium: the steps rise (lowest first) with each place's score, the
// players are revealed 3rd to 1st, and a player who placed in a final
// challenge sees their trophy big and centred with fireworks before it flies
// to its spot beside their avatar. The animation plays the first time a
// final result is seen on this browser; after that it's at rest, with Replay.
// While a challenge is open it shows the results so far, at rest, with dashed
// steps for places still to be reached. (The podium replaced the bar chart:
// the steps carry the top three scores and the list below the rest, so the
// bars only repeated them; bars.js stays, mirroring the games' widget.)

/** "1st of 3", "Tie for 1st", "Didn't play", "Declined" for the player's line. */
export function placeText(view, myPub) {
  const me = view.players.find((p) => p.pub === myPub);
  if (!me) return '';
  if (me.state === 'declined') return 'Declined';
  if (me.state === 'ineligible') return 'Didn’t count';
  if (me.state === 'expired') return 'Didn’t play';
  if (me.rank == null) return view.status === 'final' ? '' : 'Played';
  const ranked = view.players.filter((p) => p.rank != null);
  const tied = ranked.filter((p) => p.rank === me.rank).length > 1;
  return tied ? `Tie for ${ordinal(me.rank)}` : `${ordinal(me.rank)} of ${ranked.length}`;
}

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Final results whose podium has played on this browser, per player.
const podiumKey = (app) => `podiumSeen.${app.uid}`;
const podiumSeen = (app, cid) => (arenaGet(podiumKey(app), []) || []).includes(cid);
function markPodiumSeen(app, cid) {
  try {
    const list = (arenaGet(podiumKey(app), []) || []).filter((c) => c !== cid);
    list.push(cid);
    arenaSet(podiumKey(app), list.slice(-200));
  } catch {
    // No storage: it plays again next time.
  }
}

function avatarEl(p) {
  const a = avatarParts(p.pub, p.gamerId);
  return h('span', { class: 'pod-avatar', 'aria-hidden': 'true', text: a.initials, style: { background: a.colour } });
}

function stepColumn(step, me) {
  return h('div', {
    class: `pod-col${step.ghost ? ' ghost' : ''}`, 'data-place': String(step.place), style: { '--h': `${step.height}px` },
  },
  h('div', { class: `pod-who${step.players.length > 2 ? ' many' : ''}` },
    step.ghost
      ? h('div', { class: 'pod-p' },
        h('span', { class: 'pod-av-wrap' }, h('span', { class: 'pod-avatar ghost', 'aria-hidden': 'true', text: '?' })),
        h('span', { class: 'pod-name', text: 'Waiting' }))
      : step.players.map((p) => h('div', { class: `pod-p${p.pub === me ? ' me' : ''}`, 'data-pub': p.pub },
        h('span', { class: 'pod-av-wrap' }, avatarEl(p)),
        h('span', { class: 'pod-name', text: p.pub === me ? 'You' : p.gamerId })))),
  h('div', { class: 'pod-block' },
    h('span', { class: 'pod-place', text: ordinal(step.place) }),
    h('span', { class: 'pod-score', text: step.score })));
}

function restList(players, me) {
  return h('ol', { class: 'pod-rest', 'aria-label': 'Everyone else' }, players.map((p) => h('li', {
    class: `pod-row${p.pub === me ? ' me' : ''}${['invited', 'accepted'].includes(p.state) ? ' pending' : p.rank == null ? ' out' : ''}`,
  },
  h('span', { class: 'pod-rk', text: p.rank != null ? String(p.rank) : '·' }),
  h('span', { class: 'pod-nm' }, h('strong', { text: p.pub === me ? 'You' : p.gamerId }),
    p.already ? h('span', { class: 'muted', text: ' · already played' }) : null),
  h('span', { class: 'pod-sc', text: restText(p) }))));
}

/** "Challenge ended today", "Challenge ended Nov 14". */
function endedText(ms) {
  const w = whenText(ms);
  return `Challenge ended ${/^(Today|Yesterday)$/.test(w) ? w.toLowerCase() : w}`;
}

export function openResults(app, cid) {
  const view = app.social?.challenges?.[cid];
  if (!view) return;
  const game = gameById(view.game);
  const { index, tier, limit = null } = fromPuzzle(view.game, view.puzzle);
  const title = game ? puzzleTitle(game, index, tier, limit) : view.game;
  const me = app.social.pub;
  const lay = podiumLayout(view, me);
  const [head, sub] = headline(view, me);
  const { final } = lay;
  const rule = WINNER_RULE[view.game] ?? '';

  const headEl = h('h2', { class: 'pod-headline' });
  const subEl = h('p', { class: 'pod-sub' });
  const cols = lay.steps.map((s) => stepColumn(s, me));
  const stage = cols.length ? h('div', { class: `pod-stage${cols.length === 2 ? ' two' : ''}` }, cols) : null;
  const rest = lay.rest.length ? restList(lay.rest, me) : null;
  const shareBtn = final ? h('button', { class: 'btn', type: 'button' }, h('span', { html: ICONS.share }), 'Share results') : null;
  const replayBtn = h('button', { class: 'btn secondary', type: 'button', text: 'Replay', hidden: true });
  const skipBtn = h('button', { class: 'btn secondary', type: 'button', text: 'Skip', hidden: true });
  const sharePre = h('pre', { class: 'pod-share-text' });
  const shareBox = h('div', { class: 'pod-share', hidden: true },
    h('p', { class: 'soc-hint', text: 'Copy this and paste it into your group chat.' }), sharePre);
  let close = () => {};
  const root = h('div', { class: 'soc-step pod instant' },
    sheetHead(final ? `${title} · Final` : title, () => close(), game?.logo),
    h('p', { class: 'pod-when muted', text: final ? endedText(view.closedAt ?? view.expiresAt) : `Ends ${when(view.expiresAt)} · ${timeLeft(view.expiresAt)}` }),
    h('div', { class: 'pod-heads', 'aria-live': 'polite' }, headEl, subEl),
    stage, rest,
    h('div', { class: 'actions pod-actions' }, shareBtn, replayBtn, skipBtn),
    shareBox,
    h('p', { class: 'soc-hint soc-center', text: final ? rule : `${rule} Final results come in when everyone has played, or when the challenge ends.` }));

  // ---- The show
  const timers = [];
  let fx = null;
  let overlay = null;
  let playing = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  function stopShow() {
    timers.forEach(clearTimeout);
    timers.length = 0;
    fx?.stop();
    fx = null;
    overlay?.remove();
    overlay = null;
    playing = false;
  }
  function setButtons() {
    skipBtn.hidden = !playing;
    replayBtn.hidden = playing || !final || !lay.steps.length || reduceMotion();
  }
  /** The player's trophy beside their avatar (replacing any already there). */
  function placeTrophy() {
    if (!lay.trophy || !stage) return null;
    const wrap = stage.querySelector(`.pod-p[data-pub="${me}"] .pod-av-wrap`);
    if (!wrap) return null;
    wrap.querySelector('.pod-trophy')?.remove();
    const t = h('span', { class: 'pod-trophy', title: PLACE_NAMES[lay.trophy], html: trophySvg(lay.trophy) });
    wrap.append(t);
    return t;
  }
  function atRest() {
    stopShow();
    root.classList.add('instant');
    cols.forEach((c) => c.classList.add('risen', 'named'));
    rest?.classList.add('shown');
    headEl.textContent = head;
    subEl.textContent = sub;
    placeTrophy();
    setButtons();
  }
  function done() {
    headEl.textContent = head;
    subEl.textContent = sub;
    playing = false;
    setButtons();
  }
  function play() {
    stopShow();
    root.classList.add('instant');
    cols.forEach((c) => c.classList.remove('risen', 'named'));
    rest?.classList.remove('shown');
    stage?.querySelector('.pod-trophy')?.remove();
    headEl.textContent = '';
    subEl.textContent = '';
    void root.offsetHeight; // start from flat, then turn the transitions back on
    root.classList.remove('instant');
    playing = true;
    setButtons();
    // 1. The steps rise, lowest first. 2. The players appear, 3rd up to 1st.
    const up = [...cols].sort((a, b) => Number(b.dataset.place) - Number(a.dataset.place));
    up.forEach((c, i) => later(150 + i * 260, () => c.classList.add('risen')));
    const t2 = 150 + up.length * 260 + 700;
    up.forEach((c, i) => later(t2 + i * 450, () => c.classList.add('named')));
    const t3 = t2 + up.length * 450 + 300;
    later(t3, () => rest?.classList.add('shown'));
    // 3. The player's moment
    later(t3 + 200, lay.trophy ? bigMoment : done);
  }
  function bigMoment() {
    const place = lay.trophy;
    const scrim = h('div', { class: 'pod-scrim' });
    const big = h('div', { class: 'pod-big', html: trophySvg(place) });
    const label = h('div', { class: 'pod-big-label', text: head });
    const canvas = h('canvas', { class: 'pod-canvas' });
    overlay = h('div', { class: 'pod-fx', 'aria-hidden': 'true' }, scrim, big, label, canvas);
    document.body.append(overlay);
    fx = fireworks(canvas);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrim.classList.add('on');
      big.classList.add('in');
    }));
    later(300, () => label.classList.add('on'));
    const centre = () => {
      const r = big.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    // Fireworks: more and bigger for a better place; leaves from the cup for 1st
    const show = SHOWS[place];
    for (let i = 0; i < show.bursts; i++) {
      later(450 + i * show.every, () => {
        const c = centre();
        const spread = i === 0 ? 0 : 110;
        fx?.burst(c.x + (Math.random() - 0.5) * spread * 2, c.y + (Math.random() - 0.6) * spread, place, show.size);
      });
    }
    if (place === 1) later(500, () => fx?.fountain(centre, 1600));
    const hold = 450 + show.bursts * show.every + 500;
    // Then straight to its spot: the final trophy goes in first, unseen, and
    // the big one flies to its exact centre and size before they swap.
    later(hold, () => {
      label.classList.remove('on');
      scrim.classList.remove('on');
      const placed = placeTrophy();
      if (!placed) return;
      placed.style.visibility = 'hidden';
      placed.scrollIntoView?.({ block: 'nearest' });
      const end = placed.getBoundingClientRect();
      big.classList.add('fly');
      big.style.left = `${end.left + end.width / 2}px`;
      big.style.top = `${end.top + end.height / 2}px`;
      big.style.transform = `translate(-50%, -50%) scale(${end.width / big.offsetWidth})`;
    });
    later(hold + 820, () => {
      const placed = stage?.querySelector('.pod-trophy');
      if (placed) placed.style.visibility = '';
      big.remove();
      if (place === 1 && placed) {
        const r = placed.getBoundingClientRect();
        fx?.burst(r.left + r.width / 2, r.top + r.height / 2, 1, 0.5);
      }
      done();
    });
    // The last sparks fade, then the overlay goes
    later(hold + 3200, () => {
      fx?.stop();
      fx = null;
      overlay?.remove();
      overlay = null;
    });
  }

  replayBtn.addEventListener('click', play);
  skipBtn.addEventListener('click', atRest);

  // ---- Sharing (final results only)
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Results copied. Paste them into your group chat.');
    } catch {
      // Refused: show the text selected, to copy by hand
      sharePre.textContent = text;
      shareBox.hidden = false;
      const range = document.createRange();
      range.selectNodeContents(sharePre);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      toast('Selected. Copy it with your keyboard.');
    }
  }
  shareBtn?.addEventListener('click', () => {
    const text = shareText(view, me, app.social.gamerId, title, arenaLink(new URL('./', document.baseURI).href));
    track('challenge_results_share', { target_game: view.game });
    // Phones: the share sheet, opened inside the tap. Elsewhere: copy.
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      navigator.share({ title: 'Canuckle challenge results', text })
        .catch((e) => { if (e?.name !== 'AbortError') copyText(text); });
      return;
    }
    copyText(text);
  });

  close = openSheet(root, { label: title, className: 'soc-sheet pod-sheet', onClose: stopShow });
  if (final && lay.steps.length && !reduceMotion() && !podiumSeen(app, cid)) {
    markPodiumSeen(app, cid);
    requestAnimationFrame(play);
  } else {
    atRest();
  }
}
