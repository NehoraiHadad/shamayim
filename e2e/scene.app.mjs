// The app's valley as the app shows it, for review and smoke tests (docs/design/qa/canvas/<stage>/). Replaces the C9
// review's SVG | canvas runner (`scene.compare.mjs`): the SVG scene is gone, so each moment is one still.
//   node e2e/scene.app.mjs <out-dir> <place>@<HH:MM>[@<weather>] … [--built] [--dpr=2] [--page]
// `--built`: the production build in `dist/` (run `npm run build` first), served by `vite preview`, service worker
// blocked; else the Vite dev server. `--page`: the whole first screen, else the figure with the sky above it.
// The place and its recorded panorama are put in storage as the app keeps them, the clock set to the moment (2026-11-17,
// the fixture's day), the forecast answered from the fixture at the place's own height; every other request off the
// server is refused, so nothing reaches Open-Meteo. Each moment also checks the figure's accessibility as the SVG scene
// had it: `role="group"` with a spoken label, the hour slider (`role="slider"`, keyboard: ← an hour later, Escape back to
// now) and the readout pill while a time is shown.
import fs from 'node:fs'
import path from 'node:path'
import { launch, root, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const built = args.includes('--built')
const whole = args.includes('--page')
/** The scene harness's weather moments (`src/dev/sceneHarness.tsx` WEATHER) in the app's `?wx=` keys (`ui/devParams.ts`). */
const WX = {
  rain: 'rain:4,code:63,cloud:95,wind:35,gust:55,dir:270,hum:95',
  overcast: 'cloud:100,rain:0,code:3',
  dust: 'pm10:400,vis:3',
  snow: 'snow:2,rain:2,temp:-1,cloud:100,code:73',
  thunder: 'rain:6,code:95,cloud:90,wind:25,gust:50,dir:250,hum:90',
  fog: 'hum:99,vis:1.5,cloud:60,rain:0,code:45,wind:6,gust:10',
  showers: 'rain:0.6,code:80,cloud:55,wind:25,gust:45,dir:250,hum:80',
  gale: 'wind:50,gust:75,dir:270,cloud:30,rain:0,code:2',
  broken: 'cloud:50,rain:0,code:2,hum:60,vis:25',
  hazy: 'cloud:50,rain:0,code:2,hum:70,vis:12',
}
const [outDir, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!outDir || !moments.length) {
  console.log('usage: node e2e/scene.app.mjs <out-dir> <place>@<HH:MM>[@<weather>] … [--built] [--dpr=2] [--page]')
  process.exit(2)
}
if (built && !fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('no dist/: run npm run build first')
const placesSrc = fs.readFileSync(path.join(root, 'src/test/scenePlaces.ts'), 'utf8')
const placeOf = (id) => {
  const m = placesSrc.match(new RegExp(`\\{ id: '${id}'[\\s\\S]*?\\}`))
  if (!m) throw new Error(`unknown place ${id}`)
  return Function(`return (${m[0]})`)()
}

async function startPreview() {
  const { preview } = await import('vite')
  const server = await preview({ root, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: false } })
  const url = server.resolvedUrls.local[0].replace(/\/$/, '')
  return { url, close: () => new Promise((resolve) => server.httpServer.close(resolve)) }
}

const server = built ? await startPreview() : await startServer()
const browser = await launch()
const host = new URL(server.url).host
const problems = []
fs.mkdirSync(path.resolve(root, outDir), { recursive: true })
try {
  for (const moment of moments) {
    const [id, hour, weather = ''] = moment.split('@')
    if (weather && !WX[weather]) throw new Error(`unknown weather ${weather}`)
    const place = placeOf(id)
    const panorama = fs.readFileSync(path.join(root, `src/test/fixtures/scene/${id}.panorama.json`), 'utf8')
    const at = `2026-11-17T${hour}:00+02:00`
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: dpr,
      reducedMotion: 'reduce', serviceWorkers: 'block' })
    const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
    forecast.elevation = JSON.parse(panorama).groundM
    const refused = new Set()
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (/\/v1\/forecast$/.test(url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) })
      }
      if (url.host === host) return route.continue()
      refused.add(url.host)
      return route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (err) => errors.push(String(err)))
    await page.addInitScript(({ place, panorama, id, at }) => {
      localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
      localStorage.setItem(`shamayim:horizon:v3:${id}`, panorama)
      const R = Date, off = R.parse(at) - R.now()
      class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
      window.Date = S
    }, { place, panorama, id, at })
    // `?wx=` is a dev override: the built app ignores it, so a weather moment is a dev-server moment.
    const q = new URLSearchParams(weather ? { wx: WX[weather] } : {})
    await page.goto(`${server.url}/${q.size ? `?${q}` : ''}`)
    await page.waitForSelector('figure[data-canvas]', { timeout: 60000 })
    await page.waitForTimeout(3500)
    const figure = page.locator('figure[data-canvas]')
    const name = `${id}-${hour.replace(':', '')}${weather ? `-${weather}` : ''}`
    const box = await figure.boundingBox()
    const top = Math.max(0, box.y - 160)
    const shot = whole ? { fullPage: false } : { clip: { x: 0, y: top, width: 375, height: box.y + box.height - top } }
    fs.writeFileSync(path.resolve(root, outDir, `${name}.png`), await page.screenshot(shot))
    // Accessibility, as the SVG scene had it.
    const role = await figure.getAttribute('role'), label = await figure.getAttribute('aria-label')
    const slider = page.locator('[role="slider"][aria-label="שעה בעמק"]')
    const before = await slider.getAttribute('aria-valuenow')
    await slider.focus()
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(400)
    const after = await slider.getAttribute('aria-valuenow')
    const readout = await page.locator('button', { hasText: 'עכשיו' }).count()
    const text = await slider.getAttribute('aria-valuetext')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const back = await slider.getAttribute('aria-valuenow')
    const canvasHidden = await figure.locator('canvas').getAttribute('aria-hidden')
    const ok = role === 'group' && Boolean(label) && Number(after) === Number(before) + 60 && readout > 0
      && back === before && canvasHidden === 'true' && errors.length === 0
    const line = `${ok ? 'ok  ' : 'FAIL'} ${name}  label="${label}"  slider ${before}→${after}→${back} "${text}"  readout ${readout > 0}`
      + `${errors.length ? `  errors: ${errors.join(' | ')}` : ''}${refused.size ? `  refused: ${[...refused].join(',')}` : ''}`
    console.log(line)
    if (!ok) problems.push(name)
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
if (problems.length) { console.log(`${problems.length} failed: ${problems.join(', ')}`); process.exit(1) }
