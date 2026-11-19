/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'שמיים — מזג אוויר',
        short_name: 'שמיים',
        description: 'מזג האוויר המדויק למקום שלך, בעברית ברורה',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#070B1E',
        theme_color: '#131C3F',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Keep the map renderer off the network until the overhead page is opened, and the satellite reader (GeoTIFF and
        // its decoders) until a turning view asks for this week's land colours.
        globIgnores: ['**/maplibre-gl-*.{js,css}', '**/{geotiff,pako.esm,lerc,basedecoder,deflate,jpeg,lzw,packbits,raw,webimage}-*.js'],
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: /\/data\/landmarks\//,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'landmark-data' },
        }, {
          urlPattern: /\/data\/city\//,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'city-data' },
        }, {
          urlPattern: /\/data\/land\//,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'land-data' },
        }],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/city/**/*.test.ts'],
  },
})
