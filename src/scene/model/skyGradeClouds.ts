import type { WorldState } from '../../world/types'
import { cloudLayersForSky } from './cloudLayers'
import { towerOpacity } from './cloudSprite'
import { rowValues } from './rowValues'
import { skyStops, stopAt } from './skyColour'
import { mixSrgb } from './tone'
import type { LayerOf, RGB, SceneBox } from './types'

type RowCloud = { rows: readonly number[]; alphaAt: (y: number) => number; bright: RGB }
const brightest = ({ body, shade, lit }: { body: RGB; shade: RGB; lit: RGB }): RGB =>
  [Math.max(body[0], shade[0], lit[0]), Math.max(body[1], shade[1], lit[1]), Math.max(body[2], shade[2], lit[2])]

function sheetRows(sheet: LayerOf<'cloudSheet'>, bottom: number): RowCloud {
  const { xs, ys, alpha, through } = sheet
  const maxima: number[] = []
  for (const [row, y] of ys.entries()) {
    const start = row * xs.length
    let opacity = 0
    for (let i = start; i < start + xs.length; i++) opacity = Math.max(opacity, alpha[i])
    maxima.push(opacity * (through?.[row] ?? 1))
    // Keep one row beyond the ink for interpolation at its lower edge.
    if (y >= bottom) break
  }
  const rows = ys.slice(0, maxima.length)
  return { rows, alphaAt: rowValues(rows, maxima), bright: brightest(sheet) }
}

function towerRows({ sprite, y }: LayerOf<'cloudCells'>['cells'][number]): RowCloud {
  // The crown enters the ink area at zero coverage and reaches its body
  // opacity halfway down the column, then tapers through the underside.
  const rows = [y - sprite.tall, y - sprite.tall / 2, y, y + sprite.under]
  const alpha = towerOpacity(sprite)
  return { rows, alphaAt: rowValues(rows, [0, alpha, alpha, 0]), bright: brightest(sprite) }
}

/** Style-independent upper swatches, composited in the same far-to-near order as the cloud stack. */
export function inkSkySamples(world: WorldState, box: SceneBox, bottom: number): [number, RGB][] {
  const stops = skyStops(world, box)
  const clouds = [...cloudLayersForSky(world, box)].sort((a, b) => a.z - b.z).flatMap(layer => layer.kind === 'cloudSheet'
    ? [sheetRows(layer, bottom)] : layer.cells.map(towerRows))
  const rows = new Set([0, bottom, ...stops.map(([at]) => at * box.skyHeight),
    ...clouds.flatMap(cloud => cloud.rows)])
  return [...rows].filter(y => y >= 0 && y <= bottom).sort((a, b) => a - b).map(y => {
    let rgb = stopAt(stops, y / box.skyHeight, mixSrgb)
    for (const { alphaAt, bright } of clouds) {
      const over = mixSrgb(rgb, bright, alphaAt(y))
      // Include clear gaps and bound overlaps whose exact x changes with drift.
      rgb = [Math.max(rgb[0], over[0]), Math.max(rgb[1], over[1]), Math.max(rgb[2], over[2])]
    }
    return [y, rgb]
  })
}
