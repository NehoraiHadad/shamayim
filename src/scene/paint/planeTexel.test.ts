import { expect, it } from 'vitest'
import { TEXEL } from '../model/planeBands'
import type { PlaneLitField, PlanePalette, Pt } from '../model/types'
import type { Ctx2D, Scratch } from './hand'
import { HAND } from './hand'
import { paintLitSurface, preparePlaneTexels, samplePlaneTexel } from './planeTexel'

it('paints identical solar endpoints where direct visibility is zero and removes beam in lit texels', () => {
  const bounds = { x: 0, y: 0, w: 36, h: 12 }
  const outline: Pt[] = [[0, 0], [36, 0], [36, 12], [0, 12]]
  const surface: PlanePalette = { palette: [[0.65, 0.3, 0.2]], cols: 1, rows: 1, cells: [0], source: 'test' }
  const light: PlaneLitField = {
    cols: 3, rows: 1, grid: new Uint8Array([0, 110, 205, 42, 0, 110, 205, 42, 255, 110, 205, 42]),
    eSun: [1.7, 1.2, 0.8], eMoon: [0.15, 0.15, 0.3], eSky: [0.2, 0.3, 0.4], hazeLin: [0.2, 0.25, 0.3], yHorizon: 0.48,
  }
  let source: Uint8ClampedArray
  const canvas = (width: number, height: number) => ({ canvas: {}, ctx: {
    createImageData: () => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: ({ data }: ImageData) => { source = data },
  } }) as unknown as Scratch
  const beam: number[] = [], shade: number[] = []
  const target = (stamped: number[]) => ({ drawImage: () => stamped.push(...source), fillRect: () => {} }) as unknown as Ctx2D
  paintLitSurface(target(beam), outline, bounds, surface, light, 'test', 0, 1,
    { hand: HAND, phase: 0, scale: 1, canvas, shade: target(shade) })

  const t = preparePlaneTexels(outline, bounds, surface, light, 1, 0)
  for (let j = 0; j < t.hPx; j++) for (let i = 0; i < t.wPx; i++) {
    const o = (j * t.wPx + i) * 4
    const lit = samplePlaneTexel(t, i, (i + 0.5) * TEXEL, (j + 0.5) * TEXEL).sVis
    expect(shade[o + 3]).toBe(beam[o + 3])
    if (lit) expect(shade[o]).toBeLessThan(beam[o])
    else expect(shade.slice(o, o + 4)).toEqual(beam.slice(o, o + 4))
  }
})
