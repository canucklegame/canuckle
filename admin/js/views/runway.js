// Days left tab: how far each daily game's puzzles run past today.

import { h, clear } from '../ui.js?v=202610141429';
import { GAMES, longDate, todayEpochDay, todayIndex } from '../dates.js?v=202610141429';
import { DAILY_GAMES, dailyIndex, dailyEd, daysInFile } from '../runway.js?v=202610141429';
import { GAME_SITES } from '../config.js?v=202610141429';
import { loadCanokuCount } from '../store.js?v=202610141429';
import { maxIndex } from '../context.js?v=202610141429';

const RUNWAY_WARN_DAYS = 30;

// Canoku and the Flutter games, loaded once per page visit (Refresh reloads):
// {[gameId]: {last, note?} | {error}}, null while loading.
let other = null;
let loading = false;

async function fetchFile(path) {
  let lastError = null;
  for (const site of GAME_SITES) {
    try {
      const res = await fetch(site + path, { cache: 'no-store' });
      if (!res.ok) {
        lastError = new Error(`${res.status} from ${site}`);
        continue;
      }
      const last = daysInFile(await res.json());
      return { last, note: site === GAME_SITES[0] ? null : `From ${site}` };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Not found');
}

async function loadCanoku() {
  const { count, lastExists, nextExists } = await loadCanokuCount();
  if (count == null) throw new Error('canokuNewData/puzzleCount is missing');
  const notes = [];
  if (!lastExists) notes.push(`Puzzle ${count} is missing, though puzzleCount is ${count}.`);
  if (nextExists) notes.push(`Puzzle ${count + 1} exists: raise puzzleCount to let players have it.`);
  return { last: count, note: notes.join(' ') || null };
}

function loadOther() {
  const jobs = Object.entries(DAILY_GAMES).map(async ([id, g]) => {
    try {
      return [id, await (id === 'canoku' ? loadCanoku() : fetchFile(g.file))];
    } catch (e) {
      return [id, { error: e.message }];
    }
  });
  return Promise.all(jobs).then(Object.fromEntries);
}

/** One table row's numbers: {today, last, lastEd, ahead, label, unit, step}. */
function canuckleRow(gameId) {
  const g = GAMES[gameId];
  const max = maxIndex(gameId);
  return {
    name: g.name,
    href: `#${gameId}`,
    todayLabel: g.label(todayIndex(gameId)),
    lastLabel: max == null ? null : g.label(max),
    lastEd: max == null ? null : g.edForIndex(max),
    ahead: max == null ? null : max - todayIndex(gameId),
    step: g.step,
    afterEnd: `Players get no new ${g.name}.`,
  };
}

function dailyRow(gameId, loaded) {
  const g = DAILY_GAMES[gameId];
  const today = dailyIndex(gameId, todayEpochDay());
  const row = { name: g.name, todayLabel: today == null ? '—' : `#${today}`, step: 1, afterEnd: g.afterEnd };
  if (!loaded) return { ...row, loading: true };
  if (loaded.error) return { ...row, error: loaded.error };
  return {
    ...row,
    lastLabel: `#${loaded.last}`,
    lastEd: dailyEd(gameId, loaded.last),
    ahead: today == null ? loaded.last : loaded.last - today,
    note: loaded.note,
  };
}

function aheadText(r) {
  if (r.ahead < 0) return 'Out';
  const days = r.ahead * r.step;
  if (r.step === 7) return `${r.ahead} week${r.ahead === 1 ? '' : 's'}`;
  return `${days} day${days === 1 ? '' : 's'}`;
}

function status(r) {
  if (r.loading) return h('span', { class: 'muted' }, 'Loading…');
  if (r.error) return h('span', { class: 'err' }, `Couldn't load: ${r.error}`);
  if (r.ahead == null) return h('span', { class: 'flag err' }, 'No puzzles');
  if (r.ahead < 0) {
    return [h('span', { class: 'flag err' }, `Ran out ${longDate(r.lastEd + r.step)}`), ' ', h('span', { class: 'muted small' }, r.afterEnd)];
  }
  if (r.ahead * r.step < RUNWAY_WARN_DAYS) return [h('span', { class: 'flag' }, 'Running low'), ' ', h('span', { class: 'muted small' }, `Then: ${r.afterEnd}`)];
  return h('span', { class: 'ok-note' }, 'OK');
}

export function renderRunway(root, rerender) {
  if (!other && !loading) {
    loading = true;
    loadOther().then((v) => {
      other = v;
      loading = false;
      if (location.hash === '#runway') rerender();
    });
  }

  const rows = [
    ...['canuckle', 'plus', 'duo'].map(canuckleRow),
    ...Object.keys(DAILY_GAMES).map((id) => dailyRow(id, other?.[id])),
  ];
  // Fewest days first; still-loading and failed rows last.
  const order = (r) => (r.ahead == null ? (r.loading || r.error ? Infinity : -Infinity) : r.ahead * r.step);
  rows.sort((a, b) => order(a) - order(b));

  clear(root,
    h('div', { class: 'toolbar' },
      h('p', { class: 'muted small' }, `Puzzles after today (${longDate(todayEpochDay())}), fewest first. Canuckle+ counts weeks.`),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', disabled: loading, onclick: () => { other = null; rerender(); } }, 'Refresh')),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'grid compact' },
        h('thead', {}, h('tr', {}, ['Game', 'Today', 'Last puzzle', 'Left', 'Status'].map((t) => h('th', {}, t)))),
        h('tbody', {}, rows.map((r) => h('tr', {},
          h('td', { class: 'nowrap' }, r.href ? h('a', { href: r.href }, r.name) : r.name),
          h('td', { class: 'num' }, r.todayLabel),
          h('td', { class: 'nowrap' }, r.lastLabel ? `${r.lastLabel} · ${longDate(r.lastEd)}` : '—',
            r.note ? h('div', { class: 'muted small' }, r.note) : null),
          h('td', { class: 'num' }, r.ahead == null ? '—' : h('b', {}, aheadText(r))),
          h('td', {}, status(r))))))),
    h('p', { class: 'muted small' },
      'Canuckle, Canuckle+ and Duo count the puzzles saved in Firestore. Canoku uses canokuNewData/puzzleCount. ',
      'Canolitaire, Canominoes, Canoggle and Canagrams read the puzzle files built into each game; a new batch counts once that game is deployed.'));
}
