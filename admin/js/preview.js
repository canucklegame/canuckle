// HTML copies of the game's fun fact card and Duo badge chip, so a fact can
// be checked before it ships. Sources in canuckleSourceCode:
//   FactCard        lib/ui/stats_parts.dart
//   funFactSpans    lib/words.dart (runs joined with no separator)
//   DuoBadgeChip    lib/duo/duo_board.dart
//   SegmentedPill   lib/ui/segmented.dart (Duo's mini answer switch)
//   colours         lib/colors.dart, styles lib/ui/text_styles.dart
// Sizes and colours live in css/admin.css under .pv.

import { h, safeHref } from './ui.js?v=202610141429';

const LEAF = 'M50 5L57 19L64 15L61 38L72 27L75 34L86 32L82 45L90 49L70 64L73 73L53 70L53 92L47 92L47 70L27 73L30 64L10 49L18 45L14 32L25 34L28 27L39 38L36 15L43 19Z';
const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(viewBox, size, build) {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.setAttribute('aria-hidden', 'true');
  build(el);
  return el;
}

function path(d, attrs = {}) {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
  return p;
}

function mapleLeaf() {
  return svg('0 0 100 100', 14, (el) => el.append(path(LEAF, { fill: 'currentColor' })));
}

// lib/ui/icons.dart link / tag, stroke 2.2 on a 24 grid
function strokeIcon(paths) {
  return svg('0 0 24 24', 14, (el) => {
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '2.2');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    for (const d of paths) el.append(path(d));
  });
}

const LINK = ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'];
const TAG = ['M3 12V4h8l10 10-8 8z'];

function tagIcon() {
  const el = strokeIcon(TAG);
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', '7.5');
  dot.setAttribute('cy', '8.5');
  dot.setAttribute('r', '1.2');
  dot.setAttribute('fill', 'currentColor');
  el.append(dot);
  return el;
}

/** The fact text with links, as the game builds it. */
export function factSpans(fact = [], factUrls = []) {
  return fact.map((text, i) => {
    const url = factUrls[i] || '';
    if (!url) return document.createTextNode(text);
    return h('a', { class: 'pv-link', href: safeHref(url), target: '_blank', rel: 'noopener noreferrer' }, text);
  });
}

/**
 * kind: 'canuckle' | 'plus' | 'duo'. trailing: optional element at the right
 * of the header (Duo's answer switch).
 */
export function factCard({ kind, answer, fact, factUrls, trailing = null }) {
  return h('div', { class: `pv-fact pv-${kind}` },
    h('div', { class: 'pv-fact-head' },
      h('span', { class: 'pv-leaf' }, mapleLeaf()),
      h('span', { class: 'pv-label' }, `FUN FACT ABOUT ${answer || '?????'}`),
      trailing),
    h('div', { class: 'pv-body' }, fact?.length ? factSpans(fact, factUrls) : h('em', { class: 'pv-none' }, 'No fun fact — the game shows no card.')));
}

/** Duo's mini switch between the two answers. */
export function miniSwitch(options, selected, onChange) {
  return h('div', { class: 'pv-switch', role: 'tablist' },
    options.map((label, i) => h('button', {
      type: 'button',
      class: i === selected ? 'on' : '',
      onclick: () => onChange(i),
    }, label)));
}

export function badgeChip(badge, revealed) {
  if (!badge) return null;
  const linked = badge.type === 'linked';
  let text;
  let hint = null;
  if (!linked) text = `Theme: ${badge.label}`;
  else if (revealed) text = `Linked by ${badge.label}`;
  else {
    text = 'Linked pair';
    hint = 'revealed at the end';
  }
  return h('div', { class: 'pv-chip' },
    linked ? strokeIcon(LINK) : tagIcon(),
    h('span', { class: 'pv-chip-text' },
      h('b', {}, text),
      hint && h('span', { class: 'pv-hint' }, ` · ${hint}`)));
}

/**
 * A preview frame: the game's 460px sheet on its own surface, with a
 * light/dark toggle that is remembered for the session.
 */
let darkPreview = false;
export function previewFrame(render) {
  const frame = h('div', { class: 'pv-frame' });
  const sheet = h('div', { class: 'pv' });
  const toggle = h('button', { type: 'button', class: 'btn small ghost' });
  const paint = () => {
    sheet.className = `pv${darkPreview ? ' pv-dark' : ''}`;
    toggle.textContent = darkPreview ? 'Light preview' : 'Dark preview';
    sheet.replaceChildren(render());
  };
  toggle.addEventListener('click', () => {
    darkPreview = !darkPreview;
    paint();
  });
  paint();
  frame.append(h('div', { class: 'pv-tools' }, h('span', { class: 'muted small' }, 'How it looks in the game'), toggle), sheet);
  return { el: frame, refresh: paint };
}
