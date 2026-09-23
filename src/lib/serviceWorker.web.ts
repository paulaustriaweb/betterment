/**
 * Registers /sw.js so the app launches with no signal (see public/sw.js).
 * Production only: in `expo start` a cache in front of the dev server would serve
 * stale code after every edit.
 */
export function registerServiceWorker(): void {
  if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // What this page fetched before the worker took over — otherwise the first
        // visit would leave nothing cached to launch from offline.
        const urls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(location.origin));
        registration.active?.postMessage({ type: 'cache', urls: [location.pathname, ...urls] });
      })
      .catch((error: unknown) => console.error('service worker registration failed', error));
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
