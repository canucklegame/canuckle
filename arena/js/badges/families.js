// Tier families: badges that are higher levels of one another (a streak's
// lengths, Canagrams' bronze, silver and gold) share a `family` key in
// rules.js. The arena shows each family as one tile, the highest level earned
// and the way to the next, and opens it to every level. Each level is still
// its own badge everywhere else: recorded, counted, announced and shared.

/**
 * [badges] with each family's levels gathered into one group, where its first
 * level was. Badges outside a family pass through as they are. A group is
 * { family, tiers, current, next, level, shown }: current is the highest level
 * earned (or null), next the first level after it still to earn (or null once
 * every level is earned), level how many are earned, and shown the badge to
 * draw (current, or the first level until one is earned).
 */
export function groupFamilies(badges) {
  const items = [];
  const groups = new Map();
  for (const b of badges) {
    if (!b.family) {
      items.push(b);
      continue;
    }
    let g = groups.get(b.family);
    if (!g) {
      g = { family: b.family, tiers: [] };
      groups.set(b.family, g);
      items.push(g);
    }
    g.tiers.push(b);
  }
  for (const g of groups.values()) Object.assign(g, familyState(g.tiers));
  return items;
}

/** Where a player stands on [tiers], a family's levels lowest first. */
export function familyState(tiers) {
  let top = -1;
  tiers.forEach((t, i) => { if (t.earned) top = i; });
  const current = top >= 0 ? tiers[top] : null;
  return {
    current,
    next: tiers.slice(top + 1).find((t) => !t.earned) || null,
    level: tiers.filter((t) => t.earned).length,
    shown: current || tiers[0],
  };
}

/** True for a group from [groupFamilies], false for a single badge. */
export const isFamily = (item) => Array.isArray(item.tiers);

/** "25 boards", "1 week", "1,000 bonus words": [n] of a family's [unit]. */
export function countOf(n, unit) {
  const [one, many] = unit || ['', ''];
  return `${n.toLocaleString('en-CA')} ${n === 1 ? one : many}`.trim();
}
