// The trees the identity check compares, each served by its own dev server, and one unit of it: the same still shot from
// base, head, base again, head again (each a fresh context) and compared exactly.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { compareExactly } from './exactCompare.mjs'
import { CLIP, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

/** Grey levels of the page behind a layer alone: over black and over white its colour and its alpha both show. */
const BACKDROPS = [0, 255]
const LOAD_TIMEOUT = 120_000
export const PAIRS = [['base1', 'head1'], ['base1', 'base2'], ['head1', 'head2'], ['base1', 'head2'], ['base2', 'head1'],
  ['base2', 'head2']]

function commitOf(dir) {
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  try {
    const own = path.relative(fs.realpathSync.native(git('rev-parse', '--show-toplevel')), fs.realpathSync.native(dir)) === ''
    if (!own) return 'not a checkout'
    return git('rev-parse', 'HEAD') + (git('status', '--porcelain') ? ' + local changes' : '')
  } catch { return 'not a checkout' }
}

/**
 * Serves the tree at `dir` from its own sources and Vite config. Its dependency cache is its own (`cacheDir`) even where
 * two trees share one `node_modules`, whose fonts are allowed wherever it lies; nothing reloads a page mid-shot.
 */
export async function serveTree(name, dir, cacheDir) {
  const root = fs.realpathSync.native(dir)
  const vite = fs.realpathSync.native(createRequire(path.join(root, 'package.json')).resolve('vite/package.json'))
  const server = await startServer(root, { cacheDir: path.join(cacheDir, name),
    server: { hmr: false, watch: null, fs: { allow: [root, path.resolve(vite, '../..')] } } })
  return { name, root, commit: commitOf(root), ...server }
}

/** One load of a unit in a fresh context: its PNGs (one a backdrop) and the ids of the layers composited. */
async function load(browser, tree, unit, dpr) {
  const { context, page } = await openPage(browser, tree.url, dpr, { treeRoot: tree.root })
  try {
    await page.addInitScript(() => { window.__trackSceneShown = true })
    await loadScene(page, sceneUrl(tree.url, { ...unit.moment, style: unit.style, paint: unit.paint,
      overlay: unit.overlay ?? false, hide: unit.hide ?? unit.moment.hide }), LOAD_TIMEOUT, 0)
    const pngs = []
    for (const grey of unit.alone ? BACKDROPS : [null]) {
      if (grey !== null) await page.evaluate((g) => { document.body.style.background = `rgb(${g}, ${g}, ${g})` }, grey)
      pngs.push(await page.screenshot({ clip: CLIP }))
    }
    return { pngs, ids: await page.evaluate(() => Object.keys(window.__sceneStats.shown)) }
  } finally {
    await context.close()
  }
}

/** `load`, once more in another fresh context if the first one failed to load (counted in the report). */
export async function shoot(browser, tree, unit, dpr) {
  try {
    return { ...await load(browser, tree, unit, dpr), retries: 0 }
  } catch (first) {
    console.log(`retry    ${tree.name} ${unit.name}: ${String(first.message).split('\n')[0]}`)
    return { ...await load(browser, tree, unit, dpr), retries: 1 }
  }
}

/**
 * The verdict of a unit's pairs. `same`: all four shots equal. `unstable`: the base differs from itself (`firstDiffer`:
 * and the first loads differ too). `DIFF`: a stable base, and a head that is not it.
 */
export function verdictOf(pairs) {
  if (pairs['base1/base2'].pixels) return { verdict: 'unstable', firstDiffer: pairs['base1/head1'].pixels > 0 }
  return { verdict: Object.values(pairs).some((pair) => pair.pixels) ? 'DIFF' : 'same', firstDiffer: pairs['base1/head1'].pixels > 0 }
}

/**
 * Shoots and compares one unit in `comparer` (a blank page). A layer alone that shows nothing in either tree's first load
 * is `empty` and not shot again.
 */
export async function judge(browser, comparer, { base, head }, unit, dpr) {
  const started = Date.now()
  const shots = { base1: await shoot(browser, base, unit, dpr), head1: await shoot(browser, head, unit, dpr) }
  const pngs = () => Object.fromEntries(Object.entries(shots).map(([name, shot]) => [name, shot.pngs]))
  let compared, verdict = { verdict: 'empty', firstDiffer: false }
  if (unit.alone) compared = await compareExactly(comparer, pngs(), [PAIRS[0]], BACKDROPS)
  if (!(compared?.empty.base1 && compared.empty.head1)) {
    shots.base2 = await shoot(browser, base, unit, dpr)
    shots.head2 = await shoot(browser, head, unit, dpr)
    compared = await compareExactly(comparer, pngs(), PAIRS, BACKDROPS)
    verdict = verdictOf(compared.pairs)
  }
  const each = (of) => Object.fromEntries(Object.entries(shots).map(([name, shot]) => [name, of(shot)]))
  return { ...verdict, pairs: compared.pairs, shots: pngs(), ids: each((shot) => shot.ids),
    sha256: each((shot) => shot.pngs.map((png) => createHash('sha256').update(png).digest('hex'))),
    retries: Object.values(shots).reduce((sum, shot) => sum + shot.retries, 0), seconds: (Date.now() - started) / 1000 }
}
