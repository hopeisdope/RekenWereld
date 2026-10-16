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
      registerType: 'autoUpdate',
      injectRegister: false, // registratie gebeurt expliciet in src/pwa.ts
      manifest: {
        name: 'RekenWereld',
        short_name: 'RekenWereld',
        description: 'Rekenavonturen voor groep 3',
        lang: 'nl',
        dir: 'ltr',
        // Relatief t.o.v. het manifest, zodat het onder elke subdirectory klopt.
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
