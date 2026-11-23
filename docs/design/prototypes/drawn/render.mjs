// Stills of the drawn style's concept: the app's own scene (world, model, layers, hour, light), painted by the painters in
// this folder instead of `src/scene/paint/drawn/painters.ts`. Nothing in `src/scene` is written.
//   node --experimental-strip-types docs/design/prototypes/drawn/render.mjs <outDir> <moment> … [--tree=<dir>] [--dpr=2]
// `--tree`: another checkout to take the world and the model from; the painters here are copied into it first.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from '../../../../e2e/harness.mjs'
import { momentName, parseMoment } from '../../../../e2e/moments.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const option = (name, or) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? or
const [outDir, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!outDir || !moments.length) {
  console.log('usage: render.mjs <outDir> <place>@<HH:MM> … [--tree=<dir>] [--dpr=2]')
  process.exit(2)
}
const tree = path.resolve(option('tree', root)), dpr = Number(option('dpr', 2))
const proto = path.join(tree, 'docs/design/prototypes/drawn')
if (path.resolve(proto) !== path.resolve(here)) fs.cpSync(here, proto, { recursive: true })

/** The registry's drawn painters, and the sky's base (painted on the canvas here, not a CSS gradient), from this folder. */
const swap = {
  name: 'drawn-prototype',
  enforce: 'pre',
  config: () => ({ server: { fs: { strict: false } } }),
  resolveId(source, importer = '') {
    const from = importer.split('?')[0].replaceAll('\\', '/')
    // Packages come from this checkout: another tree has none of its own.
    if (/^[@a-z]/i.test(source) && !path.isAbsolute(source) && tree !== root) return this.resolve(source, path.join(root, 'index.html'), { skipSelf: true })
    if (from.includes('/prototypes/drawn/')) return null
    if (source === './drawn/painters') return path.join(proto, 'painters.ts')
    if (source.endsWith('/sky/skyBackground') || source.endsWith('/sky/skyBackground.ts')) return path.join(proto, 'skyBase.ts')
    return null
  },
}

const server = await startServer(tree, { plugins: [swap], cacheDir: path.join(tree, '.vite-drawn') })
const browser = await launch()
fs.mkdirSync(outDir, { recursive: true })
try {
  for (const text of moments) {
    const moment = { ...parseMoment(text), style: 'drawn' }
    const { context, page } = await openPage(browser, server.url, dpr, { treeRoot: tree })
    page.on('pageerror', (err) => console.error('page:', err.message))
    page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[proto]')) console.error(m.text()) })
    await loadScene(page, sceneUrl(server.url, { ...moment, overlay: true, paint: 'main' }))
    const file = path.join(outDir, `${momentName(moment)}.png`)
    fs.writeFileSync(file, await page.screenshot({ clip: CLIP }))
    console.log('saved', file)
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
