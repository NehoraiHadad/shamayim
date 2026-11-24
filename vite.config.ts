/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Chrome's explicit compile hint (`//# allFunctionsCalledOnLoad` as a script's first line): every function of the canvas
 * scene's chunk is called while its first scene is built, so V8 compiles them all as the chunk loads (off the main thread
 * while it streams) instead of one by one on first call. Measured on the scene model (`src/scene/model/*`, which carry
 * the same line for the dev server): its cold run at Shadmot 12–15 → 6–8 ms, Tel Aviv 18–32 → 7–17 (CPU ×4). Other browsers read a comment.
 */
const compileHint = (): Plugin => ({
  name: 'scene-compile-hint',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'chunk' && chunk.name === 'CanvasScene' && !chunk.code.startsWith('//# allFunctionsCalledOnLoad')) {
        chunk.code = `//# allFunctionsCalledOnLoad\n${chunk.code}`
      }
    }
  },
})

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    compileHint(),
    react(),
    VitePWA({
      registerType: 'prompt',
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
    // The scene-model suites build whole worlds from fixtures (1-5 s a test on a shared CI runner); speed is gated by test:perf, not here.
    testTimeout: 30_000,
    include: ['src/**/*.test.ts', 'scripts/city/**/*.test.ts', 'scripts/village/**/*.test.ts'],
  },
})
