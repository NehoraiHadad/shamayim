// Shared by the canvas scene's runners (docs/design/CANVAS-SCENE-PLAN.md §3): a Vite dev server for `scene.html`, the
// preinstalled Chromium (Playwright library, browsers in /opt/pw-browsers; nothing is installed), and a page that
// serves the forecast fixture for the app's own forecast request. Every other request off the dev server is refused,
// so nothing reaches Open-Meteo or any other host.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '/opt/pw-browsers'
const { chromium } = require('playwright')

/** The synthetic forecast with the scene's hourly fields (the world's fixture). */
const FORECAST = fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'))

/** The still: the sky above the land's figure and the figure (scene.html's LAND_TOP + SCENE_H). */
export const CLIP = { x: 0, y: 0, width: 375, height: 428 }

export async function startServer() {
  const { createServer } = await import('vite')
  const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false } })
  await server.listen()
  const url = server.resolvedUrls.local[0].replace(/\/$/, '')
  return { url, close: () => server.close() }
}

/**
 * Chromium for the runners, with `--disable-gpu` (software raster: deterministic pixels, and every raster counted on
 * the main thread). `gpu: true` keeps Chromium's GPU path (SwiftShader in this container: measured no faster).
 */
export function launch({ gpu = false } = {}) {
  const executablePath = process.env.SCENE_CHROMIUM
  const args = ['--force-color-profile=srgb', '--font-render-hinting=none', ...(gpu ? [] : ['--disable-gpu'])]
  return chromium.launch({ executablePath, args })
}

export function sceneUrl(base, { place, at, weather = '', overlay = false }) {
  const q = new URLSearchParams({ place, at, phase: '0' })
  if (weather) q.set('weather', weather)
  if (overlay) q.set('overlay', '1')
  return `${base}/scene.html?${q}`
}

/** A page at 375 × 812 and the given dpr; the forecast request answered from the fixture, other hosts refused. */
export async function openPage(browser, base, dpr = 1) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: dpr })
  const host = new URL(base).host
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.host === host) return route.continue()
    if (/\/v1\/forecast$/.test(url.pathname)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: FORECAST })
    }
    return route.abort('blockedbyclient')
  })
  const page = await context.newPage()
  return { context, page }
}

/** Opens the harness and waits until both surfaces are painted (one retry: Vite may reload once on a cold cache). */
export async function loadScene(page, url, timeout = 60000) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(url)
      await page.waitForFunction(() => window.__sceneReady || window.__sceneError, null, { timeout })
      const error = await page.evaluate(() => window.__sceneError)
      if (error) throw new Error(`harness: ${error}`)
      return
    } catch (err) {
      if (attempt >= 1 || String(err).includes('harness:')) throw err
    }
  }
}

export const caseName = ({ place, at, weather, dpr = 1 }) =>
  `${place}-${at.slice(11).replace(':', '')}${weather ? `-${weather}` : ''}${dpr !== 1 ? `@${dpr}x` : ''}`
