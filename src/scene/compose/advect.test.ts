import { describe, expect, it } from 'vitest'
import { layCarried } from './advect'

/** A context that records each band's draw (source x, y, w, h → dest x, y, w, h) and the transform it was laid under. */
function recorder() {
  const draws: { src: number[]; dest: number[]; at: number; flip: boolean }[] = []
  let at = 0, flip = false
  const ctx = {
    save() {}, restore() { at = 0; flip = false },
    translate(x: number) { at = x }, scale(x: number) { flip = x < 0 },
    drawImage(_: unknown, ...n: number[]) { draws.push({ src: n.slice(0, 4), dest: n.slice(4), at, flip }) },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, draws }
}

const rect = { x: 0, y: 0, w: 200, h: 40 }
const advect = { from: 0, bands: [{ y: 0, speed: 2 }, { y: 10, speed: -1 }] }

describe('a carried layer laid', () => {
  it('shifts each band by its own speed, device px', () => {
    const { ctx, draws } = recorder()
    layCarried(ctx, {} as CanvasImageSource, rect, 0, advect, 3, 2)
    const bands = draws.filter((d) => !d.flip)
    expect(bands.map((d) => d.src)).toEqual([[0, 0, 200, 20], [0, 20, 200, 20]])
    expect(bands.map((d) => d.dest[0])).toEqual([12, -6])
  })

  it('fills the edge each band left with its own edge mirrored', () => {
    const { ctx, draws } = recorder()
    layCarried(ctx, {} as CanvasImageSource, rect, 0, advect, 3, 2)
    const fills = draws.filter((d) => d.flip)
    // Moving right, the first band's left 12 px mirrored about its new left edge; moving left, the second band's right 6 px.
    expect(fills[0]).toMatchObject({ src: [0, 0, 12, 20], dest: [0, 0, 12, 20], at: 12 })
    expect(fills[1]).toMatchObject({ src: [194, 20, 6, 20], dest: [-6, 20, 6, 20], at: 194 })
  })

  it('lays the canvas whole when nothing has moved yet', () => {
    const { ctx, draws } = recorder()
    layCarried(ctx, {} as CanvasImageSource, rect, 0, advect, 0, 2)
    expect(draws.every((d) => !d.flip && d.dest[0] === 0)).toBe(true)
  })
})
