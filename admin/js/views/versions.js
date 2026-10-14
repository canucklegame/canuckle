// Versions tab: stage the gameVersions values for a release, check them
// against the builds this site is actually serving, then publish them all in
// one logged write. The rules are in ../versions.js.

import { h, clear, modal, toast, issues } from '../ui.js?v=202610141429';
import { VERSION_DOCS, normalizeVersion, servedVersion, planVersionChanges } from '../versions.js?v=202610141429';
import { loadGameVersions, publishGameVersions } from '../store.js?v=202610141429';
import { IS_LOCAL, IS_SANDBOX, SITE_LABEL } from '../config.js?v=202610141429';

// Each game's version.json on THIS site: production checks production and the
// sandbox checks the sandbox. Local dev has no builds, so it reads the sandbox
// (GitHub Pages allows cross-origin reads).
const SERVED_BASE = IS_LOCAL ? 'https://jeffrrogers.github.io/' : '/';
const DRAFTS_KEY = 'admin.versionDrafts';

const state = {
  phase: 'idle', // idle | loading | ready | publishing
  current: {},
  served: {},
  drafts: readDrafts(),
  error: '',
  loadedAt: 0,
};

function readDrafts() {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function saveDrafts() {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(state.drafts));
  } catch {
    // fine without it
  }
}

async function fetchServed(row) {
  try {
    const res = await fetch(`${SERVED_BASE}${row.path}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return servedVersion(await res.json());
  } catch {
    return null;
  }
}

async function load(rerender) {
  state.phase = 'loading';
  state.error = '';
  rerender();
  try {
    const [current, served] = await Promise.all([
      loadGameVersions(VERSION_DOCS.map((r) => r.doc)),
      Promise.all(VERSION_DOCS.map(fetchServed)),
    ]);
    state.current = current;
    state.served = Object.fromEntries(VERSION_DOCS.map((r, i) => [r.doc, served[i]]));
    state.loadedAt = Date.now();
  } catch (e) {
    state.error = `Couldn't read gameVersions: ${e.message}`;
  }
  state.phase = 'ready';
  rerender();
}

export function renderVersions(root, rerender) {
  if (state.phase === 'idle') {
    load(rerender);
    return;
  }
  const busy = state.phase === 'loading' || state.phase === 'publishing';
  const plan = planVersionChanges(state.current, state.served, state.drafts);
  const servedLabel = IS_SANDBOX ? 'Sandbox serves' : 'Site serves';

  const rows = VERSION_DOCS.map((row) => {
    const input = h('input', {
      value: state.drafts[row.doc] || '',
      placeholder: 'unchanged',
      autocomplete: 'off',
      spellcheck: false,
      class: 'mono',
      disabled: busy,
      'aria-label': `New version for ${row.name}`,
    });
    // Re-render only on change (blur / Enter), so typing keeps focus.
    input.addEventListener('change', () => {
      state.drafts[row.doc] = input.value.trim();
      saveDrafts();
      rerender();
    });
    const to = normalizeVersion(state.drafts[row.doc]);
    const cur = state.current[row.doc] ?? null;
    const live = state.served[row.doc] ?? null;
    let status = '';
    if (to === null) status = 'not a version';
    else if (!to) status = live && cur && live !== cur ? 'Firestore differs from the site' : '';
    else if (to === cur) status = 'already set';
    else if (!live) status = 'served version unknown';
    else status = to === live ? 'ready' : 'not what the site serves';
    const cls = status === 'ready' ? 'ok-note' : status && status !== 'already set' ? 'warn' : 'muted';
    return h('tr', {},
      h('td', {}, row.name, row.checks ? null : h('div', { class: 'small muted' }, "Doesn't read this doc yet")),
      h('td', { class: 'mono' }, row.doc),
      h('td', { class: 'mono' }, cur ?? h('span', { class: 'muted' }, '(none)')),
      h('td', { class: 'mono' }, live ?? h('span', { class: 'muted' }, state.phase === 'loading' ? '…' : 'unknown')),
      h('td', {}, input),
      h('td', { class: `small ${cls}` }, status));
  });

  const useServed = () => {
    for (const row of VERSION_DOCS) {
      const live = state.served[row.doc];
      if (live && live !== (state.current[row.doc] ?? null)) state.drafts[row.doc] = live;
    }
    saveDrafts();
    rerender();
  };
  const clearDrafts = () => {
    state.drafts = {};
    saveDrafts();
    rerender();
  };

  const n = plan.changes.length;
  const publishBtn = h('button', {
    class: 'btn primary',
    disabled: busy || !n || plan.errors.length > 0,
    onclick: () => publish(plan, rerender),
  }, state.phase === 'publishing' ? 'Publishing…' : `Publish ${n} change${n === 1 ? '' : 's'}`);

  clear(root,
    h('div', { class: 'card' },
      h('h3', {}, 'Game versions'),
      h('p', {}, 'Each game compares the version it was built with against its gameVersions doc, and reloads open tabs when they differ. Publish only once the new builds are live: check that "', servedLabel, '" shows them.'),
      IS_SANDBOX ? h('p', { class: 'warn' }, `${SITE_LABEL}: these are the live Firestore docs that production tabs read, and "${servedLabel}" shows the sandbox's builds, not production's.`) : null,
      h('table', { class: 'grid compact' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Game'), h('th', {}, 'Doc'), h('th', {}, 'In Firestore'), h('th', {}, servedLabel),
          h('th', {}, 'New version'), h('th', {}, ''))),
        h('tbody', {}, rows)),
      h('div', { class: 'actions left' },
        h('button', { class: 'btn', disabled: busy, onclick: () => load(rerender) }, state.phase === 'loading' ? 'Reading…' : 'Reload'),
        h('button', { class: 'btn', disabled: busy, onclick: useServed }, 'Use served versions'),
        h('button', { class: 'btn', disabled: busy, onclick: clearDrafts }, 'Clear'),
        publishBtn),
      state.error ? h('p', { class: 'err' }, state.error) : null,
      n || plan.errors.length ? issues(plan) : null),
    h('p', { class: 'muted small' }, 'Blank means leave that doc alone. Type 4.0.0 or Version 4.0.0; the doc gets "Version 4.0.0". Drafts stay in this browser. Every publish is in the Log tab, where Restore puts the old values back.'));
}

async function publish(plan, rerender) {
  const ok = await modal(`Publish ${plan.changes.length} version change${plan.changes.length === 1 ? '' : 's'}?`, (close) => {
    const go = h('button', { class: 'btn primary', onclick: () => close(true) }, 'Publish');
    const boxes = [];
    const gate = (label) => {
      const box = h('input', { type: 'checkbox', onchange: () => { go.disabled = !boxes.every((b) => b.checked); } });
      boxes.push(box);
      return h('label', { class: 'check' }, box, ` ${label}`);
    };
    const body = h('div', {},
      h('table', { class: 'grid compact' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Doc'), h('th', {}, 'From'), h('th', {}, 'To'))),
        h('tbody', {}, plan.changes.map((c) => h('tr', {},
          h('td', { class: 'mono' }, c.doc), h('td', { class: 'mono' }, c.from ?? '(none)'), h('td', { class: 'mono' }, c.to))))),
      plan.warnings.length ? h('div', { class: 'gate' },
        h('strong', {}, "Some of these don't match what this site serves"),
        h('ul', {}, plan.warnings.map((w) => h('li', {}, w))),
        gate('Publish anyway')) : null,
      IS_SANDBOX ? h('div', { class: 'gate' },
        h('strong', {}, 'This is the sandbox'),
        h('p', {}, 'The write goes to the live Firestore, and production tabs on canucklegame.ca read these docs.'),
        gate('I mean to change production')) : null,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close(false) }, 'Cancel'), go));
    go.disabled = boxes.length > 0;
    return body;
  });
  if (!ok) return;
  state.phase = 'publishing';
  rerender();
  try {
    await publishGameVersions(plan.changes);
    toast(`Published ${plan.changes.map((c) => `${c.doc} ${c.to}`).join(', ')}.`);
    for (const c of plan.changes) delete state.drafts[c.doc];
    saveDrafts();
  } catch (e) {
    toast(`Nothing published: ${e.message}`, { error: true });
  }
  await load(rerender);
}
