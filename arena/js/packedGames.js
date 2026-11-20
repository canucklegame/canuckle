// Canuckle's packed game history (firebase/COST_PLAN.md item 7). Kept byte
// for byte identical in admin/js/, js/ (the Arena) and
// firebase/functions/src/; tests check the copies match.
//
// newUserData/{id} keeps each history list in one of two forms:
//  - old: games / plusGames / duoGames, a JSON string per game
//    ({answer, startTimestamp, isFromArchive, userGuesses, results, index,
//    pollPicks?}; Duo {answers, index, startTimestamp, isFromArchive,
//    userGuesses});
//  - packed (formatVersion 2): packedGames / packedPlusGames /
//    packedDuoGames, a short string per game:
//      Canuckle / Canuckle+  index[a]:time:ANSWER:GUESS,GUESS,…[:picks]
//      Duo                   index[a]:time:ANSWER,ANSWER:GUESS,GUESS,…
//    `a` marks an archive play, time is startTimestamp in base 36, picks
//    the poll picks run together. Words are kept exactly as stored.
//    results are left out: they're standard Wordle scoring of each guess
//    (score below), which every stored result matched.
//
// packGame / packDuo return null for a game they can't reproduce exactly
// (unknown fields, a separator in a word, results that differ from the
// scoring, ...): the bulk converter (packedUpdate) then leaves the account in
// the old form. Canuckle itself, saving a game it can't pack into a packed
// doc, keeps that game's old JSON string as the array element instead, so a
// packed array may hold an element starting with '{'; readers take it as
// the old JSON.
//
// No imports: the same file runs in the browser, the admin and Node.

export const FORMAT_VERSION = 2;

/** The packed field for each old list field. */
export const PACKED_FIELDS = { games: 'packedGames', plusGames: 'packedPlusGames', duoGames: 'packedDuoGames' };

/** Standard Wordle scoring (DuoGame.score): 'c' right spot, 'e' in the word, 'n' not. */
export function score(guess, answer) {
  const g = String(guess).toUpperCase();
  const a = String(answer).toUpperCase();
  const r = Array(a.length).fill('n');
  const left = {};
  for (let i = 0; i < a.length; i++) {
    if (i < g.length && g[i] === a[i]) r[i] = 'c';
    else left[a[i]] = (left[a[i]] || 0) + 1;
  }
  for (let i = 0; i < a.length && i < g.length; i++) {
    if (r[i] === 'c') continue;
    if ((left[g[i]] || 0) > 0) {
      r[i] = 'e';
      left[g[i]] -= 1;
    }
  }
  return r.join('');
}

const isIndex = (n) => Number.isInteger(n) && n >= 0;
const isTime = (n) => Number.isInteger(n) && n >= 0;
/** A word that packs: a string with no separator. */
const word = (w) => typeof w === 'string' && !w.includes(':') && !w.includes(',');
const sameKeys = (o, allowed) => Object.keys(o).every((k) => allowed.includes(k));
const head = (g) => `${g.index}${g.isFromArchive === true ? 'a' : ''}:${g.startTimestamp.toString(36)}`;

const GAME_KEYS = ['answer', 'startTimestamp', 'isFromArchive', 'userGuesses', 'results', 'index', 'pollPicks'];
const DUO_KEYS = ['answers', 'index', 'startTimestamp', 'isFromArchive', 'userGuesses'];

/** A Canuckle / Canuckle+ game (the parsed JSON) packed, or null when it can't be exactly. */
export function packGame(g) {
  if (!g || typeof g !== 'object' || !sameKeys(g, GAME_KEYS)) return null;
  if (!isIndex(g.index) || !isTime(g.startTimestamp) || !word(g.answer)) return null;
  if (g.isFromArchive !== undefined && typeof g.isFromArchive !== 'boolean') return null;
  const guesses = g.userGuesses;
  if (!Array.isArray(guesses) || !guesses.every((x) => word(x) && x !== '')) return null;
  const results = g.results ?? [];
  if (!Array.isArray(results) || results.length !== guesses.length) return null;
  if (!results.every((r, i) => r === score(guesses[i], g.answer))) return null;
  const picks = g.pollPicks ?? [];
  if (!Array.isArray(picks) || !picks.every((p) => typeof p === 'string' && /^[a-z]$/.test(p))) return null;
  return `${head(g)}:${g.answer}:${guesses.join(',')}${picks.length ? ':' + picks.join('') : ''}`;
}

/** A Duo game (the parsed JSON) packed, or null when it can't be exactly. */
export function packDuo(g) {
  if (!g || typeof g !== 'object' || !sameKeys(g, DUO_KEYS)) return null;
  if (!isIndex(g.index) || !isTime(g.startTimestamp)) return null;
  if (g.isFromArchive !== undefined && typeof g.isFromArchive !== 'boolean') return null;
  if (!Array.isArray(g.answers) || g.answers.length !== 2 || !g.answers.every((a) => word(a) && a !== '')) return null;
  if (!Array.isArray(g.userGuesses) || !g.userGuesses.every((x) => word(x) && x !== '')) return null;
  return `${head(g)}:${g.answers.join(',')}:${g.userGuesses.join(',')}`;
}

/** The fields before the words: [index, isFromArchive, startTimestamp], or null. */
function readHead(parts) {
  const m = /^(\d+)(a?)$/.exec(parts[0] ?? '');
  if (!m || !/^[0-9a-z]+$/.test(parts[1] ?? '')) return null;
  return [Number(m[1]), m[2] === 'a', parseInt(parts[1], 36)];
}

/** A packed Canuckle / Canuckle+ game as the old JSON shape (results worked out), or null. */
export function unpackGame(s) {
  if (typeof s !== 'string') return null;
  const parts = s.split(':');
  if (parts.length !== 4 && parts.length !== 5) return null;
  const h = readHead(parts);
  if (!h) return null;
  const [index, isFromArchive, startTimestamp] = h;
  const answer = parts[2];
  const userGuesses = parts[3] === '' ? [] : parts[3].split(',');
  const g = { answer, startTimestamp, isFromArchive, userGuesses, results: userGuesses.map((x) => score(x, answer)), index };
  if (parts.length === 5) {
    if (!/^[a-z]+$/.test(parts[4])) return null;
    g.pollPicks = [...parts[4]];
  }
  return g;
}

/** A packed Duo game as the old JSON shape, or null. */
export function unpackDuo(s) {
  if (typeof s !== 'string') return null;
  const parts = s.split(':');
  if (parts.length !== 4) return null;
  const h = readHead(parts);
  if (!h) return null;
  const answers = parts[2].split(',');
  if (answers.length !== 2) return null;
  const [index, isFromArchive, startTimestamp] = h;
  return { answers, index, startTimestamp, isFromArchive, userGuesses: parts[3] === '' ? [] : parts[3].split(',') };
}

const isDuoField = (field) => field === 'duoGames';

/** Whether [doc] holds [field] ('games' | 'plusGames' | 'duoGames') in the packed form. */
export const isPacked = (doc, field) => Array.isArray(doc?.[PACKED_FIELDS[field]]);

/**
 * [field]'s games in [doc] as JSON strings in the old form, whichever form the
 * doc holds, so a reader of the old lists reads both. A packed game that can't
 * be read comes back as an empty string, as an unreadable old one would fail
 * to parse.
 */
export function gameStrings(doc, field) {
  if (isPacked(doc, field)) {
    const unpack = isDuoField(field) ? unpackDuo : unpackGame;
    return doc[PACKED_FIELDS[field]].map((s) => {
      if (typeof s === 'string' && s.startsWith('{')) return s; // an old JSON element, kept as it was
      const g = unpack(s);
      return g ? JSON.stringify(g) : '';
    });
  }
  const list = doc?.[field];
  return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
}

/** [field]'s games in [doc] as objects (null for one that can't be read), whichever form the doc holds. */
export function gameObjects(doc, field) {
  return gameStrings(doc, field).map((s) => {
    try {
      const g = JSON.parse(s);
      return g && typeof g === 'object' ? g : null;
    } catch {
      return null;
    }
  });
}

/** How many games [field] holds in [doc], either form. */
export function gameCount(doc, field) {
  const v = isPacked(doc, field) ? doc[PACKED_FIELDS[field]] : doc?.[field];
  return Array.isArray(v) ? v.length : 0;
}

/**
 * Fields no build has used for years: the old achievements (ach…,
 * unreadAchivements) and the retired trivia game (trivia…). Converting a doc
 * removes them (Canuckle's PackedHistory.isStaleField matches).
 */
export const isStaleField = (key) => /^ach[A-Z]/.test(key) || key.startsWith('trivia') || key === 'unreadAchivements';

/**
 * The update that converts [doc] to the packed form: the three packed arrays,
 * formatVersion 2, and the old lists and stale fields marked for deletion
 * with [del] (the caller's FieldValue.delete() / deleteField()). Null when
 * any game can't be packed exactly (the account stays as it is), with the
 * reason in [why.reason] when [why] is given.
 */
export function packedUpdate(doc, del, why = {}) {
  if (doc?.formatVersion === FORMAT_VERSION) {
    why.reason = 'already packed';
    return null;
  }
  const update = { formatVersion: FORMAT_VERSION };
  for (const [field, packedField] of Object.entries(PACKED_FIELDS)) {
    const list = doc?.[field] ?? [];
    if (!Array.isArray(list)) {
      why.reason = `${field} isn't a list`;
      return null;
    }
    const pack = isDuoField(field) ? packDuo : packGame;
    const out = [];
    for (const s of list) {
      let g;
      try {
        g = JSON.parse(s);
      } catch {
        why.reason = `${field} has an unreadable game`;
        return null;
      }
      const p = pack(g);
      if (p === null) {
        why.reason = `${field} has a game that can't be packed exactly (index ${g?.index})`;
        return null;
      }
      out.push(p);
    }
    // The old list's order, unchanged
    update[packedField] = out;
    update[field] = del;
  }
  for (const key of Object.keys(doc ?? {})) if (isStaleField(key)) update[key] = del;
  return update;
}
