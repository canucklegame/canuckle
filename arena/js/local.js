// Read-only access to the games' shared_preferences, plus the arena's own
// per-browser conveniences.
//
// Flutter web's shared_preferences stores every key in localStorage as
// "flutter.<key>" with a JSON-encoded value (strings are quoted, string lists
// are JSON arrays). The arena lives on the same origin as the games, so it can
// read them directly. Storage can be unavailable (private mode, blocked site
// data), so every access is guarded.

export function readPref(key) {
  let raw;
  try {
    raw = localStorage.getItem('flutter.' + key);
  } catch {
    return null;
  }
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Writes a game pref the way shared_preferences would: JSON-encoded, so a
 * string is stored quoted (a string holding JSON ends up encoded twice), an
 * int or bool bare, and a string list as a JSON array. Throws if storage is
 * unavailable, because the only caller (switching user id) must not carry on
 * after a write that did not happen.
 */
export function writePref(key, value) {
  localStorage.setItem('flutter.' + key, JSON.stringify(value));
}

export function removePref(key) {
  localStorage.removeItem('flutter.' + key);
}

/** Every game pref key currently stored, without the "flutter." prefix. */
export function prefKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('flutter.')) out.push(k.slice('flutter.'.length));
    }
  } catch {
    // No storage: nothing to list.
  }
  return out;
}

/** The anonymous player id every game shares, or null for a new player. */
export function playerId() {
  const id = readPref('FirestoreUsername');
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function arenaGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem('arena.' + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function arenaSet(key, value) {
  try {
    localStorage.setItem('arena.' + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the arena works without its cache.
  }
}
