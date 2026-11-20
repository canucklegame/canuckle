// "How challenges work": a five-step walkthrough of friends & challenges, in
// a sheet. It opens by itself the first time someone visits the Challenges
// tab (not for players under 14), and any time from the link in the tab's
// header or on its setup card. Only loaded with the Challenges tab, so only
// where featureOn('challenges').
//
// The last button follows where the player is: Set up challenges for someone
// who hasn't, Add a friend for someone with no friends yet, else Challenge a
// friend.

import { h, openSheet } from '../ui.js?v=202611200021';
import { arenaGet, arenaSet } from '../local.js?v=202611200021';
import { trophySvg } from '../social/podium.js?v=202611200021';

const SEEN_KEY = 'challengeTutorialSeen';

/** Whether this browser has been shown the walkthrough yet. */
export function tutorialSeen() {
  try {
    return arenaGet(SEEN_KEY, false) === true;
  } catch {
    return true; // No storage: don't open it on every visit
  }
}

function markSeen() {
  try {
    arenaSet(SEEN_KEY, true);
  } catch {
    // No storage: it may open again next visit
  }
}

// A tiny Canuckle board, rows of r(ed)/y(ellow)/g(rey)/. (empty)
function miniBoard(rows, caption) {
  return h('div', { class: 'tut-boardwrap' },
    h('div', { class: 'tut-board' }, rows.flatMap((r) => [...r].map((c) => h('i', { class: c === '.' ? '' : `t-${c}` })))),
    h('div', { class: 'tut-cap', text: caption }));
}

function miniCard(...kids) {
  return h('div', { class: 'tut-card' }, kids);
}

/** The steps: title, text and a small picture of the real screen. */
export const STEPS = [
  {
    title: 'Same puzzle, your friends, one winner',
    text: 'Challenge friends to the same puzzle in any game. Everyone plays whenever they like over the next 3 days, then you see who did best.',
    pic: () => h('div', { class: 'tut-pair' },
      miniBoard(['gyggr', 'rgryg', 'rrrrr', '.....'], 'You · 3 guesses'),
      miniBoard(['ggyrg', 'yrggr', 'rgrrr', 'rrrrr'], 'MapleMom · 4')),
  },
  {
    title: 'Pick a gamer ID',
    text: 'It’s the name your friends see. Don’t use your real name: anyone who knows your gamer ID can send you a friend request. Only friends you accept see your challenges.',
    pic: () => miniCard(
      h('span', { class: 'tut-lbl', text: 'Gamer ID' }),
      h('div', { class: 'tut-field' }, h('span', { text: 'CanalSkater' }), h('em', { text: '✓ Available' })),
      h('span', { class: 'tut-lbl', text: '3–16 letters, numbers or underscores. You can change it once every 30 days.' })),
  },
  {
    title: 'Add your friends',
    text: 'Send your invite link by text or email: anyone who opens it becomes your friend straight away. Or type a friend’s gamer ID, and they accept your request.',
    pic: () => miniCard(
      h('span', { class: 'tut-lbl', text: 'Your invite link' }),
      h('div', { class: 'tut-link', text: 'canucklegame.ca/arena/?invite=7KQ2…' }),
      h('div', { class: 'tut-row' },
        h('span', { class: 'tut-av', text: 'MM' }), h('b', { text: 'MapleMom' }), h('span', { class: 'tut-pill', text: 'Accept' }))),
  },
  {
    title: 'Send a challenge',
    text: 'Tap New challenge here in the Arena, or Challenge a friend in a game before you start a puzzle. Pick up to 9 friends, then play it yourself.',
    pic: () => miniCard(
      h('b', { class: 'tut-game', text: 'Canuckle #1739' }),
      h('span', { class: 'tut-lbl', text: 'Ready when you are. The clock starts when you tap Play.' }),
      h('span', { class: 'tut-pill wide', text: 'Play' }),
      h('span', { class: 'tut-pill wide ghost', text: 'Challenge a friend' })),
  },
  {
    title: 'Play, then see who won',
    text: 'Everyone’s results stay hidden until you’ve played, so nobody gets a head start. When everyone’s done, or the 3 days are up, the podium shows who won, and trophies go in your trophy case.',
    pic: () => h('div', { class: 'tut-podium' },
      h('div', { class: 'p2' }, '2', h('small', { text: 'MapleMom' })),
      h('div', { class: 'p1' }, h('span', { class: 'tut-trophy', html: trophySvg(1) }), '1', h('small', { text: 'You' })),
      h('div', { class: 'p3' }, '3', h('small', { text: 'Sam' }))),
  },
];

/**
 * The text of the last step's button, and what it's for: 'setup' (no gamer
 * ID yet), 'friends' (no friends yet) or 'challenge'.
 */
export function finalAction(social) {
  if (!social?.gamerId) return { kind: 'setup', label: 'Set up challenges' };
  if (!Object.keys(social.friends ?? {}).length) return { kind: 'friends', label: 'Add a friend' };
  return { kind: 'challenge', label: 'Challenge a friend' };
}

/**
 * Opens the walkthrough. [onFinish] gets the final action's kind when the
 * last button is tapped; closing or skipping it does nothing more.
 */
export function openTutorial(social, onFinish) {
  markSeen();
  let at = 0;
  let close;
  const action = finalAction(social);
  const body = h('div', { class: 'soc-step tut' });

  function draw() {
    const s = STEPS[at];
    const last = at === STEPS.length - 1;
    const back = h('button', { class: 'btn secondary', type: 'button', text: 'Back', onClick: () => { at--; draw(); } });
    if (at === 0) back.style.visibility = 'hidden';
    const next = h('button', {
      class: 'btn', type: 'button', text: last ? action.label : 'Next',
      onClick: () => {
        if (!last) {
          at++;
          draw();
          return;
        }
        close();
        if (onFinish) onFinish(action.kind);
      },
    });
    body.replaceChildren(
      h('div', { class: 'tut-top' },
        h('span', { class: 'tut-step', text: `How challenges work · ${at + 1} of ${STEPS.length}` }),
        h('button', { class: 'text-btn', type: 'button', text: last ? 'Close' : 'Skip', onClick: () => close() })),
      h('div', { class: 'tut-pic', 'aria-hidden': 'true' }, s.pic()),
      h('h2', { class: 'tut-title', text: s.title }),
      h('p', { class: 'muted tut-text', text: s.text }),
      h('div', { class: 'tut-dots', 'aria-hidden': 'true' }, STEPS.map((_, i) => h('i', { class: i === at ? 'on' : '' }))),
      h('div', { class: 'tut-nav' }, back, next));
    next.focus();
  }
  draw();
  close = openSheet(body, { label: 'How challenges work', className: 'soc-sheet' });
}

/** The "(?) How challenges work" link. */
export function tutorialLink(onClick) {
  return h('button', { class: 'tut-howto', type: 'button', onClick },
    h('span', { class: 'tut-q', 'aria-hidden': 'true', text: '?' }), 'How challenges work');
}
