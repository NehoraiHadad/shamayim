// The trees the identity check compares, each served by its own dev server, and one unit of it: the same still shot from
// base, head and, as a control, base and head again (each a fresh context) and compared exactly.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { compareExactly } from './exactCompare.mjs'
import { CLIP, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'
import { assertPaintedBy, paintedBy, prepare, WrongShot } from './identityPage.mjs'
import { supportedStyles } from './sceneHand.mjs'

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

/** The styles a served tree's page supports, read on an empty page of its origin (once more if the cold server failed it). */
export async function stylesOf(browser, tree, attempts = 2) {
  const { context, page } = await openPage(browser, tree.url, 1, { treeRoot: tree.root })
  try {
    await page.route('**/empty', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }))
    await page.goto(`${tree.url}/empty`)
    return await supportedStyles(page, tree.root)
  } catch (err) {
    if (attempts < 2) throw err
  } finally {
    await context.close()
  }
  return stylesOf(browser, tree, attempts - 1)
}

/**
 * The styles to compare: the ones asked for, which both trees must have, or all that both have; `lone`, the ones only one
 * tree has (`{ base, head }`).
 */
export function chosenStyles(have, asked) {
  for (const [tree, ids] of Object.entries(have)) {
    const unknown = asked.filter((id) => !ids.includes(id))
    if (unknown.length) throw new Error(`--styles: ${tree} has no style ${unknown.join(', ')} (it has ${ids.join(', ') || 'none'})`)
  }
  const both = have.base.filter((id) => have.head.includes(id))
  if (!both.length) throw new Error(`no style in common: base has ${have.base.join(', ')}, head has ${have.head.join(', ')}`)
  const lone = (ids) => ids.filter((id) => !both.includes(id))
  return { styles: asked.length ? asked : both, lone: { base: lone(have.base), head: lone(have.head) } }
}

/**
 * One load of a unit in a fresh context: its PNGs (one a backdrop) and the ids of the layers composited. A request of the
 * tree's own that fails is an error (the scene may have been drawn without it), and so is another paint path or style than
 * the unit's.
 */
async function load(browser, tree, unit, dpr) {
  const { context, page } = await openPage(browser, tree.url, dpr, { treeRoot: tree.root })
  try {
    const lost = []
    const own = (url) => new URL(url).host === new URL(tree.url).host
    page.on('requestfailed', (request) => { if (own(request.url())) lost.push(request.url()) })
    page.on('response', (response) => { if (own(response.url()) && response.status() >= 500) lost.push(response.url()) })
    page.setDefaultNavigationTimeout(LOAD_TIMEOUT)
    await page.addInitScript(prepare)
    await loadScene(page, sceneUrl(tree.url, { ...unit.moment, style: unit.style, paint: unit.paint,
      hide: unit.hide ?? unit.moment.hide }), LOAD_TIMEOUT, 0)
    await page.evaluate(() => window.__scene.settled())
    const pngs = []
    for (const grey of unit.alone ? BACKDROPS : [null]) {
      if (grey !== null) await page.evaluate((g) => { document.body.style.background = `rgb(${g}, ${g}, ${g})` }, grey)
      pngs.push(await page.screenshot({ clip: CLIP }))
    }
    if (lost.length) throw new Error(`${lost.length} of the tree's own requests failed: ${lost[0]}`)
    const seen = await paintedBy(page)
    assertPaintedBy(unit, seen)
    return { pngs, ids: seen.ids }
  } finally {
    await context.close()
  }
}

/** `load`, once more in another fresh context if the first one failed to load (counted in the report); a wrong shot is not. */
export async function shoot(browser, tree, unit, dpr) {
  try {
    return { ...await load(browser, tree, unit, dpr), retries: 0 }
  } catch (first) {
    if (first instanceof WrongShot) throw first
    console.log(`retry    ${tree.name} ${unit.name}: ${String(first.message).split('\n')[0]}`)
    return { ...await load(browser, tree, unit, dpr), retries: 1 }
  }
}

/**
 * The verdict of a unit's four shots. `same`: all equal. `unstable`: the base differs from itself (`firstDiffer`: and the
 * first loads differ too; some head load differs from some base load either way). `DIFF`: a stable base, and a head that is
 * not it.
 */
export function verdictOf(pairs) {
  if (pairs['base1/base2'].pixels) return { verdict: 'unstable', firstDiffer: pairs['base1/head1'].pixels > 0 }
  return { verdict: Object.values(pairs).some((pair) => pair.pixels) ? 'DIFF' : 'same', firstDiffer: pairs['base1/head1'].pixels > 0 }
}

/**
 * Shoots and compares one unit in `comparer` (a blank page). Without `unit.control` it is shot again only when the first
 * loads differ; otherwise it is `equal` (one load of each tree, no control), or `empty` where neither shows anything.
 */
export async function judge(browser, comparer, { base, head }, unit, dpr) {
  const started = Date.now()
  const shots = { base1: await shoot(browser, base, unit, dpr), head1: await shoot(browser, head, unit, dpr) }
  const pngs = () => Object.fromEntries(Object.entries(shots).map(([name, shot]) => [name, shot.pngs]))
  let compared = await compareExactly(comparer, pngs(), [PAIRS[0]], BACKDROPS)
  let verdict = { verdict: compared.empty.base1 ? 'empty' : 'equal', firstDiffer: false }
  if (unit.control || compared.pairs['base1/head1'].pixels) {
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
