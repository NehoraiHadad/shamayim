import { seeded } from '../../../../data/landmarks/hash'
import { PARAPET } from '../../../../data/landmarks/settlement'
import type { House } from '../../../../data/landmarks/settlement'

/**
 * A depth row of the city away from the dot, merged into a handful of paths (plan §4): the blocks' bodies, their
 * sun-side faces, the lit parapet edges, day panes and night lights. Five nodes per row instead of ~20 per block,
 * so the whole fabric stays inside the phone's SVG budget while the hour scrubs.
 */
export interface MassPaths { body: string; faces: string; roofs: string; panes: string; lights: string }

interface Light {
  /** The sun's side for the whole row, or null when the row stands in shade or it is night (no lit faces). */
  sunWest: boolean | null
  night: boolean
  litShare: number
  /** The back row: a silhouette toned toward the far ridge, no day panes, sparse lights. */
  back: boolean
  roof?: 'flat' | 'pitched'
  neighbour?: { blocks: ReadonlySet<House> }
}

const PANE_W = .9
const PANE_H = 1.1
const PANE_PITCH = 1.9
/** Window rows closer than this merge: below ~2.4 px a storey's panes would touch the next storey's. */
const ROW_PITCH = 2.4
const n = (value: number) => value.toFixed(1)
const box = (x: number, y: number, w: number, h: number) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`

/** The pane grid of one block: columns at the sun-face inset, rows at the storey pitch (grouped when tighter). */
function paneGrid({ x, w, h, baseY }: House) {
  const side = Math.min(2.2, w * .3)
  const left = x - w / 2 + side + .7
  const columns = Math.max(1, Math.floor((x + w / 2 - .6 - left) / PANE_PITCH))
  const rows = Math.max(1, Math.floor((h - PARAPET) / ROW_PITCH))
  const pitch = (h - PARAPET) / rows
  const cells: [number, number][] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) cells.push([left + column * PANE_PITCH, baseY - (row + 1) * pitch + .7])
  }
  return cells
}

export function massPaths(houses: House[], { sunWest, night, litShare, back, roof = 'flat', neighbour }: Light): MassPaths {
  const parts = { body: [] as string[], faces: [] as string[], roofs: [] as string[], panes: [] as string[], lights: [] as string[] }
  /** Day: about a fifth of the panes read as wall (curtains, shutters). Night: half the lit share, a quarter at the back. */
  const lightShare = litShare * (back ? .25 : .5)
  for (const house of houses) {
    const { x, w, h, baseY, seed } = house
    const left = x - w / 2
    const wall = roof === 'pitched' ? h * .55 : h
    const eave = baseY - wall
    parts.body.push(box(left, eave, w, wall))
    parts.roofs.push(roof === 'pitched'
      ? `M${n(left)} ${n(eave)}L${n(x)} ${n(baseY - h)}L${n(left + w)} ${n(eave)}z`
      : box(left, eave - .6, w, .6))
    if (sunWest !== null && !night && !(neighbour && back)) {
      const side = Math.min(2.2, w * .3)
      parts.faces.push(box(sunWest ? left : x + w / 2 - side, eave, side, wall))
    }
    const random = seeded(seed)
    if (night && (neighbour || roof === 'pitched')) {
      if (random() < lightShare) parts.lights.push(box(x - PANE_W / 2, baseY - (wall + PANE_H) / 2, PANE_W, PANE_H))
      continue
    }
    if (!night && (back || roof === 'pitched' || (neighbour && !neighbour.blocks.has(house)))) continue
    for (const [px, py] of paneGrid(house)) {
      const roll = random()
      if (night ? roll < lightShare : roll >= .2) (night ? parts.lights : parts.panes).push(box(px, py, PANE_W, PANE_H))
    }
  }
  return { body: parts.body.join(''), faces: parts.faces.join(''), roofs: parts.roofs.join(''),
    panes: parts.panes.join(''), lights: parts.lights.join('') }
}
