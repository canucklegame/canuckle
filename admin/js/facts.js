// A fun fact is stored as two parallel lists (canuckleSourceCode/lib/words.dart
// funFactSpans): fact[i] is a run of text and factUrls[i] makes it a link when
// non-empty. The runs are joined with no separator, so spaces live inside them.
//
// The editor shows it as one string where links are written
// [link text](https://url). A literal [ ] or \ in the text is escaped with \.

function escapeText(s) {
  return s.replace(/[\\[\]]/g, (c) => `\\${c}`);
}

// Parentheses inside a URL are fine as long as they balance (Wikipedia's
// Beaver_(disambiguation)); unbalanced ones are percent-encoded so the URL
// can't end the link early.
function escapeUrl(url) {
  let depth = 0;
  for (const c of url) {
    if (c === '(') depth++;
    else if (c === ')' && --depth < 0) break;
  }
  return depth === 0 ? url : url.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/** fact[] + factUrls[] -> editor text. */
export function segmentsToText(fact = [], factUrls = []) {
  let out = '';
  fact.forEach((text, i) => {
    const url = factUrls[i] || '';
    out += url ? `[${escapeText(text)}](${escapeUrl(url)})` : escapeText(text);
  });
  return out;
}

/** Editor text -> { fact, factUrls }. Adjacent plain text becomes one run. */
export function textToSegments(text) {
  const fact = [];
  const factUrls = [];
  let plain = '';
  const flush = () => {
    if (plain) {
      fact.push(plain);
      factUrls.push('');
      plain = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) {
      plain += text[i + 1];
      i += 2;
      continue;
    }
    if (c === '[') {
      const link = readLink(text, i);
      if (link) {
        flush();
        fact.push(link.label);
        factUrls.push(link.url);
        i = link.end;
        continue;
      }
    }
    plain += c;
    i++;
  }
  flush();
  return { fact, factUrls };
}

// [label](url) starting at text[start] === '[', or null when it isn't one.
function readLink(text, start) {
  let i = start + 1;
  let label = '';
  while (i < text.length && text[i] !== ']') {
    if (text[i] === '\\' && i + 1 < text.length) {
      label += text[i + 1];
      i += 2;
    } else if (text[i] === '[') {
      return null;
    } else {
      label += text[i++];
    }
  }
  if (text[i] !== ']' || text[i + 1] !== '(') return null;
  i += 2;
  let depth = 0;
  let url = '';
  while (i < text.length) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') {
      if (depth === 0) break;
      depth--;
    }
    url += c;
    i++;
  }
  if (text[i] !== ')' || !label || !url.trim()) return null;
  return { label, url: url.trim(), end: i + 1 };
}

/** Whether two fact lists render identically (same text, same links). */
export function sameFact(a, b) {
  return segmentsToText(a.fact, a.factUrls) === segmentsToText(b.fact, b.factUrls);
}

/** Plain text of a fact, for search and the table. */
export function plainFact(fact = []) {
  return fact.join('');
}
