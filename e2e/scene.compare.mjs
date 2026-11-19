// The app's valley, SVG scene against canvas scene (`?canvas=1`), side by side, for review (docs/design/qa/canvas/<stage>/).
//   node e2e/scene.compare.mjs <out.png|out.jpg> <place>@<HH:MM>[@<weather>] … [--dpr=2] [--title=…]
// (`weather`: one of the harness's moments below, given to both scenes as the app's own `?wx=` override; a .jpg sheet is
// written at quality 88.)
// The app itself on the Vite dev server: the place and its recorded panorama put in storage as the app keeps them, the
// clock set to the moment (2026-11-17, the fixture's day), the forecast answered from the fixture at the place's own
// height (as the scene harness does); every other request
// off the dev server is refused. Each row: the scene figure with the sky above it, SVG on the left, canvas on the right.
import fs from 'node:fs'
import path from 'node:path'
import { launch, openPage, root, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const title = args.find((a) => a.startsWith('--title='))?.slice(8) ?? ''
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
}
const [out, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!out || !moments.length) {
  console.log('usage: node e2e/scene.compare.mjs <out.png> <place>@<HH:MM> … [--dpr=2]')
  process.exit(2)
}
const placesSrc = fs.readFileSync(path.join(root, 'src/test/scenePlaces.ts'), 'utf8')
const placeOf = (id) => {
  const m = placesSrc.match(new RegExp(`\\{ id: '${id}'[\\s\\S]*?\\}`))
  if (!m) throw new Error(`unknown place ${id}`)
  return Function(`return (${m[0]})`)()
}

const server = await startServer()
const browser = await launch()
const shots = []
try {
  for (const moment of moments) {
    const [id, hour, weather = ''] = moment.split('@')
    if (weather && !WX[weather]) throw new Error(`unknown weather ${weather}`)
    const place = placeOf(id)
    const panorama = fs.readFileSync(path.join(root, `src/test/fixtures/scene/${id}.panorama.json`), 'utf8')
    const at = `2026-11-17T${hour}:00+02:00`
    for (const canvas of [false, true]) {
      const { context, page } = await openPage(browser, server.url, dpr)
      // The recorded forecast with the place's own height (the panorama's ground), as Open-Meteo answers for the place.
      const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
      forecast.elevation = JSON.parse(panorama).groundM
      await context.route(/\/v1\/forecast/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) }))
      await page.addInitScript(({ place, panorama, id, at }) => {
        localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
        localStorage.setItem(`shamayim:horizon:v3:${id}`, panorama)
        const R = Date, off = R.parse(at) - R.now()
        class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
        window.Date = S
      }, { place, panorama, id, at })
      const q = new URLSearchParams({ ...(canvas ? { canvas: '1' } : {}), ...(weather ? { wx: WX[weather] } : {}) })
      await page.goto(`${server.url}/${q.size ? `?${q}` : ''}`)
      await page.waitForSelector('figure[data-scene]', { timeout: 60000 })
      await page.waitForTimeout(3500)
      const box = await page.locator('figure[data-scene]').boundingBox()
      const top = Math.max(0, box.y - 160)
      shots.push({ id, hour: weather ? `${hour} ${weather}` : hour, canvas, png: await page.screenshot({ clip: { x: 0, y: top, width: 375, height: box.y + box.height - top } }) })
      await context.close()
    }
  }
  // One sheet: rows of moments, SVG | canvas, drawn in a page (no image library needed).
  const page = await (await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 2 * 375 + 24, height: 100 } })).newPage()
  const rows = moments.map((_, i) => [shots[2 * i], shots[2 * i + 1]])
  const head = title ? `<h1 style="margin:0;padding:10px 8px 2px;font:600 18px sans-serif">${title}</h1>` : ''
  const html = `<body style="margin:0;background:#111;font:13px sans-serif;color:#ddd">${head}${rows.map(([a, b]) =>
    `<div style="display:flex;gap:8px;padding:8px"><figure style="margin:0"><img src="data:image/png;base64,${a.png.toString('base64')}" style="width:375px;display:block"><figcaption>${a.id} ${a.hour} · SVG</figcaption></figure>`
    + `<figure style="margin:0"><img src="data:image/png;base64,${b.png.toString('base64')}" style="width:375px;display:block"><figcaption>${b.id} ${b.hour} · canvas</figcaption></figure></div>`).join('')}</body>`
  await page.setContent(html)
  await page.waitForTimeout(300)
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true })
  const jpeg = /\.jpe?g$/i.test(out)
  fs.writeFileSync(path.resolve(root, out), await page.screenshot({ fullPage: true, ...(jpeg ? { type: 'jpeg', quality: 88 } : {}) }))
  console.log('saved', out)
} finally {
  await browser.close()
  await server.close()
}
