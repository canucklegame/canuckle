// Google Analytics, production (canucklegame.ca) only.
//
// Same GA4 web stream as the games (G-RPLYG6MC2K, the Firebase-linked
// "canuckle (web)" stream), so arena events sit next to the games' own
// level_start / level_end events. Every event carries game: 'arena'; an event
// about one of the games names it in target_game.

import { GA_ID, IS_PROD_HOST } from './config.js?v=202610131208';

export function initAnalytics() {
  if (!IS_PROD_HOST) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { page_title: 'Games Arena' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.append(s);
}

/** The parameters sent with [event]: the caller's, plus game: 'arena'. */
export function eventParams(params = {}) {
  return { ...params, game: 'arena' };
}

export function track(event, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, eventParams(params));
  }
}
