// Accounts holding games Canuckle would strip. When Canuckle uploads an
// account it drops games with a blank answer and Duo games it can't read
// (canuckleSourceCode/lib/user.dart uploadPrefsToFirestore). Removing them
// here first means no save ever has to shrink a list. It matters most for
// accounts with 5+ in one list: the Firestore rules reject a save that drops
// more than 4, so those can't be saved again until an admin removes them.
//
// These functions mirror exactly what Canuckle strips and nothing more:
// anything else odd in a list (an old-format game, an entry that isn't JSON)
// is left alone.

export const MAX_DROP = 4;

// Canuckle's own blank-game stripping was certainly live by this date (it
// entered canuckleSourceCode in 884d89f, 2026-05-26), so every account saved
// since has already been cleaned by the game. The Repair scan never looks at
// accounts updated after it.
export const REPAIR_LATEST = '2026-06-01';

/**
 * The "last updated before" date the scan uses: the date picked, but never
 * later than REPAIR_LATEST (an empty or later pick means REPAIR_LATEST).
 * Dates are YYYY-MM-DD; the cutoff is local midnight at the start of it.
 */
export function repairCutoff(picked) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(picked || '') && picked < REPAIR_LATEST ? picked : REPAIR_LATEST;
  return { day, ms: new Date(`${day}T00:00:00`).getTime() };
}

function parse(s) {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** A Canuckle or Canuckle+ entry Canuckle would strip: it reads, and its answer is ''. */
export function isBlankGame(s) {
  const g = typeof s === 'string' ? parse(s) : null;
  return !!g && g.answer === '';
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const strings = (v) => v == null || (Array.isArray(v) && v.every((x) => typeof x === 'string'));

/**
 * A Duo entry Canuckle can't read (DuoGame.decode in lib/duo/duo_models.dart
 * returns null): not a JSON object, a field of the wrong type, or not
 * exactly two answers.
 */
export function isUnreadableDuo(s) {
  const g = typeof s === 'string' ? parse(s) : null;
  if (!g) return true;
  if (!strings(g.answers) || !strings(g.userGuesses)) return true;
  if (g.index != null && !isNum(g.index)) return true;
  if (g.startTimestamp != null && !isNum(g.startTimestamp)) return true;
  if (g.isFromArchive != null && typeof g.isFromArchive !== 'boolean') return true;
  return (g.answers || []).length !== 2;
}

const list = (v) => (Array.isArray(v) ? v : []);

/** What Canuckle would strip from one newUserData doc. */
export function analyzeAccount(doc) {
  const blankGames = list(doc.games).filter(isBlankGame).length;
  const blankPlus = list(doc.plusGames).filter(isBlankGame).length;
  const badDuo = list(doc.duoGames).filter(isUnreadableDuo).length;
  return {
    blankGames,
    blankPlus,
    badDuo,
    any: blankGames + blankPlus + badDuo > 0,
    stuck: blankGames > MAX_DROP || blankPlus > MAX_DROP || badDuo > MAX_DROP,
  };
}

/**
 * The doc with those entries removed and its counts brought in line, the way
 * Canuckle's own upload does it; plus what was removed, for the log.
 */
export function repairAccount(doc) {
  const games = list(doc.games);
  const plusGames = list(doc.plusGames);
  const duoGames = list(doc.duoGames);
  const removed = {
    games: games.filter(isBlankGame),
    plusGames: plusGames.filter(isBlankGame),
    duoGames: duoGames.filter(isUnreadableDuo),
  };
  const next = { ...doc };
  if (removed.games.length) {
    next.games = games.filter((s) => !isBlankGame(s));
    const count = typeof doc.gamesCount === 'number' ? doc.gamesCount : games.length;
    next.gamesCount = Math.max(0, count - removed.games.length);
  }
  if (removed.plusGames.length) {
    next.plusGames = plusGames.filter((s) => !isBlankGame(s));
    next.plusGamesCount = next.plusGames.length;
  }
  if (removed.duoGames.length) {
    next.duoGames = duoGames.filter((s) => !isUnreadableDuo(s));
    next.duoGamesCount = next.duoGames.length;
  }
  return { doc: next, removed };
}
