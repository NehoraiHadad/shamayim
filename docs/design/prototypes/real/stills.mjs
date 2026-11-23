// Concept stills of the real style (750×856, as CI's): node --experimental-strip-types docs/design/prototypes/real/stills.mjs
//   <outDir> <place>@<HH:MM>[@<weather>] … [--only=plane,canopy] [--base] [--tree=<worktree>] [--url=<a dev server's>]
// `--base`: today's painters on the same page. `--tree`: the tree whose model is drawn (the prototype is copied into it).
import fs from 'node:fs'
import path from 'node:path'
import { CLIP, launch, loadScene, openPage, root, sceneUrl, startServer } from '../../../../e2e/harness.mjs'
import { momentName, parseMoment } from '../../../../e2e/moments.mjs'

const HERE = 'docs/design/prototypes/real'
const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const [outDir, ...moments] = args.filter((a) => !a.startsWith('--'))
const tree = path.resolve(flag('tree') ?? root)
if (tree !== root) fs.cpSync(path.join(root, HERE), path.join(tree, HERE), { recursive: true })
fs.mkdirSync(outDir, { recursive: true })
const server = flag('url') ? { url: flag('url'), close() {} } : await startServer(tree, { server: { fs: { strict: false } } })
const browser = await launch()
try {
  for (const text of moments) {
    const moment = parseMoment(text)
    const { context, page } = await openPage(browser, server.url, 2)
    page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('#')) console.log(m.text()) })
    page.on('pageerror', (e) => console.log('pageerror', e.message))
    const url = new URL(sceneUrl(server.url, { ...moment, overlay: true, paint: 'main' }))
    url.pathname = `/${HERE}/index.html`
    const only = args.includes('--base') ? 'none' : flag('only')
    if (only) url.searchParams.set('only', only)
    await loadScene(page, url.href)
    fs.writeFileSync(path.join(outDir, `${momentName(moment)}.png`), await page.screenshot({ clip: CLIP }))
    console.log('saved', momentName(moment))
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
