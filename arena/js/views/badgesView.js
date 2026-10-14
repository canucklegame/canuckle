// Badge medals, the badge detail sheet, the full badge page, and the unlock
// announcement.

import { h, ICONS, openSheet, sheetHead, toast } from '../ui.js?v=202610141420';
import { longDate, todayEpochDay } from '../dates.js?v=202610141420';
import { medalSvg, LEAF_PATH } from '../badges/icons.js?v=202610141420';
import { shareBadge, shareShelf } from '../badges/share.js?v=202610141420';
import { gameById } from '../games/registry.js?v=202610141420';
import { track } from '../analytics.js?v=202610141420';

const FAMILY_COLOR = '#D52B1E';

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

export function medalButton(app, badge) {
  const sub = badge.earned ? (badge.game ? gameById(badge.game)?.name : 'Games Arena') : `${badge.have}/${badge.need}`;
  const state = badge.earned
    ? `, earned${badge.times > 1 ? ` ${badge.times} times` : ''}`
    : `, locked, ${badge.have} of ${badge.need}`;
  return h('button', {
    class: 'badge-btn',
    'aria-label': `${badge.name}${state}`,
    onClick: () => openBadgeSheet(app, badge),
  }, h('span', { class: 'medal-wrap' }, h('span', { html: medalSvg(badge, badgeColor(badge), 64) }), countChip(badge)),
  badge.name, h('span', { class: 'sub', text: sub }));
}

export function openBadgeSheet(app, badge) {
  let close;
  const game = badge.game ? gameById(badge.game) : null;
  const body = h('div', { class: 'badge-sheet' },
    sheetHead(game ? game.name : 'Games Arena badge', () => close()),
    h('span', { class: 'medal-wrap big' }, h('span', { html: medalSvg(badge, badgeColor(badge), 140) }), countChip(badge)),
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
  close = openSheet(body, { label: badge.name });
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
    let close;
    const body = h('div', { class: 'badge-sheet unlock' },
      leafBurst(),
      h('h3', { text: 'Badge unlocked' }),
      h('span', { html: medalSvg(badge, badgeColor(badge), 150) }),
      h('h2', { text: badge.name }),
      h('p', { class: 'muted', text: badge.desc }),
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

/** The Badges tab: every badge, grouped by game. */
export function renderBadgesPage(app) {
  const all = app.badges.results;
  const earned = all.filter((b) => b.earned).length;
  const sections = [
    { title: 'Games Arena', logo: 'images/arena.svg', list: all.filter((b) => !b.game) },
    ...app.games.map((g) => ({ title: g.name, logo: g.logo, list: all.filter((b) => b.game === g.id) })),
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
        s.logo ? h('img', { src: s.logo, alt: '', style: { width: '28px', height: '28px' } }) : null,
        h('h2', { text: s.title })),
      h('div', { class: 'badge-grid' }, s.list.map((b) => medalButton(app, b))))));
}
