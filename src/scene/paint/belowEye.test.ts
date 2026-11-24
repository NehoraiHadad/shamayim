import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../world/types'
import { carriedSheet } from '../model/advect'
import { skyBelowEye } from '../model/crest'
import type { SkyGeom } from '../model/skyGeom'
import type { LayerOf, SceneBox } from '../model/types'
import { paintDrawnSheet } from './drawn/cloudSheet'
import { paintCloudSheet } from './real/cloudSheet'
import type { Ctx2D, PaintEnv } from './shared/base/hand'
import { paintRows } from './shared/sky/skyRows'

/** What is in the sky at eye level goes on, as it is there, down to the far horizon: no jump at eye level, nothing where there is no dip. */
const BELOW = 10
const at = (crest: number) => skyBelowEye({
  terrain: { status: 'ready', near: { points: [[0, 60], [375, crest]] }, far: { points: [] } },
  place3: { kind: 'unknown' }, relief: { horizonY: 100 },
} as unknown as WorldState, { width: 375, skyHeight: 428, landTop: 230, landHeight: 128, dpr: 2 } as SceneBox,
{ left: 0, s: 1, width: 375, horizon: 330 } as SkyGeom)

const sheet = (alpha: number): LayerOf<'cloudSheet'> => ({
  kind: 'cloudSheet', id: 'cloudSheet.low', surface: 'sky', z: 8, lattice: 'low', genus: 'st', speeds: [1, 1, 1, 1],
  xs: [-10, 190, 390], ys: [0, 200, 300, 330], alpha: [alpha, alpha, 1, 1].flatMap((a) => [a, a, a]),
  tone: Array.from({ length: 12 }, (_, i) => i / 11),
  body: [0.6, 0.6, 0.6], shade: [0.3, 0.3, 0.3], lit: [1, 1, 1], bounds: { x: 0, y: 0, w: 380, h: 330 }, key: 's',
} as unknown as LayerOf<'cloudSheet'>)

interface Texels { data: Uint8ClampedArray; width: number; height: number }

function painted(paint: (ctx: Ctx2D, desc: LayerOf<'cloudSheet'>, env: PaintEnv) => void, desc: LayerOf<'cloudSheet'>) {
  const draws: number[][] = [], rasters: Texels[] = []
  const scratch = {
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: (image: Texels) => { rasters.push(image) },
  }
  const ctx = { save() {}, restore() {}, globalAlpha: 1, drawImage: (_: unknown, ...args: number[]) => draws.push(args) } as unknown as Ctx2D
  paint(ctx, desc, { hand: { grain: 1 }, phase: 0, scale: 1, canvas: () => ({ canvas: {}, ctx: scratch }) } as unknown as PaintEnv)
  return { draw: draws[0], raster: rasters[0] }
}

describe('the sky below eye level', () => {
  it('is what the land leaves open under eye level, and nothing where it stands up to it', () => {
    expect(at(110)).toBe(BELOW)
    expect(at(100.2)).toBe(0)
    expect(at(90)).toBe(0)
  })

  it('is not there without a dip: the sheet stays the same object', () => {
    const still = { ...sheet(0.5), speeds: [0, 0, 0, 0] }
    expect(carriedSheet(still, 0, 0)).toBe(still)
    expect(carriedSheet(still, 0, BELOW).bounds.h).toBe(330 + BELOW)
    const bands = carriedSheet(sheet(0.5), 0, BELOW).animated!.advect!.bands
    expect(bands[bands.length - 1].y).toBeGreaterThanOrEqual(330)
  })

  it.each([['real', paintCloudSheet], ['drawn', paintDrawnSheet]] as const)('a %s sheet carries its eye-level row down, the rest as without it', (_, paint) => {
    const level = painted(paint, sheet(0.9)), dipped = painted(paint, carriedSheet(sheet(0.9), 0, BELOW))
    const { width, height, data } = dipped.raster, row = (j: number) => Array.from(data.slice(j * width * 4, (j + 1) * width * 4))
    expect(width).toBe(level.raster.width)
    expect(Array.from(data.slice(0, level.raster.data.length))).toEqual(Array.from(level.raster.data))
    for (let j = level.raster.height; j < height; j++) expect(row(j)).toEqual(row(level.raster.height - 1))
    // The same px per raster row, and down to the far horizon.
    expect(dipped.draw[7] / dipped.draw[3]).toBeCloseTo(level.draw[7] / level.draw[3], 9)
    expect(dipped.draw[5] + dipped.draw[7]).toBeGreaterThanOrEqual(330 + BELOW)
  })

  it('the haze band keeps its eye-level strength down to there', () => {
    const rows = (below?: number) => {
      let image: Texels | null = null
      const ctx = { canvas: { width: 1, height: 400 }, getTransform: () => ({ e: 0, f: 0 }),
        createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
        putImageData: (given: Texels) => { image = { ...given, data: given.data.slice() } } } as unknown as Ctx2D
      paintRows(ctx, { bounds: { x: 0, y: 0, w: 1, h: 400 }, stops: [[0, [0, 0, 0]], [1, [0, 0, 0]]], glow: [], arch: null,
        band: { y: 330, h: 44, rgb: [1, 1, 1], alpha: 0.8, ...(below && { below }) } } as unknown as LayerOf<'sky'>, { scale: 1 } as PaintEnv)
      return Array.from({ length: 400 }, (_, j) => image!.data[j * 4])
    }
    const level = rows(), dipped = rows(BELOW)
    expect(dipped.slice(0, 330)).toEqual(level.slice(0, 330))
    for (let y = 330; y < 330 + BELOW; y++) expect(dipped[y]).toBe(dipped[330])
    expect(Math.abs(dipped[330] - dipped[329])).toBeLessThan(8)
    expect(level[335]).toBeLessThan(level[330] - 20)
  })
})
