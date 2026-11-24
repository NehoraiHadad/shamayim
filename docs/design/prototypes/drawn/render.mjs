// Stills of the drawn style's concept: the app's own scene (world, model, layers, hour, light), painted by the painters in
// this folder instead of `src/scene/paint/drawn/painters.ts`. Nothing in `src/scene` is written.
//   node --experimental-strip-types docs/design/prototypes/drawn/render.mjs <outDir> <moment> … [--tree=<dir>] [--dpr=2] [--as=concept|drawn|real]
// `--as`: the concept's painters (the default), or the tree's own drawn or real style, for the side by side.
// `--tree`: another checkout to take the world and the model from; the painters here are copied into it first.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from '../../../../e2e/harness.mjs'
import { momentName, parseMoment } from '../../../../e2e/moments.mjs'
import { swapIn } from './swap.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const option = (name, or) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? or
const [outDir, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!outDir || !moments.length) {
  console.log('usage: render.mjs <outDir> <place>@<HH:MM> … [--tree=<dir>] [--dpr=2]')
  process.exit(2)
}
const as = option('as', 'concept')
const tree = path.resolve(option('tree', root)), dpr = Number(option('dpr', 2))
const proto = path.join(tree, 'docs/design/prototypes/drawn')
if (path.resolve(proto) !== path.resolve(here)) fs.cpSync(here, proto, { recursive: true })

const server = await startServer(tree, { plugins: [swapIn(as, tree)], cacheDir: path.join(tree, '.vite-drawn') })
const browser = await launch()
fs.mkdirSync(outDir, { recursive: true })
try {
  for (const text of moments) {
    const moment = { ...parseMoment(text), style: as === 'real' ? 'real' : 'drawn' }
    const { context, page } = await openPage(browser, server.url, dpr, { treeRoot: tree })
    page.on('pageerror', (err) => console.error('page:', err.message))
    page.on('console', (m) => { if (m.type() === 'error') console.error(m.text()) })
    await loadScene(page, sceneUrl(server.url, { ...moment, overlay: true, paint: 'main' }))
    const file = path.join(outDir, `${momentName(moment)}${as === 'drawn' ? '-v1' : ''}.png`)
    fs.writeFileSync(file, await page.screenshot({ clip: CLIP }))
    console.log('saved', file)
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
