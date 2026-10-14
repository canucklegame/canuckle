// Canuckle Duo tab: the day table, the day editor (two Canuckle puzzles and
// an optional "Linked by" / "Theme" badge) and importing a schedule JSON
// (canuckleSourceCode/tool/duo_schedule_year1.json).

import { h, clear, modal, toast, issues, availabilityGate } from '../ui.js?v=202610141429';
import { GAMES, longDate, todayIndex, isAvailable, puzzlesAfterToday, nextIndex } from '../dates.js?v=202610141429';
import { validateDuo } from '../validate.js?v=202610141429';
import { savePuzzle, importDuo } from '../store.js?v=202610141429';
import { ctx, loadGame, duoUses, maxIndex, availabilityMessages } from '../context.js?v=202610141429';
import { factCard, badgeChip, miniSwitch, previewFrame } from '../preview.js?v=202610141429';

const PAGE = 150;
const st = { q: '', filter: 'all', shown: PAGE, refocus: false };
const g = GAMES.duo;

function answerOf(i) {
  return ctx.puzzles.canuckle.get(i)?.answer || '';
}

function duoProblems(d, uses) {
  return validateDuo({ index: d.index, docId: d.docId, puzzles: d.puzzles, badge: d.badge },
    { canuckle: ctx.puzzles.canuckle, duoUses: uses });
}

export function renderDuo(root, rerender) {
  const uses = duoUses();
  const today = todayIndex('duo');
  const max = maxIndex('duo');
  const all = [...ctx.puzzles.duo.values()].sort((a, b) => b.index - a.index);
  const q = st.q.trim().toLowerCase();
  const rows = all.filter((d) => {
    if (st.filter === 'future' && isAvailable('duo', d.index)) return false;
    if (st.filter === 'available' && !isAvailable('duo', d.index)) return false;
    if (st.filter === 'flagged') {
      const r = duoProblems(d, uses);
      if (!r.errors.length && !r.warnings.length) return false;
    }
    if (st.filter === 'nobadge' && d.badge) return false;
    if (!q) return true;
    return String(d.index) === q
      || g.label(d.index).toLowerCase() === q
      || d.puzzles.some((i) => String(i) === q || answerOf(i).toLowerCase().includes(q))
      || longDate(d.ed).toLowerCase().includes(q)
      || String(d.badge?.label || '').toLowerCase().includes(q);
  });
  const ahead = max == null ? null : puzzlesAfterToday('duo', max);

  const search = h('input', {
    type: 'search', placeholder: 'Search answer, #, date or badge', value: st.q,
    oninput: (e) => { st.q = e.target.value; st.shown = PAGE; st.refocus = true; rerender(); },
  });
  clear(root,
    h('div', { class: `banner${ahead != null && ahead < 30 ? ' warn' : ''}` },
      ahead == null ? 'No Duo days yet. Import the schedule to start.'
        : ahead < 0 ? `Out of Duo days: the last one was ${longDate(g.edForIndex(max))}.`
          : `${ahead} day${ahead === 1 ? '' : 's'} of Duo after today (last: ${g.label(max)}, ${longDate(g.edForIndex(max))}).`,
      ' Today is ', h('b', {}, g.label(today)), '.'),
    h('div', { class: 'toolbar' },
      search,
      h('select', { onchange: (e) => { st.filter = e.target.value; st.shown = PAGE; rerender(); } },
        [['all', 'All'], ['future', 'Future only'], ['available', 'Available to players'], ['flagged', 'Flagged'], ['nobadge', 'No badge']]
          .map(([v, l]) => h('option', { value: v, selected: st.filter === v }, l))),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => openImport(rerender) }, 'Import schedule…'),
      h('button', { class: 'btn primary', onclick: () => openDuoEditor(null, rerender) }, `Add ${g.label(nextIndex('duo', max))}`)),
    h('p', { class: 'muted small' }, `${rows.length} of ${all.length} days`),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'grid' },
        h('thead', {}, h('tr', {}, ['#', 'Date', 'Words', 'Badge', 'Plays', 'Flags'].map((t) => h('th', {}, t)))),
        h('tbody', {}, rows.slice(0, st.shown).map((d) => {
          const r = duoProblems(d, uses);
          const plays = g.distKeys.reduce((n, k) => n + (Number(d.data.distribution?.[k]) || 0), 0);
          return h('tr', {
            class: [d.index === today ? 'today' : '', isAvailable('duo', d.index) ? '' : 'future'].join(' '),
            tabIndex: 0,
            onclick: () => openDuoEditor(d.index, rerender),
            onkeydown: (e) => { if (e.key === 'Enter') openDuoEditor(d.index, rerender); },
          },
          h('td', { class: 'num' }, g.label(d.index)),
          h('td', { class: 'nowrap' }, longDate(d.ed), d.index === today ? h('span', { class: 'pill' }, 'Today') : null),
          h('td', { class: 'answer' }, d.puzzles.map((i) => `${answerOf(i) || '?'} (#${i})`).join(' + ') || '—'),
          h('td', {}, d.badge ? `${d.badge.type === 'linked' ? 'Linked by' : 'Theme'}: ${d.badge.label}` : ''),
          h('td', { class: 'num' }, plays || ''),
          h('td', {}, r.errors.map((e) => h('span', { class: 'flag err' }, e)), r.warnings.length ? h('span', { class: 'flag' }, `${r.warnings.length} warning${r.warnings.length > 1 ? 's' : ''}`) : null));
        })))),
    rows.length > st.shown
      ? h('button', { class: 'btn more', onclick: () => { st.shown += PAGE; rerender(); } }, `Show ${Math.min(PAGE, rows.length - st.shown)} more`)
      : null);
  if (st.refocus) {
    st.refocus = false;
    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  }
}

// An index box with the answer echoed beside it, plus answer search.
function puzzlePicker(label, initial, onChange) {
  const input = h('input', { type: 'number', value: initial ?? '', placeholder: 'Canuckle #' });
  const echo = h('span', { class: 'answer' });
  const find = h('input', { type: 'search', placeholder: 'or find by answer' });
  const hits = h('div', { class: 'hits' });
  const paint = () => {
    const i = Number(input.value);
    echo.textContent = input.value ? (answerOf(i) || 'not found') : '';
  };
  input.addEventListener('input', () => { paint(); onChange(); });
  find.addEventListener('input', () => {
    const q = find.value.trim().toUpperCase();
    clear(hits);
    if (q.length < 2) return;
    const found = [...ctx.puzzles.canuckle.values()].filter((p) => p.answer.startsWith(q)).slice(0, 8);
    hits.append(...found.map((p) => h('button', {
      type: 'button', class: 'hit',
      onclick: () => { input.value = p.index; find.value = ''; clear(hits); paint(); onChange(); },
    }, `${p.answer} #${p.index}`)));
    if (!found.length) hits.append(h('span', { class: 'muted small' }, 'No match'));
  });
  paint();
  return {
    el: h('div', { class: 'picker' }, h('label', { class: 'field' }, h('span', {}, label), h('div', { class: 'row' }, input, echo)), find, hits),
    value: () => (input.value === '' ? null : Number(input.value)),
  };
}

export async function openDuoEditor(index, rerender) {
  const isNew = index == null;
  const target = isNew ? nextIndex('duo', maxIndex('duo')) : index;
  const existing = ctx.puzzles.duo.get(target);

  const saved = await modal(`${isNew ? 'Add' : 'Edit'} Canuckle Duo ${g.label(target)} · ${longDate(g.edForIndex(target))}`, (close) => {
    const problems = h('div');
    const gateSlot = h('div');
    const save = h('button', { class: 'btn primary' }, isNew ? 'Add day' : 'Save');
    const a = puzzlePicker('First word', existing?.puzzles[0], () => update());
    const b = puzzlePicker('Second word', existing?.puzzles[1], () => update());
    const type = h('select', {},
      [['', 'No badge'], ['linked', 'Linked by (hidden until the end)'], ['theme', 'Theme (shown all day)']]
        .map(([v, l]) => h('option', { value: v, selected: (existing?.badge?.type || '') === v }, l)));
    const label = h('input', { value: existing?.badge?.label || '', placeholder: 'e.g. Sugar shack', maxLength: 60 });
    type.addEventListener('change', () => update());
    label.addEventListener('input', () => update());

    const badge = () => (type.value ? { type: type.value, label: label.value.trim() } : null);
    let shown = 0;
    const pv = previewFrame(() => {
      const ps = [a.value(), b.value()];
      const answers = ps.map((i) => answerOf(i));
      const chip = badge();
      const facts = ps.map((i, n) => {
        const p = ctx.puzzles.canuckle.get(i);
        return { answer: answers[n], fact: p?.fact || [], factUrls: p?.factUrls || [] };
      });
      const sel = facts[shown] ? shown : 0;
      return h('div', { class: 'pv-stack' },
        chip && chip.label ? [
          h('div', { class: 'pv-caption' }, 'Badge while playing'), badgeChip(chip, false),
          h('div', { class: 'pv-caption' }, 'Badge after the game'), badgeChip(chip, true),
        ] : h('div', { class: 'pv-caption' }, 'No badge on this day'),
        h('div', { class: 'pv-caption' }, 'Fun fact after the game'),
        factCard({
          kind: 'duo', ...facts[sel],
          trailing: miniSwitch(answers.map((x) => x || '?'), sel, (i) => { shown = i; pv.refresh(); }),
        }));
    });

    let gate = { el: null, ok: () => true };
    function update() {
      const d = { index: target, docId: String(target), puzzles: [a.value(), b.value()], badge: badge() };
      const r = validateDuo(d, { canuckle: ctx.puzzles.canuckle, duoUses: duoUses() });
      clear(problems, issues(r));
      save.disabled = r.errors.length > 0 || !gate.ok();
      pv.refresh();
    }
    gate = availabilityGate(availabilityMessages('duo', [target]), () => update());
    if (gate.el) gateSlot.append(gate.el);

    save.addEventListener('click', async () => {
      const changes = { puzzles: [a.value(), b.value()] };
      const bd = badge();
      changes.badge = bd && bd.label ? bd : null;
      if (isNew) changes.distribution = Object.fromEntries(g.distKeys.map((k) => [k, 0]));
      save.disabled = true;
      try {
        await savePuzzle('duo', target, changes, { isNew });
        close(true);
      } catch (e) {
        toast(`Not saved: ${e.message}`, { error: true });
        update();
      }
    });

    update();
    return h('div', { class: 'editor' },
      h('div', { class: 'editor-form' },
        h('div', { class: 'pickers' }, a.el, b.el),
        h('label', { class: 'field' }, h('span', {}, 'Badge'), type),
        h('label', { class: 'field' }, h('span', {}, 'Badge label'), label),
        problems,
        gateSlot,
        h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close(false) }, 'Cancel'), save)),
      pv.el);
  }, { wide: true });

  if (saved) {
    toast(`Duo ${g.label(target)} saved.`);
    await loadGame('duo');
    rerender();
  }
}

/** Reads a schedule file into {id: data}, keeping only the fields the game reads. */
export function parseSchedule(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Expected an object keyed by index.');
  const out = {};
  for (const [id, v] of Object.entries(json)) {
    const index = Number(id);
    if (!Number.isInteger(index) || index < g.firstIndex) throw new Error(`Bad index ${id}.`);
    if (!Array.isArray(v?.puzzles) || v.puzzles.length !== 2 || !v.puzzles.every(Number.isInteger)) {
      throw new Error(`Day ${id} needs two puzzle indexes.`);
    }
    const doc = {
      index,
      puzzles: v.puzzles,
      distribution: Object.fromEntries(g.distKeys.map((k) => [k, Number(v.distribution?.[k]) || 0])),
    };
    if (v.badge && (v.badge.type === 'linked' || v.badge.type === 'theme') && v.badge.label) {
      doc.badge = { type: v.badge.type, label: String(v.badge.label) };
    }
    out[id] = doc;
  }
  return out;
}

async function openImport(rerender) {
  const imported = await modal('Import a Duo schedule', (close) => {
    const file = h('input', { type: 'file', accept: '.json,application/json' });
    const report = h('div');
    const go = h('button', { class: 'btn primary', disabled: true }, 'Import new days');
    let toWrite = {};

    file.addEventListener('change', async () => {
      clear(report);
      go.disabled = true;
      try {
        const docs = parseSchedule(JSON.parse(await file.files[0].text()));
        const uses = new Map();
        for (const d of Object.values(docs)) for (const i of d.puzzles) uses.set(i, [...(uses.get(i) || []), d.index]);
        const fresh = {};
        let same = 0;
        const differ = [];
        const errors = [];
        for (const [id, d] of Object.entries(docs)) {
          const cur = ctx.puzzles.duo.get(Number(id));
          if (!cur) fresh[id] = d;
          else if (cur.puzzles.join() === d.puzzles.join()) same++;
          else differ.push(id);
          const r = validateDuo({ index: d.index, docId: id, puzzles: d.puzzles, badge: d.badge || null },
            { canuckle: ctx.puzzles.canuckle });
          if (r.errors.length) errors.push(`${g.label(d.index)}: ${r.errors.join(' ')}`);
        }
        const freshAvailable = Object.keys(fresh).filter((id) => isAvailable('duo', Number(id)));
        toWrite = fresh;
        report.append(
          h('ul', {},
            h('li', {}, `${Object.keys(fresh).length} new days will be added.`),
            h('li', {}, `${same} already exist with the same words (left alone).`),
            h('li', {}, `${differ.length} already exist with different words (left alone${differ.length ? `: ${differ.slice(0, 10).map((i) => g.label(Number(i))).join(', ')}${differ.length > 10 ? '…' : ''}` : ''}).`),
            freshAvailable.length ? h('li', { class: 'warn' }, `${freshAvailable.length} of the new days are already available to players.`) : null),
          errors.length ? issues({ errors: errors.slice(0, 20).concat(errors.length > 20 ? [`…and ${errors.length - 20} more`] : []) }) : null);
        go.disabled = errors.length > 0 || Object.keys(fresh).length === 0;
      } catch (e) {
        report.append(issues({ errors: [`Couldn't read that file: ${e.message}`] }));
      }
    });

    go.addEventListener('click', async () => {
      go.disabled = true;
      file.disabled = true;
      const progress = h('p', { class: 'small' });
      report.append(progress);
      try {
        await importDuo(toWrite, (done, total) => { progress.textContent = `Written ${done} of ${total}…`; });
        close(Object.keys(toWrite).length);
      } catch (e) {
        toast(`Import stopped: ${e.message}`, { error: true });
        go.disabled = false;
      }
    });

    return h('div', {},
      h('p', {}, 'Choose a schedule JSON like canuckleSourceCode/tool/duo_schedule_year1.json. Only days that don\'t exist yet are written; existing days are never changed.'),
      file, report,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), go));
  });

  if (imported) {
    toast(`Imported ${imported} Duo days.`);
    await loadGame('duo');
    rerender();
  }
}
