import { registerSW } from 'virtual:pwa-register';

/** Registreert de service worker binnen import.meta.env.BASE_URL (alleen in productie). */
export function setupPwa(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
