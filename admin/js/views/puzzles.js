// Canuckle and Canuckle+ tabs: the puzzle table, the editor (edit or add) and
// swapping two puzzles.

import { h, clear, modal, toast, issues, availabilityGate } from '../ui.js?v=202610141429';
import {
  GAMES, longDate, todayIndex, isAvailable, puzzlesAfterToday, nextIndex, missingIndices, parseIndex,
} from '../dates.js?v=202610141429';
import { encodeAnswer } from '../codec.js?v=202610141429';
import { segmentsToText, textToSegments, plainFact } from '../facts.js?v=202610141429';
import { validatePuzzle, puzzleFlags } from '../validate.js?v=202610141429';
import { swapPayload } from '../swap.js?v=202610141429';
import { savePuzzle, swapPuzzles } from '../store.js?v=202610141429';
import { ctx, loadGame, answerUses, duoUses, wordsFor, maxIndex, availabilityMessages } from '../context.js?v=202610141429';
import { factCard, previewFrame } from '../preview.js?v=202610141429';

const PAGE = 150;
const RUNWAY_WARN_DAYS = 30;
const GAPS_SHOWN = 12;

const view = { canuckle: { q: '', filter: 'all', shown: PAGE }, plus: { q: '', filter: 'all', shown: PAGE } };

export function renderPuzzles(root, gameId, rerender) {
  const g = GAMES[gameId];
  const st = view[gameId];
  const words = wordsFor(gameId);
  const uses = answerUses(gameId);
  const today = todayIndex(gameId);
  const max = maxIndex(gameId);
  const all = [...ctx.puzzles[gameId].values()].sort((a, b) => b.index - a.index);

  const flagsOf = (p) => puzzleFlags(p, { words, answerUses: uses });
  const q = st.q.trim().toLowerCase();
  const rows = all.filter((p) => {
    if (st.filter === 'future' && isAvailable(gameId, p.index)) return false;
    if (st.filter === 'available' && !isAvailable(gameId, p.index)) return false;
    if (st.filter === 'flagged' && !flagsOf(p).length) return false;
    if (!q) return true;
    return String(p.index) === q
      || g.label(p.index).toLowerCase() === q
      || p.answer.toLowerCase().includes(q)
      || longDate(p.ed).toLowerCase().includes(q)
      || plainFact(p.fact).toLowerCase().includes(q);
  });

  // Puzzles after today's: days for Canuckle, weeks for Canuckle+.
  const ahead = max == null ? null : puzzlesAfterToday(gameId, max);
  const unit = `${gameId === 'plus' ? 'week' : 'day'}${ahead === 1 ? '' : 's'}`;

  // Numbers below the highest puzzle with nothing saved, newest first.
  const gaps = missingIndices(gameId, ctx.puzzles[gameId], max).reverse();
  const gapBanner = gaps.length ? h('div', { class: 'banner warn gaps' },
    `${gaps.length} missing ${gaps.length === 1 ? 'puzzle' : 'puzzles'} below ${g.label(max)}: `,
    gaps.slice(0, GAPS_SHOWN).map((i) => h('button', {
      class: 'btn small',
      title: `Add ${g.name} ${g.label(i)} · ${longDate(g.edForIndex(i))}`,
      onclick: () => openEditor(gameId, i, rerender, { add: true }),
    }, `Add ${g.label(i)}`)),
    gaps.length > GAPS_SHOWN ? ` and ${gaps.length - GAPS_SHOWN} earlier (use Add at…).` : null) : null;

  const search = h('input', {
    type: 'search', placeholder: 'Search answer, #, date or fact', value: st.q,
    oninput: (e) => { st.q = e.target.value; st.shown = PAGE; st.refocus = true; rerender(); },
  });
  const filter = h('select', { onchange: (e) => { st.filter = e.target.value; st.shown = PAGE; rerender(); } },
    [['all', 'All'], ['future', 'Future only'], ['available', 'Available to players'], ['flagged', 'Flagged']]
      .map(([v, l]) => h('option', { value: v, selected: st.filter === v }, l)));

  clear(root,
    h('div', { class: `banner${ahead != null && ahead * g.step < RUNWAY_WARN_DAYS ? ' warn' : ''}` },
      ahead == null ? 'No puzzles yet.'
        : ahead < 0 ? `Out of puzzles: the last one was ${longDate(g.edForIndex(max))}. Players can't get a new ${g.name}.`
          : `${ahead} ${unit} of puzzles after today (last: ${g.label(max)}, ${longDate(g.edForIndex(max))}).`,
      ' Today is ', h('b', {}, g.label(today)), '.'),
    gapBanner,
    h('div', { class: 'toolbar' },
      search, filter,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => openSwap(gameId, rerender) }, 'Swap two…'),
      h('button', { class: 'btn', onclick: () => openAddAt(gameId, rerender) }, 'Add at…'),
      h('button', { class: 'btn primary', onclick: () => openEditor(gameId, null, rerender) }, `Add ${g.label(nextIndex(gameId, max))}`)),
    h('p', { class: 'muted small' }, `${rows.length} of ${all.length} puzzles`),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'grid' },
        h('thead', {}, h('tr', {}, ['#', 'Date', 'Answer', 'Fun fact', 'Plays', 'Flags'].map((t) => h('th', {}, t)))),
        h('tbody', {}, rows.slice(0, st.shown).map((p) => {
          const flags = flagsOf(p);
          const plays = g.distKeys.reduce((n, k) => n + (Number(p.data.distribution?.[k]) || 0), 0);
          return h('tr', {
            class: [p.index === today ? 'today' : '', isAvailable(gameId, p.index) ? '' : 'future'].join(' '),
            tabIndex: 0,
            onclick: () => openEditor(gameId, p.index, rerender),
            onkeydown: (e) => { if (e.key === 'Enter') openEditor(gameId, p.index, rerender); },
          },
          h('td', { class: 'num' }, g.label(p.index)),
          h('td', { class: 'nowrap' }, longDate(p.ed), p.index === today ? h('span', { class: 'pill' }, 'Today') : null),
          h('td', { class: 'answer' }, p.answer || '—'),
          h('td', { class: 'fact' }, plainFact(p.fact)),
          h('td', { class: 'num' }, plays || ''),
          h('td', {}, flags.map((f) => h('span', { class: 'flag' }, f))));
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

/**
 * Edit an existing puzzle, or add one: the next one when [index] is null, or
 * at [index] (a gap, or past the end) when [add] is set.
 */
export async function openEditor(gameId, index, rerender, { add = index == null } = {}) {
  const g = GAMES[gameId];
  const isNew = add;
  const target = index == null ? nextIndex(gameId, maxIndex(gameId)) : index;
  const existing = ctx.puzzles[gameId].get(target);
  const original = existing
    ? { answer: existing.answer, fact: existing.fact, factUrls: existing.factUrls }
    : { answer: '', fact: [], factUrls: [] };
  const originalText = segmentsToText(original.fact, original.factUrls);

  const saved = await modal(`${isNew ? 'Add' : 'Edit'} ${g.name} ${g.label(target)} · ${longDate(g.edForIndex(target))}`, (close) => {
    const answer = h('input', { class: 'answer-input', value: original.answer, maxLength: 7, autocomplete: 'off', spellcheck: false });
    const factText = h('textarea', { rows: 5, value: originalText, spellcheck: true });
    const problems = h('div');
    const gateSlot = h('div');
    const save = h('button', { class: 'btn primary' }, isNew ? 'Add puzzle' : 'Save');

    const current = () => {
      const text = factText.value;
      const segs = text === originalText ? { fact: original.fact, factUrls: original.factUrls } : textToSegments(text);
      return { answer: answer.value.trim().toUpperCase(), ...segs };
    };
    const pv = previewFrame(() => {
      const c = current();
      return factCard({ kind: gameId, answer: c.answer, fact: c.fact, factUrls: c.factUrls });
    });
    const gate = availabilityGate(availabilityMessages(gameId, [target]), () => update());
    if (gate.el) gateSlot.append(gate.el);

    let result = { errors: [], warnings: [] };
    function update() {
      const c = current();
      result = validatePuzzle({ gameId, index: target, docId: String(target), ...c },
        { words: wordsFor(gameId), answerUses: answerUses(gameId) });
      clear(problems, issues(result));
      save.disabled = result.errors.length > 0 || !gate.ok();
      pv.refresh();
    }
    answer.addEventListener('input', update);
    factText.addEventListener('input', update);

    save.addEventListener('click', async () => {
      const c = current();
      const changes = {
        answer: encodeAnswer(c.answer, { upper: ctx.upper[gameId] }),
        fact: c.fact,
        factUrls: c.factUrls,
      };
      if (!isNew && c.answer === original.answer) delete changes.answer; // keep the stored encoding
      if (isNew) changes.distribution = Object.fromEntries(g.distKeys.map((k) => [k, 0]));
      save.disabled = true;
      try {
        await savePuzzle(gameId, target, changes, { isNew });
        close(true);
      } catch (e) {
        toast(`Not saved: ${e.message}`, { error: true });
        update();
      }
    });

    update();
    const dist = existing?.data.distribution;
    return h('div', { class: 'editor' },
      h('div', { class: 'editor-form' },
        h('label', { class: 'field' }, h('span', {}, `Answer (${g.answerLengths.join(' or ')} letters)`), answer),
        h('label', { class: 'field' }, h('span', {}, 'Fun fact'), factText),
        h('p', { class: 'muted small' },
          'Write links as [link text](https://…). Spaces count: they show exactly as typed. Type \\[ or \\] for a literal bracket.'),
        dist ? h('p', { class: 'muted small' }, 'Results so far: ',
          g.distKeys.map((k) => `${k} ${dist[k] ?? 0}`).join(' · ')) : null,
        problems,
        gateSlot,
        h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close(false) }, 'Cancel'), save)),
      pv.el);
  }, { wide: true });

  if (saved) {
    toast(`${g.name} ${g.label(target)} saved.`);
    await loadGame(gameId);
    rerender();
  }
}

/** Asks for any number with no puzzle yet, then opens the editor to add it. */
export async function openAddAt(gameId, rerender) {
  const g = GAMES[gameId];
  const max = maxIndex(gameId);
  const chosen = await modal(`Add a ${g.name} puzzle at…`, (close) => {
    const input = h('input', { type: 'text', inputMode: 'numeric', placeholder: g.label(nextIndex(gameId, max)), autocomplete: 'off' });
    const note = h('div');
    const go = h('button', { class: 'btn primary', disabled: true }, 'Continue');
    let target = null;

    const update = () => {
      target = null;
      go.disabled = true;
      go.textContent = 'Continue';
      go.onclick = null;
      const i = parseIndex(gameId, input.value);
      if (input.value.trim() === '') {
        clear(note, h('p', { class: 'muted small' }, `Type a ${g.name} number${gameId === 'canuckle' ? '' : ` (${g.label(g.firstIndex + 79)} or ${g.firstIndex + 79} both work)`}.`));
        return;
      }
      if (i == null || i < g.firstIndex) {
        clear(note, issues({ errors: [`Enter a whole number from ${g.label(g.firstIndex)} up.`] }));
        return;
      }
      const existing = ctx.puzzles[gameId].get(i);
      if (existing) {
        clear(note, issues({ warnings: [`${g.label(i)} already exists (${existing.answer || 'no answer'}, ${longDate(existing.ed)}).`] }));
        go.disabled = false;
        go.textContent = `Edit ${g.label(i)}`;
        go.onclick = () => close({ index: i, add: false });
        return;
      }
      target = i;
      const where = max == null || i < max ? 'fills a gap' : i === max + 1 ? 'is the next one' : `leaves ${i - max - 1} empty before it`;
      clear(note, h('p', { class: 'small' }, `${g.label(i)} is ${longDate(g.edForIndex(i))}, and ${where}.`));
      go.disabled = false;
      go.onclick = () => close({ index: target, add: true });
    };
    input.addEventListener('input', update);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !go.disabled) go.click(); });
    update();
    setTimeout(() => input.focus(), 0);
    return h('div', {},
      h('label', { class: 'field' }, h('span', {}, 'Puzzle number'), input),
      note,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), go));
  });
  if (chosen) await openEditor(gameId, chosen.index, rerender, { add: chosen.add });
}

export async function openSwap(gameId, rerender) {
  const g = GAMES[gameId];
  const done = await modal(`Swap two ${g.name} puzzles`, (close) => {
    const inputA = h('input', { type: 'number', placeholder: 'Index' });
    const inputB = h('input', { type: 'number', placeholder: 'Index' });
    const cardA = h('div', { class: 'swap-card' });
    const cardB = h('div', { class: 'swap-card' });
    const notes = h('div');
    const go = h('button', { class: 'btn primary', disabled: true }, 'Swap');
    let gate = { ok: () => true };

    // Accepts the player-facing number for Plus (#80) as well as the index.
    const parse = (input) => parseIndex(gameId, input.value);
    const fill = (card, p, i) => clear(card,
      p ? [
        h('div', { class: 'swap-title' }, `${g.label(i)} · ${longDate(p.ed)}`),
        h('div', { class: 'answer big' }, p.answer || '—'),
        h('p', { class: 'small' }, plainFact(p.fact) || h('em', {}, 'No fact')),
      ] : h('p', { class: 'muted' }, i == null ? 'Enter an index' : `${g.label(i)} doesn't exist`));

    const update = () => {
      const a = parse(inputA);
      const b = parse(inputB);
      const pa = ctx.puzzles[gameId].get(a);
      const pb = ctx.puzzles[gameId].get(b);
      fill(cardA, pa, a);
      fill(cardB, pb, b);
      clear(notes);
      go.disabled = true;
      if (!pa || !pb) return;
      if (a === b) {
        notes.append(issues({ errors: ['Pick two different puzzles.'] }));
        return;
      }
      const warnings = [];
      if (gameId === 'canuckle') {
        const uses = duoUses();
        for (const i of [a, b]) {
          const d = uses.get(i) || [];
          if (d.length) warnings.push(`Canuckle #${i} is used by Duo ${d.map(GAMES.duo.label).join(', ')}; those days will get the swapped word.`);
        }
      }
      notes.append(h('p', { class: 'small' }, 'The answer, fun fact and results move together; the dates stay put.'));
      if (warnings.length) notes.append(issues({ warnings }));
      gate = availabilityGate(availabilityMessages(gameId, [a, b]), () => { go.disabled = !gate.ok(); });
      if (gate.el) notes.append(gate.el);
      go.disabled = !gate.ok();
      go.onclick = async () => {
        go.disabled = true;
        try {
          await swapPuzzles(gameId, a, b, swapPayload);
          close(`${g.label(a)} and ${g.label(b)}`);
        } catch (e) {
          toast(`Not swapped: ${e.message}`, { error: true });
          go.disabled = false;
        }
      };
    };
    inputA.addEventListener('input', update);
    inputB.addEventListener('input', update);
    update();
    return h('div', {},
      h('div', { class: 'swap' },
        h('div', {}, h('label', { class: 'field' }, h('span', {}, 'First'), inputA), cardA),
        h('div', { class: 'swap-arrow' }, '⇄'),
        h('div', {}, h('label', { class: 'field' }, h('span', {}, 'Second'), inputB), cardB)),
      notes,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), go));
  }, { wide: true });

  if (done) {
    toast(`Swapped ${done}.`);
    await loadGame(gameId);
    rerender();
  }
}
