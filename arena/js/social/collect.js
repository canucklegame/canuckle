// On a game's page: after a puzzle is finished, tell the server so a
// challenge on it gets the result straight away. Loaded by nextUp.js only
// while featureOn('challenges'), and only does anything when this browser's
// copy of the player's challenges (from their last Arena visit) has an open
// one on this game they're still to play. The server reads the result from
// the game's own saved data, never from here.

import { cachedSocial, call, loadSocialViaServer } from './api.js?v=202611200021';

// The game saves the result as the puzzle finishes; give that a moment to
// land first, and look once more a little later.
const FIRST_TRY_MS = 4000;
const RETRY_MS = 12000;

export function hasOpenChallenge(social, gameId) {
  return Object.values(social?.challenges ?? {}).some((v) => v.status === 'open' && v.game === gameId
    && ['invited', 'accepted'].includes(v.me));
}

export function collectAfterFinish(gameId) {
  if (!hasOpenChallenge(cachedSocial(), gameId)) return;
  const attempt = async (retriesLeft) => {
    try {
      const { updated } = await call('collectResult', {});
      if (updated) {
        // A game's page: ask the server, never load the Firestore SDK here.
        await loadSocialViaServer().catch(() => null);
        return;
      }
    } catch {
      // Offline or refused: the Arena collects on the next visit.
    }
    if (retriesLeft > 0) setTimeout(() => attempt(retriesLeft - 1), RETRY_MS);
  };
  setTimeout(() => attempt(1), FIRST_TRY_MS);
}
