// Checks before a puzzle is saved, and the flags shown in the tables.
// Errors block saving; warnings are shown and can be saved past.

import { GAMES } from './dates.js?v=202610141429';

// How recent a Canuckle puzzle may be and still be reused in Duo
// (canuckleSourceCode/tool/generate_duo_schedule.dart excludeRecent).
export const DUO_RECENT_GAP = 60;

const WORD = /^[A-Za-z]+$/;

/**
 * @param p {gameId, index, docId, answer (plain), fact[], factUrls[]}
 * @param ctx {words: Set|null, answerUses: Map<WORD, index[]>}
 */
export function validatePuzzle(p, ctx = {}) {
  const errors = [];
  const warnings = [];
  const game = GAMES[p.gameId];
  const answer = String(p.answer || '').trim().toUpperCase();

  if (!answer) errors.push('Answer is empty.');
  else if (!WORD.test(answer)) errors.push('Answer must be letters only.');
  else if (!game.answerLengths.includes(answer.length)) {
    errors.push(`Answer must be ${game.answerLengths.join(' or ')} letters.`);
  } else if (ctx.words && !ctx.words.has(answer.toLowerCase())) {
    warnings.push(`${answer} is not in the word list, so players can't guess it unless it's the answer.`);
  }

  if (String(p.docId) !== String(p.index)) errors.push(`Doc id ${p.docId} doesn't match index ${p.index}.`);

  const fact = p.fact || [];
  const urls = p.factUrls || [];
  if (fact.length === 0 || !fact.join('').trim()) warnings.push('No fun fact; the game will show none.');
  if (fact.length !== urls.length) errors.push('Fact text and links are out of step.');
  for (const u of urls) {
    if (u && !/^https?:\/\/\S+$/i.test(u)) errors.push(`Link is not a web address: ${u}`);
  }

  const uses = (ctx.answerUses?.get(answer) || []).filter((i) => i !== p.index);
  if (answer && uses.length) {
    warnings.push(`${answer} is also the answer for ${uses.map(game.label).join(', ')}.`);
  }
  return { errors, warnings };
}

/**
 * @param d {index, docId, puzzles: [a, b], badge: {type, label}|null}
 * @param ctx {canuckle: Map<index, {answer}>, duoUses: Map<canuckleIndex, duoIndex[]>}
 */
export function validateDuo(d, ctx = {}) {
  const errors = [];
  const warnings = [];
  const [a, b] = d.puzzles || [];

  if (String(d.docId) !== String(d.index)) errors.push(`Doc id ${d.docId} doesn't match index ${d.index}.`);
  if (!Number.isInteger(a) || !Number.isInteger(b)) errors.push('Pick two Canuckle puzzles.');
  else if (a === b) errors.push('The two puzzles must be different.');

  const duoEd = GAMES.duo.edForIndex(d.index);
  for (const i of [a, b]) {
    if (!Number.isInteger(i)) continue;
    const p = ctx.canuckle?.get(i);
    if (!p) {
      errors.push(`Canuckle #${i} doesn't exist.`);
      continue;
    }
    if (!p.answer) errors.push(`Canuckle #${i} has no answer.`);
    const gap = duoEd - GAMES.canuckle.edForIndex(i);
    if (gap <= 0) errors.push(`Canuckle #${i} hasn't been played yet on this Duo day, so Duo would spoil it.`);
    else if (gap <= DUO_RECENT_GAP) warnings.push(`Canuckle #${i} was only ${gap} days earlier; players may remember it.`);
    const others = (ctx.duoUses?.get(i) || []).filter((x) => x !== d.index);
    if (others.length) warnings.push(`Canuckle #${i} is also used on Duo ${others.map(GAMES.duo.label).join(', ')}.`);
    if (p.answer && !(p.fact || []).join('').trim()) warnings.push(`Canuckle #${i} has no fun fact.`);
  }

  const badge = d.badge;
  if (badge) {
    if (badge.type !== 'linked' && badge.type !== 'theme') errors.push('Badge must be Linked or Theme.');
    if (!String(badge.label || '').trim()) errors.push('Badge needs a label.');
    else if (badge.label.length > 32) warnings.push('Long badge labels are cut off on phones (one line).');
  }
  return { errors, warnings };
}

/** Short flags for the puzzle table. */
export function puzzleFlags(p, ctx = {}) {
  const flags = [];
  if (!p.answer) flags.push('no answer');
  if (String(p.docId) !== String(p.index)) flags.push('index mismatch');
  if (!p.hasFactFields) flags.push('missing fact fields');
  else if (!(p.fact || []).join('').trim()) flags.push('no fact');
  if (p.answer && ctx.words && !ctx.words.has(p.answer.toLowerCase())) flags.push('not in word list');
  if (p.answer && (ctx.answerUses?.get(p.answer) || []).length > 1) flags.push('repeat');
  return flags;
}
