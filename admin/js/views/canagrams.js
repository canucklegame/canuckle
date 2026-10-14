// Canagrams tab: the shipped puzzle calendar, read back out of the game's own
// files, and an optional summary of every player's stats.
//
// Canagrams' puzzles are built offline and shipped inside the game
// (canagramsSourceCode/tools/generate_dailies.dart), so there is nothing to
// edit here -- this is for looking: what each day's board is, how long the
// calendar lasts, which Canuckle words it uses, and how many people solve each
// day. To change or extend the calendar, regenerate it in the game project.

import { h, clear, modal, toast, safeHref } from '../ui.js?v=202610141429';
import { GAME_SITES } from '../config.js?v=202610141429';
import { longDate, todayEpochDay } from '../dates.js?v=202610141429';
import { sdk } from '../firebase.js?v=202610141429';
import { launchEd } from '../launch.js?v=202610141429';
import {
  RUNGS, unpackCanagrams, gridRows, rungOf, summarizePlayers,
} from '../canagrams.js?v=202610141429';

const START_ED = launchEd('canagrams');
const DATA = 'canagrams/assets/assets/data/';
const PAGE = 28;
const WARN_DAYS = 30;

/** {site, days: [{day, p}], facts} once loaded, or {error}. */
let data = null;
let loading = false;
let players = null; // summarizePlayers(...) once loaded
let playersLoading = false;
let from = null; // first day shown
let query = '';

const todayIdx = () => todayEpochDay() - START_ED + 1;

async function fetchJson(site, path) {
  const res = await fetch(site + DATA + path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} for ${path} on ${site}`);
  return res.json();
}

async function load() {
  let lastError = null;
  for (const site of GAME_SITES) {
    try {
      const index = await fetchJson(site, 'dailies_index.json');
      const shardCount = Math.ceil(index.days / index.shard);
      const shards = await Promise.all(Array.from({ length: shardCount }, (_, s) =>
        fetchJson(site, `dailies_${String(s).padStart(3, '0')}.json`)));
      const days = [];
      for (const shard of shards) {
        (shard.d || []).forEach((line, k) => days.push({ day: shard.start + k, p: unpackCanagrams(line) }));
      }
      let facts = {};
      try {
        facts = await fetchJson(site, 'canuckle_facts.json');
      } catch {
        // Facts are a nicety here.
      }
      return { site, days, facts };
    } catch (e) {
      lastError = e;
    }
  }
  return { error: lastError?.message || 'Not found' };
}

async function loadPlayers() {
  const { fs, db } = await sdk();
  const docs = [];
  let last = null;
  for (;;) {
    const parts = [fs.collection(db, 'anagramUserData'), fs.orderBy(fs.documentId()), fs.limit(300)];
    const snap = await fs.getDocs(last ? fs.query(...parts, fs.startAfter(last)) : fs.query(...parts));
    snap.docs.forEach((d) => docs.push(d.data()));
    if (snap.size < 300) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return summarizePlayers(docs, todayIdx());
}

function summary(root) {
  const t = todayIdx();
  const last = data.days.length;
  const left = last - t;
  const used = new Set(data.days.map((d) => d.p?.canuckle).filter(Boolean));
  const shapes = {};
  for (const d of data.days) {
    if (rungOf(d.day) === 5 && d.p) shapes[d.p.shape] = (shapes[d.p.shape] || 0) + 1;
  }
  const broken = data.days.filter((d) => !d.p).map((d) => d.day);
  return h('div', { class: 'two-col' },
    h('div', { class: 'card' },
      h('h3', {}, 'Calendar'),
      h('p', {}, `${last} puzzles shipped: #1 ${longDate(START_ED)} to #${last} ${longDate(START_ED + last - 1)}.`),
      h('p', {}, h('b', {}, left < 0 ? 'Ran out' : `${left} days left`), ' after today (#', String(t), ').',
        left < WARN_DAYS ? [' ', h('span', { class: 'flag err' }, 'Regenerate soon')] : null),
      h('p', { class: 'muted small' }, `${used.size} distinct Canuckle words. Saturdays: `,
        Object.entries(shapes).map(([k, v]) => `${k} ${v}`).join(' · '), '.'),
      broken.length ? h('p', { class: 'err' }, `Unreadable days: ${broken.join(', ')}`) : null,
      h('p', { class: 'muted small' }, `Read from ${data.site === '/' ? 'this site' : data.site}. `,
        'Extend with tools/generate_dailies.dart in canagramsSourceCode, then deploy the game.')),
    h('div', { class: 'card' },
      h('h3', {}, 'Players'),
      players
        ? [
          h('p', {}, `${players.players} players · ${players.solved} solves · ${players.activeToday} solved today · ${players.activeWeek} in the last 7 days.`),
          h('p', { class: 'muted small' },
            `Average score ${players.solved ? Math.round(players.points / players.solved) : 0} · best ${players.best} · `
            + `no-hint solves ${players.noHint} · Canuckle words spelled ${players.canuckleWords} · `
            + `bonus words ${players.bonusWords} · longest streak ${players.longestStreak}.`),
        ]
        : [
          h('p', { class: 'muted small' }, 'Reads every anagramUserData document once (one read per player).'),
          h('button', {
            class: 'btn', disabled: playersLoading,
            onclick: async () => {
              playersLoading = true;
              root.rerender();
              try {
                players = await loadPlayers();
              } catch (e) {
                toast(`Couldn't load players: ${e.message}`, { error: true });
              }
              playersLoading = false;
              root.rerender();
            },
          }, playersLoading ? 'Loading…' : 'Load player summary'),
        ]));
}

/** A fact with its `[words](https://...)` links as real links (game: lib/ui/fact_text.dart). */
function factNodes(fact) {
  const out = [];
  let at = 0;
  for (const m of fact.matchAll(/\[([^\[\]]+)\]\((https:\/\/[^\s()]+)\)/g)) {
    if (m.index > at) out.push(fact.slice(at, m.index));
    const href = safeHref(m[2]);
    out.push(href ? h('a', { href, target: '_blank', rel: 'noopener' }, m[1]) : m[1]);
    at = m.index + m[0].length;
  }
  out.push(fact.slice(at));
  return out;
}

function openDay(d) {
  const p = d.p;
  modal(`Canagrams #${d.day}`, () => [
    h('p', { class: 'muted' }, `${longDate(START_ED + d.day - 1)} · ${RUNGS[rungOf(d.day)]} · ${p.shape}`),
    h('p', {}, 'Wheel ', h('b', { class: 'mono' }, p.letters.split('').join(' ')), ' · Canuckle word ', h('b', {}, p.canuckle)),
    h('pre', { class: 'mono', style: 'line-height:1.25;font-size:15px' }, gridRows(p).join('\n')),
    h('p', {}, h('b', {}, `Grid (${p.slots.length}): `), p.slots.map((s) => s.word).join(', ')),
    h('p', { class: 'muted small' }, h('b', {}, `Bonus (${p.bonus.length}): `), p.bonus.join(', ')),
    data.facts[p.canuckle] ? h('p', { class: 'muted' }, h('b', {}, 'Fun fact: '), factNodes(data.facts[p.canuckle])) : null,
  ], { wide: true });
}

function table() {
  const t = todayIdx();
  const q = query.trim().toUpperCase();
  const rows = q
    ? data.days.filter((d) => d.p && (d.p.canuckle.includes(q) || d.p.slots.some((s) => s.word === q) || String(d.day) === q))
    : data.days.slice(Math.max(0, from - 1), from - 1 + PAGE);
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'grid' },
      h('thead', {}, h('tr', {}, ['#', 'Date', 'Day', 'Shape', 'Canuckle word', 'Wheel', 'Words', 'Bonus', players ? 'Solved by' : null]
        .filter(Boolean).map((x) => h('th', {}, x)))),
      h('tbody', {}, rows.map((d) => h('tr', {
        class: d.day === t ? 'today' : d.day > t ? 'future' : '',
        onclick: () => d.p && openDay(d),
      },
      h('td', { class: 'num' }, String(d.day)),
      h('td', { class: 'nowrap' }, longDate(START_ED + d.day - 1)),
      h('td', {}, RUNGS[rungOf(d.day)]),
      h('td', {}, d.p?.shape || '—'),
      h('td', { class: 'answer' }, d.p ? h('b', {}, d.p.canuckle) : h('span', { class: 'err' }, 'unreadable')),
      h('td', { class: 'mono' }, d.p?.letters || ''),
      h('td', { class: 'num' }, d.p ? String(d.p.slots.length) : ''),
      h('td', { class: 'num' }, d.p ? String(d.p.bonus.length) : ''),
      players ? h('td', { class: 'num' }, String(players.byDay.get(d.day) || 0)) : null)))));
}

export function renderCanagrams(root, rerender) {
  root.rerender = rerender;
  if (!data && !loading) {
    loading = true;
    load().then((v) => {
      data = v;
      loading = false;
      if (location.hash === '#canagrams') rerender();
    });
  }
  if (!data) {
    clear(root, h('p', { class: 'muted' }, 'Loading Canagrams puzzles…'));
    return;
  }
  if (data.error) {
    clear(root, h('p', { class: 'err' }, `Couldn't load the Canagrams puzzle files: ${data.error}`),
      h('button', { class: 'btn', onclick: () => { data = null; rerender(); } }, 'Retry'));
    return;
  }
  if (from == null) from = Math.max(1, todayIdx() - 7);

  const search = h('input', {
    type: 'search', placeholder: 'Find a Canuckle word, grid word or puzzle number', value: query,
    oninput: (e) => {
      query = e.target.value;
      rerender();
      const el = root.querySelector('input[type="search"]');
      el?.focus();
      el?.setSelectionRange(query.length, query.length);
    },
  });
  clear(root,
    summary(root),
    h('div', { class: 'toolbar' },
      search,
      h('button', { class: 'btn small', disabled: !!query || from <= 1, onclick: () => { from = Math.max(1, from - PAGE); rerender(); } }, '‹ Earlier'),
      h('button', { class: 'btn small', disabled: !!query, onclick: () => { from = Math.max(1, todayIdx() - 7); rerender(); } }, 'Today'),
      h('button', { class: 'btn small', disabled: !!query || from + PAGE > data.days.length, onclick: () => { from += PAGE; rerender(); } }, 'Later ›'),
      h('button', { class: 'btn small', onclick: () => { data = null; players = null; rerender(); } }, 'Refresh')),
    table(),
    h('p', { class: 'muted small' }, 'Tap a day to see its board. Future days are greyed. Answers here are spoilers for players, not for you.'));
}
