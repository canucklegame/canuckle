// Challenge puzzles: the Arena's way of naming a puzzle (a game, an index and
// a tier key from js/games/*) to and from the server's (firebase/functions
// src/games.js GAMES[id].puzzle), plus how each game picks a winner.

import { SOLVED, FAILED, PLAYED, PROGRESS } from '../status.js?v=202611200021';

/**
 * Games that can be challenged. Sandbox-only games aren't supported by the
 * server yet.
 */
export const CHALLENGE_GAMES = ['canuckle', 'plus', 'duo', 'canoku', 'canolitaire', 'canominoes', 'canagrams', 'canoggle'];

/**
 * Canoggle's time limits in seconds, 0 for none, per board (tier key): the
 * challenger picks one and everyone plays it (squaredleSourceCode
 * lib/model/time_limit.dart; the server's CANOGGLE_LIMITS).
 */
export const CANOGGLE_LIMITS = { d: [0, 180, 300], m: [0, 120, 240] };

/** "No time limit", "3 min". */
export const limitLabel = (secs) => (secs > 0 ? `${Math.round(secs / 60)} min` : 'No time limit');

export const canChallenge = (gameId) => CHALLENGE_GAMES.includes(gameId);

/**
 * The server's puzzle for [game] puzzle [index], tier [tierKey]. [limit]:
 * Canoggle's time limit in seconds (0 for none).
 */
export function puzzleFor(game, index, tierKey, limit = 0) {
  switch (game.id) {
    case 'canuckle':
    case 'plus':
    case 'duo':
      return { index };
    case 'canoku':
      return { day: index, mode: tierKey };
    case 'canolitaire':
      return { day: index, draw: Number(tierKey[0]), tier: tierKey.slice(1) };
    case 'canominoes':
      return { day: index, tier: tierKey };
    case 'canagrams':
      return { day: index };
    case 'canoggle':
      return { day: index, kind: tierKey, limit };
    default:
      throw new Error(`can't challenge ${game.id}`);
  }
}

/**
 * The Arena's {index, tier, limit} for a server puzzle of game [gameId].
 * [limit] is Canoggle's time limit (seconds); other games have none.
 */
export function fromPuzzle(gameId, p) {
  switch (gameId) {
    case 'canuckle':
    case 'plus':
    case 'duo':
      return { index: p.index, tier: null };
    case 'canoku':
      return { index: p.day, tier: p.mode };
    case 'canolitaire':
      return { index: p.day, tier: `${p.draw}${p.tier}` };
    case 'canominoes':
      return { index: p.day, tier: p.tier };
    case 'canagrams':
      return { index: p.day, tier: null };
    case 'canoggle':
      return { index: p.day, tier: p.kind, limit: p.limit ?? 0 };
    default:
      return { index: p?.day ?? p?.index ?? null, tier: null };
  }
}

/** "Hard 9×9", "Draw 3 · Medium", "Easy", or '' for a game with one puzzle a day. */
export function tierLabel(game, tierKey) {
  const t = game.tiers.find((x) => x.key === tierKey);
  if (!t) return '';
  if (!t.group) return t.label;
  return game.id === 'canoku' ? `${t.label} ${t.group}` : `${t.group} · ${t.label}`;
}

/** "Canoku #1126 · Hard 9×9", "Canoggle #12 · Daily · 3 min" */
export function puzzleTitle(game, index, tierKey, limit = null) {
  const tier = tierLabel(game, tierKey);
  const clock = limit == null ? '' : ` · ${limitLabel(limit)}`;
  return `${game.name} ${game.label(index)}${tier ? ` · ${tier}` : ''}${clock}`;
}

/**
 * Whether this browser's progress shows the puzzle touched (in progress or
 * finished). The server checks the game's own data too; this also catches
 * today's unfinished boards, which only live in the browser.
 */
export function startedHere(game, entry, tierKey) {
  const touched = (s) => [PROGRESS, SOLVED, FAILED, PLAYED].includes(s);
  if (game.tiers.length) return touched(entry?.tiers?.[tierKey]);
  return touched(entry?.status);
}

/** How the winner is decided, as players see it (mirrors the server's compare). */
export const WINNER_RULE = {
  canuckle: 'Fewest guesses wins.',
  plus: 'Fewest guesses wins.',
  duo: 'Fewest guesses to find both words wins.',
  canoku: 'Fastest solve wins. Each hint adds 30 seconds.',
  canolitaire: 'Fastest win wins. Fewer moves breaks a tie.',
  canominoes: 'Fewest hints wins, then the fastest time.',
  canagrams: 'Most points wins. A faster time breaks a tie.',
  canoggle: 'Finding every word beats any score; otherwise most points wins. Everyone plays the same time limit.',
};
