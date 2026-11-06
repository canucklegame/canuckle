// Badge medals, the badge detail sheet, the full badge page, and the unlock
// announcements: one badge at a time, or a summary of several. A tier family
// (families.js) shows as one tile and opens to every level.

import { h, ICONS, openSheet, sheetHead, toast } from '../ui.js?v=202611060005';
import { longDate, shortDate, todayEpochDay } from '../dates.js?v=202611060005';
import { medalSvg, LEAF_PATH } from '../badges/icons.js?v=202611060005';
import { shareBadge, shareShelf } from '../badges/share.js?v=202611060005';
import { groupFamilies, isFamily, countOf } from '../badges/families.js?v=202611060005';
import { gameById } from '../games/registry.js?v=202611060005';
import { track } from '../analytics.js?v=202611060005';
import { playTodayProps } from './play.js?v=202611060005';
import { listedGames } from '../gameOrder.js?v=202611060005';

const FAMILY_COLOR = '#D52B1E';
const TIER_WORD = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
/** Families with more levels than this show "Level 3 of 24" for pips, and a shortened list of levels. */
const LONG_FAMILY = 5;

export function badgeColor(badge) {
  return badge.game ? gameById(badge.game)?.color || FAMILY_COLOR : FAMILY_COLOR;
}

function earnedText(app, badge) {
  const rec = app.badges.stored[badge.id];
  const many = badge.times > 1 ? `Earned ${badge.times} times` : null;
  if (!rec) return many || 'Earned';
  const ed = todayEpochDay(new Date(rec.earnedAt));
  if (many) return `${many} · first ${rec.dated ? '' : 'by '}${longDate(ed)}`;
  return rec.dated ? `Earned ${longDate(ed)}` : `Earned by ${longDate(ed)}`;
}

/** "×4" on a medal earned more than once. */
function countChip(badge) {
  if (!badge.earned || !(badge.times > 1)) return null;
  return h('span', { class: 'badge-count', style: { '--badge': badgeColor(badge) }, 'aria-hidden': 'true', text: `×${badge.times}` });
}

/** A medal [size] across, with its "×4" chip. */
function medalWrap(badge, size, big = false) {
  return h('span', { class: big ? 'medal-wrap big' : 'medal-wrap' },
    h('span', { html: medalSvg(badge, badgeColor(badge), size) }), countChip(badge));
}

const pct = (b) => `${Math.round((b.have / b.need) * 100)}%`;

/** True when a family's levels share one name (Canagrams' bronze, silver, gold). */
const oneName = (g) => g.tiers.every((t) => t.name === g.tiers[0].name);

/** What a level is called inside its family: its ring when the levels share a name, else its own. */
function levelName(g, t) {
  return oneName(g) ? TIER_WORD[t.tier] || t.name : t.name;
}

/** The family a badge belongs to, across every badge the player can see. */
function familyOf(app, badge) {
  return groupFamilies(app.badges.results).find((it) => isFamily(it) && it.family === badge.family) || null;
}

/** The checklist behind a badge that needs several things: done, and still missing. */
function partsList(badge) {
  const parts = badge.parts;
  if (!parts?.items?.length) return null;
  // A badge earned for good needs no checklist; a repeatable one can be
  // earned again today.
  if (badge.earned && !badge.repeatable) return null;
  const again = parts.complete ? 'Earned today' : 'Earn it again';
  return h('section', { class: 'badge-parts', 'aria-label': badge.earned ? again : 'Progress' },
    badge.earned ? h('h3', { text: again }) : null,
    h('h4', { text: parts.title }),
    h('ul', {}, parts.items.map((it) => h('li', { class: it.done ? 'done' : null },
      h('span', { class: 'tick', html: it.done ? ICONS.check : '' }),
      it.logo ? h('img', { src: it.logo, alt: '' }) : null,
      h('span', { class: 'label', text: it.label }),
      it.detail ? h('span', { class: 'detail', text: it.detail }) : null,
      h('span', { class: 'visually-hidden', text: it.done ? ', done' : ', not yet' })))),
    parts.note ? h('p', { class: 'note', text: parts.note }) : null);
}

async function doShare(app, badge) {
  const game = badge.game ? gameById(badge.game) : null;
  const result = await shareBadge(badge, badgeColor(badge), game?.name);
  if (result === 'copied') toast('Copied to clipboard');
  if (result !== 'cancelled') {
    track('badge_share', { badge: badge.id });
    app.onShared(badge.id);
  }
}

/** A family's level marks: a pip per level, or "Level 3 of 24" on a long ladder. */
function levelMarks(g) {
  const n = g.tiers.length;
  if (n > LONG_FAMILY) return h('span', { class: 'tier-level', text: g.level ? `Level ${g.level} of ${n}` : `${n} levels` });
  return h('span', { class: 'tier-pips', 'aria-hidden': 'true' },
    g.tiers.map((t) => h('i', { class: t.earned ? `on ${t.tier}` : null })));
}

/** A tier family's tile: the highest level earned, its level marks, and the way to the next. */
export function familyButton(app, g) {
  const b = g.shown;
  const n = g.tiers.length;
  const state = g.next
    ? `${g.current ? `, level ${g.level} of ${n}` : ', locked'}, ${g.next.have} of ${g.next.need} to the next level`
    : ', every level earned';
  return h('button', {
    class: 'badge-btn family',
    style: { '--badge': badgeColor(b) },
    'aria-label': `${b.name}${state}`,
    onClick: () => openFamilySheet(app, g),
  }, medalWrap(b, 64), b.name, levelMarks(g),
  g.next
    ? [h('span', { class: 'tier-bar', 'aria-hidden': 'true' }, h('i', { style: { width: pct(g.next) } })),
      h('span', { class: 'sub', 'aria-hidden': 'true', text: `${g.next.have} / ${g.next.need}` })]
    : h('span', { class: 'tier-max', text: 'Max level' }));
}

/** Tiles for [badges]: one per badge, and one per tier family. */
export function badgeTiles(app, badges) {
  return groupFamilies(badges).map((it) => (isFamily(it) ? familyButton(app, it) : medalButton(app, it)));
}

export function medalButton(app, badge) {
  const sub = badge.earned ? (badge.game ? gameById(badge.game)?.name : 'Games Arena') : `${badge.have}/${badge.need}`;
  const state = badge.earned
    ? `, earned${badge.times > 1 ? ` ${badge.times} times` : ''}`
    : `, locked, ${badge.have} of ${badge.need}`;
  return h('button', {
    class: 'badge-btn',
    'aria-label': `${badge.name}${state}`,
    onClick: () => openBadgeSheet(app, badge),
  }, medalWrap(badge, 64), badge.name, h('span', { class: 'sub', text: sub }));
}

export function openBadgeSheet(app, badge) {
  let close;
  const body = badgeDetail(app, badge, { onClose: () => close() });
  close = openSheet(body, { label: badge.name });
}

/**
 * A badge's details: its medal, what it's for, and when it was earned or how
 * close it is. [onBack], when given, adds a way back to wherever it was opened
 * from inside the same sheet (the summary of new badges).
 */
function badgeDetail(app, badge, { onClose, onBack = null }) {
  const game = badge.game ? gameById(badge.game) : null;
  return h('div', { class: 'badge-sheet' },
    sheetHead(game ? game.name : 'Games Arena badge', onClose),
    backButton(onBack),
    medalWrap(badge, 140, true),
    h('h2', { text: badge.name }),
    h('p', { class: 'muted', text: badge.desc }),
    badge.earned
      ? h('div', {},
        h('p', { text: earnedText(app, badge) }),
        partsList(badge),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', onClick: () => doShare(app, badge) }, h('span', { html: ICONS.share }), 'Share')))
      : h('div', {},
        h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(badge.need), 'aria-valuenow': String(badge.have) },
          h('div', { style: { width: `${Math.round((badge.have / badge.need) * 100)}%` } })),
        // Same-day badges count the best day so far, which today's checklist
        // below doesn't show.
        // A checklist titles its own count, so the caption would only repeat it.
        badge.bestDay ? h('p', { class: 'muted', text: `Best day so far: ${badge.have} of ${badge.need}` })
          : badge.parts ? null : h('p', { class: 'muted', text: `${badge.have} of ${badge.need}` }),
        partsList(badge)));
}

function backButton(onBack) {
  return onBack ? h('button', { class: 'badge-back', type: 'button', onClick: onBack },
    h('span', { 'aria-hidden': 'true', text: '‹' }), 'Back to your badges') : null;
}

function openFamilySheet(app, g) {
  let close;
  const body = familyDetail(app, g, { onClose: () => close() });
  close = openSheet(body, { label: g.shown.name });
}

/** "Silver · Level 2 of 3" for level [t] of [g], or how many levels there are before any is earned. */
function levelPill(g, t, level) {
  const n = g.tiers.length;
  return h('span', { class: 'tier-pill' },
    h('i', { class: t ? t.tier : null, 'aria-hidden': 'true' }),
    t ? `${TIER_WORD[t.tier] ? `${TIER_WORD[t.tier]} · ` : ''}Level ${level} of ${n}` : `Not earned yet · ${n} levels`);
}

/** The next level to earn and how close it is, or a note that every level is earned. */
function nextBox(g) {
  const nx = g.next;
  if (!nx) return h('div', { class: 'tier-next done' }, h('strong', { text: 'Every level earned' }));
  const at = nx.need > 1 ? ` at ${countOf(nx.need, nx.unit)}` : '';
  return h('div', { class: 'tier-next' },
    h('span', { class: 'tier-next-medal', html: medalSvg(nx, badgeColor(nx), 52) }),
    h('strong', { text: `Next: ${levelName(g, nx)}${at}` }),
    h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(nx.need), 'aria-valuenow': String(nx.have) },
      h('div', { style: { width: pct(nx) } })),
    h('span', { class: 'muted', text: `${nx.have} of ${nx.need} · ${nx.need - nx.have} more to go` }));
}

/**
 * Every level of [g], each with the day it was earned or how far off it is.
 * A long ladder lists the two levels below the player's and the next three,
 * with a button for the rest.
 */
function levelsList(app, g) {
  const n = g.tiers.length;
  const cur = g.current ? g.tiers.indexOf(g.current) : -1;
  const nxt = g.next ? g.tiers.indexOf(g.next) : n;
  let all = n <= LONG_FAMILY + 1;
  const detail = (t) => (oneName(g) ? countOf(t.need, t.unit) : `${countOf(t.need, t.unit)} · ${TIER_WORD[t.tier] || ''}`);
  const row = (t, i) => h('li', { class: [i === cur ? 'now' : null, t.earned ? null : 'locked'].filter(Boolean).join(' ') || null },
    h('span', { class: 'tier-row-medal', html: medalSvg(t, badgeColor(t), 36) }),
    h('span', { class: 't' }, levelName(g, t), h('small', { text: detail(t) })),
    h('span', { class: 'r' },
      i === cur ? h('b', { text: 'Current' }) : i === nxt ? h('b', { text: 'Next' }) : null,
      t.earned ? earnedShort(app, t) || 'Earned' : `${t.need - t.have} more`));
  const list = h('ol', { class: 'tier-levels' });
  const fill = () => list.replaceChildren(...g.tiers.map((t, i) => (all || (i >= cur - 2 && i <= nxt + 2) ? row(t, i) : null)).filter(Boolean));
  fill();
  const label = () => (all ? 'Show fewer' : `Show all ${n} levels`);
  const toggle = all ? null : h('button', {
    class: 'tier-all',
    type: 'button',
    'aria-expanded': 'false',
    text: label(),
    onClick: () => {
      all = !all;
      toggle.setAttribute('aria-expanded', String(all));
      toggle.textContent = label();
      fill();
    },
  });
  return h('section', { class: 'tier-levels-wrap', 'aria-label': 'All levels' },
    h('div', { class: 'tier-levels-head' }, h('h3', { text: 'All levels' }), h('span', { class: 'muted', text: `${g.level} of ${n} earned` })),
    list, toggle);
}

/**
 * A tier family's details: the highest level earned, the next one and how
 * close it is, and every level. [onBack] as for [badgeDetail].
 */
function familyDetail(app, g, { onClose, onBack = null }) {
  const b = g.shown;
  const game = b.game ? gameById(b.game) : null;
  return h('div', { class: 'badge-sheet tier-sheet', style: { '--badge': badgeColor(b) } },
    sheetHead(game ? game.name : 'Games Arena badge', onClose),
    backButton(onBack),
    medalWrap(b, 140, true),
    b.familyName && !oneName(g) ? h('span', { class: 'tier-family', text: b.familyName }) : null,
    h('h2', { text: b.name }),
    levelPill(g, g.current, g.level),
    h('p', { class: 'muted', text: b.desc }),
    g.current ? h('p', { class: 'tier-when', text: earnedText(app, g.current) }) : null,
    nextBox(g),
    levelsList(app, g),
    g.current ? h('div', { class: 'actions' },
      h('button', { class: 'btn', onClick: () => doShare(app, g.current) }, h('span', { html: ICONS.share }), 'Share')) : null);
}

function leafBurst() {
  const leaves = [];
  for (let k = 0; k < 12; k++) {
    const angle = (k / 12) * Math.PI * 2;
    const dist = 120 + (k % 3) * 30;
    leaves.push(h('span', {
      html: `<svg viewBox="0 0 100 100" style="--dx:${Math.round(Math.cos(angle) * dist)}px;--dy:${Math.round(Math.sin(angle) * dist)}px;--rot:${k * 47}deg;animation-delay:${(k % 4) * 60}ms"><path d="${LEAF_PATH}" fill="currentColor"/></svg>`,
    }));
  }
  return h('div', { class: 'leaf-burst', 'aria-hidden': 'true' }, leaves);
}

/** Shows unlock announcements one at a time; onDone(id) after each. */
export function announce(app, badges, onDone) {
  const queue = [...badges];
  const next = () => {
    const badge = queue.shift();
    if (!badge) return;
    track('badge_unlock', { badge: badge.id });
    // A family's second level and up is a level up, with the next in sight.
    const fam = badge.family ? familyOf(app, badge) : null;
    const at = fam ? fam.tiers.findIndex((t) => t.id === badge.id) : -1;
    const levelUp = at > 0;
    let close;
    const body = h('div', { class: 'badge-sheet unlock', style: { '--badge': badgeColor(badge) } },
      leafBurst(),
      h('h3', { text: levelUp ? 'Level up' : 'Badge unlocked' }),
      h('span', { html: medalSvg(badge, badgeColor(badge), 150) }),
      h('h2', { text: badge.name }),
      levelUp ? levelPill(fam, badge, at + 1) : null,
      h('p', { class: 'muted', text: badge.desc }),
      levelUp ? nextBox(fam) : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn secondary', onClick: () => doShare(app, badge) }, h('span', { html: ICONS.share }), 'Share'),
        h('button', { class: 'btn', text: queue.length ? 'Next' : 'Nice!', onClick: () => close() })));
    close = openSheet(body, {
      label: `Badge unlocked: ${badge.name}`,
      onClose: () => {
        onDone(badge.id);
        setTimeout(next, 250);
      },
    });
  };
  next();
}

/**
 * How to tell a player about [count] badges to announce: nothing, the single
 * unlock, or (for two or more, so a long-awaited first visit or a few days'
 * play doesn't become a run of pop-ups) the summary.
 */
export function unlockStyle(count) {
  if (count <= 0) return 'none';
  return count === 1 ? 'single' : 'summary';
}

/** The day a badge was recorded as earned, for its tile in the summary. */
function earnedShort(app, badge) {
  const rec = app.badges.stored[badge.id];
  const ed = badge.earnedOn ?? (rec ? todayEpochDay(new Date(rec.earnedAt)) : null);
  if (ed == null) return '';
  return badge.earnedOn != null || rec?.dated ? shortDate(ed) : `By ${shortDate(ed)}`;
}

/**
 * Every badge in [badges] at a glance, in one scrolling sheet, grouped like
 * the Badges tab. Tapping one shows its details in place, with a way back to
 * the list where it was. [firstVisit] greets someone new to the arena who has
 * already earned these. onDone(ids) once, when the sheet closes.
 */
export function announceMany(app, badges, onDone, { firstVisit = false } = {}) {
  track('badge_summary', { count: badges.length, first_visit: firstVisit });
  let close;
  let scrollTop = 0;
  const sheetEl = () => body.closest('.sheet');

  const sections = [
    { title: 'Games Arena', logo: 'images/arena.svg', list: badges.filter((b) => !b.game) },
    ...listedGames(app).map((g) => ({ title: g.name, logo: g.logo, list: badges.filter((b) => b.game === g.id) })),
  ].filter((s) => s.list.length);

  // Several new levels of one family share a tile: the highest, and how many more.
  const tile = (item) => {
    const b = isFamily(item) ? item.shown : item;
    const more = isFamily(item) ? item.tiers.length - 1 : 0;
    const levels = `+${more} level${more > 1 ? 's' : ''}`;
    return h('button', {
      class: 'badge-btn',
      type: 'button',
      'aria-label': `${b.name}, earned${b.times > 1 ? ` ${b.times} times` : ''}${more ? `, ${levels}` : ''}. Show details`,
      onClick: () => showDetail(b),
    }, medalWrap(b, 64), b.name, h('span', { class: 'sub', text: earnedShort(app, b) }),
    more ? h('span', { class: 'sub tier-plus', text: levels }) : null);
  };

  const list = h('div', { class: 'badge-summary-list' },
    leafBurst(),
    h('h3', { text: firstVisit ? 'Welcome to the Arena' : 'Badges unlocked' }),
    h('h2', { text: firstVisit ? `You've already earned ${badges.length} badges` : `${badges.length} new badges` }),
    h('p', { class: 'muted', text: 'Tap any badge to see what it’s for.' }),
    sections.map((s) => h('section', { class: 'badge-summary-section' },
      h('div', { class: 'row-head' },
        h('img', { src: s.logo, alt: '' }),
        h('h4', { text: s.title }),
        h('span', { class: 'muted', text: `${s.list.length} ${firstVisit ? 'earned' : 'new'}` })),
      h('div', { class: 'badge-grid' }, groupFamilies(s.list).map(tile)))),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn secondary',
        type: 'button',
        text: 'See all badges',
        onClick: () => { close(); location.hash = '#badges'; },
      }),
      h('button', { class: 'btn', type: 'button', text: 'Done', onClick: () => close() })));

  const detail = h('div', { class: 'badge-summary-detail', hidden: true });
  const body = h('div', { class: 'badge-sheet unlock badge-summary' },
    sheetHead(firstVisit ? 'Your badges' : 'New badges', () => close()),
    list, detail);

  function showDetail(b) {
    scrollTop = sheetEl()?.scrollTop || 0;
    const fam = b.family ? familyOf(app, b) : null;
    const opts = { onClose: () => close(), onBack: showList };
    detail.replaceChildren(fam ? familyDetail(app, fam, opts) : badgeDetail(app, b, opts));
    // The summary's own heading would sit above the badge's.
    detail.querySelector('.sheet-head')?.remove();
    list.hidden = true;
    detail.hidden = false;
    if (sheetEl()) sheetEl().scrollTop = 0;
    detail.querySelector('.badge-back')?.focus();
  }
  function showList() {
    detail.hidden = true;
    detail.replaceChildren();
    list.hidden = false;
    if (sheetEl()) sheetEl().scrollTop = scrollTop;
  }

  close = openSheet(body, {
    label: firstVisit ? `Your badges: ${badges.length} earned` : `${badges.length} new badges`,
    scrollHint: true,
    onClose: () => onDone(badges.map((b) => b.id)),
  });
}

/** "Play" at the end of a game's heading: today's puzzle, or its archive once that's done. */
function playButton(app, game) {
  const todayIdx = game.todayIndex(app.todayEd);
  if (todayIdx == null) return null;
  const entry = app.progress[game.id]?.progress?.days.get(todayIdx);
  return h('a', {
    class: 'btn small',
    style: { background: game.color },
    'aria-label': `Play ${game.name}`,
    ...playTodayProps(game, entry, todayIdx),
    text: 'Play',
  });
}

/** The Badges tab: every badge, grouped by game, each tier family as one tile. */
export function renderBadgesPage(app) {
  const all = app.badges.results;
  const earned = all.filter((b) => b.earned).length;
  const sections = [
    { title: 'Games Arena', logo: 'images/arena.svg', list: all.filter((b) => !b.game) },
    ...listedGames(app).map((g) => ({ title: g.name, logo: g.logo, game: g, list: all.filter((b) => b.game === g.id) })),
  ];
  return h('div', { class: 'wrap' },
    h('div', { class: 'page-head' },
      h('div', { class: 'grow' }, h('h1', { text: 'Badges' }),
        h('span', { class: 'muted', text: `${earned} of ${all.length} earned` })),
      h('button', {
        class: 'btn secondary',
        onClick: async () => { if (await shareShelf(earned, all.length) === 'copied') toast('Copied to clipboard'); },
      }, h('span', { html: ICONS.share }), 'Share')),
    sections.filter((s) => s.list.length).map((s) => h('section', { class: 'card', style: { marginBottom: '12px' } },
      h('div', { class: 'row-head', style: { padding: '0 0 10px' } },
        s.logo ? h('img', { src: s.logo, alt: '' }) : null,
        h('div', { class: 'grow' }, h('h2', { text: s.title }),
          h('p', { class: 'muted', text: `${s.list.filter((b) => b.earned).length} of ${s.list.length} earned` })),
        s.game ? playButton(app, s.game) : null),
      h('div', { class: 'badge-grid' }, badgeTiles(app, s.list)))));
}
