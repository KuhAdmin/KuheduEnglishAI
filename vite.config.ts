/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const APP_NAME = 'Kuhedu English AI'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Never reload silently mid-session: the app shows an "Update available" prompt.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
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
            urlPattern: ({ url }) => url.pathname.startsWith('/api/lessons'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lessons',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
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
  server: { host: true },
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
