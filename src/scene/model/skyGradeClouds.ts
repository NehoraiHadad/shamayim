import type { WorldState } from '../../world/types'
import { cloudLayersForSky } from './cloudLayers'
import { brightestCloud, sheetPaintBound, whitened } from './cloudPaintBounds'
import { rowValues } from './rowValues'
import { skyStops, stopAt } from './skyColour'
import { mixSrgb } from './tone'
import { towerPaintProfile } from './towerPaintBounds'
import type { LayerOf, RGB, SceneBox } from './types'

type RowCloud = { rows: readonly number[]; alphaAt: (y: number) => number; bright: RGB }

function sheetRows(sheet: LayerOf<'cloudSheet'>, bottom: number): RowCloud {
  const { xs, ys, alpha, through } = sheet
  const bound = sheetPaintBound(sheet)
  const maxima: number[] = []
  for (const [row, y] of ys.entries()) {
    const start = row * xs.length
    let opacity = 0
    for (let i = start; i < start + xs.length; i++) opacity = Math.max(opacity, alpha[i])
    maxima.push(opacity)
    // Keep one row beyond the ink for interpolation at its lower edge.
    if (y >= bottom) break
  }
  const rows = ys.slice(0, maxima.length)
  const opacityAt = rowValues(rows, maxima)
  const transmissionAt = through ? rowValues(ys, through, 1) : () => 1
  return { rows, alphaAt: y => bound.alpha(opacityAt(y)) * transmissionAt(y), bright: bound.bright }
}

function towerRows({ sprite, y }: LayerOf<'cloudCells'>['cells'][number]): RowCloud[] {
  const profile = towerPaintProfile(sprite)
  return profile ? [{ rows: profile.rows.map(row => y + row), alphaAt: row => profile.alphaAt(row - y),
    bright: brightestCloud({ ...sprite, lit: whitened(sprite.lit) }) }] : []
}

type InkSample = [row: number, clouded: RGB, sky: RGB]

/** Style-independent upper swatches, composited in the same far-to-near order as the cloud stack. */
export function inkSkySamples(world: WorldState, box: SceneBox, bottom: number): InkSample[] {
  const stops = skyStops(world, box)
  const clouds = [...cloudLayersForSky(world, box)].sort((a, b) => a.z - b.z).flatMap(layer => layer.kind === 'cloudSheet'
    ? [sheetRows(layer, bottom)] : layer.cells.flatMap(towerRows))
  const rows = new Set([0, bottom, ...stops.map(([at]) => at * box.skyHeight),
    ...clouds.flatMap(cloud => cloud.rows)])
  return [...rows].filter(y => y >= 0 && y <= bottom).sort((a, b) => a - b).map(y => {
    const sky = stopAt(stops, y / box.skyHeight, mixSrgb)
    let rgb = sky
    for (const { alphaAt, bright } of clouds) {
      const alpha = alphaAt(y)
      if (!alpha) continue
      const over = mixSrgb(rgb, bright, alpha)
      // Include clear gaps and bound overlaps whose exact x changes with drift.
      rgb = [Math.max(rgb[0], over[0]), Math.max(rgb[1], over[1]), Math.max(rgb[2], over[2])]
    }
    return [y, rgb, sky]
  })
}
