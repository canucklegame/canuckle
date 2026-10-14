// Records badges in arenaUserData/{id}, the arena's only Firestore write.
//
//   arenaUserData/{id} = {
//     badges: { <badgeId>: { earnedAt, dated?, announcedAt?, sharedAt?, backfill?, on? } },
//     createdAt, updatedAt
//   }
//
// The first visit records everything already earned quietly (backfill), so a
// returning player isn't buried in announcements for history. After that, a
// newly earned badge is written once and queued for an unlock announcement;
// announcedAt is set when the player dismisses it. Badges are never removed.
//
// earnedAt is the day the badge was really earned, worked out from the games'
// history (rules.js earnedOn), not the day the arena noticed. dated is false
// when the history couldn't pin the day down and earnedAt is only a day it was
// earned BY (the player's last finish that counts toward it); badges
// backfilled before dating existed have no dated flag and are re-dated.
//
// on lists a key for each time a repeatable badge has been earned (rules.js
// occurrences: a puzzle index or calendar day). It only grows, so the count
// holds after the earnings scroll out of the window the arena reads. Growing
// it never announces anything: only a badge's first earning is announced.

import { getDocData, setMerge, SERVER_TIME, toMillis } from '../firebase.js?v=202610141420';
import { millisOfEd, todayEpochDay } from '../dates.js?v=202610141420';

function normalize(doc) {
  const out = {};
  for (const [id, b] of Object.entries(doc?.badges || {})) {
    out[id] = {
      earnedAt: toMillis(b.earnedAt) ?? Date.now(),
      dated: typeof b.dated === 'boolean' ? b.dated : b.backfill !== true,
      undated: b.backfill === true && typeof b.dated !== 'boolean',
      announcedAt: toMillis(b.announcedAt),
      sharedAt: toMillis(b.sharedAt),
      backfill: b.backfill === true,
      on: Array.isArray(b.on) ? b.on.filter((k) => Number.isFinite(k)) : [],
    };
  }
  return out;
}

export async function loadStoredBadges(uid) {
  const doc = await getDocData(['arenaUserData', uid]);
  return { exists: doc != null, badges: normalize(doc) };
}

/** True when the stored badges include backfilled ones that were never dated. */
export function needsDating(stored) {
  return !stored.exists || Object.values(stored.badges).some((b) => b.undated);
}

/**
 * Pure: which badges to write, re-date and announce, given evaluation
 * results, what is stored, and today's epoch day. dates maps each written or
 * re-dated id to { ed, dated }: ed is the epoch day to record (null = today).
 */
export function planSync(results, stored, todayEd = todayEpochDay()) {
  const earned = results.filter((b) => b.earned);
  const newIds = earned.filter((b) => !stored.badges[b.id]).map((b) => b.id);
  const backfill = !stored.exists;
  // Backfilled before dating existed (earnedAt = the day it was processed).
  const redate = earned.filter((b) => {
    const s = stored.badges[b.id];
    return s && s.undated && (b.earnedOn ?? b.earnedBy) != null;
  }).map((b) => b.id);

  // Repeat keys not stored yet, as the full list to store.
  const grow = {};
  for (const b of earned) {
    const have = new Set(stored.badges[b.id]?.on || []);
    if (!(b.occurrenceKeys || []).some((k) => !have.has(k))) continue;
    grow[b.id] = [...new Set([...have, ...b.occurrenceKeys])].sort((x, y) => x - y);
  }

  const dates = {};
  for (const b of earned) {
    const isNew = newIds.includes(b.id);
    if (!isNew && !redate.includes(b.id)) continue;
    // A badge first seen on a later visit was earned since the last one, so
    // without an exact day "today" is right; history only predates it.
    const quiet = backfill || !isNew;
    const ed = b.earnedOn ?? (quiet ? b.earnedBy : null);
    dates[b.id] = {
      ed: ed != null && ed < todayEd ? ed : null,
      dated: b.earnedOn != null || !quiet,
    };
  }

  if (backfill) {
    return { write: newIds, backfill: true, announce: [], redate: [], dates, grow };
  }
  const unannounced = Object.entries(stored.badges)
    .filter(([, b]) => !b.announcedAt && !b.backfill)
    .map(([id]) => id);
  return {
    write: newIds,
    backfill: false,
    announce: [...new Set([...unannounced, ...newIds])],
    redate,
    dates,
    grow,
  };
}

/** Applies a plan. Returns the stored map as it now stands (locally). */
export async function applySync(uid, plan, stored) {
  const now = Date.now();
  const merged = { ...stored.badges };
  const grow = plan.grow || {};
  if (plan.write.length === 0 && plan.redate.length === 0 && Object.keys(grow).length === 0 && stored.exists) {
    return merged;
  }

  const badges = {};
  for (const id of [...plan.write, ...plan.redate]) {
    const { ed, dated } = plan.dates[id] || { ed: null, dated: true };
    const earnedAt = ed != null ? millisOfEd(ed) : SERVER_TIME;
    if (plan.redate.includes(id)) {
      badges[id] = { earnedAt, dated };
      merged[id] = { ...merged[id], earnedAt: ed != null ? earnedAt : now, dated, undated: false };
      continue;
    }
    badges[id] = plan.backfill
      ? { earnedAt, dated, announcedAt: SERVER_TIME, backfill: true }
      : { earnedAt, dated };
    merged[id] = {
      earnedAt: ed != null ? earnedAt : now,
      dated,
      announcedAt: plan.backfill ? now : null,
      backfill: plan.backfill,
    };
  }
  for (const [id, on] of Object.entries(grow)) {
    badges[id] = { ...badges[id], on };
    merged[id] = { ...merged[id], on };
  }
  const data = { badges, updatedAt: SERVER_TIME };
  if (!stored.exists) data.createdAt = SERVER_TIME;
  await setMerge(['arenaUserData', uid], data);
  return merged;
}

export async function markAnnounced(uid, id) {
  await setMerge(['arenaUserData', uid], { badges: { [id]: { announcedAt: SERVER_TIME } }, updatedAt: SERVER_TIME });
}

export async function markShared(uid, id) {
  await setMerge(['arenaUserData', uid], { badges: { [id]: { sharedAt: SERVER_TIME } }, updatedAt: SERVER_TIME });
}
