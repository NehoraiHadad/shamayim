import { farTownField, ROWS } from './farTownField'
import { townFootprints } from '../data/city/townFootprints'
import { panoramaFarColumns, type FarData } from '../data/city/farData'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from '../data/city/farGrid'
import { SKYLINE_TO_KM } from '../data/city/outsideView'
import { plainLights } from '../data/city/plainLights'
import { hashId, seeded } from '../data/landmarks/hash'
import type { Coordinate } from '../data/landmarks/project'
import { apparentHeight, baseAngle, MARK_MIN_PX } from '../data/terrain/apparentHeight'
import { azimuthAt, destination } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import { groundAt as lineAt } from './sceneLight'
import { SCENE_W } from './sceneBox'
import type { FarCities, FarPatch, FarTowerSite } from './types'

/** The y of a tower's top standing `heightM` tall on ground drawn at `base`, `km` away, on the scene's vertical scale. */
function topOver(terrain: SceneTerrain, base: number, km: number, heightM: number): number {
  return base - apparentHeight(heightM, km, baseAngle(base, terrain.horizonY))
}

/** No far towns: no data yet, or no panorama to place them on. */
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
  const footprints = townFootprints(far)
  const fromKm = ownSkyline ? SKYLINE_TO_KM : null
  const scene = panoramaFarColumns(place, SCENE_W, far, sightAt, terrain, fromKm ?? undefined)
  // Each stretch's storeys: the far raster's height class at the stretch's own place (its bearing and distance).
  const camera = terrain.camera ?? SCENE_CAMERA
  const patches = (scene.patches ?? []).map((patch): FarPatch => {
    const point = destination(place.lat, place.lon, patch.km, azimuthAt((patch.left + patch.right) / 2 / SCENE_W, camera))
    const row = Math.floor((point.lat - FAR_SOUTH) / FAR_LAT_STEP), col = Math.floor((point.lon - FAR_WEST) / FAR_LON_STEP)
    const inside = row >= 0 && row < FAR_ROWS && col >= 0 && col < FAR_COLS
    return { ...patch, level: inside ? far.grid[row * FAR_COLS + col] & 15 : 0,
      townId: patch.cellId === undefined ? undefined : footprints.get(patch.cellId)?.townId }
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
  return { footprints, patches, towers, fromKm, shapes: townShapes(patches, towers, placeId, terrain.horizonY) }
}

/** Metres a storey. */
const STOREY_M = 3.2
export { MASS_FROM } from './farTownField'

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
export function townShapes(patches: readonly FarPatch[], towers: readonly FarTowerSite[], placeId: string, horizonY = 0): FarCities['shapes'] {
  const mass: FarCities['shapes']['mass'] = [], blocks: FarCities['shapes']['blocks'] = []
  if (patches.length) {
    const { mass: townMass, cols, rows, r0, field } = farTownField(patches)
    mass.push(...townMass)
    for (const patch of patches) {
      const { left, right, top, bottom, km } = patch
      const w = right - left
      if (w <= 0.05) continue
      const c = Math.min(cols - 1, Math.max(0, Math.floor(left + w / 2))), r = Math.min(rows - 1, Math.max(0, Math.floor(bottom * ROWS) - 1 - r0))
      const dense = field[r * cols + c]
      const random = seeded(hashId(`${placeId}:far:${Math.round(left * 2)}:${Math.round(km * 20)}`))
      if (dense < 0.3 || random() > Math.min(1, 2 * (dense - 0.15))) continue
      const level = patch.level || 3
      const n = Math.max(1, Math.round(w * dense * 1.4))
      for (let i = 0; i < n; i++) {
        const bw = Math.min(w, 0.6 + random() * 0.9)
        const x = left + random() * (w - bw)
        const heightM = STOREY_M * level * (0.5 + random())
        const base = bottom - random() * (bottom - top) * 0.6
        const h = apparentHeight(heightM, km, baseAngle(base, horizonY))
        if (h < MARK_MIN_PX) continue
        blocks.push({ x, base, w: bw, h, km, heightM })
      }
    }
  }
  for (const tower of towers) {
    const w = 0.85
    // Intervening terrain can hide the shaft below the crest; it cannot make the visible part taller than the tower.
    const h = Math.min(tower.base - tower.top, apparentHeight(tower.heightM, tower.km, baseAngle(tower.base, horizonY)))
    if (h < MARK_MIN_PX) continue
    // No invented podium: only the raster's evidenced town field can supply a tower's surrounding mass.
    blocks.push({ x: tower.x - w / 2, base: tower.base, w, h, km: tower.km, heightM: tower.heightM, visiblePx: tower.base - tower.top })
  }
  const lights = plainLights([...patches], hashId(`${placeId}:far:lights`))
    .map((dot) => ({ x: dot.x, y: dot.y, r: dot.size * 0.5, alpha: dot.alpha, km: dot.km }))
  return { mass, blocks, lights }
}

