// The gameVersions docs, and the rules for changing them. Each game compiles in
// a "Version x.y.z" string and compares it with gameVersions/<doc>.version;
// when they differ, a tab left open across a deploy reloads onto the new
// build. So a doc must only ever name a build the live site is serving.
// Bumped too early, open tabs reload onto the old build, and Canuckle, which
// has no reload latch, keeps reloading forever. The Versions tab
// (views/versions.js) uses this.

/**
 * One row per gameVersions doc. [path] is where that game's Flutter
 * version.json is served, relative to the site root. [checks] is false for
 * games whose code never reads the doc (setting it is harmless, and keeps the
 * runbook uniform, but reloads nobody). [latch] is true when the game reloads
 * at most once per tab (sessionStorage), false when it reloads on every
 * mismatch.
 */
export const VERSION_DOCS = [
  { doc: 'canuckle', name: 'Canuckle, Canuckle+ and Duo', path: 'version.json', checks: true, latch: false },
  { doc: 'canoku', name: 'Canoku', path: 'canoku/version.json', checks: false, latch: false },
  { doc: 'solitaire', name: 'Canolitaire', path: 'canolitaire/version.json', checks: false, latch: false },
  { doc: 'canominoes', name: 'Canominoes', path: 'canominoes/version.json', checks: true, latch: true },
  { doc: 'canoggle', name: 'Canoggle', path: 'canoggle/version.json', checks: true, latch: true },
  { doc: 'canagrams', name: 'Canagrams', path: 'canagrams/version.json', checks: true, latch: true },
];

/** What a doc naming a build the site doesn't serve does to open tabs. */
function mismatchEffect(row, live) {
  if (!row.checks) return 'The game doesn\'t read this doc, so nothing reloads.';
  if (!row.latch) return `Every open tab would reload onto ${live}, again and again (no reload latch).`;
  return `Open tabs would reload once onto ${live}, then stay out of date.`;
}

/**
 * "4.0.0", "v4.0.0" or "Version 4.0.0" -> "Version 4.0.0", the exact form the
 * games compile in. Blank -> ''. Anything else -> null (not a version).
 */
export function normalizeVersion(input) {
  const s = String(input ?? '').trim();
  if (!s) return '';
  const m = /^(?:version\s+|v)?(\d+\.\d+\.\d+)$/i.exec(s);
  return m ? `Version ${m[1]}` : null;
}

/** The "Version x.y.z" a Flutter version.json describes, or null. */
export function servedVersion(json) {
  return json && typeof json.version === 'string' ? normalizeVersion(json.version) || null : null;
}

/**
 * What Publish would do. [current] is {doc: version string or null (no doc)},
 * [served] {doc: version or null (unknown)}, [drafts] {doc: what was typed}.
 * Returns {changes: [{doc, from, to}], errors: [..], warnings: [..]}.
 * A blank draft means "leave it alone"; a doc is never deleted from here.
 */
export function planVersionChanges(current, served, drafts) {
  const changes = [];
  const errors = [];
  const warnings = [];
  for (const row of VERSION_DOCS) {
    const raw = drafts[row.doc];
    const to = normalizeVersion(raw);
    if (to === null) {
      errors.push(`${row.name}: "${String(raw).trim()}" isn't a version. Use x.y.z, e.g. 4.0.0.`);
      continue;
    }
    if (!to || to === (current[row.doc] ?? null)) continue;
    changes.push({ doc: row.doc, from: current[row.doc] ?? null, to });
    const live = served[row.doc] ?? null;
    if (!live) warnings.push(`${row.name}: couldn't read the served version, so ${to} can't be checked against what players get.`);
    else if (live !== to) warnings.push(`${row.name}: this site serves ${live}, not ${to}. ${mismatchEffect(row, live)}`);
  }
  return { changes, errors, warnings };
}
