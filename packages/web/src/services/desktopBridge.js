/**
 * Wraps window.techspeak, the IPC bridge exposed by packages/desktop's
 * preload script (see packages/desktop/public/preload.js). Undefined when
 * running in a regular browser, so every call here is a safe no-op there.
 */
const bridge = typeof window !== 'undefined' ? window.techspeak : undefined;

export const isDesktop = Boolean(bridge);

export function setDesktopSession(session) {
  return bridge?.auth.setSession(session);
}

export function queueDesktopProgress(chapterId, payload) {
  return bridge?.cache.queueProgress(chapterId, payload);
}

export function queueDesktopReview(flashcardId, quality) {
  return bridge?.cache.queueReview(flashcardId, quality);
}

export function getCachedAudioPath(chapterId) {
  return Promise.resolve(bridge?.cache.getCachedAudioPath(chapterId));
}

export function cacheChapterAudio(chapterId, audioUrl) {
  return Promise.resolve(bridge?.cache.downloadChapterAudio(chapterId, audioUrl));
}

// Dia 61-62: read-side offline fallback. The desktop app has cached the
// last-synced progress/flashcards locally since Dia 20 (packages/desktop/
// public/db.js), but nothing on the renderer side ever read it back - a
// network failure just showed a raw error instead of falling back to it.
export function getCachedProgress() {
  return Promise.resolve(bridge?.cache.getProgress()).then((rows) => rows ?? []);
}

export function getCachedFlashcards() {
  return Promise.resolve(bridge?.cache.getFlashcards()).then((rows) => rows ?? []);
}

export function syncNow() {
  return Promise.resolve(bridge?.sync.now());
}

// Returns an unsubscribe function, matching preload.js's onStatusChange -
// a no-op unsubscribe in the browser, where there's nothing to listen to.
export function onSyncStatusChange(callback) {
  return bridge?.sync.onStatusChange(callback) ?? (() => {});
}
