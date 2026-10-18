import { registerSW } from 'virtual:pwa-register';

/** Bouwnummer (korte commit-hash in CI, 'dev' lokaal); zichtbaar in het oudergedeelte. */
export const BUILD_ID: string = String(import.meta.env.VITE_BUILD_ID || 'dev').slice(0, 12);

/** Zo vaak hooguit op een nieuwe versie controleren als de app weer in beeld komt. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registreert de service worker binnen import.meta.env.BASE_URL (alleen in productie).
 *
 * Updates: een nieuwe versie wordt op de achtergrond gedownload en pas geactiveerd
 * (met herladen) als de app uit beeld is, zodat het kind nooit midden in een opdracht
 * een herstart ziet. Voortgang staat in localStorage en blijft bij een update staan;
 * Workbox ruimt alleen zijn eigen oude caches op.
 */
export function setupPwa(): void {
  document.documentElement.dataset.build = BUILD_ID;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let pendingUpdate = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pendingUpdate = true;
      if (document.visibilityState === 'hidden') void updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Een app op het beginscherm wordt zelden echt herladen: controleer zelf.
      let lastCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        if (Date.now() - lastCheck < UPDATE_CHECK_MS) return;
        lastCheck = Date.now();
        registration.update().catch(() => undefined);
      });
    },
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pendingUpdate) void updateSW(true);
  });

  // Vraag de browser de opslag niet automatisch op te ruimen (best effort).
  navigator.storage?.persist?.().catch(() => undefined);
}
