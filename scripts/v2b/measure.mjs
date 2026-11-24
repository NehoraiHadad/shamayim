// V2b: what each still's drawn houses are worth against the real footprints.
//   node scripts/v2b/measure.mjs <stillsDir> <footprintsDir> <place> …
// plan: share of real houses with a drawn one within 25 / 60 m of true place, and of drawn ones with a real one within 25 m;
// rows: real rows of 5+ with 3+ drawn houses within 12 m of the row's line, over 60 % of its length; rings: how the houses
// spread by distance from the settlement's middle (correlation of 40 m rings); seen: drawn houses not mostly hidden.
import fs from 'node:fs'
import { rowsOf } from '../../src/dev/v2b/rows.ts'

const [stills, data, ...places] = process.argv.slice(2)
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])
const share = (list, test) => list.length ? Math.round(1000 * list.filter(test).length / list.length) / 10 : null

function alongLine(line, p) {
  let best = Infinity, at = 0, run = 0
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]], len = dist(a, b)
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / Math.max(1e-9, len * len)))
    const d = dist(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    if (d < best) { best = d; at = run + t * len }
    run += len
  }
  return { d: best, at, length: run }
}

function rowsFound(real, drawn) {
  const lines = rowsOf(real.map(([dx, dy]) => ({ dx, dy }))).filter(r => r.at.length >= 5).map(r => r.at.map(i => real[i]))
  const found = lines.filter(line => {
    const on = drawn.map(p => alongLine(line, p)).filter(h => h.d <= .012)
    const ats = on.map(h => h.at)
    return on.length >= 3 && Math.max(...ats) - Math.min(...ats) >= .6 * on[0].length
  })
  return { rows: lines.length, found: found.length }
}

function ringMatch(real, drawn) {
  const mid = [0, 1].map(k => real.reduce((s, p) => s + p[k], 0) / real.length)
  const rings = (list) => {
    const bins = new Array(18).fill(0)
    for (const p of list) { const b = Math.floor(dist(p, mid) / .04); if (b < 18) bins[b]++ }
    return bins.map((n, i) => n / (2 * i + 1) / list.length)
  }
  const a = rings(real), b = rings(drawn)
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length, ma = mean(a), mb = mean(b)
  const cov = a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0)
  const r = cov / Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, x) => s + (x - mb) ** 2, 0))
  return Math.round(100 * r) / 100
}

/** Drawn boxes back to front on a 0.25 px grid: the share of each still seen. */
function seen(houses) {
  const owner = new Map()
  const px = houses.map(([, , x, foot, w, h], i) => ({ i, x, foot, w, h })).sort((a, b) => a.foot - b.foot)
  const all = new Map()
  for (const { i, x, foot, w, h } of px) for (let u = Math.round((x - w / 2) * 4); u < Math.round((x + w / 2) * 4); u++)
    for (let v = Math.round((foot - h - 1.5) * 4); v < Math.round(foot * 4); v++) { owner.set(`${u}:${v}`, i); all.set(i, (all.get(i) ?? 0) + 1) }
  const left = new Map()
  for (const i of owner.values()) left.set(i, (left.get(i) ?? 0) + 1)
  return houses.filter((_, i) => (left.get(i) ?? 0) >= .35 * (all.get(i) ?? 1)).length
}

for (const place of places) {
  const real = read(`${data}/${place}.json`).map(([x, y]) => [x / 1000, y / 1000])
  for (const mode of ['today', 'a', 'b']) {
    const { houses } = read(`${stills}/${place}-${mode}.json`)
    const drawn = houses.map(([dx, dy]) => [dx, dy])
    const span = (k) => [Math.min(...houses.map(h => h[k])), Math.max(...houses.map(h => h[k]))].map(v => Math.round(v * 10) / 10)
    console.log(JSON.stringify({ place, mode, real: real.length, drawn: drawn.length, seen: seen(houses),
      real25: share(real, p => drawn.some(q => dist(p, q) <= .025)), real60: share(real, p => drawn.some(q => dist(p, q) <= .06)),
      drawn25: share(drawn, p => real.some(q => dist(p, q) <= .025)), drawn60: share(drawn, p => real.some(q => dist(p, q) <= .06)),
      ...rowsFound(real, drawn), ringCorrelation: ringMatch(real, drawn), x: span(2), foot: span(3) }))
  }
}
