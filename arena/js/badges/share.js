// Sharing badges through the device share sheet, with a clipboard fallback.

import { medalSvgStandalone } from './icons.js?v=202610141420';
import { ARENA_URL } from '../config.js?v=202610141420';

function shareText(badge, gameName) {
  const where = gameName ? ` in ${gameName}` : '';
  return `🍁 I earned the "${badge.name}" badge${where} on Canuckle Games Arena!`;
}

/** A 1080x1080 PNG of the badge, or null if the browser can't draw one. */
async function badgeImage(badge, color, gameName) {
  try {
    const svg = medalSvgStandalone(badge, color);
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FBF7F2';
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.drawImage(img, 290, 170, 500, 500);
    ctx.fillStyle = '#17171A';
    ctx.textAlign = 'center';
    ctx.font = '800 76px Sora, "Clear Sans", sans-serif';
    ctx.fillText(badge.name, 540, 790);
    ctx.fillStyle = '#55534F';
    ctx.font = '400 40px Sora, "Clear Sans", sans-serif';
    ctx.fillText(gameName || 'Canuckle Games Arena', 540, 860);
    ctx.fillStyle = '#B3241A';
    ctx.font = '600 36px Sora, "Clear Sans", sans-serif';
    ctx.fillText('canucklegame.ca/arena', 540, 960);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? new File([blob], 'canuckle-badge.png', { type: 'image/png' }) : null;
  } catch {
    return null;
  }
}

/**
 * Shares a badge. Resolves to 'shared', 'copied' or 'cancelled'.
 */
export async function shareBadge(badge, color, gameName) {
  const text = shareText(badge, gameName);
  if (navigator.share) {
    const file = await badgeImage(badge, color, gameName);
    const withFile = { title: 'Canuckle Games', text, url: ARENA_URL, files: file ? [file] : undefined };
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(withFile);
      } else {
        await navigator.share({ title: 'Canuckle Games', text, url: ARENA_URL });
      }
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${ARENA_URL}`);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}

/** Shares the whole badge shelf as a short text summary. */
export async function shareShelf(earned, total) {
  const text = `🍁 I've earned ${earned} of ${total} badges on Canuckle Games Arena!`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Canuckle Games', text, url: ARENA_URL });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${ARENA_URL}`);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
