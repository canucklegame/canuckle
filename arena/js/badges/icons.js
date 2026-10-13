// Badge medal artwork: a layered hexagon (tier ring, the game's colour) with
// an illustration of what the badge is for. Built from constants only, so the
// markup is safe to inject. The artwork for a badge is picked from its id.

export const LEAF_PATH = 'M50 5L57 19L64 15L61 38L72 27L75 34L86 32L82 45L90 49L70 64L73 73L53 70L53 92L47 92L47 70L27 73L30 64L10 49L18 45L14 32L25 34L28 27L39 38L36 15L43 19Z';

const RING = { bronze: '#C07A3E', silver: '#B9BCC2', gold: '#E2B23B', none: '#F1E9DB' };

// Inner colour and its darker edge, per game.
const PALETTE = {
  family: ['#D52B1E', '#A61F15'],
  canuckle: ['#D52B1E', '#A61F15'],
  plus: ['#C08A12', '#8F6608'],
  duo: ['#6B3FA0', '#4E2C78'],
  canoku: ['#1F5E96', '#154369'],
  canolitaire: ['#1E5A3C', '#123824'],
  canominoes: ['#2A2A33', '#15151B'],
  canoggle: ['#D35F1B', '#9E4512'],
  canagrams: ['#0E7C7B', '#0A5958'],
  night: ['#2A2050', '#1A1430'],
  aurora: ['#16305A', '#0E1E36'],
  slate: ['#3A3A44', '#2B2B33'],
  locked: ['#CFC9C0', '#BDB7AE'],
};

const leaf = (x, y, s, fill) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="${LEAF_PATH}" fill="${fill}"/>`;

const hex = (r, fill, sw) => {
  const p = (a) => {
    const t = (Math.PI / 180) * a;
    return `${(60 + r * Math.cos(t)).toFixed(1)},${(60 + r * Math.sin(t)).toFixed(1)}`;
  };
  const pts = [-90, -30, 30, 90, 150, 210].map(p).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${fill}" stroke-width="${sw}" stroke-linejoin="round"/>`;
};

/** A banner across the bottom, folding back behind itself at both ends. */
function ribbon(top, text, face, ink) {
  const gold = face === RING.gold;
  const tail = gold ? '#C2921E' : '#E3DCD0';
  const fold = gold ? '#8F6A12' : '#B8AE9C';
  const b = top + 13;
  const tt = top + 5;
  const tb = b + 5;
  const tm = (tt + tb) / 2;
  return `<path d="M22 ${tt}H2L7 ${tm}L2 ${tb}H22Z" fill="${tail}"/>`
    + `<path d="M98 ${tt}H118L113 ${tm}L118 ${tb}H98Z" fill="${tail}"/>`
    + `<path d="M14 ${b}H22V${tb}Z" fill="${fold}"/>`
    + `<path d="M106 ${b}H98V${tb}Z" fill="${fold}"/>`
    + `<path d="M14 ${top}H106V${b}H14Z" fill="${face}"/>`
    + `<path d="M14 ${top + 0.8}H106" stroke="#fff" stroke-opacity=".45" stroke-width="1"/>`
    + `<text x="60" y="${top + 10.2}" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="10" fill="${ink}">${text}</text>`;
}

// ---- Illustrations ----------------------------------------------------------

const FLAME = (x, y, w, h, fill) => {
  // A teardrop flame whose tip is at (x, y), w wide and h tall.
  const hw = w / 2;
  return `<path d="M${x} ${y}c${hw * 0.6} ${h * 0.35} ${hw} ${h * 0.55} ${hw * 0.92} ${h * 0.78}`
    + `c-${hw * 0.1} ${h * 0.17} -${hw * 0.5} ${h * 0.22} -${hw * 0.92} ${h * 0.22}`
    + `s-${hw * 0.82} -${h * 0.05} -${hw * 0.92} -${h * 0.22}`
    + `c-${hw * 0.08} -${h * 0.23} ${hw * 0.32} -${h * 0.43} ${hw * 0.92} -${h * 0.78}z" fill="${fill}"/>`;
};

function campfire(level) {
  const logW = [40, 44, 48, 52][level];
  const logs = `<rect x="${60 - logW / 2}" y="74" width="${logW}" height="8" rx="4" fill="#7A4A26" transform="rotate(-12 60 78)"/>`
    + `<rect x="${60 - logW / 2}" y="74" width="${logW}" height="8" rx="4" fill="#9A5E30" transform="rotate(12 60 78)"/>`;
  const big = [[46, 22, 31], [40, 26, 36], [34, 28, 41], [30, 30, 45]][level];
  let art = logs;
  if (level >= 1) art += FLAME(47, 56, 12, 19, '#F28C28');
  if (level >= 2) art += FLAME(74, 54, 12, 21, '#F28C28');
  if (level >= 3) art = art.replace(/#F28C28/g, '#E8641B');
  art += FLAME(60, big[0], big[1], big[2], '#F28C28');
  art += FLAME(60, big[0] + big[2] * 0.42, big[1] * 0.55, big[2] * 0.55, '#FFD15C');
  if (level >= 3) art += FLAME(60, big[0] + big[2] * 0.66, big[1] * 0.3, big[2] * 0.32, '#FFF3C4');
  if (level === 2) art += '<circle cx="44" cy="40" r="1.6" fill="#FFD15C"/><circle cx="78" cy="36" r="1.6" fill="#FFD15C"/><circle cx="83" cy="46" r="1.2" fill="#FFD15C"/>';
  if (level === 3) {
    art += '<path d="M38 34l1.4 3.6 3.6 1.4-3.6 1.4L38 44l-1.4-3.6-3.6-1.4 3.6-1.4z" fill="#fff"/>'
      + '<path d="M82 32l1.2 3 3 1.2-3 1.2L82 40.4l-1.2-3-3-1.2 3-1.2z" fill="#fff"/>'
      + '<circle cx="50" cy="30" r="1.2" fill="#fff"/><circle cx="72" cy="28" r="1" fill="#fff"/>';
  }
  return art;
}

const ART = {
  compass: () => '<circle cx="60" cy="60" r="25" fill="#F7E6C8"/><circle cx="60" cy="60" r="25" fill="none" stroke="#fff" stroke-width="4"/>'
    + '<circle cx="60" cy="60" r="19" fill="none" stroke="#C9A26B" stroke-width="1.2" stroke-dasharray="2 3"/>'
    + '<path d="M60 38l5 22h-5z" fill="#D52B1E"/><path d="M60 38l-5 22h5z" fill="#A61F15"/>'
    + '<path d="M60 82l5-22h-5z" fill="#fff"/><path d="M60 82l-5-22h5z" fill="#D9D2C5"/>'
    + '<path d="M38 60l22 4v-4z" fill="#8E8576"/><path d="M82 60l-22-4v4z" fill="#8E8576"/><circle cx="60" cy="60" r="3.5" fill="#17171A"/>',

  toque: (y = 0) => `<g transform="translate(0 ${y})"><circle cx="60" cy="32" r="7" fill="#fff"/><circle cx="57.5" cy="30" r="2" fill="#E9E2D6"/>`
    + '<path d="M40 66C40 47 49 38 60 38S80 47 80 66Z" fill="#fff"/><path d="M41.5 56h37" stroke="#D52B1E" stroke-width="4"/>'
    + '<path d="M40.5 62h39" stroke="#D52B1E" stroke-width="2"/><rect x="37" y="64" width="46" height="12" rx="5" fill="#F3EEE6"/>'
    + '<path d="M41 70h38" stroke="#D52B1E" stroke-width="2" stroke-dasharray="4 3"/></g>',

  pucks: () => [44, 60, 76].map((x, i) => {
    const y = i === 1 ? 90 : 88;
    return `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.2" fill="#17171A"/><ellipse cx="${x}" cy="${y - 1.4}" rx="7" ry="2.6" fill="#3A3A40"/>`;
  }).join(''),

  slate: () => {
    const colours = ['#D52B1E', '#C08A12', '#1F5E96', '#1E5A3C', '#17171A', '#D35F1B'];
    const tiles = colours.map((c, i) =>
      `<rect x="${36 + (i % 3) * 16.5}" y="${45 + Math.floor(i / 3) * 17}" width="15" height="15" rx="4" fill="${c}" stroke="#fff" stroke-width="1.5"/>`).join('');
    return `<rect x="31" y="40" width="58" height="42" rx="6" fill="#4C4C58" stroke="#8A6A3A" stroke-width="3"/>${tiles}`
      + '<circle cx="84" cy="84" r="9" fill="#2FA866" stroke="#fff" stroke-width="2"/><path d="M79.5 84l3 3 6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  },

  aurora: () => '<path d="M28 58C40 46 52 54 62 46S84 40 92 46" fill="none" stroke="#5FE3A1" stroke-width="7" stroke-linecap="round" opacity=".75"/>'
    + '<path d="M28 66C42 56 54 62 66 54S86 50 92 54" fill="none" stroke="#4CC7E0" stroke-width="5" stroke-linecap="round" opacity=".6"/>'
    + '<path d="M60 26l2.2 6.8 6.8 2.2-6.8 2.2L60 44l-2.2-6.8-6.8-2.2 6.8-2.2z" fill="#fff"/>'
    + '<circle cx="40" cy="38" r="1.3" fill="#fff"/><circle cx="80" cy="34" r="1.3" fill="#fff"/><circle cx="84" cy="62" r="1" fill="#fff"/>'
    + '<path d="M27 88l14-18 8 9 11-16 13 16 7-8 13 17z" fill="#fff"/><path d="M60 63l4 5-4-1-4 1zM41 70l3 4-3-1-3 1z" fill="#DDE6F0"/>'
    + leaf(54, 80, 0.12, '#D52B1E'),

  trophy: () => '<path d="M44 44c-9 0-9 14 2 15M76 44c9 0 9 14-2 15" fill="none" stroke="#F5C443" stroke-width="4"/>'
    + '<path d="M43 36h34v12c0 12-7 21-17 21s-17-9-17-21z" fill="#F5C443"/><path d="M47 38h6v10c0 7 3 12 7 14-7 0-13-6-13-14z" fill="#FFE08A"/>'
    + '<rect x="56" y="68" width="8" height="8" fill="#D9A62E"/><rect x="46" y="76" width="28" height="9" rx="3" fill="#F5C443"/><rect x="42" y="84" width="36" height="6" rx="2" fill="#7A4A26"/>'
    + leaf(53, 42, 0.14, '#D52B1E'),

  flag: () => '<path d="M44 34v54" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M46 36h32l-7 9 7 9H46z" fill="#fff"/>'
    + [[48, 38], [58, 38], [53, 43], [63, 43], [48, 48], [58, 48]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="5" fill="#17171A"/>`).join('')
    + leaf(64, 64, 0.18, '#fff'),

  stack: (n, dark, ring) => '<g transform="rotate(-12 50 62)"><rect x="34" y="44" width="30" height="34" rx="6" fill="#fff" opacity=".45"/></g>'
    + '<g transform="rotate(-3 58 60)"><rect x="42" y="40" width="30" height="34" rx="6" fill="#fff" opacity=".75"/></g>'
    + `<g transform="rotate(7 66 58)"><rect x="50" y="36" width="30" height="34" rx="6" fill="#fff"/>${leaf(57.5, 45, 0.15, dark)}</g>`
    + `<circle cx="80" cy="80" r="12" fill="${ring}" stroke="#fff" stroke-width="2"/>`
    + `<text x="80" y="84" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="${n >= 100 ? 9 : 11}" fill="#fff">${n}</text>`,

  sweep: () => '<rect x="31" y="40" width="22" height="22" rx="4" fill="#fff"/><rect x="56" y="45" width="17" height="17" rx="3.5" fill="#fff"/><rect x="76" y="50" width="12" height="12" rx="3" fill="#fff"/>'
    + [42, 64.5, 82].map((x) => `<circle cx="${x}" cy="74" r="6" fill="#2FA866"/><path d="M${x - 3} 74l2 2 4-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`).join(''),

  twoGuess: () => [31, 43, 55, 67, 79].map((x, i) =>
    `<rect x="${x}" y="42" width="10" height="10" rx="2.5" fill="${i === 1 || i === 4 ? '#E9C46A' : '#fff'}" opacity="${i === 1 || i === 4 ? 1 : 0.35}"/>`
    + `<rect x="${x}" y="55" width="10" height="10" rx="2.5" fill="#fff"/>`).join('')
    + leaf(56.5, 56.5, 0.07, '#D52B1E')
    + '<circle cx="60" cy="82" r="11" fill="#E2B23B" stroke="#fff" stroke-width="2"/>'
    + `<text x="60" y="86.5" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="13" fill="#7A2A12">2</text>`,

  hourglass: () => '<rect x="42" y="32" width="36" height="6" rx="3" fill="#9A5E30"/><rect x="42" y="84" width="36" height="6" rx="3" fill="#9A5E30"/>'
    + '<path d="M46 38c0 14 10 18 10 23s-10 9-10 23h28c0-14-10-18-10-23s10-9 10-23z" fill="#fff" opacity=".92"/>'
    + '<path d="M50 41h20c-1 7-6 11-10 15-4-4-9-8-10-15z" fill="#E9C46A"/><path d="M49 84c1-7 5-11 11-12 6 1 10 5 11 12z" fill="#E9C46A"/>'
    + '<path d="M60 57v14" stroke="#E9C46A" stroke-width="1.6" stroke-dasharray="2 2"/>' + leaf(54.5, 73, 0.11, '#D52B1E'),

  sudoku: () => '<rect x="36" y="36" width="44" height="44" rx="5" fill="#fff"/>'
    + '<path d="M50.7 36v44M65.3 36v44M36 50.7h44M36 65.3h44" stroke="#1F5E96" stroke-width="2"/>'
    + '<path d="M40.9 36v44M45.8 36v44M55.6 36v44M60.4 36v44M70.2 36v44M75.1 36v44M36 40.9h44M36 45.8h44M36 55.6h44M36 60.4h44M36 70.2h44M36 75.1h44" stroke="#A9C6E3" stroke-width=".8"/>'
    + '<rect x="51.7" y="51.7" width="12.6" height="12.6" fill="#E1ECF7"/>' + leaf(53.5, 53.5, 0.09, '#D52B1E')
    + '<path d="M80 66l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L80 89.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#F5C443" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',

  cards: () => '<g transform="rotate(-22 60 92)"><rect x="46" y="36" width="28" height="40" rx="4" fill="#EDE8DE" stroke="#123824" stroke-width="1"/></g>'
    + '<g transform="rotate(22 60 92)"><rect x="46" y="36" width="28" height="40" rx="4" fill="#F6F2EA" stroke="#123824" stroke-width="1"/></g>'
    + '<rect x="46" y="34" width="28" height="40" rx="4" fill="#fff" stroke="#123824" stroke-width="1"/>'
    + `<text x="50" y="44" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="8" fill="#D52B1E">3</text>`
    + leaf(53, 46, 0.14, '#D52B1E'),

  domino: () => '<rect x="44" y="34" width="26" height="52" rx="6" fill="#fff"/><path d="M48 60h18" stroke="#2A2A33" stroke-width="2"/>'
    + leaf(50, 39, 0.14, '#D52B1E') + leaf(50, 65, 0.14, '#D52B1E')
    + '<path d="M84 34l-12 24h9l-11 28 21-33h-9l10-19z" fill="#F5C443" stroke="#15151B" stroke-width="2" stroke-linejoin="round"/>',

  chain: () => '<rect x="36" y="38" width="14" height="14" rx="4" fill="#fff" opacity=".3"/><rect x="70" y="72" width="14" height="14" rx="4" fill="#fff" opacity=".3"/>'
    + '<rect x="36" y="72" width="14" height="14" rx="4" fill="#fff" opacity=".3"/><rect x="70" y="55" width="14" height="14" rx="4" fill="#fff" opacity=".3"/>'
    + '<path d="M43 62H60V45H77" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
    + [[36, 55, 'E'], [53, 55, 'H'], [53, 38, '!']].map(([x, y, t]) =>
      `<rect x="${x}" y="${y}" width="14" height="14" rx="4" fill="#fff"/><text x="${x + 7}" y="${y + 11}" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="9" fill="#D35F1B">${t}</text>`).join('')
    + '<circle cx="78" cy="44" r="10" fill="#fff"/>' + leaf(71.5, 37, 0.13, '#D52B1E'),

  // Two Duo boards, both solved, with a gold star: a Perfect Duo.
  duoBoards: (badge = '') => [33, 61].map((x) =>
    `<rect x="${x}" y="38" width="26" height="30" rx="5" fill="#fff"/>`
    + [0, 1, 2].map((r) => `<rect x="${x + 4}" y="${42 + r * 8}" width="18" height="5" rx="1.5" fill="${r === 2 ? '#2FA866' : '#CDB6EA'}"/>`).join('')).join('')
    + '<path d="M80 62l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L80 85.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#F5C443" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
    + (badge ? `<text x="80" y="81" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="8" fill="#7A2A12">${badge}</text>` : ''),

  // Lucky Hoser: a horseshoe, open end up, with a 7.
  horseshoe: () => '<path d="M44 40v18a16 16 0 0 0 32 0V40" fill="none" stroke="#E9C46A" stroke-width="9" stroke-linecap="round"/>'
    + '<path d="M44 40v18a16 16 0 0 0 32 0V40" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="1 7" opacity=".9"/>'
    + '<circle cx="60" cy="84" r="11" fill="#fff"/>'
    + `<text x="60" y="88.5" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="13" fill="#4E2C78">7</text>`,

  // Double Double: a coffee cup, two sugars.
  cup: () => '<path d="M44 46h32l-4 38a5 5 0 0 1-5 4H53a5 5 0 0 1-5-4z" fill="#fff"/>'
    + '<rect x="41" y="40" width="38" height="8" rx="3" fill="#EDE8DE"/><rect x="47" y="35" width="26" height="6" rx="3" fill="#EDE8DE"/>'
    + '<path d="M46 58h28l-1.6 16H47.6z" fill="#D52B1E"/>' + leaf(55.5, 61, 0.09, '#fff')
    + '<path d="M54 28c-3-3 3-5 0-8M62 28c-3-3 3-5 0-8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>'
    + '<rect x="80" y="74" width="9" height="9" rx="2" fill="#fff" stroke="#E9E2D6"/><rect x="83" y="64" width="9" height="9" rx="2" fill="#fff" stroke="#E9E2D6"/>',

  // Daily Double: Canuckle's tile and Duo's tile side by side.
  pair: () => '<g transform="rotate(-8 46 60)"><rect x="30" y="42" width="32" height="32" rx="8" fill="#D52B1E" stroke="#fff" stroke-width="2"/>'
    + '<path d="M49.5 52a8 8 0 1 0 0 12" fill="none" stroke="#fff" stroke-width="5"/></g>'
    + '<g transform="rotate(8 74 60)"><rect x="58" y="44" width="32" height="32" rx="8" fill="#6B3FA0" stroke="#fff" stroke-width="2"/>'
    + '<path d="M75.5 54a8 8 0 1 0 0 12" fill="none" stroke="#fff" stroke-width="5"/>'
    + '<path d="M80 57a2.3 2.3 0 1 1 4 2l-5 3.5h6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>',

  // Canagrams: the letter wheel with the leaf in the middle.
  wheel: () => {
    const tiles = [0, 1, 2, 3, 4, 5].map((k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      const x = (60 + 22 * Math.cos(a)).toFixed(1);
      const y = (60 + 22 * Math.sin(a)).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="8" fill="#fff"/>`;
    }).join('');
    return '<circle cx="60" cy="60" r="32" fill="#fff" opacity=".22"/>' + tiles
      + `<text x="60" y="41" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="9" fill="#0A5958">C</text>`
      + leaf(51, 51, 0.18, '#D52B1E');
  },

  // Full Week: seven squares, Monday to Sunday, all ticked.
  week: () => [0, 1, 2, 3, 4, 5, 6].map((k) =>
    `<rect x="${27 + k * 9.6}" y="${50 - k * 2}" width="8" height="${12 + k * 4}" rx="2" fill="#fff"/>`).join('')
    + '<circle cx="60" cy="84" r="9" fill="#2FA866" stroke="#fff" stroke-width="2"/>'
    + '<path d="M55.5 84l3 3 6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',

  // Sunday Best: a calendar page reading SUN, and no eye on it.
  sunday: () => '<rect x="38" y="36" width="44" height="46" rx="6" fill="#fff"/><rect x="38" y="36" width="44" height="13" rx="6" fill="#D52B1E"/>'
    + '<rect x="38" y="44" width="44" height="5" fill="#D52B1E"/>'
    + `<text x="60" y="71" text-anchor="middle" font-family="Sora, 'Clear Sans', sans-serif" font-weight="800" font-size="15" fill="#0A5958">SUN</text>`
    + '<path d="M80 62l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L80 85.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#F5C443" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',

  // No Peeking: a closed eye.
  closedEye: () => '<path d="M34 58c14 14 38 14 52 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
    + [[42, 66, 38, 74], [52, 70, 50, 79], [60, 71, 60, 80], [68, 70, 70, 79], [78, 66, 82, 74]]
      .map(([a, b, c, d]) => `<path d="M${a} ${b}L${c} ${d}" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`).join('')
    + leaf(52, 34, 0.16, '#D52B1E'),

  // Speed Speller: a stopwatch.
  stopwatch: () => '<rect x="55" y="30" width="10" height="7" rx="2" fill="#fff"/><circle cx="60" cy="63" r="24" fill="#fff"/>'
    + '<circle cx="60" cy="63" r="19" fill="none" stroke="#0E7C7B" stroke-width="1.5" stroke-dasharray="2 4"/>'
    + '<path d="M60 63V48M60 63l9 6" stroke="#D52B1E" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="63" r="3" fill="#17171A"/>',

  // Bonus Hunter: a burst of stars.
  stars: () => [[60, 40, 1], [42, 64, 0.7], [78, 64, 0.7], [60, 82, 0.55]].map(([x, y, k]) =>
    `<path transform="translate(${x} ${y}) scale(${k})" d="M0-16l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L0 7.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#F5C443" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`).join(''),

  padlock: () => '<rect x="49" y="54" width="22" height="18" rx="4" fill="#8A847B"/><path d="M53 54v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#8A847B" stroke-width="3.5"/><circle cx="60" cy="62" r="2.5" fill="#D9D4CC"/>',
};

const STREAK_LEVEL = { 7: 0, 30: 1, 100: 2, 365: 3, 4: 0, 12: 1, 52: 2 };

/** What to draw for a badge: { palette, art } from its id. */
function design(badge) {
  const [scope, key] = badge.id.split('.');
  const game = scope === 'family' ? 'family' : scope;
  const weekly = scope === 'plus';
  const streak = /^streak(\d+)$/.exec(key || '');
  const total = /^total(\d+)$/.exec(key || '');
  // Canagrams' tiered badges: the art for the kind, the number on a ribbon.
  const tiered = scope === 'canagrams' && /^(canuckle|fullweek|nopeek|bonus)(\d+)$/.exec(key || '');

  if (scope === 'family') {
    switch (key) {
      case 'explorer': return { palette: 'family', art: ART.compass() };
      case 'hattrick': return { palette: 'family', art: ART.toque() + ART.pucks() };
      case 'hattrickweek': return { palette: 'family', art: ART.toque(-2), ribbon: ['7 DAYS', RING.gold, '#7A2A12', 83] };
      case 'fullslate': return { palette: 'slate', art: ART.slate() };
      case 'truenorth': return { palette: 'aurora', art: ART.aurora() };
      default: return { palette: 'family', art: ART.trophy() };
    }
  }
  if (streak) {
    const n = Number(streak[1]);
    const level = STREAK_LEVEL[n] ?? 0;
    const night = n === 365 || n === 52;
    const pal = night ? 'night' : game;
    const unit = weekly ? 'WEEKS' : 'DAYS';
    return {
      palette: pal,
      art: campfire(level),
      ribbon: [`${n} ${unit}`, night ? RING.gold : '#FFFFFF', PALETTE[pal][1], 87],
    };
  }
  if (total) {
    const n = Number(total[1]);
    return { palette: game, art: ART.stack(n, PALETTE[game]?.[1] || '#A61F15', RING[badge.tier || 'bronze']) };
  }
  if (tiered) {
    const art = { canuckle: ART.wheel, fullweek: ART.week, nopeek: ART.closedEye, bonus: ART.stars }[tiered[1]]();
    const n = tiered[2];
    const face = badge.tier === 'gold' ? RING.gold : '#FFFFFF';
    const text = tiered[1] === 'fullweek' ? (n === '1' ? 'ONE WEEK' : `${n} WEEKS`) : n;
    return { palette: game, art, ribbon: [text, face, PALETTE.canagrams[1], 87] };
  }
  if (scope === 'canagrams') {
    switch (key) {
      case 'sunday': return { palette: game, art: ART.sunday() };
      case 'speed': return { palette: game, art: ART.stopwatch(), ribbon: ['UNDER 2:00', '#FFFFFF', PALETTE.canagrams[1], 87] };
      case 'score': return { palette: game, art: ART.trophy(), ribbon: ['1,500', RING.gold, '#7A2A12', 87] };
      default: break;
    }
  }
  switch (key) {
    case 'first': return { palette: game, art: ART.flag() };
    case 'sweep': return { palette: game, art: ART.sweep() };
    case 'quick': return { palette: game, art: ART.twoGuess() };
    case 'archive': return { palette: game, art: ART.hourglass() };
    case 'expert': return { palette: game, art: ART.sudoku() };
    case 'draw3': return { palette: game, art: ART.cards(), ribbon: ['DRAW 3', '#FFFFFF', PALETTE.canolitaire[1], 86] };
    case 'hard': return { palette: game, art: ART.domino() };
    case 'canuckle': return { palette: game, art: ART.chain() };
    case 'perfect': return { palette: game, art: ART.duoBoards() };
    case 'perfect10': return { palette: game, art: ART.duoBoards('10') };
    case 'doubledouble': return { palette: game, art: ART.cup() };
    case 'twice': return { palette: game, art: ART.twoGuess() };
    case 'lucky': return { palette: game, art: ART.horseshoe() };
    case 'dailydouble': return { palette: game, art: ART.pair() };
    default: return { palette: game, art: ART.flag() };
  }
}

let monoId = 0;

/** Medal SVG markup for a badge. Locked badges are drawn in greys. */
export function medalSvg(badge, _color, size = 72) {
  const d = design(badge);
  const earned = badge.earned;
  const [main, edge] = earned ? (PALETTE[d.palette] || PALETTE.family) : PALETTE.locked;
  const ring = earned ? RING[badge.tier || 'none'] : '#D9D4CC';
  let body = d.art + (d.ribbon ? ribbon(d.ribbon[3], d.ribbon[0], d.ribbon[1], d.ribbon[2]) : '');
  if (!earned) {
    const id = `arena-mono-${++monoId}`;
    body = `<defs><filter id="${id}"><feColorMatrix type="saturate" values="0"/></filter></defs>`
      + `<g filter="url(#${id})" opacity=".45">${body}</g>${ART.padlock()}`;
  }
  return `<svg class="medal${earned ? '' : ' locked'}" viewBox="-4 -4 128 128" width="${size}" height="${size}" aria-hidden="true">`
    + hex(52, ring, 8)
    + `<path d="M60 8L105 34V60H15V34Z" fill="#fff" opacity="${earned ? 0.22 : 0.15}"/>`
    + hex(44, edge, 6)
    + hex(38, main, 6)
    + body
    + '</svg>';
}

/** Same medal as a standalone document, for drawing onto a canvas. */
export function medalSvgStandalone(badge, color) {
  return medalSvg({ ...badge, earned: true }, color, 400)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}
