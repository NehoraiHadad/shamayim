// App stills and smoke checks at 375×812, with the day defaulting to the harness fixture's day.
// `--built` serves dist/ via Vite preview. `--page` saves the first screen instead of the figure and a
// strip of sky, `--foot` the page's footer.
import fs from 'node:fs'
import path from 'node:path'
import { openAppPage } from './appPage.mjs'
import { caseName, DEFAULT_DAY, launch, root, startPreview, startServer } from './harness.mjs'
import { skyProblem, STILL_OPTIONS, waitForSky } from './skyShown.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const built = args.includes('--built')
const whole = args.includes('--page')
const foot = args.includes('--foot')
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
  console.log('usage: node e2e/scene.app.mjs <out-dir> <place>@<HH:MM|YYYY-MM-DDTHH:MM>[@<weather>] …'
    + ' [--built] [--dpr=2] [--page|--foot]')
  process.exit(2)
}
if (built && !fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('no dist/: run npx vite build first')

async function checkKeyboard({ page, errors, refused }, figure, name) {
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
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}  label="${label}"  slider ${before}→${after}→${back} "${text}"`
    + `  readout ${readout > 0}`
    + `${errors.length ? `  errors: ${errors.join(' | ')}` : ''}${refused.size ? `  refused: ${[...refused].join(',')}` : ''}`)
  return ok
}

async function renderMoment(browser, base, moment) {
  const [id, time, weather = ''] = moment.split('@')
  if (weather && !Object.hasOwn(WX, weather)) throw new Error(`unknown weather ${weather}`)
  const at = /^\d{2}:\d{2}$/.test(time) ? `${DEFAULT_DAY}T${time}` : time
  const app = await openAppPage(browser, base, { id, at, dpr, wx: weather ? WX[weather] : '' })
  const { context, page } = app
  try {
    const stable = await waitForSky(page)
    const name = caseName({ place: id, at, weather })
    const figure = page.locator('figure[data-canvas]')
    const box = await figure.count() === 1 ? await figure.boundingBox() : null
    const top = box ? Math.max(0, box.y - 160) : 0
    const clip = { x: 0, y: top, width: page.viewportSize().width, height: box ? box.y + box.height - top : 0 }
    const shot = foot ? await page.locator('footer').screenshot(STILL_OPTIONS)
      : await page.screenshot({ ...STILL_OPTIONS, ...(whole || !box ? {} : { clip }) })
    fs.writeFileSync(path.resolve(root, outDir, `${name}.png`), shot)

    const sky = await skyProblem(page)
    if (!stable) console.log(`FAIL ${name}  sky did not reach two equal screenshots after painting within 15 s`)
    if (sky) console.log(`FAIL ${name}  ${sky}`)
    const keyboard = box && await checkKeyboard(app, figure, name)
    return stable && !sky && keyboard ? null : name
  } finally {
    await context.close()
  }
}

fs.mkdirSync(path.resolve(root, outDir), { recursive: true })
const server = await (built ? startPreview() : startServer())
const problems = []
let browser
try {
  browser = await launch()
  for (const moment of moments) {
    const problem = await renderMoment(browser, server.url, moment)
    if (problem) problems.push(problem)
  }
} finally {
  try { await browser?.close() } finally { await server.close() }
}
if (problems.length) {
  console.log(`${problems.length} failed: ${problems.join(', ')}`)
  process.exitCode = 1
}
