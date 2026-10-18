/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serveert de app onder /<repository>/. De workflow zet BASE_PATH;
// lokaal (dev/test) draait de app op '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'safari15',
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [
    VitePWA({
      // 'prompt': een nieuwe versie wacht tot src/pwa.ts hem activeert (als de app uit
      // beeld is), zodat er nooit midden in een opdracht herladen wordt.
      registerType: 'prompt',
      injectRegister: false, // registratie gebeurt expliciet in src/pwa.ts
      includeManifestIcons: false, // iconen zitten al in globPatterns (geen dubbele precache)
      manifest: {
        name: 'RekenWereld',
        short_name: 'RekenWereld',
        description: 'Rekenavonturen voor groep 3',
        lang: 'nl',
        dir: 'ltr',
        // Relatief t.o.v. het manifest, zodat het onder elke subdirectory klopt.
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#2f8f5b',
        theme_color: '#2f8f5b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2,mp3,m4a,json}'],
        // Elke navigatie binnen de scope krijgt de gecachte app, ook offline.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
