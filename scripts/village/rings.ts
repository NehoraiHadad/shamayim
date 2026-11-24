// Whether a round settlement's rings can be read at 375 px: what each depth, and a thinning that knows the rings, draws.
// Usage: npx tsx scripts/village/rings.ts <lat> <lon>   (prints tables, and one line of JSON per picture)
import { readFile } from 'node:fs/promises'
import { outsideProject } from '../../src/data/city/outsideView'
import { landCellKey } from '../../src/data/land/grid'
import { HOUSE_M } from '../../src/data/village/cellSource'
import { footprintSettlement } from '../../src/data/village/footprintSource'
import type { FootprintHouse } from '../../src/data/village/settlement'
import { readTile } from '../../src/data/village/tile'
import { drawnCount } from '../../src/world/village/count'
import { villageFrame } from '../../src/world/village/frame'
import { housesOfFootprints } from '../../src/world/village/fromFootprints'

const [lat, lon] = process.argv.slice(2).map(Number), W = 375, BIN_M = 25, HALF_BAND_M = 22, SEEN = .5
const tile = readTile(JSON.parse(await readFile(`public/data/village/il/${landCellKey(lat, lon)}.json`, 'utf8')))!
const found = footprintSettlement(tile, { lat, lon })
if (found?.kind !== 'footprints') throw new Error('No footprints here')
const { spots, rows, group } = found
const inner = spots.filter(s => Math.hypot(s.dx, s.dy) < 1)
const mean = (pick: (s: FootprintHouse) => number) => inner.reduce((sum, s) => sum + pick(s), 0) / inner.length
const middle = { dx: mean(s => s.dx), dy: mean(s => s.dy) }
const radius = (s: { dx: number; dy: number }) => Math.hypot(s.dx - middle.dx, s.dy - middle.dy) * 1000
const turn = (s: { dx: number; dy: number }) => Math.atan2(s.dy - middle.dy, s.dx - middle.dx)

const bins = Array.from({ length: 40 }, (_, i) => spots.filter(s => Math.floor(radius(s) / BIN_M) === i).length)
console.log('middle, km from the place', middle, 'houses', spots.length, 'rows of 5+', rows.filter(r => r.count >= 5).length, 'rings', rows.filter(r => r.ring).length)
console.log('houses by distance from the middle (25 m bins):', bins.join(' '))
const density = bins.map((n, i) => n / ((2 * i + 1) * BIN_M * BIN_M * Math.PI / 1e4))
console.log('houses a hectare:', density.map(d => d.toFixed(1)).join(' '))
// Rings: the bins denser than both of their neighbours' mean by half, at least 12 houses.
const rings = density.flatMap((d, i) => i && bins[i] >= 12 && d > density[i - 1] && d >= density[i + 1] ? [(i + .5) * BIN_M] : [])
console.log('rings, m:', rings)
const ringOf = (s: { dx: number; dy: number }) => rings.findIndex(r => Math.abs(radius(s) - r) <= HALF_BAND_M)

const own = villageFrame(found, { centerX: W / 2 } as never, W)
interface Drawn { x: number; foot: number; w: number; h: number; ring: number }
for (const depthShare of [.16, .25, .33]) {
  const depthPx = own.widthPx * depthShare, count = Math.round(drawnCount(spots.length, own, depthPx))
  const at = (s: { dx: number; dy: number; frontM: number }): Drawn => {
    const { x, near, depth } = outsideProject(own.frame, s.dx, s.dy), px = own.housePx / HOUSE_M * own.frame.midDepth / depth
    return { x, foot: near * depthPx, w: s.frontM * px, h: 5 * px, ring: ringOf(s) }
  }
  const all = (houses: readonly FootprintHouse[]) => housesOfFootprints(houses, [], houses.length)
  const thinned = housesOfFootprints(spots, rows, count).map(at)
  // Ring-aware: the count goes to the rings by their length, evenly by angle; a house is kept only where half of it is seen.
  const around = rings.reduce((sum, r) => sum + r, 0)
  const ringed = rings.flatMap((r, i) => {
    const ring = spots.filter(s => ringOf(s) === i).sort((a, b) => turn(a) - turn(b)), n = Math.min(ring.length, Math.round(count * r / around))
    return all(Array.from({ length: n }, (_, k) => ring[Math.floor(k * ring.length / n)]))
  }).map(at)
  const seen = (houses: Drawn[]) => [...houses].sort((a, b) => b.foot - a.foot).reduce<Drawn[]>((kept, house) => {
    const hidden = kept.reduce((most, near) => {
      const across = Math.max(0, Math.min(near.x + near.w / 2, house.x + house.w / 2) - Math.max(near.x - near.w / 2, house.x - house.w / 2)) / house.w
      const up = Math.max(0, Math.min(1, (house.foot - (near.foot - near.h)) / house.h))
      return Math.max(most, across * up)
    }, 0)
    return hidden <= 1 - SEEN ? [...kept, house] : kept
  }, [])
  for (const [how, drawn] of [['thinned as now', thinned], ['rings only', ringed], ['rings, only those seen', seen(ringed)]] as const) {
    const visible = seen([...drawn])
    console.table(rings.map((r, i) => ({ depthShare, depthPx: depthPx.toFixed(1), how, ring: r, real: spots.filter(s => ringOf(s) === i).length,
      drawn: drawn.filter(d => d.ring === i).length, seen: visible.filter(d => d.ring === i).length,
      acrossPx: i ? ((r - rings[i - 1]) * own.ppm).toFixed(1) : '', deepPx: i ? ((r - rings[i - 1]) / 1000 * depthPx / own.deepKm).toFixed(1) : '',
      houseHighPx: (5 * own.housePx / HOUSE_M).toFixed(1) })))
    console.log(`PICTURE ${JSON.stringify({ how, depthShare, count, width: own.widthPx, extent: group.extentKm, all: drawn.length,
      houses: drawn.map(d => [d.x, d.foot, d.w, d.h, d.ring].map(v => Math.round(v * 10) / 10)) })}`)
  }
}