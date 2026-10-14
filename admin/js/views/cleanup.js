// Cleanup tab: find stale accounts (dry run), download a backup, then delete.
// The rule itself is in ../cleanup.js.

import { h, clear, toast, downloadJson } from '../ui.js?v=202610141429';
import { summarize, thresholdDays, clockProblem, PLAYER_COLLECTIONS, MAX_GAMES } from '../cleanup.js?v=202610141429';
import { findStaleAccounts, deleteAllAccounts, serverNow } from '../store.js?v=202610141429';
import { USE_EMULATOR } from '../config.js?v=202610141429';

const state = {
  phase: 'idle', // idle | scanning | scanned | deleting | done
  scanned: 0,
  verdicts: [],
  candidates: [], // {id, total, idleDays, lastUpdated}
  backupTaken: false,
  deleted: 0,
  stop: false,
  error: '',
  startedAt: 0,
};

export function renderCleanup(root, rerender) {
  const rules = h('div', { class: 'card' },
    h('h3', {}, 'The rule'),
    h('p', {}, `An account with N games in total (Canuckle + Canuckle+ + Duo), N ≤ ${MAX_GAMES}, can be deleted once it hasn't been updated for 10 + (N − 1) × 5 days. No games counts as one.`),
    h('table', { class: 'mini' },
      h('tr', {}, h('th', {}, 'Games'), ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => h('td', {}, n))),
      h('tr', {}, h('th', {}, 'Days idle'), ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => h('td', {}, thresholdDays(n))))),
    h('p', {}, "Always kept: a linked email in any of the ID's docs; any sign of play in Canoku, Canolitaire, Canominoes, Canoggle or Canagrams (stats, streaks or saved puzzles); Canoku accounts with unmigrated old saves; and anything with a missing lastUpdated."),
    h('p', {}, `Deleting removes the ID's doc in every player collection: ${PLAYER_COLLECTIONS.join(', ')}. Accounts are deleted as the scan found them, without another check, so scan and delete in one sitting.`));

  const busy = state.phase === 'scanning' || state.phase === 'deleting';
  const s = summarize(state.verdicts);

  const scanBtn = h('button', { class: 'btn primary', disabled: busy, onclick: () => scan(rerender) },
    state.phase === 'idle' ? 'Scan (dry run)' : 'Scan again');
  const stopBtn = busy ? h('button', { class: 'btn', onclick: () => { state.stop = true; } }, 'Stop') : null;

  const status = h('div', { class: 'card' },
    h('h3', {}, 'Scan'),
    h('div', { class: 'actions left' }, scanBtn, stopBtn),
    state.error ? h('p', { class: 'err' }, state.error) : null,
    state.phase !== 'idle' ? h('p', {},
      `Checked ${state.scanned} accounts with ${MAX_GAMES} or fewer Canuckle games that were idle 10+ days. `,
      h('b', {}, `${state.candidates.length} can be deleted.`),
      state.phase === 'scanning' ? ' Still scanning…' : '') : null,
    Object.keys(s.byReason).length ? h('div', { class: 'two-col' },
      h('div', {}, h('h4', {}, 'Kept or deleted, by reason'), h('ul', {},
        Object.entries(s.byReason).map(([r, n]) => h('li', {}, `${REASONS[r] || r}: ${n}`)))),
      h('div', {}, h('h4', {}, 'To delete, by games played'), h('ul', {},
        Object.entries(s.byTotal).map(([t, n]) => h('li', {}, `${t} game${t === '1' ? '' : 's'}: ${n}`))))) : null,
    state.candidates.length ? h('details', {},
      h('summary', {}, `First ${Math.min(50, state.candidates.length)} accounts to delete`),
      h('table', { class: 'grid compact' },
        h('thead', {}, h('tr', {}, h('th', {}, 'ID'), h('th', {}, 'Games'), h('th', {}, 'Idle days'))),
        h('tbody', {}, state.candidates.slice(0, 50).map((c) =>
          h('tr', {}, h('td', { class: 'mono' }, c.id), h('td', { class: 'num' }, c.total), h('td', { class: 'num' }, c.idleDays)))))) : null);

  const canDelete = state.phase === 'scanned' && state.candidates.length > 0;
  const phrase = `DELETE ${state.candidates.length}`;
  const confirmInput = h('input', { placeholder: phrase, disabled: !canDelete || !state.backupTaken, autocomplete: 'off' });
  const deleteBtn = h('button', { class: 'btn danger', disabled: true }, `Delete ${state.candidates.length} accounts`);
  confirmInput.addEventListener('input', () => { deleteBtn.disabled = confirmInput.value.trim() !== phrase; });
  deleteBtn.addEventListener('click', () => remove(rerender));

  const del = h('div', { class: 'card' },
    h('h3', {}, 'Delete'),
    h('p', {}, '1. Download a backup of every doc that will be deleted. 2. Type the phrase. 3. Delete.'),
    h('div', { class: 'actions left' },
      h('button', { class: 'btn', disabled: !canDelete || busy, onclick: () => backup(rerender) },
        state.backupTaken ? 'Download backup again' : 'Download backup'),
      confirmInput, deleteBtn),
    state.phase === 'deleting' || state.phase === 'done'
      ? h('p', {}, `Deleted ${state.deleted} of ${state.candidates.length}.${state.phase === 'deleting' ? ' Working…' : ''}`)
      : null,
    state.phase === 'deleting' ? h('progress', { max: state.candidates.length, value: state.deleted }) : null);

  clear(root, rules, status, del,
    h('p', { class: 'muted small' }, 'The scan needs the (gamesCount, lastUpdated) index in firebase/firestore.indexes.json. If it is missing, the error below Scan includes a link that creates it.'));
}

const REASONS = {
  stale: 'Can be deleted',
  'no account': 'Gone already',
  recent: 'Not idle long enough yet',
  email: 'Kept: linked email',
  'other games': 'Kept: progress in another game',
  'more than 10 games': 'Kept: more than 10 games',
  'no lastUpdated': 'Kept: no lastUpdated',
};

// The idle times are only as good as this computer's clock.
async function checkClock() {
  if (USE_EMULATOR) return null;
  return clockProblem(Date.now(), await serverNow());
}

async function scan(rerender) {
  Object.assign(state, {
    phase: 'scanning', scanned: 0, verdicts: [], candidates: [], backupTaken: false,
    deleted: 0, stop: false, error: '', startedAt: Date.now(),
  });
  rerender();
  const clock = await checkClock();
  if (clock) {
    Object.assign(state, { phase: 'idle', error: clock });
    rerender();
    return;
  }
  const now = state.startedAt;
  try {
    await findStaleAccounts(now, {
      onPage: (verdicts, candidates, scanned) => {
        state.verdicts.push(...verdicts);
        state.candidates.push(...candidates);
        state.scanned += scanned;
        rerender();
      },
      shouldStop: () => state.stop,
    });
    state.phase = 'scanned';
  } catch (e) {
    state.phase = 'idle';
    state.error = `Scan failed: ${e.message}`;
  }
  rerender();
}

// The docs the scan already read for each account, so the file is ready at
// once with no extra reads, and always covers every account the delete
// would touch.
function backup(rerender) {
  const accounts = {};
  for (const c of state.candidates) {
    accounts[c.id] = Object.fromEntries(Object.entries(c.docs || {}).filter(([, d]) => d));
  }
  const stamp = new Date(state.startedAt).toISOString().slice(0, 16).replace(/[:T]/g, '-');
  downloadJson(`canuckle-cleanup-backup-${stamp}.json`, { scannedAt: new Date(state.startedAt).toISOString(), accounts });
  state.backupTaken = true;
  rerender();
}

async function remove(rerender) {
  const clock = await checkClock();
  if (clock) {
    toast(clock, { error: true });
    return;
  }
  state.phase = 'deleting';
  state.stop = false;
  rerender();
  try {
    await deleteAllAccounts(state.candidates, {
      shouldStop: () => state.stop,
      onBatch: (r) => {
        state.deleted += r.deleted.length;
        rerender();
      },
    });
    toast(`Deleted ${state.deleted} accounts.`);
  } catch (e) {
    toast(`Delete stopped: ${e.message}`, { error: true });
  }
  // The list stays for the "Deleted N of M" line; delete is off once done.
  state.phase = 'done';
  rerender();
}
