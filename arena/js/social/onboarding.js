// First use of challenges: the age check, then a gamer ID.
//
// setUpChallenges() walks a player through whatever is still missing and
// resolves with their social doc once they have a gamer ID, or null if they
// stopped (closed a sheet) or are under 14. Only the outcome of the age
// check is stored, never the birth year (firebase/functions/src/social.js).

import { h, openSheet, sheetHead, toast, ICONS } from '../ui.js?v=202611200021';
import { openPrivacy } from '../privacy.js?v=202611200021';
import { call, loadSocial, ensurePlayerId, markStartedSocial, reasonText } from './api.js?v=202611200021';
import { suggester } from './names.js?v=202611200021';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/**
 * Opens [build](finish, close, detour) in a sheet; resolves with what
 * finish() is given, or null when the sheet is closed. detour(go) steps away
 * to another sheet (the Privacy Policy) without ending the step: go(back) is
 * given a back() that reopens this sheet as it was.
 */
function sheetStep(label, build) {
  return new Promise((resolve) => {
    let done = false;
    let away = false;
    let close;
    let content;
    const open = () => {
      close = openSheet(content, {
        label,
        className: 'soc-sheet',
        onClose: () => { if (!done && !away) resolve(null); },
      });
    };
    const finish = (value) => {
      done = true;
      close();
      resolve(value);
    };
    const detour = (go) => {
      away = true;
      close();
      go(() => {
        away = false;
        open();
      });
    };
    content = build(finish, () => close(), detour);
    open();
  });
}

function errorLine() {
  const el = h('p', { class: 'soc-error', role: 'alert' });
  el.hidden = true;
  return {
    el,
    show(text) { el.textContent = text; el.hidden = !text; },
  };
}

function busy(button, on, text) {
  button.disabled = on;
  if (text) button.textContent = text;
}

// ---- Step 1: age ---------------------------------------------------------------

function ageStep() {
  return sheetStep('Set up challenges', (finish, close) => {
    const year = new Date().getFullYear();
    const yearSel = h('select', { id: 'soc-year', class: 'soc-select' },
      h('option', { value: '', text: 'Select year' }),
      Array.from({ length: year - 1919 }, (_, i) => year - i).map((y) => h('option', { value: String(y), text: String(y) })));
    const monthSel = h('select', { id: 'soc-month', class: 'soc-select' },
      h('option', { value: '', text: 'Select month' }),
      MONTHS.map((m, i) => h('option', { value: String(i + 1), text: m })));
    const monthField = h('div', { class: 'soc-field' },
      h('label', { for: 'soc-month', text: 'And the month?' }), monthSel);
    monthField.hidden = true;
    const err = errorLine();
    const go = h('button', { class: 'btn soc-wide', type: 'button', text: 'Continue' });
    go.addEventListener('click', async () => {
      err.show('');
      const birthYear = Number(yearSel.value);
      if (!birthYear) return err.show('Pick the year you were born.');
      const data = { birthYear };
      if (!monthField.hidden) {
        if (!monthSel.value) return err.show('Pick the month you were born.');
        data.birthMonth = Number(monthSel.value);
      }
      busy(go, true);
      try {
        const { result } = await call('setChallengeAge', data);
        if (result === 'need-month') {
          monthField.hidden = false;
          monthSel.focus();
          busy(go, false);
          return undefined;
        }
        return finish(result);
      } catch (e) {
        err.show(reasonText(e.reason));
        busy(go, false);
      }
      return undefined;
    });
    return h('div', { class: 'soc-step' },
      sheetHead('Set up challenges', close),
      h('p', { class: 'muted', text: 'Challenge friends to the same puzzle, play whenever you like, and see who did best.' }),
      h('div', { class: 'soc-field' },
        h('label', { for: 'soc-year', text: 'What year were you born?' }), yearSel,
        h('p', { class: 'soc-hint', text: 'We only use this to check challenges are right for you. We don’t keep your birth year.' })),
      monthField,
      err.el,
      go);
  });
}

function underStep() {
  return sheetStep('Challenges are for players 14 and up', (finish, close) => h('div', { class: 'soc-step' },
    sheetHead('Challenges', close),
    h('h2', { class: 'soc-title', text: 'Challenges are for players 14 and up' }),
    h('p', { class: 'muted', text: 'You can still play every game, track your stats and earn badges right here in the Arena.' }),
    h('a', { class: 'btn soc-wide', href: '#games', onClick: () => finish(null), text: 'Back to games' })));
}

// ---- Step 2: gamer ID -----------------------------------------------------------

/** The gamer ID sheet. [current]: the player's gamer ID when renaming. Resolves with the saved name, or null. */
export function gamerIdStep({ current = null } = {}) {
  return sheetStep(current ? 'Change your gamer ID' : 'Pick a gamer ID', (finish, close, detour) => {
    const input = h('input', {
      id: 'soc-gid', class: 'soc-input', type: 'text', maxlength: '16', autocomplete: 'off',
      autocapitalize: 'off', spellcheck: 'false', value: current ?? '', placeholder: 'e.g. MapleMoose',
    });
    const status = h('p', { class: 'soc-status', 'aria-live': 'polite' });
    const err = errorLine();
    let lastChecked = '';
    let checkTimer = null;

    const check = async (name) => {
      try {
        return await call('checkGamerId', { name });
      } catch (e) {
        return { available: false, reason: e.reason };
      }
    };
    const showCheck = async () => {
      const name = input.value.trim();
      lastChecked = name;
      if (!name || name === current) {
        status.textContent = '';
        status.className = 'soc-status';
        return;
      }
      const r = await check(name);
      if (name !== lastChecked) return;
      status.textContent = r.available ? 'Available' : reasonText(r.reason);
      status.className = `soc-status ${r.available ? 'ok' : 'bad'}`;
    };
    input.addEventListener('input', () => {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(showCheck, 450);
    });

    const suggest = suggester(async (name) => (await check(name)).available);
    const suggestBtn = h('button', { class: 'btn secondary soc-suggest', type: 'button' },
      h('span', { html: ICONS.dice ?? '' }), 'Suggest ID');
    suggestBtn.addEventListener('click', async () => {
      busy(suggestBtn, true);
      const name = await suggest.next();
      busy(suggestBtn, false);
      if (!name) return toast('Couldn’t find a free name. Try typing one.');
      input.value = name;
      lastChecked = name;
      status.textContent = 'Available';
      status.className = 'soc-status ok';
      return undefined;
    });

    const save = h('button', { class: 'btn soc-wide', type: 'button', text: current ? 'Save new gamer ID' : 'Save gamer ID' });
    save.addEventListener('click', async () => {
      err.show('');
      const name = input.value.trim();
      if (!name) return err.show('Type a gamer ID, or tap Suggest ID.');
      if (name === current) return finish(current);
      busy(save, true);
      try {
        await call('setGamerId', { name });
        return finish(name);
      } catch (e) {
        err.show(e.reason === 'taken' ? 'Someone just took that gamer ID. Try another, or tap Suggest ID.' : reasonText(e.reason));
        busy(save, false);
      }
      return undefined;
    });

    const privacy = h('a', { href: '#', text: 'Privacy Policy' });
    privacy.addEventListener('click', (e) => {
      e.preventDefault();
      detour((back) => openPrivacy(back));
    });

    return h('div', { class: 'soc-step' },
      sheetHead(current ? 'Change your gamer ID' : 'Pick a gamer ID', close),
      current ? null : h('ul', { class: 'soc-points' },
        h('li', {}, 'Your gamer ID is ', h('strong', { text: 'public' }), ': anyone who knows it can send you a friend request. Don’t use your real name.'),
        h('li', {}, h('strong', { text: 'Only friends you accept' }), ' see your challenges and how you did in them.'),
        h('li', { text: 'Your private User ID is never shown to anyone.' })),
      current ? h('p', { class: 'muted', text: 'You can change it once every 30 days. Your friends see the new one straight away.' }) : null,
      h('div', { class: 'soc-field' },
        h('label', { for: 'soc-gid', text: 'Gamer ID' }),
        h('div', { class: 'soc-row' }, input, suggestBtn),
        status,
        h('p', { class: 'soc-hint', text: '3–16 letters, numbers or underscores.' })),
      err.el,
      current ? null : h('p', { class: 'soc-hint soc-center' }, 'By saving, you agree to the updated ', privacy, '.'),
      save);
  });
}

// ---- The whole setup -------------------------------------------------------------

/**
 * Takes the player through what's missing: a player ID (made here for
 * someone who has never played), the age check, then a gamer ID. Resolves
 * with their social doc once they have a gamer ID, else null.
 */
export async function setUpChallenges() {
  try {
    await ensurePlayerId();
  } catch {
    toast('Couldn’t reach the server. Check your connection and try again.');
    return null;
  }
  markStartedSocial();
  let social;
  try {
    social = await loadSocial();
  } catch {
    toast('Couldn’t reach the server. Check your connection and try again.');
    return null;
  }
  if (social?.challengeAge === 'under') {
    await underStep();
    return null;
  }
  if (social?.challengeAge !== 'ok') {
    const result = await ageStep();
    if (result === 'under') {
      await loadSocial().catch(() => null);
      await underStep();
      return null;
    }
    if (result !== 'ok') return null;
  }
  social = await loadSocial().catch(() => social);
  if (!social?.gamerId) {
    const name = await gamerIdStep();
    if (!name) return null;
    social = await loadSocial().catch(() => social);
    toast(`You’re all set, ${name}.`);
  }
  return social;
}
