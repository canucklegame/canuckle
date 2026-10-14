// Repair tab: find accounts holding games Canuckle would strip (blank or
// unreadable; see ../repair.js) and remove them. Accounts with more than 4 in
// one list are marked stuck: Canuckle can't save those at all until fixed.

import { h, clear, toast, downloadJson } from '../ui.js?v=202610141429';
import { analyzeAccount, repairCutoff, MAX_DROP, REPAIR_LATEST } from '../repair.js?v=202610141429';
import { scanAccounts, repairOneAccount } from '../store.js?v=202610141429';

const state = {
  phase: 'idle', // idle | scanning | scanned | repairing | done
  scanned: 0,
  stuck: 0,
  found: [], // {id, blankGames, blankPlus, badDuo, stuck, lastUpdated, doc}
  backupTaken: false,
  repaired: 0,
  unchanged: 0,
  stop: false,
  error: '',
  before: REPAIR_LATEST,
  scannedBefore: '', // the cutoff the last scan used
};

export function renderRepair(root, rerender) {
  const busy = state.phase === 'scanning' || state.phase === 'repairing';
  const before = h('input', { type: 'date', value: state.before, max: REPAIR_LATEST, disabled: busy });
  before.addEventListener('change', () => {
    state.before = repairCutoff(before.value).day;
    before.value = state.before;
  });

  const intro = h('div', { class: 'card' },
    h('h3', {}, 'Blank and unreadable games'),
    h('p', {}, `When Canuckle saves an account it drops games with a blank answer and Duo games it can't read. This finds every account holding any, and removes exactly what Canuckle would have removed; nothing else in the account changes. Accounts with more than ${MAX_DROP} in one list are marked stuck: the rules allow at most ${MAX_DROP} to be dropped in one save, so Canuckle can't save those at all until they're repaired.`),
    h('p', { class: 'small muted' }, `Only accounts last updated before ${REPAIR_LATEST} are scanned (one Firestore read each): Canuckle has stripped these games itself on every save since then. Pick an earlier date to read fewer.`),
    h('div', { class: 'actions left' },
      h('label', { class: 'row small' }, 'Last updated before ', before),
      h('button', { class: 'btn primary', disabled: busy, onclick: () => scan(rerender) }, state.phase === 'idle' ? 'Scan' : 'Scan again'),
      busy ? h('button', { class: 'btn', onclick: () => { state.stop = true; } }, 'Stop') : null),
    state.error ? h('p', { class: 'err' }, state.error) : null,
    state.phase !== 'idle' ? h('p', {},
      `Checked ${state.scanned} accounts last updated before ${state.scannedBefore}. `,
      h('b', {}, `${state.found.length} have games to remove`),
      `, ${state.stuck} of them stuck.`,
      state.phase === 'scanning' ? ' Still scanning…' : '') : null);

  // Stuck accounts first: they're the ones Canuckle can't save at all.
  const rows = [...state.found].sort((a, b) => Number(b.stuck) - Number(a.stuck));
  const table = rows.length ? h('div', { class: 'table-wrap' },
    h('table', { class: 'grid compact' },
      h('thead', {}, h('tr', {}, ['ID', 'Blank Canuckle', 'Blank Canuckle+', 'Unreadable Duo', 'Stuck', 'Last updated'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.slice(0, 200).map((s) => h('tr', {},
        h('td', { class: 'mono' }, s.id),
        h('td', { class: 'num' }, s.blankGames),
        h('td', { class: 'num' }, s.blankPlus),
        h('td', { class: 'num' }, s.badDuo),
        h('td', {}, s.stuck ? h('span', { class: 'flag err' }, 'stuck') : ''),
        h('td', { class: 'nowrap' }, s.lastUpdated ? new Date(s.lastUpdated).toLocaleDateString() : '—')))))) : null;

  const canRepair = state.phase === 'scanned' && state.found.length > 0;
  const phrase = `REPAIR ${state.found.length}`;
  const confirmInput = h('input', { placeholder: phrase, disabled: !canRepair || !state.backupTaken, autocomplete: 'off' });
  const go = h('button', { class: 'btn danger', disabled: true }, `Repair ${state.found.length} accounts`);
  confirmInput.addEventListener('input', () => { go.disabled = confirmInput.value.trim() !== phrase; });
  go.addEventListener('click', () => repairAll(rerender));

  const fix = h('div', { class: 'card' },
    h('h3', {}, 'Repair'),
    h('p', {}, '1. Download a backup of these accounts. 2. Type the phrase. 3. Repair. Each account is re-read first, so a save that landed since the scan is kept.'),
    h('div', { class: 'actions left' },
      h('button', { class: 'btn', disabled: !canRepair, onclick: () => backup(rerender) }, state.backupTaken ? 'Download backup again' : 'Download backup'),
      confirmInput, go),
    state.phase === 'repairing' || state.phase === 'done'
      ? h('p', {}, `Repaired ${state.repaired}. Unchanged ${state.unchanged} (nothing left to remove).${state.phase === 'repairing' ? ' Working…' : ''}`)
      : null,
    state.phase === 'repairing' ? h('progress', { max: state.found.length, value: state.repaired + state.unchanged }) : null);

  clear(root, intro, table, fix);
}

async function scan(rerender) {
  Object.assign(state, {
    phase: 'scanning', scanned: 0, stuck: 0, found: [], backupTaken: false,
    repaired: 0, unchanged: 0, stop: false, error: '',
  });
  rerender();
  // Always a cutoff, never a full scan: at most REPAIR_LATEST.
  const cutoff = repairCutoff(state.before);
  state.scannedBefore = cutoff.day;
  const beforeMs = cutoff.ms;
  try {
    await scanAccounts({
      beforeMs,
      shouldStop: () => state.stop,
      onPage: (page) => {
        for (const { id, data } of page) {
          const a = analyzeAccount(data);
          if (!a.any) continue;
          state.found.push({ id, ...a, lastUpdated: data.lastUpdated, doc: data });
          if (a.stuck) state.stuck++;
        }
        state.scanned += page.length;
        rerender();
      },
    });
    state.phase = 'scanned';
  } catch (e) {
    state.phase = 'idle';
    state.error = `Scan failed: ${e.message}`;
  }
  rerender();
}

function backup(rerender) {
  const accounts = Object.fromEntries(state.found.map((s) => [s.id, s.doc]));
  downloadJson(`canuckle-repair-backup-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`,
    { takenAt: new Date().toISOString(), accounts });
  state.backupTaken = true;
  rerender();
}

async function repairAll(rerender) {
  state.phase = 'repairing';
  state.stop = false;
  rerender();
  try {
    // Stuck accounts first, so stopping early still fixes the ones that matter most.
    for (const s of [...state.found].sort((a, b) => Number(b.stuck) - Number(a.stuck))) {
      if (state.stop) break;
      const r = await repairOneAccount(s.id);
      if (r.repaired) state.repaired++;
      else state.unchanged++;
      rerender();
    }
    toast(`Repaired ${state.repaired} accounts.`);
  } catch (e) {
    toast(`Repair stopped: ${e.message}`, { error: true });
  }
  state.phase = 'done';
  rerender();
}
