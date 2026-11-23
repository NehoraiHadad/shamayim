// The vote UI in every state, on the built app at phone size, with the checks that a still cannot show.
import fs from 'node:fs'
import path from 'node:path'
import { openAppPage } from './appPage.mjs'
import { DEFAULT_DAY, launch, startPreview } from './harness.mjs'
import { STILL_OPTIONS, waitForSky } from './skyShown.mjs'

const [outDir, appRoot = '.', mode = 'after'] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const KEY = `shamayim:style-vote:${mode === 'before' ? 'v1' : 'v2'}`
const PANEL = '#style-vote-panel', TOGGLE = '[data-style-vote]', VOTE = `${PANEL} button:not([aria-label])`
let failed = 0
const check = (ok, what, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what} ${detail}`) }

async function session(browser, base, moment, width, run, { height = 812, posts = 'ok' } = {}) {
  const [id, time] = moment.split('@')
  const app = await openAppPage(browser, base, { id, at: `${DEFAULT_DAY}T${time}`, dpr: 2, wx: '' })
  const { page, context, errors } = app
  const net = { mode: posts, bodies: [] }
  await page.route('**/v1/style-vote', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 })
    net.bodies.push(route.request().postData())
    if (net.mode === 'offline') return route.abort('internetdisconnected')
    return route.fulfill({ status: net.mode === 'ok' ? 204 : Number(net.mode), headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.setViewportSize({ width, height })
  const name = (state) => path.join(outDir, `${mode}-${state}-${id}-${time.replace(':', '')}${width === 375 ? '' : `-${width}`}.png`)
  const shot = async (state) => {
    await page.waitForTimeout(1200)
    await waitForSky(page)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    check(over <= 0, `${state} ${moment} ${width}: no sideways scroll`, over)
    await page.screenshot({ ...STILL_OPTIONS, path: name(state) })
  }
  try {
    await waitForSky(page)
    await run({ page, net, shot, saved: () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY) })
    check(errors.length === 0, `${moment} no page errors`, errors.join(' | '))
  } finally { await context.close() }
}

const shifts = (page) => page.evaluate(() => {
  window.__cls = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cls.push({ v: e.value,
    who: e.sources.map((s) => `${s.node?.nodeName}.${s.node?.className ?? ''} ${Math.round(s.previousRect.y)}>${Math.round(s.currentRect.y)}`) }) })
    .observe({ type: 'layout-shift' })
})
const openPanel = async (page) => { await page.locator(TOGGLE).scrollIntoViewIfNeeded(); await page.locator(TOGGLE).click(); await page.locator(PANEL).waitFor() }
const pick = (page, style) => page.locator(`${PANEL} input[value=${style}]`).check({ force: true })
const status = (page) => page.locator(`${PANEL} [role=status]`).innerText()
const box = (page) => page.locator(PANEL).boundingBox()

async function tour({ page, net, shot, saved }) {
  await page.locator(TOGGLE).scrollIntoViewIfNeeded()
  await page.evaluate(() => scrollTo(0, 420))
  await shot('1-closed')
  await openPanel(page)
  await shot('2-open-real')
  await shifts(page)
  const before = await box(page)
  await pick(page, 'drawn')
  await shot('3-drawn-can-vote')
  await page.locator(VOTE).click()
  await shot('4-voted')
  await pick(page, 'real')
  await shot('5-can-change')
  const after = await box(page)
  check(before.y === after.y && before.height === after.height, 'panel keeps its box', JSON.stringify([before, after]))
  const cls = await page.evaluate(() => window.__cls)
  check(cls.reduce((a, e) => a + e.v, 0) < 0.001, 'no layout shift', JSON.stringify(cls))
  check((await saved()).sent === true && net.bodies.length === 1, 'vote sent once', net.bodies.join(' '))
  await page.keyboard.press('Escape')
  check(await page.evaluate((t) => document.activeElement?.matches(t), TOGGLE), 'Escape closes, focus back on the toggle')
  await pick2(page)
  await page.reload()
  await waitForSky(page)
  await openPanel(page)
  check(await page.locator(`${PANEL} input[value=drawn]`).isChecked(), 'the style survives a reload')
  await shot('6-after-reload')
}
const pick2 = async (page) => { await openPanel(page); await pick(page, 'drawn') }

async function offline({ page, net, shot, saved }) {
  await openPanel(page)
  await pick(page, 'drawn')
  await page.locator(VOTE).click()
  await shot('7-not-sent')
  console.log('     status:', await status(page))
  check((await saved()).sent === false, 'unsent vote stays')
  net.mode = 'ok'
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await page.waitForTimeout(800)
  check((await saved()).sent === true, 'goes out when back online', `posts ${net.bodies.length}`)
  console.log('     status:', await status(page))
}

async function hour({ page, shot }) {
  await openPanel(page)
  const slider = page.locator('[role="slider"][aria-label="שעה בעמק"]')
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await shot('8-hour-picked')
}

async function bottom({ page, shot }) {
  await openPanel(page)
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await shot('9-page-end')
  const gap = await page.evaluate((p) => {
    const last = [...document.querySelectorAll('.paper a, .paper p, .paper button')].at(-1).getBoundingClientRect()
    return document.querySelector(p).getBoundingClientRect().top - last.bottom
  }, PANEL)
  check(gap >= 0, 'the page end clears the panel', gap)
}

const server = await startPreview(appRoot)
const browser = await launch()
try {
  for (const moment of ['jerusalem@12:00', 'haifa@21:00', 'tel-aviv@16:30']) await session(browser, server.url, moment, 375, tour)
  await session(browser, server.url, 'jerusalem@12:00', 320, tour, { height: 640 })
  for (const moment of ['jerusalem@12:00', 'haifa@21:00']) await session(browser, server.url, moment, 375, offline, { posts: 'offline' })
  await session(browser, server.url, 'jerusalem@12:00', 375, async (s) => {
    await openPanel(s.page); await pick(s.page, 'drawn'); await s.page.locator(VOTE).click(); await s.page.waitForTimeout(500)
    check((await s.saved()).sent === false, '429 keeps the vote unsent', await status(s.page))
  }, { posts: '429' })
  await session(browser, server.url, 'jerusalem@12:00', 375, hour)
  await session(browser, server.url, 'jerusalem@12:00', 375, bottom)
} finally {
  await browser.close()
  await server.close()
}
console.log(`${failed} failed (${mode})`)
