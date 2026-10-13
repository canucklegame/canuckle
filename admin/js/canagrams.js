// Reading Canagrams' shipped puzzles, for the Canagrams tab. Pure functions,
// unit-tested in admin/tests/run.mjs.
//
// A port of the READ half of canagramsSourceCode/lib/model/puzzle_codec.dart,
// which is the format's only definition -- if it changes, this changes with it:
//
//     LETTERS~W,H,S~SLOTS~BLOB
//
// SLOTS is four characters per word (row, column, A/D, length; base 36). BLOB
// deciphers to GRIDWORDS|BONUS|CANUCKLESLOT, the bonus list front-coded.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,|';
const SALT = 0x3C61A7;

/** BoardShape, by index (lib/model/difficulty.dart). */
export const SHAPES = ['Free', 'Mirror', 'Spine', 'Maple leaf', 'Plus sign', 'Ring'];

/** The weekday ladder's labels (lib/model/difficulty.dart), Monday first. */
export const RUNGS = ['Easy', 'Easy', 'Medium', 'Medium-hard', 'Hard', 'Fun board', 'Toughest'];

function decipher(text, key) {
  let state = SALT;
  for (let i = 0; i < key.length; i++) state = (state * 31 + key.charCodeAt(i)) & 0x7FFFFFFF;
  if (state === 0) state = 0x9E3779B9 & 0x7FFFFFFF;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    // The Dart is 63-bit integers masked to 31 bits; keep every step in range.
    state ^= Number((BigInt(state) << 13n) & 0x7FFFFFFFn);
    state ^= state >>> 17;
    state ^= Number((BigInt(state) << 5n) & 0x7FFFFFFFn);
    const shift = state % 38;
    const index = ALPHABET.indexOf(text[i]);
    out += index < 0 ? text[i] : ALPHABET[(index - shift + 76) % 38];
  }
  return out;
}

function frontDecode(field) {
  if (!field) return [];
  const out = [];
  let previous = '';
  for (const entry of field.split(',')) {
    const shared = parseInt(entry[0], 36);
    if (Number.isNaN(shared) || shared > previous.length) return null;
    const word = previous.slice(0, shared) + entry.slice(1);
    out.push(word);
    previous = word;
  }
  return out;
}

/**
 * One packed line as {letters, width, height, shape, slots, bonus, canuckle},
 * or null if it does not read. slots: [{word, row, col, dir}].
 */
export function unpackCanagrams(line) {
  const parts = String(line).split('~');
  if (parts.length !== 4) return null;
  const [letters, dims, slotText, blob] = parts;
  const [width, height, shape] = dims.split(',').map(Number);
  if (!width || !height || !(shape >= 0) || slotText.length % 4) return null;
  const fields = decipher(blob, letters + slotText).split('|');
  if (fields.length !== 3) return null;
  const words = fields[0] ? fields[0].split(',') : [];
  if (words.length * 4 !== slotText.length) return null;
  const slots = words.map((word, i) => {
    const c = slotText.slice(i * 4, i * 4 + 4);
    return { word, row: parseInt(c[0], 36), col: parseInt(c[1], 36), dir: c[2], len: parseInt(c[3], 36) };
  });
  if (slots.some((s) => s.len !== s.word.length)) return null;
  const bonus = frontDecode(fields[1]);
  const canuckle = slots[parseInt(fields[2], 36)]?.word;
  if (!bonus || !canuckle) return null;
  return { letters, width, height, shape: SHAPES[shape] || 'Free', slots, bonus, canuckle };
}

/** The crossword as rows of text, '·' for an empty square. */
export function gridRows(p) {
  const rows = Array.from({ length: p.height }, () => Array(p.width).fill('·'));
  for (const s of p.slots) {
    for (let i = 0; i < s.word.length; i++) {
      const r = s.dir === 'D' ? s.row + i : s.row;
      const c = s.dir === 'A' ? s.col + i : s.col;
      if (rows[r]) rows[r][c] = s.word[i];
    }
  }
  // Masked shapes (leaf, plus) ship the whole mask as the box; trim the empty
  // margin so the preview is the board, not the mask.
  const used = rows.map((r) => r.some((ch) => ch !== '·'));
  const top = used.indexOf(true);
  const bottom = used.lastIndexOf(true);
  let left = Infinity;
  let right = -1;
  for (const r of rows) {
    r.forEach((ch, c) => {
      if (ch !== '·') {
        left = Math.min(left, c);
        right = Math.max(right, c);
      }
    });
  }
  return rows.slice(top, bottom + 1).map((r) => r.slice(left, right + 1).join(' '));
}

/** Weekday of a Canagrams day: 0 = Monday .. 6 = Sunday. Day 1 is a Tuesday. */
export function rungOf(day) {
  return (day % 7 + 7) % 7;
}

/**
 * The parent docs of anagramUserData, summed for the tab's player panel.
 * [docs] are the documents' data; [todayIdx] is today's puzzle number.
 */
export function summarizePlayers(docs, todayIdx) {
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const out = {
    players: docs.length,
    solved: 0,
    points: 0,
    best: 0,
    noHint: 0,
    canuckleWords: 0,
    bonusWords: 0,
    activeToday: 0,
    activeWeek: 0,
    longestStreak: 0,
    byDay: new Map(),
  };
  for (const d of docs) {
    out.solved += n(d.ds);
    out.points += n(d.pt);
    out.best = Math.max(out.best, n(d.bp));
    out.noHint += n(d.nh);
    out.canuckleWords += n(d.cw);
    out.bonusWords += n(d.bf);
    out.longestStreak = Math.max(out.longestStreak, n(d.mx));
    const ld = n(d.ld);
    if (ld >= todayIdx) out.activeToday++;
    if (ld > todayIdx - 7) out.activeWeek++;
    for (const day of Array.isArray(d.sd) ? d.sd : []) {
      if (Number.isInteger(day)) out.byDay.set(day, (out.byDay.get(day) || 0) + 1);
    }
  }
  return out;
}
