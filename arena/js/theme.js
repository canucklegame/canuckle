// The arena's display settings: light or dark, and high contrast.
//
// Both are the arena's own, saved in its own storage. The first time, they
// follow Canuckle's settings, then the device's colour scheme. They never
// write back to Canuckle: Canuckle restores its settings from the player's
// account each time it opens, so a change made here would not stick there.

import { readPref, arenaGet, arenaSet } from './local.js?v=202610141420';

export function initialTheme() {
  const saved = arenaGet('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  const canuckleDark = readPref('isDarkMode');
  if (typeof canuckleDark === 'boolean') return canuckleDark ? 'dark' : 'light';
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initialContrast() {
  const saved = arenaGet('highContrast');
  if (typeof saved === 'boolean') return saved;
  return readPref('isHighContrast') === true;
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function currentContrast() {
  return document.documentElement.dataset.contrast === 'high';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function applyContrast(high) {
  if (high) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
}

export function setTheme(theme) {
  arenaSet('theme', theme);
  applyTheme(theme);
}

export function setContrast(high) {
  arenaSet('highContrast', high);
  applyContrast(high);
}
