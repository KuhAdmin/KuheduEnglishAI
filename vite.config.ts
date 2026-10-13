/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const APP_NAME = 'Kuhedu Lingo - The Fluency App'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Never reload silently mid-session: the app shows an "Update available" prompt.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: 'Kuhedu',
        description: 'Practise spoken English with a friendly AI tutor.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Static at build time: the installed icon/splash stay in the default (Indigo Dawn)
        // colors regardless of the user's in-app theme.
        theme_color: '#4f46e5',
        background_color: '#f8f8fd',
        categories: ['education'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // TODO(pwa-install): add narrow + wide `screenshots` once screens are designed.
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only precache Latin font subsets; others load on demand via unicode-range if ever needed.
        globIgnores: [
          // The picture the icons are made from (pwa-assets.config.ts). The app shows the icons,
          // never this: it is some thirty times the weight of the largest size a screen needs.
          'logo.png',
          '**/nunito-{cyrillic,cyrillic-ext,vietnamese}-*.woff2',
          // Baloo Da 2 is only used for Bengali glyphs, Baloo 2 only for Devanagari ones.
          '**/baloo-da-2-{latin,latin-ext,vietnamese}-*.woff2',
          '**/baloo-2-{latin,latin-ext,vietnamese}-*.woff2',
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // AI conversation must always hit the network.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/conversation'),
            handler: 'NetworkOnly',
          },
          {
            // Admin-managed settings (landing page, ...): instant from cache, refreshed behind.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/app-config'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-config', expiration: { maxEntries: 20 } },
          },
          {
            // A week's lesson content: the server's answer while it can be had, so that an
            // admin's change reaches a learner at their next look, and the last one kept when
            // it cannot (the app keeps its own copy as well, for its screens).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/lessons'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lessons',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // A text said in a voice is the same sound for good, so what has been heard once
            // is played from here ever after: offline too.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/speech/audio'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'speech',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 },
              plugins: [
                {
                  // Kept only with the mouth for it (the `x-speech-mouth` header): a sound that
                  // came without is not finished, and the server's "do not keep" is not something
                  // this cache heeds by itself. Written out in full: it is copied into the
                  // service worker as text, where nothing imported here exists.
                  cacheWillUpdate: async ({ response }) =>
                    response.status === 200 && response.headers.has('x-speech-mouth')
                      ? response
                      : null,
                },
              ],
            },
          },
          {
            // The list of voices: instant from cache, refreshed behind.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/speech/voices'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'speech-voices', expiration: { maxEntries: 2 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    // The backend (`npm run dev:server`) answers on the same origin as the app, as it will in
    // production, so its session cookie needs no cross-site rules.
    // `changeOrigin: false` is said out loud because a target given as a bare string turns it
    // on: the backend would then be told it was asked at `127.0.0.1:8787` while the browser's
    // `Origin` names this dev server, and it refuses every request that changes something as
    // coming from another site (sign-up, sign-in).
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false },
      '/media': { target: 'http://127.0.0.1:8787', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Component styles are not needed in unit tests, but themes.contrast.test.ts reads the
    // token file as text, so only that file is let through.
    css: { include: [/tokens\.css/] },
  },
})
