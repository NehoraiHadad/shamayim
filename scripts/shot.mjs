// Headless phone stills for visual QA (WebGL and animation frames run, unlike a hidden preview pane).
// Usage: node scripts/shot.mjs <url> <out.png> [waitMs] [clickText]
// SHOT_PLACE='<Place JSON>' opens that place instead of the default (stored as the app stores a picked place).
// SHOT_TIME='2026-11-19T10:00:00+02:00' runs the page's clock from that moment (Date shifted, still ticking).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [url, out, waitMs = '6000', clickText] = process.argv.slice(2)
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shamayim-shot-'))
const port = 9300 + Math.floor(Math.random() * 500)
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(200)
  }
  throw new Error('chrome did not start')
}

try {
  const ws = new WebSocket(await target())
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  })
  const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true })
  await send('Page.enable')
  if (process.env.SHOT_PLACE) {
    const place = JSON.stringify(process.env.SHOT_PLACE)
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('shamayim:place:v1', ${place})` })
  }
  if (process.env.SHOT_TIME) {
    const at = JSON.stringify(process.env.SHOT_TIME)
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const R = Date, off = R.parse(${at}) - R.now()
      class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
      window.Date = S })()` })
  }
  await send('Page.navigate', { url })
  await sleep(4000)
  if (clickText) {
    await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(clickText)}))?.click()` })
  }
  await sleep(Number(waitMs))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
  console.log('saved', out)
  ws.close()
} finally {
  browser.kill()
  await sleep(300)
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* locked */ }
}
