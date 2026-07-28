// Dia 73-74: registered only in production builds - in dev, a service
// worker intercepting fetches would fight with Vite's own dev-server
// module requests and HMR websocket, causing confusing stale-code bugs
// with no real offline benefit during development.
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('service worker registration failed', err));
  });
}
