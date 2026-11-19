import { panoramaFarColumns, type FarData } from '../data/city/farData'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from '../data/city/farGrid'
import { SKYLINE_TO_KM } from '../data/city/skylineRay'
import { plainLights } from '../data/city/plainLights'
import { hashId, seeded } from '../data/landmarks/hash'
import type { Coordinate } from '../data/landmarks/project'
import { anglePx } from '../data/terrain/angleScale'
import { azimuthAt, destination } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import { groundAt as lineAt } from './sceneLight'
import { SCENE_W } from './sceneBox'
import type { FarCities, FarPatch, FarTowerSite } from './types'

/** The y of a tower's top standing `heightM` tall on ground drawn at `base`, `km` away, on the scene's vertical scale. */
function topOver(terrain: SceneTerrain, base: number, km: number, heightM: number): number {
  const horizonY = terrain.horizonY ?? 0
  // The ground's angle at `base` (anglePx is odd and rising: bisection), then the tower's top a little higher.
  let lo = -30, hi = 30
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (horizonY - anglePx(mid) > base) lo = mid
    else hi = mid
  }
  const rise = Math.atan2(heightM, km * 1000) * 180 / Math.PI
  return horizonY - anglePx((lo + hi) / 2 + rise)
}

/** No far towns: no data yet, or a drawn stand-in with no panorama to place them on. */
export const NO_FAR_CITIES: FarCities = { patches: [], towers: [], fromKm: null, shapes: { mass: [], blocks: [], lights: [] } }

/**
 * The towns beyond the near ridge, from the far raster (`public/data/city/il/far.json`: built share and mean storeys per
 * ~0.5 km cell, and the towers of 80 m and more), placed where the panorama really shows the ground they stand on: the
 * plain's patches (`plainPatches`: each seen stretch of a built cell along each ray, with its distance) and the towers on
 * the plain or on the far ridge, with their tops and bases. A place seen from outside keeps its own city to the outside
 * view: the far towns start beyond its skyline's reach (`SKYLINE_TO_KM`). Scene px at the reference width; independent
 * of the hour.
 */
export function farCitiesOf(place: Coordinate & { id: string }, terrain: SceneTerrain, far: FarData | null | undefined,
  ownSkyline: boolean): FarCities {
  const placeId = place.id
  const { sightAt, seenAt } = terrain
  if (!far || !sightAt || !seenAt) return NO_FAR_CITIES
  const fromKm = ownSkyline ? SKYLINE_TO_KM : null
  const scene = panoramaFarColumns(place, SCENE_W, far, sightAt, terrain, fromKm ?? undefined)
  // Each stretch's storeys: the far raster's height class at the stretch's own place (its bearing and distance).
  const camera = terrain.camera ?? SCENE_CAMERA
  const patches = (scene.patches ?? []).map((patch): FarPatch => {
    const point = destination(place.lat, place.lon, patch.km, azimuthAt((patch.left + patch.right) / 2 / SCENE_W, camera))
    const row = Math.floor((point.lat - FAR_SOUTH) / FAR_LAT_STEP), col = Math.floor((point.lon - FAR_WEST) / FAR_LON_STEP)
    const inside = row >= 0 && row < FAR_ROWS && col >= 0 && col < FAR_COLS
    return { ...patch, level: inside ? far.grid[row * FAR_COLS + col] & 15 : 0 }
  })
  const towers = scene.towers.flatMap((tower): FarTowerSite[] => {
    const { x, heightM } = tower
    if (x < 0.5 || x > SCENE_W - 0.5) return []
    if (tower.km !== undefined && tower.y !== undefined) {
      // On the plain: its top where the panorama sees it, its foot on the ground under it (hidden by nearer land below
      // the near ridge's line).
      const seen = seenAt(x, tower.km, heightM)
      if (!seen) return []
      const foot = Math.min(seen.groundY, lineAt(terrain.nearPoints, x))
      return seen.y < foot - 0.3 ? [{ x, top: seen.y, base: foot, km: tower.km, heightM, onRidge: false }] : []
    }
    // On the far ridge: standing on its crest, at the crest's distance.
    const sight = sightAt(x)
    const base = lineAt(terrain.farPoints, x)
    if (!sight.farShows || base >= lineAt(terrain.nearPoints, x) - 1) return []
    return [{ x, top: topOver(terrain, base, sight.farKm, heightM), base, km: sight.farKm, heightM, onRidge: true }]
  })
  return { patches, towers, fromKm, shapes: townShapes(patches, towers, placeId) }
}

/** Metres a storey. */
const STOREY_M = 3.2
/**
 * The mass's strength steps: a cell's built share, smoothed, from `MASS_FROM[k]` up shows at step k. A fifth of the
 * ground built over already reads as a town: roofs and walls are far paler than the fields.
 */
export const MASS_FROM = [0.03, 0.08, 0.16, 0.28, 0.45]
/** Rows of the town field per scene px (its columns are one scene px). */
const ROWS = 2

/** px a height (m) stands at a distance (km), on the scene's vertical scale near eye level. */
const standsPx = (heightM: number, km: number) => anglePx(Math.atan2(heightM, km * 1000) * 180 / Math.PI)

/**
 * The far towns' shapes (scene px at the reference width; built once with the terrain, never per hour). A town at
 * 5–50 km is far below the size of its houses, so it is drawn as what the eye gets of it:
 * - **mass**: every seen stretch of a built cell lays its built share into a field of 1 px columns and half-px rows,
 *   smoothed by its neighbours (a 1-2-1 pass each way); each run of the field at one strength step shows the town's
 *   stone. So a dense town is one continuous pale mass with soft, ragged edges, and a lone farm or shed on the plain no
 *   more than a breath of tone, never a speck.
 * - **blocks**: where the town is dense (its smoothed share ≥ 0.3), blocks of its real height at its distance (storeys ×
 *   3.2 m on the scene's vertical scale) rise out of the mass with a chance by the share: a ragged roofline, taller
 *   where the raster's storeys are.
 * - **towers** of 80 m and more at their own height on the plain or the far crest; **lights** by night as the SVG's far
 *   city spreads them (`plainLights`: by built share and the area each stretch covers).
 * Seeded by the place and the cell's position, never the hour.
 */
export function townShapes(patches: readonly FarPatch[], towers: readonly FarTowerSite[], placeId: string): FarCities['shapes'] {
  const mass: FarCities['shapes']['mass'] = [], blocks: FarCities['shapes']['blocks'] = []
  if (patches.length) {
    // The field covers only the rows the towns stand in (from `r0`), a margin for the smoothing round them.
    const r0 = Math.max(0, Math.floor(Math.min(...patches.map((p) => p.top)) * ROWS) - 2)
    const cols = SCENE_W, rows = Math.max(1, Math.ceil(Math.max(...patches.map((p) => p.bottom)) * ROWS) + 2 - r0)
    const share = new Float32Array(cols * rows), kmShare = new Float32Array(cols * rows)
    for (const { left, right, top, bottom, km, built } of patches) {
      for (let c = Math.max(0, Math.floor(left)); c < Math.min(cols, Math.ceil(right)); c++) {
        const across = Math.min(right, c + 1) - Math.max(left, c)
        for (let r = Math.max(0, Math.floor(top * ROWS) - r0); r < Math.min(rows, Math.ceil(bottom * ROWS) - r0); r++) {
          const down = Math.min(bottom * ROWS - r0, r + 1) - Math.max(top * ROWS - r0, r)
          const add = built * across * down
          share[r * cols + c] += add
          kmShare[r * cols + c] += add * km
        }
      }
    }
    // Mean distance where the share was laid (before smoothing spreads it), then a 1-2-1 pass across and down.
    const kmOf = new Float32Array(cols * rows)
    for (let i = 0; i < share.length; i++) kmOf[i] = share[i] > 0 ? kmShare[i] / share[i] : 0
    const smooth = (src: Float32Array, step: number, len: number): Float32Array => {
      const out = new Float32Array(src.length)
      for (let i = 0; i < src.length; i++) {
        const p = Math.floor(i / step) % len
        const prev = p > 0 ? src[i - step] : 0, next = p < len - 1 ? src[i + step] : 0
        out[i] = (prev + 2 * src[i] + next) / 4
      }
      return out
    }
    const field = smooth(smooth(share, 1, cols), cols, rows)
    // The distance a smoothed cell shows: its own, else its nearest laid neighbour's in the row or column.
    const kmAt = (c: number, r: number) => {
      for (let d = 0; d <= 2; d++) {
        for (const [dc, dr] of [[0, 0], [-d, 0], [d, 0], [0, -d], [0, d]]) {
          const cc = c + dc, rr = r + dr
          if (cc >= 0 && cc < cols && rr >= 0 && rr < rows && kmOf[rr * cols + cc] > 0) return kmOf[rr * cols + cc]
        }
      }
      return 0
    }
    for (let r = 0; r < rows; r++) {
      let run: { c0: number; step: number; km: number; band: number } | null = null
      const flush = (c: number) => {
        if (run) mass.push({ x: run.c0, y: (r + r0) / ROWS, w: c - run.c0, h: 1 / ROWS, km: run.km, step: run.step })
        run = null
      }
      for (let c = 0; c < cols; c++) {
        const v = field[r * cols + c]
        const step = MASS_FROM.findLastIndex((from) => v >= from)
        const km = step >= 0 ? kmAt(c, r) : 0
        // A run keeps one step and one distance band (a tenth of the distance), so the air takes it as one.
        const band = km > 0 ? Math.round(Math.log(km) * 10) : -1
        if (run && (step !== run.step || band !== run.band)) flush(c)
        if (step >= 0 && km > 0) run ??= { c0: c, step, km, band }
      }
      flush(cols)
    }
    for (const patch of patches) {
      const { left, right, top, bottom, km } = patch
      const w = right - left
      if (w <= 0.05) continue
      const c = Math.min(cols - 1, Math.max(0, Math.floor(left + w / 2))), r = Math.min(rows - 1, Math.max(0, Math.floor(bottom * ROWS) - 1 - r0))
      const dense = field[r * cols + c]
      const random = seeded(hashId(`${placeId}:far:${Math.round(left * 2)}:${Math.round(km * 20)}`))
      if (dense < 0.3 || random() > Math.min(1, 2 * (dense - 0.15))) continue
      const storey = standsPx(STOREY_M, km)
      const level = patch.level || 3
      const n = Math.max(1, Math.round(w * dense * 1.4))
      for (let i = 0; i < n; i++) {
        const bw = Math.min(w, 0.6 + random() * 0.9)
        const x = left + random() * (w - bw)
        const h = Math.min(7, Math.max(0.5, storey * level * (0.5 + random())))
        blocks.push({ x, base: bottom - random() * (bottom - top) * 0.6, w: bw, h, km })
      }
    }
  }
  for (const tower of towers) {
    const w = 0.85
    blocks.push({ x: tower.x - w / 2, base: tower.base, w, h: Math.max(1.2, tower.base - tower.top), km: tower.km })
  }
  const lights = plainLights([...patches], hashId(`${placeId}:far:lights`))
    .map((dot) => ({ x: dot.x, y: dot.y, r: dot.size * 0.5, alpha: dot.alpha, km: dot.km }))
  return { mass, blocks, lights }
}

