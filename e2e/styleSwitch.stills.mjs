// Scratch checks of the switch between the styles on the built app: every frame the compositor shows is one whole style.
import fs from 'node:fs'
import path from 'node:path'
import { openAppPage } from './appPage.mjs'
import { DEFAULT_DAY, launch, startPreview } from './harness.mjs'
import { STILL_OPTIONS, waitForSky } from './skyShown.mjs'

const outDir = process.argv[2]
fs.mkdirSync(outDir, { recursive: true })
const PANEL = '#style-vote-panel', TOGGLE = '[data-style-vote]'
const SLIDER = '[role="slider"][aria-label="שעה בעמק"]'
let failed = 0
const check = (ok, what, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what} ${detail}`) }

/** Mean absolute difference of each frame from two references, over the scene (top 428 CSS px). */
async function measure(page, frames, real, drawn) {
  return page.evaluate(async ({ frames, real, drawn }) => {
    const W = 188, H = 214
    const load = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const bmp = await createImageBitmap(new Blob([bytes]))
      const ctx = new OffscreenCanvas(W, H).getContext('2d')
      const k = bmp.width / 375
      ctx.drawImage(bmp, 0, 0, 375 * k, 428 * k, 0, 0, W, H)
      return ctx.getImageData(0, 0, W, H).data
    }
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) if (i % 4 < 3) s += Math.abs(a[i] - b[i]); return s / (W * H * 3) }
    const R = await load(real), D = await load(drawn)
    const out = []
    for (const f of frames) { const p = await load(f); out.push([+diff(p, R).toFixed(2), +diff(p, D).toFixed(2)]) }
    return { apart: +diff(R, D).toFixed(2), out }
  }, { frames, real, drawn })
}

async function record(page, act, ms = 2500) {
  const cdp = await page.context().newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => { frames.push(data); cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}) })
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 375, maxHeight: 812 })
  await act()
  await page.waitForTimeout(ms)
  await cdp.send('Page.stopScreencast')
  await cdp.detach()
  return frames
}
const still = async (page) => { await waitForSky(page); return (await page.screenshot({ ...STILL_OPTIONS, scale: 'css' })).toString('base64') }
const choose = (page, style) => page.evaluate(([p, s]) => document.querySelector(`${p} input[value=${s}]`).click(), [PANEL, style])
const top = (page) => page.evaluate(() => scrollTo(0, 0))
const openPanel = async (page) => { await page.locator(TOGGLE).click(); await page.locator(PANEL).waitFor(); await top(page) }
const save = (name, b64) => fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(b64, 'base64'))

/** Every frame is (nearly) all one style or all the other, and the last is `to`. */
function judge(what, { apart, out }, to) {
  const worst = Math.max(...out.map(([r, d]) => Math.min(r, d)))
  const back = out.findIndex(([r, d]) => (to === 'drawn' ? d < r : r < d))
  const turned = back >= 0 && out.slice(back).every(([r, d]) => (to === 'drawn' ? d < r : r < d))
  console.log(`     ${what}: apart ${apart}, frames ${JSON.stringify(out.slice(0, 14))}`)
  check(out.length > 0 && worst < apart * 0.3 && turned, `${what}: no blank or mixed frame`, `worst ${worst} of ${apart}`)
}

async function switching(browser, base, moment) {
  const [id, time] = moment.split('@')
  const { page, context, errors } = await openAppPage(browser, base, { id, at: `${DEFAULT_DAY}T${time}`, dpr: 1, wx: '' })
  const name = (s) => `${s}-${id}-${time.replace(':', '')}`
  try {
    await page.route('**/v1/style-vote', (route) => route.fulfill({ status: 204 }))
    await page.setViewportSize({ width: 375, height: 812 })
    await waitForSky(page)
    await openPanel(page)
    const pass = async (label, hold = async () => {}) => {
      for (const to of ['drawn', 'real', 'drawn', 'real']) {
        await hold()
        await page.waitForTimeout(1300)
        const frames = await record(page, () => choose(page, to), 2500)
        const [first, last] = [frames[0], frames.at(-1)]
        const [real, drawn] = to === 'drawn' ? [first, last] : [last, first]
        const got = await measure(page, frames, real, drawn)
        check(got.apart > 1, `${moment} ${label} to ${to}: the scene changed`, got.apart)
        judge(`${moment} ${label} to ${to}`, got, to)
        const mixed = got.out.findIndex(([r, d]) => Math.min(r, d) > got.apart * 0.05)
        save(name(`${label}-to-${to}`), last)
        if (mixed >= 0) save(name(`${label}-to-${to}-mixed`), frames[mixed])
      }
    }
    await pass('now')
    const focus = () => page.locator(SLIDER).focus()
    await focus()
    for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowRight')
    await top(page); await page.waitForTimeout(800)
    let side = 0
    await pass('hour', () => focus().then(() => top(page)).then(() => page.keyboard.press(side++ % 2 ? 'ArrowLeft' : 'ArrowRight')))
    const box = await page.locator(SLIDER).boundingBox()
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width * 0.3, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.55, y, { steps: 6 })
    await page.waitForTimeout(600)
    let dx = 0
    await pass('scrub', () => page.mouse.move(box.x + box.width * 0.55 + (dx = 4 - dx), y, { steps: 2 }))
    await page.mouse.up()
    // In drawn, an hour picked afresh, with the panel closed.
    await choose(page, 'drawn'); await page.keyboard.press('Escape')
    await page.locator(SLIDER).focus(); await page.keyboard.press('ArrowLeft'); await top(page); await page.waitForTimeout(800)
    save(name('drawn-hour-picked'), await still(page))
    check(errors.length === 0, `${moment} no page errors`, errors.join(' | '))
  } finally { await context.close() }
}

const server = await startPreview('.')
const browser = await launch()
const step = async (what, run) => { try { await run() } catch (error) { check(false, what, String(error)) } }
try {
  for (const m of ['jerusalem@12:00', 'haifa@21:00', 'tel-aviv@16:30']) {
    await step(`switch ${m}`, () => switching(browser, server.url, m))
  }
} finally {
  await browser.close()
  await server.close()
}
console.log(`${failed} failed (switch)`)
