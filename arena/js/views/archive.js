// A game's archive: one month at a time, with buttons to step between months.
//
// Daily games get a Sunday-first month grid, one cell per puzzle. Canuckle+
// is weekly and its weeks start on Monday, so its grid is Monday-first and
// each week is a single band across the row: the whole week is one puzzle.

import { h, ICONS, statusIcon, tierMarks } from '../ui.js?v=202610131208';
import { ymd, epochDay, monthName, monthTitle, daysInMonth, shortDate } from '../dates.js?v=202610131208';
import { SOLVED, FAILED, PLAYED, PROGRESS, STATUS_LABEL, isDone } from '../status.js?v=202610131208';
import { playProps } from './play.js?v=202610131208';
import { streakChip } from './gamesTab.js?v=202610131208';

const DOW_SUNDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOW_MONDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// The month each game's archive was last showing, so coming back to it (or a
// data refresh re-rendering the page) lands on the same month.
const shownMonth = new Map();

function legend(game) {
  const items = [[SOLVED], [PROGRESS], [null]];
  if (game.id === 'canuckle' || game.id === 'plus' || game.id === 'canoggle') items.splice(1, 0, [FAILED]);
  if (game.id === 'canolitaire') items.splice(1, 0, [PLAYED]);
  return h('div', { class: 'legend' },
    items.map(([s]) => h('span', {}, statusIcon(s), s ? STATUS_LABEL[s] : 'Not played')));
}

const monthKey = (y, m) => y * 12 + (m - 1);
const fromKey = (k) => ({ y: Math.floor(k / 12), m: (k % 12) + 1 });

/** Sunday-first grid for a daily game. */
function dailyGrid(game, progress, y, m, todayEd, todayIdx) {
  const first = epochDay(y, m, 1);
  const cells = [];
  for (let k = 0; k < ymd(first).weekday; k++) cells.push(h('span', { class: 'day blank', 'aria-hidden': 'true' }));
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const ed = first + d - 1;
    if (ed > todayEd) {
      cells.push(h('span', { class: 'day future', 'aria-hidden': 'true' }, String(d)));
      continue;
    }
    const index = game.indexForEd(ed);
    if (index == null) {
      cells.push(h('span', { class: 'day none', 'aria-hidden': 'true' }, String(d)));
      continue;
    }
    const entry = progress?.days.get(index);
    const status = entry?.status || '';
    cells.push(h('a', {
      class: `day ${status}${ed === todayEd ? ' is-today' : ''}`,
      'aria-label': `${shortDate(ed)}, ${game.name} ${game.label(index)}, ${STATUS_LABEL[status] || 'Not played'}`,
      ...playProps(game, index, entry, todayIdx),
    }, String(d), tierMarks(game, entry)));
  }
  return h('div', { class: 'cal' },
    DOW_SUNDAY.map((d) => h('span', { class: 'dow', 'aria-hidden': 'true', text: d })),
    cells);
}

/**
 * Monday-first grid for Canuckle+: one band per week that touches the month.
 * Days from the neighbouring months are shown faintly so every band is a full
 * week, the same week the puzzle covers.
 */
function weeklyGrid(game, progress, y, m, todayEd, todayIdx) {
  const first = epochDay(y, m, 1);
  const last = first + daysInMonth(y, m) - 1;
  // Back up to the Monday on or before the 1st (weekday: 0 Sun .. 6 Sat).
  const lead = (ymd(first).weekday + 6) % 7;
  const rows = [];
  for (let monday = first - lead; monday <= last; monday += 7) {
    const days = [];
    for (let k = 0; k < 7; k++) {
      const ed = monday + k;
      const inMonth = ed >= first && ed <= last;
      days.push(h('span', {
        class: `wk-day${inMonth ? '' : ' outside'}${ed === todayEd ? ' is-today' : ''}`,
        'aria-hidden': 'true',
        text: String(ymd(ed).d),
      }));
    }
    const index = game.indexForEd(monday);
    if (monday > todayEd || index == null) {
      rows.push(h('div', { class: `week-band ${monday > todayEd ? 'future' : 'none'}` },
        h('span', { class: 'wk-num', 'aria-hidden': 'true' }, ''), days));
      continue;
    }
    const entry = progress?.days.get(index);
    const status = entry?.status || '';
    rows.push(h('a', {
      class: `week-band ${status}${index === todayIdx ? ' is-current' : ''}`,
      'aria-label': `${game.name} ${game.label(index)}, week of ${shortDate(monday)}, ${STATUS_LABEL[status] || 'Not played'}`,
      ...playProps(game, index, entry, todayIdx),
    }, h('span', { class: 'wk-num', text: game.label(index) }), days));
  }
  return h('div', { class: 'cal-weeks' },
    h('div', { class: 'week-head', 'aria-hidden': 'true' },
      h('span', { class: 'wk-num' }, ''),
      DOW_MONDAY.map((d) => h('span', { class: 'dow', text: d }))),
    rows);
}

export function renderArchive(app, game) {
  const { todayEd } = app;
  const progress = app.progress[game.id]?.progress;
  const todayIdx = game.todayIndex(todayEd);
  const firstIdx = game.indexForEd(game.firstEd);
  const total = todayIdx - firstIdx + 1;
  const finished = progress ? [...progress.days.values()].filter((d) => isDone(d.status)).length : 0;
  const weekly = game.cadence === 'weekly';

  const firstYm = ymd(game.firstEd);
  const nowYm = ymd(todayEd);
  const minKey = monthKey(firstYm.y, firstYm.m);
  const maxKey = monthKey(nowYm.y, nowYm.m);
  let key = Math.min(Math.max(shownMonth.get(game.id) ?? maxKey, minKey), maxKey);

  // Every month from the first puzzle to now, newest first and grouped by
  // year, so going back a long way is one pick instead of many clicks.
  const select = h('select', { class: 'month-select', 'aria-label': 'Choose a month' });
  for (let yy = nowYm.y; yy >= firstYm.y; yy--) {
    const group = h('optgroup', { label: String(yy) });
    for (let mm = 12; mm >= 1; mm--) {
      const k = monthKey(yy, mm);
      if (k < minKey || k > maxKey) continue;
      group.append(h('option', { value: String(k), text: monthTitle(yy, mm) }));
    }
    select.append(group);
  }
  // What the heading shows: the month, with the year under it, since a phone
  // has no room for "September 2026" on one line beside the buttons. The
  // select sits invisibly on top and still does the picking.
  const monthLine = h('span', { class: 'month-name' });
  const monthYear = h('span', { class: 'month-year' });
  const label = h('span', { class: 'month-label', 'aria-hidden': 'true' }, monthLine, monthYear);
  const grid = h('div', { class: 'month-grid' });
  const prev = h('button', { class: 'icon-btn', 'aria-label': 'Previous month', html: ICONS.back });
  const next = h('button', { class: 'icon-btn month-next', 'aria-label': 'Next month', html: ICONS.back });
  const todayBtn = h('button', { class: 'month-today', text: weekly ? 'This week' : 'Today' });

  const show = () => {
    shownMonth.set(game.id, key);
    const { y, m } = fromKey(key);
    select.value = String(key);
    monthLine.textContent = monthName(m);
    monthYear.textContent = String(y);
    grid.replaceChildren(weekly
      ? weeklyGrid(game, progress, y, m, todayEd, todayIdx)
      : dailyGrid(game, progress, y, m, todayEd, todayIdx));
    prev.disabled = key <= minKey;
    next.disabled = key >= maxKey;
    todayBtn.hidden = key === maxKey;
  };
  const go = (k) => {
    key = Math.min(Math.max(k, minKey), maxKey);
    show();
  };
  prev.addEventListener('click', () => go(key - 1));
  next.addEventListener('click', () => go(key + 1));
  todayBtn.addEventListener('click', () => go(maxKey));
  select.addEventListener('change', () => go(Number(select.value)));
  show();

  return h('div', { class: 'wrap', style: { '--game': game.color } },
    h('div', { class: 'page-head' },
      h('a', { class: 'icon-btn', href: '#games', 'aria-label': 'Back to games', html: ICONS.back }),
      h('img', { src: game.logo, alt: '' }),
      h('div', { class: 'grow' },
        h('h1', { text: `${game.name} Archive` }),
        h('span', { class: 'muted', text: `${finished} of ${total} ${weekly ? 'weeks' : 'puzzles'} finished` })),
      streakChip(game, progress)),
    h('section', { class: 'month' },
      h('div', { class: 'month-nav' }, prev, h('div', { class: 'month-title' }, h('div', { class: 'month-pick' }, select, label)), todayBtn, next),
      grid),
    legend(game));
}
