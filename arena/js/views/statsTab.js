// The Stats tab: a card per game; and each game's detail page. Badges have
// their own tab (badgesView.js).

import { h, ICONS } from '../ui.js?v=202610141420';
import { medalButton } from './badgesView.js?v=202610141420';
import { streakChip } from './gamesTab.js?v=202610141420';
import { PROGRESS, isDone } from '../status.js?v=202610141420';
import { playProps } from './play.js?v=202610141420';
import { orderedGames } from '../gameOrder.js?v=202610141420';

function numbers(game, progress) {
  const p = progress;
  const s = game.summary(p);
  const unit = game.cadence === 'weekly' ? 'Weeks' : 'Days';
  return h('div', { class: 'numbers' },
    h('div', {}, h('b', { text: String(p.streak) }), h('small', { text: 'Streak' })),
    h('div', {}, h('b', { text: String(p.maxStreak) }), h('small', { text: 'Best streak' })),
    h('div', {}, h('b', { text: String(p.doneIdx.size) }), h('small', { text: `${unit} finished` })),
    h('div', {}, h('b', { text: s.winRate == null ? String(p.solved) : `${s.winRate}%` }),
      h('small', { text: s.winRate == null ? 'Solved' : 'Win rate' })));
}

function gameCard(game, progress) {
  const s = game.summary(progress);
  return h('a', { class: 'card stat-card', href: `#stats/${game.id}`, style: { '--game': game.color } },
    h('div', { class: 'row-head' },
      h('img', { src: game.logo, alt: '' }),
      h('div', { class: 'grow' }, h('h2', { text: game.name })),
      streakChip(game, progress)),
    numbers(game, progress),
    h('div', { class: 'headline' }, h('span', { class: 'muted', text: s.headline.label }), h('b', { text: s.headline.value })));
}

export function renderStats(app) {
  const { progress } = app;
  return h('div', { class: 'wrap' },
    h('div', { class: 'section-title', style: { marginTop: '0' } }, h('h2', { text: 'Your games' })),
    h('div', { class: 'stat-grid' },
      orderedGames(app).map((g) => gameCard(g, progress[g.id]?.progress))));
}

function section(sec) {
  if (sec.bars) {
    const max = Math.max(1, ...sec.bars.map((b) => b.value));
    const top = Math.max(...sec.bars.map((b) => b.value));
    return h('section', { class: 'card' }, h('h3', { text: sec.title }),
      h('div', { class: 'bars' }, sec.bars.map((b) => h('div', { class: 'bar' },
        h('span', { text: b.label }),
        h('span', {
          class: `fill${b.value === top && b.value > 0 && b.label !== 'X' ? ' top' : ''}`,
          style: { width: `${Math.max(8, Math.round((b.value / max) * 100))}%` },
          text: String(b.value),
        })))));
  }
  return h('section', { class: 'card' }, h('h3', { text: sec.title }),
    h('table', { class: 'rows' }, h('tbody', {},
      sec.rows.map(([k, v]) => h('tr', {}, h('td', { text: k }), h('td', { text: String(v) }))))));
}

export function renderStatsDetail(app, game) {
  const progress = app.progress[game.id]?.progress;
  const todayIdx = game.todayIndex(app.todayEd);
  const todayEntry = progress?.days.get(todayIdx);
  const todayStatus = todayEntry?.status;
  const playLabel = isDone(todayStatus) ? 'Play again' : todayStatus === PROGRESS ? 'Continue today' : 'Play today';
  const gameBadges = app.badges.results.filter((b) => b.game === game.id);

  return h('div', { class: 'wrap', style: { '--game': game.color } },
    h('div', { class: 'page-head' },
      h('a', { class: 'icon-btn', href: '#stats', 'aria-label': 'Back to stats', html: ICONS.back }),
      h('img', { src: game.logo, alt: '' }),
      h('div', { class: 'grow' }, h('h1', { text: game.name }), h('span', { class: 'muted', text: game.blurb })),
      h('a', { class: 'btn', style: { background: game.color }, ...playProps(game, todayIdx, todayEntry, todayIdx), text: playLabel })),
    h('div', { class: 'card' }, numbers(game, progress)),
    h('div', { class: 'detail-sections' }, game.detail(progress).map(section)),
    gameBadges.length ? h('div', { class: 'section-title' }, h('h2', { text: 'Badges' })) : null,
    gameBadges.length ? h('div', { class: 'card' }, h('div', { class: 'badge-grid' }, gameBadges.map((b) => medalButton(app, b)))) : null,
    h('p', { style: { marginTop: '16px' } }, h('a', { href: `#archive/${game.id}`, text: `Open the ${game.name} Archive` })));
}
