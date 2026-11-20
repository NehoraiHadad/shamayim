// Pixel tests of the canvas scene (docs/design/CANVAS-SCENE-PLAN.md §3, tier 2).
//   npm run test:pixels                 compare every moment with its reference in e2e/__pixels__/
//   npm run test:pixels -- --update     (re)write the references (review each changed still)
//   npm run test:pixels -- --only=haifa only the moments whose name contains the text
// Failures leave the actual still and a diff in test-results/pixels/.
import fs from 'node:fs'
import path from 'node:path'
import { CASES } from './cases.mjs'
import { comparePngs, LIMITS } from './compare.mjs'
import { caseName, CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const update = args.includes('--update')
const only = args.find((a) => a.startsWith('--only='))?.slice(7)
const refs = path.join(root, 'e2e/__pixels__')
const results = path.join(root, 'test-results/pixels')
fs.mkdirSync(refs, { recursive: true })

const cases = CASES.filter((c) => !only || caseName(c).includes(only))
const server = await startServer()
const browser = await launch()
const failed = []
const started = Date.now()
try {
  const blank = await (await browser.newContext()).newPage()
  for (const c of cases) {
    const name = caseName(c)
    const { context, page } = await openPage(browser, server.url, c.dpr ?? 1)
    try {
      await loadScene(page, sceneUrl(server.url, c))
      const shot = await page.screenshot({ clip: CLIP, animations: 'disabled' })
      const ref = path.join(refs, `${name}.png`)
      if (update || !fs.existsSync(ref)) {
        if (!update) { failed.push(name); console.log(`MISSING ${name} (run with --update)`); continue }
        const same = fs.existsSync(ref) && Buffer.compare(fs.readFileSync(ref), shot) === 0
        if (!same) fs.writeFileSync(ref, shot)
        console.log(`${same ? 'same   ' : 'written'} ${name}`)
        continue
      }
      const result = await comparePngs(blank, shot, fs.readFileSync(ref))
      const ok = !result.sizeMismatch && result.ratio <= LIMITS.maxRatio && result.worstTile <= LIMITS.maxTileRatio
      console.log(`${ok ? 'ok     ' : 'FAIL   '} ${name}  ${result.sizeMismatch ?? `${(result.ratio * 100).toFixed(3)} % px, worst tile ${(result.worstTile * 100).toFixed(1)} %`}`)
      if (!ok) {
        failed.push(name)
        fs.mkdirSync(results, { recursive: true })
        fs.writeFileSync(path.join(results, `${name}.actual.png`), shot)
        if (result.diff) fs.writeFileSync(path.join(results, `${name}.diff.png`), Buffer.from(result.diff, 'base64'))
      }
    } catch (err) {
      failed.push(name)
      console.log(`ERROR   ${name}  ${err.message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  await server.close()
}
console.log(`\n${cases.length - failed.length}/${cases.length} passed in ${((Date.now() - started) / 1000).toFixed(1)} s`)
if (failed.length) {
  console.log(`failed: ${failed.join(', ')}`)
  process.exit(1)
}
