// Small DOM helpers. Text always goes in through textContent, never innerHTML,
// because puzzle facts and player data are untrusted.

/** h('div', {class: 'x', onclick}, child, 'text', [more]) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

/** Only web links become hrefs; anything else (javascript:, data:) does not. */
export function safeHref(url) {
  return /^https?:\/\//i.test(url || '') ? url : null;
}

/**
 * Opens a dialog. [build] gets a close(result) function and returns the body.
 * Resolves with whatever close() was given (undefined on Esc / backdrop).
 */
export function modal(title, build, { wide = false } = {}) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: `modal${wide ? ' wide' : ''}` });
    const close = (result) => {
      dlg.close();
      dlg.remove();
      resolve(result);
    };
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(undefined);
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) close(undefined);
    });
    dlg.append(
      h('div', { class: 'modal-head' },
        h('h2', {}, title),
        h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => close(undefined) }, '✕')),
      h('div', { class: 'modal-body' }, build(close)),
    );
    document.body.append(dlg);
    dlg.showModal();
  });
}

let toastTimer = null;
export function toast(message, { error = false } = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status' });
    document.body.append(el);
  }
  el.textContent = message;
  el.className = `show${error ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, error ? 7000 : 3500);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

/** A list of errors (red) and warnings (amber). */
export function issues({ errors = [], warnings = [] }) {
  if (!errors.length && !warnings.length) return h('p', { class: 'ok-note' }, 'No problems found.');
  return h('ul', { class: 'issues' },
    errors.map((e) => h('li', { class: 'err' }, e)),
    warnings.map((w) => h('li', { class: 'warn' }, w)));
}

/**
 * The "available to players" warning with its "Save anyway" box. Returns
 * {el, ok()}; ok() is true when nothing is available or the box is ticked.
 */
export function availabilityGate(messages, onChange) {
  if (!messages.length) return { el: null, ok: () => true };
  const box = h('input', { type: 'checkbox', onchange: () => onChange?.() });
  const el = h('div', { class: 'gate' },
    h('strong', {}, 'Players may already have this puzzle'),
    h('ul', {}, messages.map((m) => h('li', {}, m))),
    h('p', {}, 'That includes time zones up to a day ahead. Saved games keep the old word, and the fact and results will no longer match for those players.'),
    h('label', { class: 'check' }, box, ' Save anyway'));
  return { el, ok: () => box.checked };
}

export function fmtTime(ts) {
  const ms = typeof ts?.toMillis === 'function' ? ts.toMillis() : ts;
  if (!ms) return '…';
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
