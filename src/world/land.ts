import { hashId, seeded } from '../data/landmarks/hash'
import { COLUMN, footOf, type FaceColumn, type PlaneFace } from './face'
import { groundAt as lineAt } from './sceneLight'
import { SCENE_H } from './sceneBox'
import type { Pt } from './types'

/**
 * Terrain-only morphological marks of a plane, light-free: gullies cut down the slopes and stone terraces on moderate
 * lower slopes (placed from the face's contours and slopes, `face.ts`, seeded by the place). Vegetation (forest,
 * orchards, fields, scrub/grass, desert strata) is driven by `WorldState.land` in `scene/model/landVegetation.ts`.
 */

export interface LandGully { points: Pt[]; w: number; alpha: number }
export interface LandForm { gullies: LandGully[]; terraces: Pt[][] }

/** How much of the modelling a plane carries: the near ridge all of it, a far one less (smaller marks, more haze). */
export const LAND_MODEL = { near: 1, far: 0.5 } as const

type Plane = { points: readonly Pt[] }

/** The ground morphology of the near and the far plane, seeded by the place. */
export function landOf(planes: Record<'near' | 'far', Plane>, faces: Record<'near' | 'far', PlaneFace>, placeId: string): Record<'near' | 'far', LandForm> {
  return { near: planeLand(planes.near, faces.near, placeId, 'near'), far: planeLand(planes.far, faces.far, placeId, 'far') }
}

function planeLand(plane: Plane, face: PlaneFace, placeId: string, name: 'near' | 'far'): LandForm {
  const k = LAND_MODEL[name]
  if (plane.points.length < 2) return { gullies: [], terraces: [] }
  const floor = SCENE_H
  const crestAt = (x: number) => lineAt(plane.points, x)
  const seed = (part: string) => seeded(hashId(`${placeId}:${name}:${part}`))
  return {
    gullies: gulliesOf(face, { k, floor, crestAt, r: seed('gully') }),
    terraces: name === 'near' ? terracesOf(face, { floor, crestAt, r: seed('terrace') }) : [],
  }
}

interface Ctx {
  floor: number
  crestAt: (x: number) => number
  r: () => number
}

/** The face point nearest y in a column (for its slope and distance), or null when the column shows no ground. */
function pointAt(column: FaceColumn | undefined, y: number) {
  if (!column?.points.length) return null
  let best = column.points[0]
  for (const p of column.points) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p
  return best
}

const columnAt = (face: PlaneFace, x: number) => face.columns[Math.max(0, Math.min(face.columns.length - 1,
  Math.round((x - (face.columns[0]?.x ?? 0)) / COLUMN)))]

/** How big the ground's small things read at a distance (1 at about 1 km). */
const nearness = (km: number) => Math.min(1.5, Math.max(0.45, 1.4 / (0.4 + km)))

function gulliesOf(face: PlaneFace, { k, floor, crestAt, r }: Ctx & { k: number }): LandGully[] {
  // Re-entrants: where a contour bends back toward the crest (a local top of its y), by at least a little.
  type Bend = { x: number; y: number; km: number }
  const bends: Bend[] = []
  for (const contour of face.contours) {
    const p = contour.points
    for (let i = 2; i < p.length - 2; i++) {
      const y = p[i][1]
      if (!(y < p[i - 1][1] && y <= p[i + 1][1])) continue
      const depth = Math.min(Math.max(p[i - 1][1], p[i - 2][1]), Math.max(p[i + 1][1], p[i + 2][1])) - y
      if (depth >= 0.7) bends.push({ x: p[i][0], y, km: contour.kms[i] })
    }
  }
  bends.sort((a, b) => a.y - b.y)
  const used = new Set<Bend>()
  const chains: Bend[][] = []
  for (const start of bends) {
    if (used.has(start)) continue
    const chain = [start]
    used.add(start)
    for (;;) {
      const cur = chain.at(-1)!
      let next: Bend | null = null
      for (const b of bends) {
        if (used.has(b) || b.y <= cur.y + 0.5 || b.y > cur.y + 12 || Math.abs(b.x - cur.x) > 5) continue
        if (!next || b.y - cur.y + Math.abs(b.x - cur.x) < next.y - cur.y + Math.abs(next.x - cur.x)) next = b
      }
      if (!next) break
      chain.push(next)
      used.add(next)
    }
    chains.push(chain)
  }
  // A notch in the crest line (a saddle the face drains from) starts a gully where no re-entrant chain does.
  for (let i = 3; i < face.columns.length - 3; i++) {
    const c = face.columns[i]
    const around = [-3, -2, 2, 3].map((d) => face.columns[i + d].crest)
    if (!(c.crest > face.columns[i - 1].crest && c.crest >= face.columns[i + 1].crest)) continue
    if (c.crest - Math.max(...around) < 1.2 || !c.points.length) continue
    if (chains.some((chain) => Math.abs(chain[0].x - c.x) < 7 && chain[0].y - c.crest < 8)) continue
    const p = pointAt(c, c.crest + 2)
    chains.push([{ x: c.x, y: c.crest + 1.2, km: p?.km ?? 2 }])
  }

  const out: LandGully[] = []
  const cap = Math.round(2 + 8 * k)
  // The longest first, then by where they start (seeded tie-break only through the wobble).
  chains.sort((a, b) => (b.at(-1)!.y - b[0].y) - (a.at(-1)!.y - a[0].y))
  for (const chain of chains) {
    if (out.length >= cap) break
    const top = chain[0]
    const column = columnAt(face, top.x)
    const foot = Math.min(floor - 1, column ? footOf(column) : floor)
    // A single bend or a notch runs on down the slope a little; a chain follows its bends and runs a little past them.
    const tail = 2 + r() * 4 + (chain.length === 1 ? Math.min(9, (foot - top.y) * 0.3) : 0)
    const last = chain.at(-1)!
    // Running out, it turns a little to one side (seeded), as a gully leaves its fall line.
    const drift = (r() - 0.5) * 2 * (1.5 + tail * 0.3)
    const pts: Pt[] = [[top.x, Math.max(top.y - 1, crestAt(top.x) + 1.5 + r() * 2)], ...chain.slice(1).map((b): Pt => [b.x, b.y]),
      [last.x + drift, Math.min(foot, last.y + tail)]]
    // Cut where it leaves the face.
    const kept: Pt[] = []
    for (const p of pts) {
      if (p[1] > floor - 0.5) break
      kept.push(p)
    }
    if (kept.length < 2 || kept.at(-1)![1] - kept[0][1] < 2.5) continue
    out.push({ points: kept, w: (0.5 + 0.7 * nearness(top.km)) * (0.5 + 0.5 * k), alpha: 0.05 + 0.08 * k })
  }
  return out
}

function terracesOf(face: PlaneFace, { floor, crestAt, r }: Ctx): Pt[][] {
  const out: Pt[][] = []
  for (const contour of face.contours) {
    const p = contour.points
    let i = 0
    while (i < p.length) {
      // A run of seeded length along the contour, then a gap: terraces are short, not a map's continuous line.
      const len = 2 + Math.floor(r() * 4), gap = 1 + Math.floor(r() * 4)
      const run: Pt[] = []
      for (let j = i; j < Math.min(p.length, i + len); j++) {
        const [x, y] = p[j]
        const crest = crestAt(x)
        const column = columnAt(face, x)
        const foot = Math.min(floor, column ? footOf(column) : floor)
        const lower = y >= crest + Math.max(4, 0.22 * (foot - crest))
        const moderate = contour.slopes[j] >= 0.015 && contour.slopes[j] <= 0.3 && contour.kms[j] <= 2.5
        if (!lower || !moderate || y > floor - 1.5) break
        run.push([x, y + Math.sin(x * 0.2) * 0.3])
      }
      if (run.length >= 2 && r() < 0.45) out.push(run)
      i += len + gap
    }
  }
  return out
}
