// Challenge results as bars: how long each player's bar is, and its colour by
// rank. The same rules as canuckleSharedCode challenge_results.dart.

/** Bar colours by rank: gold, silver, bronze, then the rest. */
export const RANK_COLOURS = ['#C9971C', '#9AA4AE', '#B5733A'];
export const OTHER_COLOUR = '#6F6A63';
export const rankColour = (rank) => RANK_COLOURS[rank - 1] ?? OTHER_COLOUR;

const MIN_FRACTION = 0.06;

/**
 * Each player's bar as a fraction of the full width (0-1), or null for no bar
 * (not played yet, declined, or a result with nothing to draw). The best
 * value gets the full bar; [better] 'higher' scales by value / best,
 * 'lower' by best / value. Players with a rank but no value (challenges from
 * before values were sent) are drawn by rank instead.
 */
export function barFractions(players, better = 'higher') {
  const values = players.map((p) => (typeof p.value === 'number' && p.value > 0 ? p.value : null));
  const known = values.filter((v) => v != null);
  const ranked = players.filter((p) => p.rank != null).length;
  return players.map((p, i) => {
    const v = values[i];
    if (v != null && known.length) {
      const best = better === 'lower' ? Math.min(...known) : Math.max(...known);
      const f = better === 'lower' ? best / v : v / best;
      return Math.max(MIN_FRACTION, Math.min(1, f));
    }
    if (p.rank != null && ranked) return Math.max(MIN_FRACTION, 1 - (p.rank - 1) / (ranked + 1));
    return p.state === 'done' && p.score ? MIN_FRACTION : null;
  });
}

/** The legend: the ranks shown, then "Hasn't played yet" when anyone hasn't. */
export function legendItems(players) {
  const ranks = [...new Set(players.map((p) => p.rank).filter((r) => r != null))].sort((a, b) => a - b);
  const items = ranks.map((r) => ({ label: ordinal(r), colour: rankColour(r) }));
  if (players.some((p) => ['invited', 'accepted'].includes(p.state))) items.push({ label: 'Hasn’t played yet', colour: null });
  return items;
}

const ORD = ['th', 'st', 'nd', 'rd'];
export const ordinal = (n) => `${n}${(n % 100 >= 11 && n % 100 <= 13) ? 'th' : ORD[n % 10] ?? 'th'}`;
