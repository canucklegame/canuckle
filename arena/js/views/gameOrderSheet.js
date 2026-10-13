// Settings › Game order: arrange the games by hand. Any move switches
// "Sort by most played" off, so the arrangement stays as the player left it.

import { h, ICONS, openSheet, sheetHead } from '../ui.js?v=202610131208';
import { orderedGames, saveCustomOrder, sortsByPlay } from '../gameOrder.js?v=202610131208';
import { track } from '../analytics.js?v=202610131208';

function note() {
  return sortsByPlay()
    ? 'Sorted by most played. Moving a game switches that off and keeps your order.'
    : 'Your own order. Switch on Sort by most played in Settings to go back to it.';
}

/** Opens the sheet. [onBack] returns to Settings. */
export function openGameOrder(app, onBack) {
  let close;
  const back = () => {
    close();
    if (onBack) onBack();
  };
  const hint = h('p', { class: 'muted order-note', text: note() });
  const list = h('ol', { class: 'set-card order-list' });

  const move = (from, to, dir) => {
    const ids = orderedGames(app).map((g) => g.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    saveCustomOrder(ids);
    app.reorder();
    track('game_order_move');
    paint();
    hint.textContent = note();
    // Keep focus on the game that moved, on the same arrow while it has one.
    const row = list.children[to];
    const btn = row.querySelector(`.order-btn.${dir}`) || row.querySelector('.order-btn');
    if (btn) btn.focus();
  };

  const arrow = (game, dir, from, to) => h('button', {
    class: `order-btn ${dir}`,
    type: 'button',
    'aria-label': `Move ${game.name} ${dir}`,
    html: ICONS[dir],
    onClick: () => move(from, to, dir),
  });

  function paint() {
    const games = orderedGames(app);
    list.replaceChildren(...games.map((g, i) => h('li', { class: 'set-row order-row' },
      h('img', { class: 'order-logo', src: g.logo, alt: '' }),
      h('span', { class: 'set-label grow', text: g.name }),
      i > 0 ? arrow(g, 'up', i, i - 1) : h('span', { class: 'order-gap' }),
      i < games.length - 1 ? arrow(g, 'down', i, i + 1) : h('span', { class: 'order-gap' }))));
  }
  paint();

  close = openSheet(h('div', {},
    sheetHead('Game order', back),
    h('div', { class: 'settings' }, hint, list)), { label: 'Game order', scrollHint: true });
}
