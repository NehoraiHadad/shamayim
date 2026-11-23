import { smoothstep } from '../../domain/smoothstep'
import type { RGB } from '../model/types'
import { mix } from './hand'

/*
 * How much of a building's drawing the eye resolves at its size on the page. Its small marks (windows, parapet, roof
 * edge) keep their contrast by the storey's height in px; its own lit and shaded sides by the body's width. What is not
 * resolved melts into the wall's mean, so the body keeps its tone, and the unresolved bodies take their light together as
 * one neighbourhood: a mass with a lit flank and a shaded one. Continuous in size: nothing pops as it grows.
 */

/** Storey heights (px) between which the small marks come up, and body widths between which the sides do. */
const STOREY = [0.9, 2] as const, WIDTH = [1.2, 4] as const, HEIGHT = [2.5, 7] as const
/** A neighbourhood's size on the page, px across and up. */
const CELL_X = 11, CELL_Y = 5
/** How far an unresolved body's flank takes the light of its neighbourhood's flank. */
const FLANK = 0.75
/** The softest edge (px) of an unresolved body. */
const SOFT = 0

export const detailOf = (storeyPx: number) => smoothstep(STOREY[0], STOREY[1], storeyPx)
export const sidesOf = (widthPx: number) => smoothstep(WIDTH[0], WIDTH[1], widthPx)
export const risesOf = (heightPx: number) => smoothstep(HEIGHT[0], HEIGHT[1], heightPx)

/** Half the width (px) of a body's edge: none where its detail is drawn. */
export const softEdge = (detail: number, widthPx: number) => Math.min(SOFT * (1 - detail), widthPx * 0.2)

const lattice = (i: number, j: number) => {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Smooth value noise, 0–1, one swell per neighbourhood. */
function swell(x: number, y: number): number {
  const u = x / CELL_X, v = y / CELL_Y
  const i = Math.floor(u), j = Math.floor(v)
  const fu = smoothstep(0, 1, u - i), fv = smoothstep(0, 1, v - j)
  const top = lattice(i, j) * (1 - fu) + lattice(i + 1, j) * fu
  const low = lattice(i, j + 1) * (1 - fu) + lattice(i + 1, j + 1) * fu
  return top * (1 - fv) + low * fv
}

/** The neighbourhood at a point: its shared plaster (0–1), and its flank there (1 faces left, −1 right). */
export function neighbourhood(x: number, y: number) {
  const slope = (swell(x + 2, y) - swell(x - 2, y)) * 2.2
  return { tint: swell(x + 37, y + 11), flank: Math.max(-1, Math.min(1, slope)) }
}

export interface BodyTones { left: RGB; front: RGB; right: RGB }

/** The three faces as the size resolves them: `sides` 0 melts them into their mean, turned by the neighbourhood's flank. */
export function melted(f: BodyTones, faceShare: number, sides: number, flank: number): BodyTones {
  const mean = mix(f.front, mix(f.left, f.right, 0.5), Math.min(1, 2 * faceShare))
  const mass = mix(mean, flank > 0 ? f.left : f.right, FLANK * Math.abs(flank))
  return { left: mix(mass, f.left, sides), front: mix(mass, f.front, sides), right: mix(mass, f.right, sides) }
}
