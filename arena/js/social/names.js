// "Suggest ID": Canadian-themed gamer ID suggestions.
//
// Names come from a curated adjective + noun pool, all within the 16
// characters a gamer ID allows, with no trademarks. Each suggestion is a pool
// name not shown before (checked for availability by the caller). Once 5 pool
// names in a row come back taken, or every pool name has been shown,
// suggestions add a 2-4 digit number: MapleMoose427.

// Reviewed 2026-11-15 for connotations as well as the server's filter:
// no Beaver (vulgar slang, worse after Frosty, Misty or Snowy), and no
// Loonie or Toonie (Royal Canadian Mint trademarks).
export const ADJECTIVES = [
  'Maple', 'Northern', 'Polar', 'Prairie', 'Arctic', 'Boreal', 'Frosty', 'Coastal',
  'Tundra', 'Aurora', 'Rocky', 'Snowy', 'Misty', 'Glacier', 'Spruce', 'Cedar',
];

export const NOUNS = [
  'Moose', 'Loon', 'Bison', 'Canoe', 'Toque', 'Puck', 'Paddler', 'Caribou',
  'Orca', 'Goose', 'Narwhal', 'Lynx', 'Toboggan', 'Snowshoe', 'Poutine', 'Otter',
];

// Numbers never added to a name: sexual, drug and white-supremacist codes.
export const BANNED_NUMBERS = ['69', '88', '420', '666', '1488'];
const numberOk = (s) => !BANNED_NUMBERS.some((b) => s.includes(b));

export const MAX_LENGTH = 16;
export const MISSES_BEFORE_NUMBERS = 5;

/** Every pool name that fits in a gamer ID. */
export const POOL = ADJECTIVES.flatMap((a) => NOUNS.map((n) => a + n))
  .filter((name, i, all) => name.length <= MAX_LENGTH && all.indexOf(name) === i);

/** A pool name with a 2-4 digit number (never a BANNED_NUMBERS one), still within MAX_LENGTH. */
export function withNumber(name, random = Math.random) {
  const digits = 2 + Math.floor(random() * 3);
  const room = MAX_LENGTH - name.length;
  const n = Math.max(2, Math.min(digits, room));
  const min = 10 ** (n - 1);
  let num;
  do {
    num = String(min + Math.floor(random() * (9 * min)));
  } while (!numberOk(num));
  return name.length + num.length <= MAX_LENGTH ? name + num : name.slice(0, MAX_LENGTH - num.length) + num;
}

/**
 * Makes a suggester. [isAvailable](name) resolves true when nobody has the
 * name (checkGamerId). Each next() resolves with a new available suggestion.
 */
export function suggester(isAvailable, { random = Math.random } = {}) {
  const shown = new Set();
  let misses = 0;
  const unseen = () => POOL.filter((n) => !shown.has(n));
  return {
    async next() {
      for (let tries = 0; tries < 12; tries++) {
        const fresh = unseen();
        const usePool = misses < MISSES_BEFORE_NUMBERS && fresh.length > 0;
        const base = usePool ? fresh[Math.floor(random() * fresh.length)] : POOL[Math.floor(random() * POOL.length)];
        const name = usePool ? base : withNumber(base, random);
        if (shown.has(name)) continue;
        shown.add(name);
        if (await isAvailable(name)) return name;
        if (usePool) misses++;
      }
      return null;
    },
  };
}
