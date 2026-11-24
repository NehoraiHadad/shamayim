import { expect, it } from 'vitest'
import { cellAt, CELLS, ELEVATIONS, geom, silhouette, worldOf } from '../../test/loneCell'
import { cloudSheetOf } from './cloudSheet'
import { sheetAlphaAt } from './cloudSheetGrid'
import type { LayerOf } from './types'

const neutral = { body: [1, 1, 1], shade: [0.5, 0.5, 0.5], lit: [1, 1, 1], light: 0 } as const
const STEPS = [-2, -1, 0, 1, 2]

/** The painted widths (px) of a lone cloud at half its opacity, half a pixel a row, top to bottom. */
function widths(sheet: LayerOf<'cloudSheet'>) {
  const rows = []
  for (let y = 0; y < sheet.bounds.h; y += 0.5) {
    let count = 0
    for (let x = 0.25; x < sheet.bounds.w; x += 0.5) count += Number(sheetAlphaAt(sheet, x, y) >= 0.5)
    if (count) rows.push(count / 2)
  }
  return rows
}

/** A lone cell as it is painted. Less than a quarter as wide as its widest, a row is a lobe's tip (an oval loses a thirtieth). */
function painted(id: string, genus: 'ac' | 'cu', heightKm: number, r: number, vKm: number, elevation: number, azimuth: number) {
  const rows = widths(cloudSheetOf(worldOf(id), geom, cellAt(genus, heightKm, r, vKm, elevation, azimuth), neutral)!)
  const widest = Math.max(...rows)
  return { ...silhouette(rows, 0.5), aspect: silhouette(rows.filter((wide) => wide >= widest / 4), 0.5).aspect }
}

it.each(CELLS)('draws a lone %s cell as wide as it is tall, on a broad foot', (genus, heightKm, r, vKm) => {
  for (const elevation of ELEVATIONS) {
    // Round the sky of several places, as each has its own lobes, and over a row's span (5°), as a rim is drawn on the rows.
    const shapes = ['a', 'b', 'c'].flatMap((id) => [150, 180, 210].flatMap((azimuth) => STEPS.map((step) =>
      painted(id, genus, heightKm, r, vKm, elevation + step, azimuth))))
    const mean = (of: (shape: (typeof shapes)[number]) => number) => shapes.reduce((sum, shape) => sum + of(shape), 0) / shapes.length
    const aspect = mean((shape) => shape.aspect), foot = mean((shape) => shape.foot)
    const flare = Math.max(...shapes.map((shape) => shape.flare))
    console.info('PAINTED', genus, elevation, { aspect, foot, flare })
    // Not one of them a vase.
    expect.soft(flare, `${genus} ${elevation}`).toBeLessThanOrEqual(0.1)
    expect.soft(aspect, `${genus} ${elevation}`).toBeLessThanOrEqual(1.1)
    // An oval is .71 of its width there: no cone, no drop hanging from its tip.
    expect.soft(foot, `${genus} ${elevation}`).toBeGreaterThanOrEqual(0.6)
  }
}, 60_000)
