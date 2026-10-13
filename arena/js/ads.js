// The Yolla ad tag. The slots themselves are static markup in index.html
// (the same classes and sizes as the games' pages); the tag finds them by
// their ympb_target class and fills them.
//
// One tag for the whole family, the same one every game injects. As in the
// games' flutter_bootstrap.js, it goes in a little after the arena has first
// rendered so it doesn't compete with it, and only on canucklegame.ca: off
// production (sandbox, localhost) the slots get coloured placeholder
// backgrounds instead (html.ad-preview in arena.css), like the games' pages.

import { IS_PROD_HOST } from './config.js?v=202610131208';

const AD_TAG_URL =
  'https://portal.cdn.yollamedia.com/storage/tag/ps6d46b18362b4075b4074ad02399f36e91e9d429e.js';
const AD_INJECT_DELAY_MS = 2000;

if (!IS_PROD_HOST && typeof document !== 'undefined') {
  document.documentElement.classList.add('ad-preview');
}

let injected = false;

export function loadAds() {
  if (injected || !IS_PROD_HOST) return;
  injected = true;
  setTimeout(() => {
    const s = document.createElement('script');
    s.async = true;
    s.src = AD_TAG_URL;
    document.head.appendChild(s);
  }, AD_INJECT_DELAY_MS);
}
