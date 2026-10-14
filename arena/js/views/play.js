// Opening a puzzle: straight into the game, or via a difficulty picker for
// games with several puzzles per day.

import { h, openSheet, sheetHead, statusIcon } from '../ui.js?v=202610141420';
import { shortDate, weekdayName } from '../dates.js?v=202610141420';
import { track } from '../analytics.js?v=202610141420';

/** Short label for a puzzle relative to today: "Today", "Yesterday", "Wed". */
export function whenLabel(game, index, todayIdx) {
  const ed = game.edForIndex(index);
  if (game.cadence === 'weekly') {
    if (index === todayIdx) return 'This week';
    if (index === todayIdx - 1) return 'Last week';
    return `Week of ${shortDate(ed)}`;
  }
  if (index === todayIdx) return 'Today';
  if (index === todayIdx - 1) return 'Yesterday';
  return weekdayName(ed);
}

/** The calendar date line under a tile's label: "Sep 30". */
export function dateLabel(game, index) {
  return shortDate(game.edForIndex(index));
}

const LEFT_FOR_GAME = 'arena.leftForGame';

function trackPlay(game, index, tier, isToday) {
  track('arena_play', { target_game: game.id, index, tier: tier || '', today: isToday ? 1 : 0 });
  // Remembered for this tab only, so the arena knows to look again for a
  // result that is still on its way to Firestore when the player comes back.
  try {
    sessionStorage.setItem(LEFT_FOR_GAME, String(Date.now()));
  } catch {
    // Storage blocked: the one re-read on return still happens.
  }
}

/**
 * True once after the player went from here into a game in this tab (within
 * the last two hours), then false until they go again.
 */
export function takeLeftForGame() {
  try {
    const at = Number(sessionStorage.getItem(LEFT_FOR_GAME));
    sessionStorage.removeItem(LEFT_FOR_GAME);
    return at > 0 && Date.now() - at < 2 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Props for an <a> that opens [index]: a direct link, or the tier sheet. */
export function playProps(game, index, entry, todayIdx) {
  const isToday = index === todayIdx;
  if (!game.tiers.length) {
    return {
      href: game.link(index, null, isToday),
      onClick: () => trackPlay(game, index, null, isToday),
    };
  }
  return {
    href: game.link(index, null, isToday),
    onClick: (e) => {
      e.preventDefault();
      openTierSheet(game, index, entry, todayIdx);
    },
  };
}

export function openTierSheet(game, index, entry, todayIdx) {
  const isToday = index === todayIdx;
  const tiers = entry?.tiers || {};
  const groups = [...new Set(game.tiers.map((t) => t.group || ''))];
  let close;
  const body = h('div', {},
    sheetHead(`${game.name} ${game.label(index)} · ${whenLabel(game, index, todayIdx)}`, () => close(), game.logo),
    h('p', { class: 'muted', style: { margin: '0' }, text: 'Pick a puzzle to play.' }),
    groups.map((g) => h('div', { class: 'tier-group' },
      g ? h('h3', { text: g }) : null,
      h('div', { class: 'tier-list' },
        game.tiers.filter((t) => (t.group || '') === g).map((t) => h('a', {
          class: 'tier-btn',
          href: game.link(index, t.key, isToday),
          // Close as the game opens, so the picker isn't still up on Back.
          onClick: () => {
            trackPlay(game, index, t.key, isToday);
            close();
          },
        }, statusIcon(tiers[t.key]), t.label))))));
  close = openSheet(body, { label: `${game.name} puzzles` });
}
