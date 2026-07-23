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
