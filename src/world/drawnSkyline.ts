import type { SceneTerrain } from '../data/terrain/terrain'
import type { WorldMark } from './markGeometry'
import { outsideBodies } from './outsideBodies'
import { HORIZON_Y, SCENE_W } from './sceneBox'
import { sceneClearance } from './sceneClearance'
import type { Skyline } from './skyline'
import type { FarCities, OutsideView, PlaceUnknown, Pt, WorldLabels } from './types'

/*
 * The drawn skyline (the owner's report of 2026-11-20: a low sun drawn over the near hill and the town). Everything in the
 * sky is hidden by whatever land and structures are actually drawn in front of it, so the sun and moon rise and set, and
 * the light judges them up or behind the land, against one line: the top of what the scene draws. That is the near land
 * as drawn (the place's own ground on its scale within its span, the panorama's ridge beyond), the far land, and what
 * stands on them, as it stands clear of the text (`outsideBodies.ts`): the place's rows and towers, its trees, the towers
 * and towns beyond it; the marks, the far towns' towers. (Until this, the bodies were judged on the panorama's own skyline, which the place's own near land now
 * overdraws; and a body the place's eye saw was laid again over the place's mass.)
 */

/** Columns per scene px (at the 375 px reference). */
const RES = 2

/**
 * The top of the world-width land and its budgeted marks at each fraction of the scene's width (layout px). The panorama's
 * eye level and camera (`base`) place each body on its path, and this line determines whether it clears the land.
 */
export function drawnSkyline(drawn: SceneTerrain, place3: OutsideView | PlaceUnknown, marks: readonly WorldMark[], far: FarCities | null,
  base: Skyline, labels: WorldLabels, width: number): Skyline {
  const n = SCENE_W * RES + 1
  const cols = new Float32Array(n).fill(Infinity)
  const line = (points: readonly Pt[]) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i], [bx, by] = points[i + 1]
      const x0 = Math.min(ax, bx) * RES, x1 = Math.max(ax, bx) * RES
      for (let c = Math.max(0, Math.floor(x0)); c <= Math.min(n - 1, Math.ceil(x1)); c++) {
        const t = x1 > x0 ? Math.min(1, Math.max(0, (c - x0) / (x1 - x0))) : 0
        const y = ax <= bx ? ay + (by - ay) * t : by + (ay - by) * t
        if (y < cols[c]) cols[c] = y
      }
    }
  }
  const block = (x: number, w: number, top: number) => {
    for (let c = Math.max(0, Math.ceil((x - w / 2) * RES)); c <= Math.min(n - 1, Math.floor((x + w / 2) * RES)); c++) if (top < cols[c]) cols[c] = top
  }
  line(drawn.nearPoints)
  line(drawn.farPoints)
  if (place3.kind === 'outside') {
    if (place3.land?.top.length) line(place3.land.top)
    const sx = width / SCENE_W
    const standing = outsideBodies(place3, sceneClearance(labels, place3.dot, width), sx)
    for (const { box, x, w } of standing.boxes) block(x / sx, w / sx, box.top)
    for (const { tower, x, w } of standing.towers) block(x / sx, w / sx, tower.baseY - tower.h)
    for (const t of standing.beyond) block(t.x, t.w / sx, t.baseY - t.h)
    for (const b of standing.towns) block(b.x, b.w, b.baseY - b.h)
    for (const t of standing.trees) block(t.x, t.w / sx, t.base - t.h)
  }
  for (const m of marks) block(m.x, m.w, m.base - m.h * m.scale)
  for (const t of far?.towers ?? []) block(t.x, 2, t.top)
  let first = cols.findIndex(Number.isFinite)
  if (first < 0) { cols.fill(base.horizon ?? HORIZON_Y); first = 0 }
  for (let c = 0; c < first; c++) cols[c] = cols[first]
  for (let c = 1; c < n; c++) if (!Number.isFinite(cols[c])) cols[c] = cols[c - 1]
  const at = (fraction: number) => {
    const f = Math.max(0, Math.min(n - 1, fraction * SCENE_W * RES))
    const i = Math.floor(f), j = Math.min(n - 1, i + 1)
    // The higher of the two columns either side: a narrow spire still hides the disc behind it.
    return Math.min(cols[i], cols[j])
  }
  // The base's peak, eye level and camera: the bodies' paths are laid on them, exactly as on the panorama's skyline.
  return Object.assign(at, { peak: base.peak, ...(base.horizon !== undefined ? { horizon: base.horizon } : {}),
    ...(base.camera ? { camera: base.camera } : {}) })
}
