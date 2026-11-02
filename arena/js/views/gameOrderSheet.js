// Settings › Game order: arrange the games by hand, or go back to the order
// they were released in.

import { h, ICONS, openSheet, sheetHead } from '../ui.js?v=202611012056';
import { orderedGames, saveCustomOrder, hasCustomOrder, resetOrder } from '../gameOrder.js?v=202611012056';
import { track } from '../analytics.js?v=202611012056';

function note() {
  return hasCustomOrder()
    ? 'Your own order.'
    : 'In the order the games were released. Move a game to make your own order.';
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
  const reset = h('button', {
    class: 'btn secondary order-reset',
    type: 'button',
    text: 'Reset to release order',
    onClick: () => {
      resetOrder();
      app.reorder();
      track('game_order_reset');
      paint();
    },
  });

  const move = (from, to, dir) => {
    const ids = orderedGames(app).map((g) => g.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    saveCustomOrder(ids);
    app.reorder();
    track('game_order_move');
    paint();
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
    hint.textContent = note();
    reset.hidden = !hasCustomOrder();
  }
  paint();

  close = openSheet(h('div', {},
    sheetHead('Game order', back),
    h('div', { class: 'settings' }, hint, list, reset)), { label: 'Game order', scrollHint: true });
}
