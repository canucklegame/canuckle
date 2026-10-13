// The Settings sheet: display, account, support, feedback and socials, with
// the privacy policy a button at the foot.
//
// Everything Canuckle's own Settings offers except Hard Mode, which only means
// something inside Canuckle, plus the Ko-fi and social links Canuckle keeps in
// its menu.

import { h, ICONS, openSheet, sheetHead, toast } from '../ui.js?v=202610131208';
import {
  ARENA_VERSION, IS_SANDBOX, sandboxOffsetWeeks, setSandboxOffsetWeeks, parseOffsetWeeks, offsetBannerText,
} from '../config.js?v=202610131208';
import { readPref, prefKeys, arenaSet } from '../local.js?v=202610131208';
import { getDocData, setMerge } from '../firebase.js?v=202610131208';
import { currentTheme, currentContrast, setTheme, setContrast } from '../theme.js?v=202610131208';
import { ID_DOCS, isValidUserId, planIdSwitch, applyIdSwitch } from '../idSwitch.js?v=202610131208';
import { track } from '../analytics.js?v=202610131208';
import { openPrivacy } from '../privacy.js?v=202610131208';
import { sortsByPlay, setSortByPlay } from '../gameOrder.js?v=202610131208';
import { openGameOrder } from './gameOrderSheet.js?v=202610131208';

const SUPPORT_EMAIL = 'info@canucklegame.ca';
const KOFI_URL = 'https://ko-fi.com/canuckle';
const CIRA_URL = 'https://www.cira.ca?utm_source=Website&utm_medium=Banner&utm_campaign=Canuckle';
const SOCIALS = [
  { name: 'Twitter', icon: 'twitter', url: 'https://twitter.com/CanuckleGame' },
  { name: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/CanuckleGame' },
  { name: 'Instagram', icon: 'instagram', url: 'https://instagram.com/canucklegame' },
];

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Canuckle's feedback subject: the id, plus any ids this browser used before. */
export function feedbackSubject(id, oldIds) {
  const base = `Feedback from User ID: ${id || 'none yet'}`;
  return oldIds && oldIds.length ? `${base} (Old IDs: [${oldIds.join(', ')}])` : base;
}

const oldIdsHere = () => {
  const v = readPref('oldFirestoreUsernames');
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
};

const external = (url, content, props = {}) =>
  h('a', { href: url, target: '_blank', rel: 'noopener', ...props }, content);

// ---- Rows -------------------------------------------------------------------

function toggleRow(label, detail, checked, onChange) {
  const sw = h('button', {
    class: 'switch',
    role: 'switch',
    'aria-checked': String(checked),
    'aria-label': label,
  }, h('span', { class: 'knob' }));
  const row = h('div', { class: 'set-row toggle' },
    h('div', { class: 'set-text' },
      h('div', { class: 'set-label', text: label }),
      detail ? h('div', { class: 'set-detail', text: detail }) : null),
    sw);
  // The whole row toggles, as in the games.
  row.addEventListener('click', () => {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return row;
}

function section(title, ...children) {
  return h('section', { class: 'set-section' },
    h('h3', { class: 'set-caption', text: title }),
    ...children);
}

// ---- Account ----------------------------------------------------------------

function userIdRow(app) {
  if (!app.uid) {
    return h('div', { class: 'set-row' },
      h('div', { class: 'set-text' },
        h('div', { class: 'set-label', text: 'User ID' }),
        h('div', { class: 'set-detail', text: 'Play any game to get your User ID.' })));
  }
  const idText = h('span', { class: 'user-id', text: app.uid });
  return h('div', { class: 'set-row' },
    h('div', { class: 'set-text' },
      h('div', { class: 'set-label', text: 'User ID' }),
      idText),
    h('button', {
      class: 'copy-btn',
      type: 'button',
      'aria-label': 'Copy User ID',
      html: ICONS.copy,
      onClick: (e) => {
        const btn = e.currentTarget;
        const copied = () => {
          btn.innerHTML = ICONS.check;
          btn.classList.add('copied');
          btn.setAttribute('aria-label', 'User ID copied');
          clearTimeout(btn.resetTimer);
          btn.resetTimer = setTimeout(() => {
            btn.innerHTML = ICONS.copy;
            btn.classList.remove('copied');
            btn.setAttribute('aria-label', 'Copy User ID');
          }, 2000);
        };
        const select = () => {
          const range = document.createRange();
          range.selectNodeContents(idText);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          toast('Select and copy your User ID');
        };
        try {
          navigator.clipboard.writeText(app.uid).then(copied, select);
        } catch {
          select();
        }
      },
    }));
}

/**
 * Linked email, stored on the player's Canuckle record like Canuckle's own.
 *
 * Only offered once that record exists: a record with nothing but an email in
 * it has no games list, and Canuckle treats such a record as unreadable and
 * stops saving to it.
 */
function emailRow(app) {
  const box = h('div', { class: 'set-row column' },
    h('div', { class: 'set-label', text: 'Linked Email' }),
    h('div', { class: 'set-detail', text: 'Loading…' }));
  if (!app.uid) {
    box.lastChild.textContent = 'Play Canuckle once to link an email.';
    return box;
  }

  const render = (doc) => {
    const caption = h('div', { class: 'set-detail', text: 'Only used for account recovery purposes.' });
    if (!doc || !Array.isArray(doc.games)) {
      box.replaceChildren(
        h('div', { class: 'set-label', text: 'Linked Email' }),
        h('div', { class: 'set-detail', text: 'Play Canuckle once to link an email.' }));
      return;
    }
    const linked = typeof doc.email === 'string' ? doc.email : '';
    if (linked) {
      box.replaceChildren(
        h('div', { class: 'set-label', text: 'Linked Email' }),
        h('div', { class: 'inline-form' },
          h('span', { class: 'linked', text: linked }),
          h('button', {
            class: 'btn small',
            text: 'Unlink',
            onClick: async (e) => {
              e.currentTarget.disabled = true;
              try {
                await setMerge(['newUserData', app.uid], { email: '' });
                render({ ...doc, email: '' });
                toast('Email unlinked');
              } catch {
                e.currentTarget.disabled = false;
                toast('Couldn’t connect. Try again.');
              }
            },
          })),
        caption);
      return;
    }
    const input = h('input', {
      id: 'link-email',
      type: 'email',
      autocomplete: 'email',
      placeholder: 'Email address',
      'aria-label': 'Email address',
    });
    const form = h('form', { class: 'inline-form' }, input, h('button', { class: 'btn small', type: 'submit', text: 'Link' }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!isValidEmail(email)) {
        toast('Enter a valid email address');
        return;
      }
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await setMerge(['newUserData', app.uid], { email });
        render({ ...doc, email });
        toast('Email linked');
        track('email_link');
      } catch {
        btn.disabled = false;
        toast('Couldn’t connect. Try again.');
      }
    });
    box.replaceChildren(h('div', { class: 'set-label', text: 'Linked Email' }), form, caption);
  };

  getDocData(['newUserData', app.uid]).then(render, () => {
    box.replaceChildren(
      h('div', { class: 'set-label', text: 'Linked Email' }),
      h('div', { class: 'set-detail', text: 'Couldn’t load. Check your connection.' }));
  });
  return box;
}

// ---- Sync to another User ID ---------------------------------------------

/**
 * [raw] as a path on this site, or null.
 *
 * The games open the sync screen with ?return=<their path>, and the arena goes
 * back there afterwards. Anything that is not a plain same-site path -- an
 * absolute URL, a protocol-relative //host, a javascript: link -- is refused,
 * or the link would be an open redirect.
 */
export function safeReturnPath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return null;
  }
  try {
    const base = 'https://same.site.invalid';
    const url = new URL(raw, base);
    return url.origin === base ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}

/**
 * The sync flow. Opened from Settings, or directly by a game's Settings via
 * /arena/?return=<path>#sync -- then [returnTo] is where Cancel, closing the
 * sheet and the finished switch all go, back into the game.
 */
export function openSync(app, { returnTo = null } = {}) {
  let close;
  const body = h('div', { class: 'sync' });
  // From a game, leaving is going back to it: closing the sheet does that
  // (onClose below). From Settings, it reopens Settings.
  const back = returnTo
    ? () => close()
    : () => {
      close();
      openSettings(app);
    };

  const step = (...nodes) => body.replaceChildren(...nodes);

  const ask = (message) => {
    const input = h('input', {
      id: 'sync-id',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      placeholder: 'User ID',
      'aria-label': 'User ID to sync to',
    });
    const form = h('form', { class: 'sync-form' },
      h('p', { text: 'Enter the User ID from your other device. Its progress in every Canuckle game replaces this device’s.' }),
      message ? h('p', { class: 'sync-error', role: 'alert', text: message }) : null,
      input,
      h('div', { class: 'sync-actions' },
        h('button', { class: 'btn secondary', type: 'button', text: 'Cancel', onClick: back }),
        h('button', { class: 'btn', type: 'submit', text: 'Continue' })));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      lookup(input.value.trim());
    });
    step(form);
    input.focus();
  };

  const lookup = async (newId) => {
    if (!isValidUserId(newId)) return ask('That doesn’t look like a User ID. It’s letters and numbers only.');
    if (newId === app.uid) return ask('That’s already this device’s User ID.');
    step(h('p', { class: 'muted', text: 'Looking up ' + newId + '…' }));
    let docs;
    try {
      const games = Object.keys(ID_DOCS);
      const found = await Promise.all(games.map((g) => getDocData([ID_DOCS[g], newId])));
      docs = Object.fromEntries(games.map((g, i) => [g, found[i]]));
    } catch {
      // An error is never "not found": guessing wrong here would switch to an
      // empty account.
      return ask('Couldn’t connect. Your User ID is unchanged. Check your connection and try again.');
    }
    if (Object.values(docs).every((d) => d == null)) {
      return ask('Sorry eh? We couldn’t find any record for User ID ' + newId + '.');
    }
    confirm(newId, docs);
  };

  const confirm = (newId, docs) => {
    step(
      h('p', { text: 'Your stats and game data on this device will be replaced by the data stored for User ID ' + newId + '.' }),
      h('div', { class: 'sync-actions' },
        h('button', { class: 'btn secondary', type: 'button', text: 'Cancel', onClick: back }),
        h('button', {
          class: 'btn',
          type: 'button',
          text: 'Sync',
          onClick: () => apply(newId, docs),
        })));
  };

  const apply = (newId, docs) => {
    const ops = planIdSwitch({
      oldId: app.uid,
      newId,
      docs,
      keys: prefKeys(),
      oldIds: oldIdsHere(),
    });
    try {
      applyIdSwitch(ops);
    } catch {
      return ask('This browser wouldn’t save the change. Your User ID is unchanged.');
    }
    if (app.uid) arenaSet('cache.' + app.uid, null);
    track('sync_event');
    step(
      h('p', { text: 'Synced. This device now uses User ID ' + newId + '.' }),
      h('div', { class: 'sync-actions' },
        h('button', {
          class: 'btn',
          type: 'button',
          text: 'OK',
          onClick: () => (returnTo ? location.assign(returnTo) : location.reload()),
        })));
  };

  close = openSheet(h('div', {}, sheetHead('Sync to another User ID', back), body), {
    label: 'Sync to another User ID',
    onClose: returnTo ? () => location.assign(returnTo) : undefined,
  });
  ask();
}

// ---- Sandbox -------------------------------------------------------------------

/**
 * Sandbox only: how many weeks earlier than production the new games launch
 * (config.js). Saving reloads, so every game is numbered from the new dates.
 */
function sandboxSection() {
  const input = h('input', {
    type: 'number',
    step: '1',
    inputmode: 'numeric',
    value: String(sandboxOffsetWeeks()),
    'aria-label': 'Launch date offset in weeks',
  });
  const form = h('form', { class: 'inline-form' }, input, h('button', { class: 'btn small', type: 'submit', text: 'Apply' }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = parseOffsetWeeks(input.value);
    if (n == null) {
      toast('Enter a whole number of weeks');
      return;
    }
    setSandboxOffsetWeeks(n);
    location.reload();
  });
  return section('Sandbox',
    h('div', { class: 'set-card' },
      h('div', { class: 'set-row column' },
        h('div', { class: 'set-label', text: 'Launch date offset (weeks)' }),
        h('div', {
          class: 'set-detail',
          text: `${offsetBannerText(sandboxOffsetWeeks())}. 0 matches production; the games read the same setting.`,
        }),
        form)));
}

// ---- The sheet --------------------------------------------------------------

function socialsRow() {
  const dark = currentTheme() === 'dark';
  return h('div', { class: 'socials' },
    SOCIALS.map((s) => external(s.url,
      h('img', { src: `images/icons/${s.icon}${dark ? '_darkmode' : ''}.svg`, alt: '', width: 40, height: 40 }),
      { class: 'social', 'aria-label': `Canuckle on ${s.name}` })));
}

/**
 * Privacy policy, socials, sponsor and version. Rebuilt when the theme flips,
 * for its icons.
 */
function footer(app) {
  const dark = currentTheme() === 'dark';
  return h('footer', { class: 'set-footer' },
    h('button', {
      class: 'btn privacy-btn',
      type: 'button',
      onClick: () => openPrivacy(() => openSettings(app)),
    }, h('span', { html: ICONS.shield }), 'Privacy Policy'),
    socialsRow(),
    external(CIRA_URL, [
      h('span', { class: 'powered', text: 'Powered by' }),
      h('img', { src: `images/icons/${dark ? 'cira-darkmode' : 'cira-logo'}.svg`, alt: 'CIRA', height: 30 }),
    ], { class: 'cira' }),
    h('p', { class: 'muted', text: `Arena version ${ARENA_VERSION}` }),
    h('p', { class: 'muted', text: '© 2026 Canuckle Games' }));
}

function build(app, onTheme) {
  const display = section('Display',
    h('div', { class: 'set-card' },
      toggleRow('Dark Theme', null, currentTheme() === 'dark', (on) => {
        setTheme(on ? 'dark' : 'light');
        onTheme();
      }),
      toggleRow('High Contrast Mode', 'For improved colour vision', currentContrast(), (on) => setContrast(on)),
      toggleRow('Sort by most played', 'Games you played most in the last 30 days come first', sortsByPlay(), (on) => {
        setSortByPlay(on, app.order);
        app.reorder();
      }),
      h('button', { class: 'set-row link-row', type: 'button', onClick: () => openGameOrder(app, () => openSettings(app)) },
        h('span', { class: 'set-text' },
          h('span', { class: 'set-label', text: 'Game order' }),
          h('span', { class: 'set-detail', text: 'Arrange your games' })),
        h('span', { html: ICONS.chevron }))));

  const account = section('Account',
    h('div', { class: 'set-card' },
      userIdRow(app),
      emailRow(app),
      h('button', { class: 'set-row link-row', type: 'button', onClick: () => openSync(app) },
        h('span', { class: 'set-text' },
          h('span', { class: 'set-label', text: 'Sync to another User ID' }),
          h('span', { class: 'set-detail', text: 'Use your progress from another device' })),
        h('span', { html: ICONS.chevron }))));

  const support = section('Support',
    h('div', { class: 'set-card' },
      external(KOFI_URL, [
        h('img', { class: 'row-icon', src: 'images/icons/kofi.svg', alt: '', width: 28, height: 28 }),
        h('span', { class: 'set-text' },
          h('span', { class: 'set-label', text: 'Buy Canuckle a coffee' }),
          h('span', { class: 'set-detail', text: 'Tips on Ko-fi keep the games free' })),
        h('span', { html: ICONS.chevron }),
      ], { class: 'set-row link-row', onClick: () => track('kofi_click') })));

  const subject = feedbackSubject(app.uid, oldIdsHere());
  const feedback = section('Feedback',
    h('div', { class: 'set-card' },
      h('a', { class: 'set-row link-row', href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` },
        h('span', { class: 'row-icon tinted', html: ICONS.mail }),
        h('span', { class: 'set-text' },
          h('span', { class: 'set-label', text: 'Email' }),
          h('span', { class: 'set-detail selectable', text: SUPPORT_EMAIL })),
        h('span', { html: ICONS.chevron }))));

  return [display, account, support, feedback, IS_SANDBOX ? sandboxSection() : null];
}

export function openSettings(app) {
  let close;
  let foot = footer(app);
  const onTheme = () => {
    const next = footer(app);
    foot.replaceWith(next);
    foot = next;
  };
  const body = h('div', { class: 'settings' }, ...build(app, onTheme), foot);
  close = openSheet(h('div', {}, sheetHead('Settings', () => close()), body), { label: 'Settings', scrollHint: true });
  track('settings_open');
}
