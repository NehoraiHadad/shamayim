import type { SceneNote } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import { WATER_ROOF_CLEARANCE } from './portraitMargins'
import { DOT_R, overlaps, VISIBLE_BOTTOM } from './layout'
import type { CoastalSea, OutsideView } from './types'

/**
 * A water name's letters (the note's box less its line's air: Hebrew at the notes' small type stands ~7 px tall, 3 px
 * under the box's top) stay inside its water by this much (px) and above the sheet's edge (`VISIBLE_BOTTOM`).
 */
const GLYPH = { top: 3, bottom: 10 }
const NOTE_INSET = 1

/**
 * The water's names over a place seen from outside (C9 defect 5): **a name is written on its water's surface as drawn**,
 * never in the sky over a thin far edge nor among what the place builds. On its body's own water where the surface shows
 * deep enough under the far shore for the text (along the stretch, nearest its middle first), clear of the place's mass,
 * towers, trees, the towers beyond and the dot; else, for the sea, on the outside view's own coastal sea (its polygon, the
 * same clearances); else unnamed. The datum's note stays as it is.
 */
export function notesOnWater(notes: readonly SceneNote[], terrain: Pick<SceneTerrain, 'water'>, view: Pick<OutsideView, 'skyline' | 'trees' | 'beyond' | 'beyondTowns'> & { sea: CoastalSea | null },
  dot: { x: number; y: number }, width: number): SceneNote[] {
  const scale = width / 375
  const blocks = [...view.skyline.boxes.map((b) => ({ left: b.x - b.w / 2, right: b.x + b.w / 2, top: b.top - WATER_ROOF_CLEARANCE, bottom: b.foot })),
    ...[...view.skyline.towers, ...view.beyond].map((t) => ({ left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.baseY - t.h, bottom: t.baseY })),
    ...view.trees.map((t) => ({ left: t.x - t.w, right: t.x + t.w, top: t.base - t.h, bottom: t.base })),
    ...(view.beyondTowns ?? []).map((b) => ({ left: b.x - b.w / 2, right: b.x + b.w / 2, top: b.baseY - b.h, bottom: b.baseY })),
    { left: dot.x - DOT_R - 1, right: dot.x + DOT_R + 1, top: dot.y - DOT_R - 1, bottom: dot.y + DOT_R + 1 }]
    .map((b) => ({ left: b.left * scale, right: b.right * scale, top: b.top, bottom: b.bottom }))
  const out: SceneNote[] = notes.filter((n) => n.kind !== 'water')
  const clear = (n: SceneNote) => n.top + GLYPH.bottom <= VISIBLE_BOTTOM - 0.5 && n.left >= 4 && n.left + n.width <= width - 4
    && blocks.every((b) => !overlaps({ left: n.left, right: n.left + n.width, top: n.top, bottom: n.top + n.height }, b, 1))
    && out.every((o) => !overlaps({ left: n.left, right: n.left + n.width, top: n.top, bottom: n.top + n.height },
      { left: o.left, right: o.left + o.width, top: o.top, bottom: o.top + o.height }, 1))
  for (const note of notes.filter((n) => n.kind === 'water')) {
    const spans = (terrain.water ?? []).filter((sp) => sp.name === note.text)
    let placed: SceneNote | null = null
    // On its own water: every ray of every stretch where the text's box fits between the far shore and the near edge.
    const spots: { x: number; d: number; top: number }[] = []
    for (const sp of spans) {
      const mid = (sp.from + sp.to) / 2
      for (const e of sp.edges) {
        const half = note.width / scale / 2
        if (e.x - half < sp.from || e.x + half > sp.to) continue
        const near = sp.edges.filter((o) => Math.abs(o.x - e.x) <= half)
        // The shore's own raggedness (a cove, a spit) under a letter or two is let pass: the most of the text on water.
        const q = (v: number[], t: number) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(t * v.length))]
        const far = q(near.map((o) => o.farY), .8), nearY = q(near.map((o) => o.nearY), .2)
        if (nearY - far >= GLYPH.bottom - GLYPH.top + 2 * NOTE_INSET) spots.push({ x: e.x, d: Math.abs(e.x - mid), top: far + NOTE_INSET - GLYPH.top })
      }
    }
    spots.sort((a, b) => a.d - b.d)
    for (const sp of spots) {
      const n = { ...note, left: sp.x * scale - note.width / 2, top: sp.top }
      if (clear(n)) { placed = n; break }
    }
    // Else the sea on the outside view's coastal sea: its rows from the horizon down, nearest the coast's open side first.
    const sea = view.sea
    if (!placed && sea && spans.some((sp) => sp.kind === 'sea')) {
      const poly = sea.points.map(([x, y]) => [x * scale, y] as const)
      const inside = (x: number, y: number) => {
        let hit = false
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i], [xj, yj] = poly[j]
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
        }
        return hit
      }
      const xs = poly.map(([x]) => x)
      const x0 = Math.min(...xs), x1 = Math.max(...xs)
      search: for (let top = sea.top + NOTE_INSET - GLYPH.top; top + GLYPH.bottom <= Math.min(sea.bottom, VISIBLE_BOTTOM - 0.5); top += 1) {
        const order = sea.side === 'right' ? 1 : -1
        for (let k = 0; k <= (x1 - x0); k += 3) {
          const left = order > 0 ? x1 - note.width - NOTE_INSET - k : x0 + NOTE_INSET + k
          const n = { ...note, left, top }
          const corners = [[left, top + GLYPH.top], [left + note.width, top + GLYPH.top], [left, top + GLYPH.bottom], [left + note.width, top + GLYPH.bottom]] as const
          if (corners.every(([x, y]) => inside(x, y)) && clear(n)) { placed = n; break search }
        }
      }
    }
    if (placed) out.push(placed)
  }
  return out
}
