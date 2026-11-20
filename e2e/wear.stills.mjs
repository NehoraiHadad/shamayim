// The "מה ללבוש" clothesline card as the app shows it, for review (docs/design/qa/canvas/wear/).
//   node e2e/wear.stills.mjs <out-dir> <name>=<place>@<HH:MM>[@<wx>] … [--dpr=2]
// The place and its recorded panorama are put in storage as the app keeps them, the clock set to the moment (2026-11-17,
// the fixture's day), the forecast answered from the fixture at the place's own height (`src/test/fixtures/
// forecast-layers-2026-11-17.json`); every other request off the dev server is refused, so nothing reaches Open-Meteo.
// `<wx>` is the app's `?wx=` override (`ui/devParams.ts`), with `;` for `,`. Each moment also checks the card's semantics:
// a section labelled by its heading, the heading's and the sentence's text, and the drawing hidden from the reader.
import fs from 'node:fs'
import path from 'node:path'
import { launch, root, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const [outDir, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!outDir || !moments.length) {
  console.log('usage: node e2e/wear.stills.mjs <out-dir> <name>=<place>@<HH:MM>[@<wx>] … [--dpr=2]')
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
const host = new URL(server.url).host
const problems = []
fs.mkdirSync(path.resolve(root, outDir), { recursive: true })
try {
  for (const moment of moments) {
    const [name, spec] = moment.split('=')
    const [id, hour, wx = ''] = spec.split('@')
    const place = placeOf(id)
    const panorama = fs.readFileSync(path.join(root, `src/test/fixtures/scene/${id}.panorama.json`), 'utf8')
    const at = `2026-11-17T${hour}:00+02:00`
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: dpr,
      reducedMotion: 'reduce', serviceWorkers: 'block' })
    const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
    forecast.elevation = JSON.parse(panorama).groundM
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (/\/v1\/forecast$/.test(url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) })
      }
      if (url.host === host) return route.continue()
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
    const q = new URLSearchParams(wx ? { wx: wx.replaceAll(';', ',') } : {})
    await page.goto(`${server.url}/${q.size ? `?${q}` : ''}`)
    await page.waitForSelector('figure[data-canvas]', { timeout: 60000 })
    const card = page.locator('section[aria-labelledby="wear-title"]')
    await card.waitFor({ timeout: 30000 })
    await page.waitForTimeout(3500)
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const box = await card.boundingBox()
    const top = Math.max(0, box.y - 24)
    fs.writeFileSync(path.resolve(root, outDir, `${name}.png`),
      await page.screenshot({ clip: { x: 0, y: top, width: 375, height: box.y + box.height - top + 8 } }))
    const semantics = await card.evaluate((el) => ({
      heading: el.querySelector('h2#wear-title')?.textContent ?? null,
      text: el.querySelector('p')?.textContent ?? null,
      drawings: [...el.querySelectorAll('svg, canvas')].map((d) => d.closest('[aria-hidden="true"]') !== null),
      height: Math.round(el.getBoundingClientRect().height),
    }))
    const ok = Boolean(semantics.heading?.startsWith('מה ללבוש')) && Boolean(semantics.text)
      && semantics.drawings.length > 0 && semantics.drawings.every(Boolean) && errors.length === 0
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}  "${semantics.heading}" — "${semantics.text}"  height ${semantics.height}`
      + `${errors.length ? `  errors: ${errors.join(' | ')}` : ''}`)
    if (!ok) problems.push(name)
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
if (problems.length) { console.log(`${problems.length} failed: ${problems.join(', ')}`); process.exit(1) }
