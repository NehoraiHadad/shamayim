// Both styles paint the same bytes as a base commit, in the same browser (a refactor's proof):
//   node e2e/styleIdentity.mjs <baseDir> [<outDir>] [options] [moment …]    (moments: `moments.mjs`; default: `stillSet.mjs`)
//     --dpr=2 --styles=real,drawn --paint=worker,main   what is shot
//     --layers=worker     the paint paths whose layers are also shot each alone (`--layers=`: none), with the labels' still
//     --pages=3 --shard=1/1   pages at once; the i-th of n parts of the moments and styles
// `baseDir`: a checkout of the base commit, with its dependencies. Each tree serves its own sources and fixtures; this
// tree's runner shoots both in one Chromium. Only scene.html's URL parameters and window hooks are relied on.
// Writes identity.md, identity.json and the images of what is not the same to `outDir` (test-results/identity).
// Exit 1 on a DIFF, an unstable unit whose first loads differ, or an error.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { launch, root } from './harness.mjs'
import { layerParts } from './identityLayers.mjs'
import { isRed, lineOf, writeImages, writeReport } from './identityReport.mjs'
import { judge, serveTree, shoot } from './identityShoot.mjs'
import { momentName, momentsOnce, parseMoment } from './moments.mjs'
import { STILL_SET } from './stillSet.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const list = (name, fallback) => option(name, fallback).split(',').filter(Boolean)
const [baseDir, ...rest] = args.filter((a) => !a.startsWith('--'))
const outDir = rest.length && !rest[0].includes('@') ? rest.shift() : 'test-results/identity'
const moments = momentsOnce(rest.length ? rest : STILL_SET).map(parseMoment)
const dpr = Number(option('dpr', 2)), pages = Number(option('pages', 3)), shard = option('shard', '1/1')
const [part, parts] = shard.split('/').map(Number)
const styles = list('styles', 'real,drawn'), paints = list('paint', 'worker,main')
const layers = list('layers', 'worker').filter((paint) => paints.includes(paint))
const known = ['dpr', 'styles', 'paint', 'layers', 'pages', 'shard']
const unknown = args.filter((a) => a.startsWith('--') && !known.some((name) => a.startsWith(`--${name}=`)))
const bad = (values, allowed) => !values.length || values.some((v) => !allowed.includes(v))
if (!baseDir || unknown.length || !(dpr > 0) || !(pages >= 1) || !(part >= 1 && part <= parts)
  || bad(styles, ['real', 'drawn']) || bad(paints, ['worker', 'main'])) {
  console.log(`usage: node e2e/styleIdentity.mjs <baseDir> [<outDir>] [--dpr=2] [--styles=real,drawn] [--paint=worker,main]
  [--layers=worker] [--pages=3] [--shard=1/1] [moment …]${unknown.length ? `\nunknown: ${unknown.join(' ')}` : ''}`)
  process.exit(2)
}

const started = Date.now()
const out = path.resolve(root, outDir)
fs.mkdirSync(out, { recursive: true })
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-identity-'))
const browser = await launch()
const trees = {}
const results = []

/** A unit: what is shot (`kind`: the whole clip, the clip with its labels, or a layer alone) of a moment in a style and paint path. */
const unitOf = (moment, style, paint, kind, partName = kind, more = {}) => {
  const row = `${momentName({ ...moment, style })} ${paint}`
  return { moment, style, paint, kind, row, name: `${row} ${partName}`, alone: kind === 'layer', overlay: kind === 'labels', ...more }
}

async function judgeUnit(comparer, unit) {
  const { name, row, kind } = unit
  let result
  try {
    result = { name, row, kind, ...await judge(browser, comparer, trees, unit, dpr) }
    await writeImages(comparer, out, result)
  } catch (err) {
    result = { name, row, kind, verdict: 'ERROR', error: String(err.message).split('\n')[0] }
  }
  delete result.shots
  results.push(result)
  console.log(lineOf(result))
  return result
}

/** Runs the units on `pages` lanes (each shoots one unit's loads in turn); the results in the units' order. */
async function runAll(units) {
  const done = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(pages, units.length) }, async () => {
    const comparer = await (await browser.newContext()).newPage()
    for (let i = next++; i < units.length; i = next++) done[i] = await judgeUnit(comparer, units[i])
    await comparer.context().close()
  }))
  return done
}

try {
  trees.base = await serveTree('base', path.resolve(baseDir), cacheDir)
  trees.head = await serveTree('head', root, cacheDir)
  const shown = moments.flatMap((moment) => styles.map((style) => ({ moment, style }))).filter((_, i) => i % parts === part - 1)
  // Both servers warm (dependencies found and bundled) before the first shot: no load is Vite's first.
  for (const tree of Object.values(trees)) for (const style of styles) for (const paint of paints) {
    await shoot(browser, tree, unitOf(moments[0], style, paint, 'warm-up'), dpr)
  }
  const whole = shown.flatMap(({ moment, style }) => paints.map((paint) => unitOf(moment, style, paint, 'whole')))
  const wholes = await runAll(whole)
  const rows = whole.map((unit, i) => ({ ...unit, ids: [...new Set(Object.values(wholes[i].ids ?? {}).flat())] }))
    .filter(({ paint }) => layers.includes(paint))
  await runAll(rows.flatMap(({ moment, style, paint, ids }) => [unitOf(moment, style, paint, 'labels'),
    ...layerParts(ids, moment.hide).map(({ part: name, hide }) => unitOf(moment, style, paint, 'layer', name, { hide }))]))
  const order = new Map(whole.map(({ row }, i) => [row, i]))
  results.sort((a, b) => order.get(a.row) - order.get(b.row) || (a.kind === b.kind ? a.name.localeCompare(b.name, 'en') : a.kind < b.kind ? 1 : -1))
  writeReport(out, { base: trees.base.commit, head: trees.head.commit, chromium: browser.version(), dpr, pages, shard, styles,
    paints, layers, minutes: (Date.now() - started) / 60000 }, results)
} finally {
  await browser.close()
  for (const tree of Object.values(trees)) await tree.close()
  fs.rmSync(cacheDir, { recursive: true, force: true })
}
process.exitCode = results.some(isRed) || !results.length ? 1 : 0
