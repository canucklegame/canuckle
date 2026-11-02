// Calendar arithmetic on "epoch days" (whole days since 1970-01-01).
//
// Every game numbers its puzzles from the player's LOCAL calendar date,
// normalized through UTC before subtracting (see e.g.
// solitaireSourceCode/lib/model/daily.dart dayIndexFor). Working in epoch days
// built from local y/m/d reproduces that exactly and is immune to DST, because
// no wall-clock hours are ever involved.

const MS_PER_DAY = 86400000;

export function epochDay(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** The player's local calendar date, as an epoch day. */
export function todayEpochDay(now = new Date()) {
  return epochDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** The local calendar date of a millisecond timestamp, or null for none. */
export function edOfMillis(ms) {
  return ms ? todayEpochDay(new Date(ms)) : null;
}

/** Midday local time on an epoch day, as millis (safe from DST edges). */
export function millisOfEd(ed) {
  const { y, m, d } = ymd(ed);
  return new Date(y, m - 1, d, 12).getTime();
}

/** {y, m, d, weekday} for an epoch day. weekday: 0 = Sunday .. 6 = Saturday. */
export function ymd(ed) {
  const dt = new Date(ed * MS_PER_DAY);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    weekday: dt.getUTCDay(),
  };
}

export function isoDate(ed) {
  const { y, m, d } = ymd(ed);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Oct 3" */
export function shortDate(ed) {
  const { m, d } = ymd(ed);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Fri" */
export function weekdayName(ed) {
  return WEEKDAYS[ymd(ed).weekday];
}

/** "October" */
export function monthName(m) {
  return MONTHS_LONG[m - 1];
}

/** "October 2026" */
export function monthTitle(y, m) {
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "Oct 3, 2026" */
export function longDate(ed) {
  const { y, m, d } = ymd(ed);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Formats seconds as m:ss or h:mm:ss. */
export function duration(sec) {
  if (!sec || sec < 0) return '–';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
