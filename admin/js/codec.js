// Canuckle stores answers as plain base64 of the UTF-8 word, no key
// (canuckleSourceCode/lib/words.dart encrypt/decrypt). The app upper-cases on
// read, so case only matters for keeping the data consistent.

function toBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(text) {
  const bin = atob(text);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeAnswer(word, { upper = false } = {}) {
  const w = String(word || '').trim();
  return toBase64(new TextEncoder().encode(upper ? w.toUpperCase() : w.toLowerCase()));
}

/** The plain word, upper-cased like the app shows it, or '' when unreadable. */
export function decodeAnswer(stored) {
  if (!stored) return '';
  try {
    return new TextDecoder().decode(fromBase64(stored)).toUpperCase();
  } catch {
    return '';
  }
}

/** Whether most existing answers were stored upper-case, so new ones match. */
export function storedUpperCase(storedAnswers) {
  let upper = 0;
  let lower = 0;
  for (const s of storedAnswers) {
    if (!s) continue;
    let raw;
    try {
      raw = new TextDecoder().decode(fromBase64(s));
    } catch {
      continue;
    }
    if (raw === raw.toUpperCase() && raw !== raw.toLowerCase()) upper++;
    else lower++;
  }
  return upper > lower;
}
