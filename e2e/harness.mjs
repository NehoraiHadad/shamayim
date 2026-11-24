// Shared by the canvas scene's runners (docs/design/CANVAS-SCENE-PLAN.md §3): a Vite dev server for `scene.html`, the
// preinstalled Chromium (Playwright library, browsers in /opt/pw-browsers; nothing is installed), and a page that
// serves the forecast fixture for the app's own forecast request. Every other request off the dev server is refused,
// so nothing reaches Open-Meteo or any other host.
import fs from 'node:fs'
import { SCENE_W } from '../src/world/sceneBox.ts'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '/opt/pw-browsers'
const { chromium } = require('playwright')

/** The day of the synthetic forecast with the scene's hourly fields (the world's fixture), the default day. */
export const DEFAULT_DAY = '2026-11-17'

/** Prefer the place's recording, then any recording of that day, then the synthetic fixture (of the tree at `treeRoot`). */
export function forecastForDay(day, place, treeRoot = root) {
  const fixtures = path.join(treeRoot, 'src/test/fixtures')
  const recordings = !day || day === DEFAULT_DAY ? []
    : fs.readdirSync(fixtures).filter((file) => file.startsWith('forecast-') && file.endsWith(`-${day}.json`))
  const real = recordings.find((file) => file === `forecast-${place}-${day}.json`) ?? recordings[0]
  return fs.readFileSync(path.join(fixtures, real ?? `forecast-layers-${DEFAULT_DAY}.json`))
}

function forecastFor(pageUrl, treeRoot) {
  const params = new URL(pageUrl).searchParams
  return forecastForDay(params.get('at')?.slice(0, 10), params.get('place'), treeRoot)
}

/** The still: the sky above the land's figure and the figure (scene.html's LAND_TOP + SCENE_H). */
export const CLIP = { x: 0, y: 0, width: SCENE_W, height: 428 }

/** A dev server of the tree at `treeRoot` (its own sources, fixtures and Vite config); `config` adds to Vite's options. */
export async function startServer(treeRoot = root, config = {}) {
  const { createServer } = await import('vite')
  const server = await createServer({ root: treeRoot, logLevel: 'error', ...config,
    server: { host: '127.0.0.1', port: 0, strictPort: false, ...config.server } })
  await server.listen()
  const url = server.resolvedUrls.local[0].replace(/\/$/, '')
  return { url, close: () => server.close() }
}

export async function startPreview(appRoot = root) {
  const { preview } = await import('vite')
  const server = await preview({ root: appRoot, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
  // Vite's close also runs plugin cleanup. Older preview servers expose only the HTTP server.
  const close = () => server.close?.() ?? new Promise((resolve, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolve())
  })
  return { url: server.resolvedUrls.local[0].replace(/\/$/, ''), close }
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

export function sceneUrl(base, { place, at, weather = '', overlay = false, phase = '0', land = '', wear = '', hide = '', style = '',
  paint = process.env.SCENE_PAINT, label = process.env.SCENE_LABEL }) {
  const q = new URLSearchParams({ place, at, phase: String(phase) })
  if (wear) q.set('wear', wear)
  if (weather) q.set('weather', weather)
  if (land) q.set('land', land)
  if (hide) q.set('hide', hide)
  if (style) q.set('style', style)
  if (overlay) q.set('overlay', '1')
  // label (or SCENE_LABEL) = a | b | c: the height told by one of the design options.
  if (label) q.set('label', label)
  // paint (or SCENE_PAINT) = main: the layers painted on the main thread (the fallback where a browser has no paint worker).
  if (paint === 'main') q.set('paint', 'main')
  return `${base}/scene.html?${q}`
}

/**
 * A page at 375 × 812 and the given dpr; the forecast request answered from the fixture, other hosts refused. Reduced
 * motion unless `motion` (C6): the scene then draws one still frame at phase 0 and runs no loop, so a still is the same
 * pixels whenever it is taken and a scrub frame is not raced by the drifting clouds. `treeRoot`: the tree the forecast
 * fixture is read from, for a server of another tree.
 */
export async function openPage(browser, base, dpr = 1, { motion = false, treeRoot = root } = {}) {
  const context = await browser.newContext({ viewport: { width: SCENE_W, height: 812 }, deviceScaleFactor: dpr,
    reducedMotion: motion ? 'no-preference' : 'reduce' })
  const host = new URL(base).host
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.host === host) return route.continue()
    if (/\/v1\/forecast$/.test(url.pathname)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: forecastFor(route.request().frame().url(), treeRoot) })
    }
    return route.abort('blockedbyclient')
  })
  const page = await context.newPage()
  return { context, page }
}

/**
 * Opens the harness and waits until both surfaces are painted (by default one retry in the same page: Vite may reload once
 * on a cold cache).
 */
export async function loadScene(page, url, timeout = 60000, retries = 1) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(url)
      await page.waitForFunction(() => window.__sceneReady || window.__sceneError, null, { timeout })
      const error = await page.evaluate(() => window.__sceneError)
      if (error) throw new Error(`harness: ${error}`)
      return
    } catch (err) {
      if (attempt >= retries || String(err).includes('harness:')) throw err
    }
  }
}

export const caseName = ({ place, at, weather, dpr = 1, land = '', phase = '0', name = '' }) => name ? `${name}${dpr !== 1 ? `@${dpr}x` : ''}` :
  `${place}-${at.startsWith(DEFAULT_DAY) || !at.includes('T') ? '' : `${at.slice(0, 10)}-`}${at.slice(11).replace(':', '')}${weather ? `-${weather}` : ''}${land ? `-${land}${phase !== '0' ? `-${phase}` : ''}` : ''}${dpr !== 1 ? `@${dpr}x` : ''}`
