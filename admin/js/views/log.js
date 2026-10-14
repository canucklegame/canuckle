// Log tab: recent admin changes with what they changed, and Restore.

import { h, clear, modal, toast, fmtTime, availabilityGate } from '../ui.js?v=202610141429';
import { loadLog, restoreLogEntry } from '../store.js?v=202610141429';
import { decodeAnswer } from '../codec.js?v=202610141429';
import { loadAll, availabilityMessages } from '../context.js?v=202610141429';
import { GAMES } from '../dates.js?v=202610141429';

const RESTORABLE = new Set(['add', 'edit', 'swap', 'import', 'restore', 'versions']);

// A readable one-liner for a puzzle (or gameVersions) doc in a log entry.
function describe(doc) {
  if (!doc) return '(none)';
  if (typeof doc.version === 'string' && !('answer' in doc)) return doc.version;
  if (Array.isArray(doc.puzzles)) {
    const badge = doc.badge ? `, ${doc.badge.type} "${doc.badge.label}"` : '';
    return `#${doc.puzzles.join(' + #')}${badge}`;
  }
  const fact = (doc.fact || []).join('');
  return `${decodeAnswer(doc.answer) || '?'}: ${fact.length > 90 ? `${fact.slice(0, 90)}…` : fact}`;
}

export async function renderLog(root, rerender) {
  clear(root, h('p', { class: 'muted' }, 'Loading…'));
  let entries;
  try {
    entries = await loadLog(50);
  } catch (e) {
    clear(root, h('p', { class: 'err' }, `Couldn't load the log: ${e.message}`));
    return;
  }
  clear(root,
    h('p', { class: 'muted small' }, 'The 50 most recent changes made here. Restore puts back what a change replaced; results players posted since are kept.'),
    entries.length ? null : h('p', {}, 'No changes yet.'),
    entries.map((e) => {
      const changed = e.after ? Object.keys(e.after) : [];
      return h('div', { class: 'card log' },
        h('div', { class: 'log-head' },
          h('b', {}, e.action), ` · ${e.collection} · `, fmtTime(e.at), ` · ${e.email || ''}`,
          h('span', { class: 'spacer' }),
          RESTORABLE.has(e.action) && changed.length
            ? h('button', { class: 'btn small', onclick: () => restore(e, rerender) }, 'Restore') : null),
        e.note ? h('p', { class: 'small muted' }, e.action === 'restore' ? `Restored entry ${e.note}` : e.note) : null,
        e.action === 'cleanup'
          ? h('p', { class: 'small' }, `${e.ids.length} IDs deleted. The full docs are in the backup file from that run.`)
          : h('details', {},
            h('summary', {}, `${changed.length} doc${changed.length === 1 ? '' : 's'}: ${changed.slice(0, 6).join(', ')}${changed.length > 6 ? '…' : ''}`),
            changed.slice(0, 40).map((id) => h('div', { class: 'diff' },
              h('div', { class: 'mono' }, id),
              h('div', { class: 'small' }, h('span', { class: 'muted' }, 'Before: '), describe(e.before?.[id])),
              h('div', { class: 'small' }, h('span', { class: 'muted' }, 'After: '), describe(e.after?.[id]))))));
    }));
}

async function restore(entry, rerender) {
  const game = Object.values(GAMES).find((g) => g.collection === entry.collection);
  const ids = Object.keys(entry.after).map(Number);
  const ok = await modal('Restore this change?', (close) => {
    const go = h('button', { class: 'btn primary', onclick: () => close(true) }, 'Restore');
    const gate = availabilityGate(game ? availabilityMessages(game.id, ids) : [], () => { go.disabled = !gate.ok(); });
    go.disabled = !gate.ok();
    return h('div', {},
      h('p', {}, `This writes back what the ${entry.action} on ${fmtTime(entry.at)} replaced, for ${ids.length} doc(s) in ${entry.collection}. Docs it created are deleted.`),
      gate.el,
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => close(false) }, 'Cancel'),
        go));
  });
  if (!ok) return;
  try {
    await restoreLogEntry(entry);
    toast('Restored.');
    await loadAll();
  } catch (e) {
    toast(`Not restored: ${e.message}`, { error: true });
  }
  rerender();
}
