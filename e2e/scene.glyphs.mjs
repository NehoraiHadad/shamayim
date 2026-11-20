// The canvas glyph sheet (stage C4): every glyph kind and icon in one place's light at four hours, at scene size and 4×.
//   node e2e/scene.glyphs.mjs [out.png] [--dpr=2]
import fs from 'node:fs'
import path from 'node:path'
import { launch, openPage, root, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const out = path.resolve(root, args.find((a) => !a.startsWith('--')) ?? 'docs/design/qa/canvas/c4/glyphs.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
const server = await startServer()
const browser = await launch()
try {
  const { context, page } = await openPage(browser, server.url, dpr)
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto(`${server.url}/scene.html?sheet=glyphs`)
  await page.waitForFunction(() => window.__sceneReady || window.__sceneError, null, { timeout: 60000 })
  const error = await page.evaluate(() => window.__sceneError)
  if (error) throw new Error(error)
  await page.evaluate(() => document.fonts.ready)
  const sheet = await page.$('#root > div')
  fs.writeFileSync(out, await sheet.screenshot())
  console.log('saved', path.relative(root, out))
  await context.close()
} finally {
  await browser.close()
  await server.close()
}
