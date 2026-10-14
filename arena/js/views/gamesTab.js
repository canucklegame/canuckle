// The Games tab: each game is a swipeable strip of cards on a tint of its
// colour. A wide card for today (or this week), a square card for each of the
// previous seven, and a way into the archive at the end. Streaks and stats
// live on the Stats tab, not here.

import { h, ICONS } from '../ui.js?v=202610141420';
import { longDate, weekdayName, shortDate, ymd } from '../dates.js?v=202610141420';
import { recentIndices } from '../games/common.js?v=202610141420';
import { SOLVED, FAILED, PLAYED, PROGRESS, isDone } from '../status.js?v=202610141420';
import { LEAF_PATH } from '../badges/icons.js?v=202610141420';
import { playProps } from './play.js?v=202610141420';
import { orderedGames } from '../gameOrder.js?v=202610141420';
import { launchEd } from '../config.js?v=202610141420';

const DEFAULT_CAPTION = {
  [SOLVED]: 'SOLVED',
  [FAILED]: 'FINISHED',
  [PLAYED]: 'PLAYED',
  [PROGRESS]: 'IN PROGRESS',
};

/** Short caps line under a result: "SOLVED IN 3", "2 OF 6 WON", "NOT PLAYED". */
function caption(game, entry, isToday) {
  const status = entry?.status;
  if (!status) return isToday ? 'NOT STARTED' : 'NOT PLAYED';
  return game.resultLabel?.(entry) || DEFAULT_CAPTION[status];
}

/** CSS custom properties that colour a game's cards in both themes. */
function cardVars(game) {
  return {
    '--game': game.color,
    '--tint': game.card.tint[0],
    '--tint-dark': game.card.tint[1],
    '--frame': game.card.frame[0],
    '--frame-dark': game.card.frame[1],
  };
}

/** "Sep 21–27", or "Sep 28–Oct 4" across a month end. */
function weekRange(ed) {
  const a = ymd(ed);
  const b = ymd(ed + 6);
  return a.m === b.m ? `${shortDate(ed)}–${b.d}` : `${shortDate(ed)}–${shortDate(ed + 6)}`;
}

const TILE_FRAME = '<rect class="rt-frame" width="64" height="64" rx="14"/>';

/** The result tile on a past card: a maple leaf for a solve, and so on. */
export function resultTile(game, status) {
  let inner;
  switch (status) {
    case SOLVED:
      inner = `<rect x="10" y="10" width="44" height="44" rx="8" style="fill:var(--tile-solved, var(--game))"/>`
        + `<path transform="translate(17 16.5) scale(.3)" d="${LEAF_PATH}" fill="#fff"/>`;
      break;
    case FAILED:
      inner = '<rect x="10" y="10" width="44" height="44" rx="8" fill="#6B6862"/>'
        + '<path d="M24 24l16 16M40 24L24 40" stroke="#fff" stroke-width="5" stroke-linecap="round"/>';
      break;
    case PLAYED:
      inner = `<rect x="10" y="10" width="44" height="44" rx="8" style="fill:var(--tile-progress, var(--game))"/>`
        + '<circle cx="32" cy="32" r="9" fill="none" stroke="#fff" stroke-width="4"/>';
      break;
    case PROGRESS:
      inner = '<rect x="10" y="10" width="44" height="44" rx="8" fill="#fff"/>'
        + `<path d="M10 34h44v12a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z" style="fill:var(--tile-progress, var(--game))"/>`
        + `<g style="fill:var(--tile-progress, var(--game))"><circle cx="23" cy="24" r="3"/><circle cx="32" cy="24" r="3"/><circle cx="41" cy="24" r="3"/></g>`;
      break;
    default:
      return h('img', { class: 'rt-logo', src: game.logo, alt: '' });
  }
  return h('span', {
    class: 'result-tile',
    html: `<svg viewBox="0 0 64 64" aria-hidden="true">${TILE_FRAME}${inner}</svg>`,
  });
}

function todayCard(game, entry, todayIdx) {
  const status = entry?.status || null;
  const weekly = game.cadence === 'weekly';
  let cta = 'Play';
  let done = false;
  if (status === PROGRESS) cta = 'Continue';
  else if (isDone(status)) {
    // A multi-puzzle day still has more to play after the first finish.
    if (game.tiers.length) cta = 'Play more';
    else {
      cta = status === SOLVED ? 'Solved' : 'Finished';
      done = true;
    }
  }
  const when = weekly ? 'This week' : 'Today';
  return h('a', {
    class: 'gcard today-card',
    'aria-label': `${game.name}, ${when} ${game.label(todayIdx)}, ${caption(game, entry, true).toLowerCase()}, ${cta}`,
    ...playProps(game, todayIdx, entry, todayIdx),
  },
  h('span', { class: 'tc-top' },
    h('span', { class: 'tc-text' },
      h('span', { class: 'tc-name', text: game.name }),
      h('span', { class: 'tc-blurb', text: game.blurb })),
    h('img', { class: 'tc-logo', src: game.logo, alt: '' })),
  h('span', { class: 'tc-bottom' },
    h('span', {},
      h('span', { class: 'tc-kicker', text: caption(game, entry, true) }),
      h('span', { class: 'tc-when', text: `${when} ${game.label(todayIdx)}` })),
    h('span', { class: `cta${done ? ' done' : ''}`, text: cta })));
}

function pastCard(game, index, entry, todayIdx) {
  const ed = game.edForIndex(index);
  let day;
  let date;
  if (game.cadence === 'weekly') {
    day = index === todayIdx - 1 ? 'Last week' : 'Week of';
    date = weekRange(ed);
  } else {
    day = index === todayIdx - 1 ? 'Yesterday' : weekdayName(ed);
    date = shortDate(ed);
  }
  const text = caption(game, entry, false);
  return h('a', {
    class: 'gcard past-card',
    'aria-label': `${game.name} ${game.label(index)}, ${day} ${date}, ${text.toLowerCase()}`,
    ...playProps(game, index, entry, todayIdx),
  },
  resultTile(game, entry?.status || null),
  h('span', { class: 'pc-label', text: text }),
  h('span', { class: 'pc-day', text: day }),
  h('span', { class: 'pc-date', text: date }));
}

function seeAllCard(game) {
  return h('a', {
    class: 'gcard past-card see-all',
    href: `#archive/${game.id}`,
    'aria-label': `${game.name} Archive, see every puzzle`,
  },
  h('span', { class: 'see-all-icon', html: ICONS.calendar }),
  h('span', { class: 'pc-label', text: 'ARCHIVE' }),
  h('span', { class: 'pc-day', text: 'See all' }));
}

// ---- Making the sideways scroll obvious --------------------------------------
//
// Each strip fades out at whichever edge has more cards beyond it, and on
// devices with a mouse gets round arrow buttons, since a trackpad-less desktop
// has no natural way to scroll sideways. Touch devices swipe, so the arrows
// stay hidden there (CSS) and the fade plus the half-visible next card do the
// telling.

function updateStripEdges(row, strip) {
  const max = strip.scrollWidth - strip.clientWidth;
  row.classList.toggle('can-left', strip.scrollLeft > 4);
  row.classList.toggle('can-right', strip.scrollLeft < max - 4);
}

function scrollStrip(strip, direction) {
  // Most of a screen at a time, leaving one card in view for continuity.
  const step = Math.max(strip.clientWidth - 170, 160) * direction;
  strip.scrollBy({ left: step, behavior: 'smooth' });
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    for (const row of document.querySelectorAll('.strip-row')) {
      updateStripEdges(row, row.querySelector('.strip'));
    }
  });
}

/** "Launches Thu Nov 12" for a game not out yet, or null if it is. */
export function launchLabel(game, todayEd) {
  const ed = launchEd(game.id);
  return ed != null && todayEd < ed ? `Launches ${weekdayName(ed)} ${shortDate(ed)}` : null;
}

/** A game before its launch: one card with the date, nothing to play yet. */
function comingSoonStrip(game, todayEd) {
  const when = launchLabel(game, todayEd) || 'Coming soon';
  const card = h('div', {
    class: 'gcard today-card coming-soon',
    role: 'group',
    'aria-label': `${game.name}, coming soon, ${when}`,
  },
  h('span', { class: 'tc-top' },
    h('span', { class: 'tc-text' },
      h('span', { class: 'tc-name', text: game.name }),
      h('span', { class: 'tc-blurb', text: game.blurb })),
    h('img', { class: 'tc-logo', src: game.logo, alt: '' })),
  h('span', { class: 'tc-bottom' },
    h('span', {},
      h('span', { class: 'tc-kicker', text: 'COMING SOON' }),
      h('span', { class: 'tc-when', text: when }))));
  return h('section', { class: 'strip-row', style: cardVars(game), 'aria-label': game.name },
    h('div', { class: 'strip' }, card));
}

function gameStrip(game, progress, todayEd) {
  const todayIdx = game.todayIndex(todayEd);
  // Never "#null": a game whose first puzzle is still to come.
  if (todayIdx == null) return comingSoonStrip(game, todayEd);
  const [today, ...past] = recentIndices(game, todayEd);
  const strip = h('div', { class: 'strip' },
    todayCard(game, progress?.days.get(today), todayIdx),
    past.map((i) => pastCard(game, i, progress?.days.get(i), todayIdx)),
    seeAllCard(game));
  const row = h('section', { class: 'strip-row', style: cardVars(game), 'aria-label': game.name },
    strip,
    // Cards run from today on the left back in time to the right.
    h('button', {
      class: 'strip-nav prev',
      'aria-label': `Back towards today's ${game.name}`,
      html: ICONS.back,
      onClick: () => scrollStrip(strip, -1),
    }),
    h('button', {
      class: 'strip-nav next',
      'aria-label': `Earlier ${game.name} puzzles`,
      html: ICONS.back,
      onClick: () => scrollStrip(strip, 1),
    }));
  strip.addEventListener('scroll', () => updateStripEdges(row, strip), { passive: true });
  requestAnimationFrame(() => updateStripEdges(row, strip));
  return row;
}

/** A small streak pill, used by the archive and Stats pages. */
export function streakChip(game, progress) {
  const n = progress?.streak || 0;
  const unit = game.cadence === 'weekly' ? 'week' : 'day';
  return h('span', {
    class: `streak-chip${n ? '' : ' zero'}`,
    title: `Current streak: ${n} ${unit}${n === 1 ? '' : 's'}`,
    'aria-label': `Current streak ${n} ${unit}${n === 1 ? '' : 's'}`,
  }, h('span', { html: ICONS.flame }), String(n));
}

export function renderGames(app) {
  const { games, todayEd, progress, uid } = app;
  const daily = games.filter((g) => g.cadence === 'daily');
  const doneToday = daily.filter((g) => {
    const p = progress[g.id]?.progress;
    return p && isDone(p.days.get(g.todayIndex(todayEd))?.status);
  }).length;

  return h('div', { class: 'wrap' },
    h('div', { class: 'today-line' },
      h('h1', { text: `${weekdayName(todayEd)}, ${longDate(todayEd)}` }),
      h('span', { class: 'muted', text: uid ? `${doneToday} of ${daily.length} daily games finished today` : '' })),
    uid ? null : h('div', { class: 'notice' },
      'Welcome! Pick any game to start. Your streaks, archive and badges show up here once you have played.'),
    orderedGames(app).map((g) => gameStrip(g, progress[g.id]?.progress, todayEd)),
    // Sandbox only (production hides them): games still to launch at this offset.
    (app.upcoming || []).map((g) => comingSoonStrip(g, todayEd)));
}
