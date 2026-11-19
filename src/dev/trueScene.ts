/**
 * PROTOTYPE (dev only, `?truescene=1`): the main scene drawn as the eye sees it (docs/design/HANDOFF-TRUE-SCENE.md §4–§5).
 * Eye level is one fixed line; the place's own houses come from the built-up raster at their true bearing, distance
 * and angle (a band hugging that line); marks near the place stand on the ground at their distance; no hand-set
 * positions; the dot is at the bottom centre. Not the default scene: stills only, for the owner's choice.
 */
import { xOf, type Camera } from '../domain/camera'
import type { CityRaster } from '../data/city/cityRaster'
import { LAT_STEP, LON_STEP } from '../data/city/grid'
import { roofHeight } from '../data/city/skylineHeight'
import { hashId, seeded } from '../data/landmarks/hash'
import type { Coordinate } from '../data/landmarks/project'
import type { House } from '../data/landmarks/settlement'
import { EARTH_R_KM, EYE_M, RAY_DISTANCES, REFRACTION_K } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { anglePx, RELIEF } from '../data/terrain/angleScale'

export function trueScene(): boolean {
  if (typeof window === 'undefined' || !import.meta.env?.DEV) return false
  return new URLSearchParams(window.location.search).has('truescene')
}

/** Eye level: leaves ~16 px under it for the near ground, the houses' bases and the dot. */
export const TRUE_HORIZON_Y = 96
/** The dot (you are here): bottom centre, just over the sheet. */
export const TRUE_DOT_Y = 107

const NORTH_M = 111_320
const eastM = (lat: number) => NORTH_M * Math.cos((lat * Math.PI) / 180)
const RAD = Math.PI / 180
const CURVE = (1000 * (1 - REFRACTION_K)) / (2 * EARTH_R_KM)
/** Houses nearer than this would tower over the view (your own yard); farther than this they are under a pixel. */
const NEAREST_M = 90
const REACH_M = 3000
const LOT_M2 = 350
const MAX_PER_SQUARE = 14

/** y of an angle for the place's own houses and marks: the land's scale, or the village's own when split. */
function villageY(terrain: SceneTerrain) {
  const own = RELIEF.village
  if (own && terrain.horizonY !== undefined) return (angle: number) => terrain.horizonY! - anglePx(angle, own)
  return terrain.angleY
}

/** Angle (deg) of a point `upM` above the ground at `km` in the scene column `x`, and whether the land before hides it. */
function sight(terrain: SceneTerrain, x: number, km: number, upM: number) {
  const first = RAY_DISTANCES[0]
  const rel = (d: number): number => {
    if (d >= first) return terrain.groundAt?.(x, d) ?? -EYE_M
    const at = terrain.groundAt?.(x, first) ?? -EYE_M
    return -EYE_M + ((at + EYE_M) * d) / first
  }
  const angleAt = (d: number, up = 0) => Math.atan2(rel(d) + up - CURVE * d * d, d * 1000) / RAD
  let before = -90
  for (const d of RAY_DISTANCES) {
    if (d >= km - 0.05) break
    before = Math.max(before, angleAt(d))
  }
  return { base: angleAt(km), top: angleAt(km, upM), hidden: angleAt(km, upM) < before }
}

/**
 * The place's own buildings seen from the eye, 2 m over its ground: every built square of the raster within 3 km,
 * as dense and tall as the square says, at its true bearing (x), its ground's true angle (base) and its roof's (top),
 * on the same vertical scale as the land. Far ones first so near ones stand in front.
 */
export function eyeHouses(place: Coordinate, raster: CityRaster, terrain: SceneTerrain, camera: Camera, width: number): House[] {
  const angleY = villageY(terrain)
  if (!angleY) return []
  const east = eastM(place.lat)
  const rows = Math.ceil(REACH_M / (LAT_STEP * NORTH_M)) + 1
  const cols = Math.ceil(REACH_M / (LON_STEP * east)) + 1
  const row0 = Math.floor(place.lat / LAT_STEP), col0 = Math.floor(place.lon / LON_STEP)
  const scale = width / camera.width
  const pxPerRad = camera.pxPerDeg / RAD
  const out: (House & { d: number })[] = []
  for (let row = row0 - rows; row <= row0 + rows; row++) {
    for (let col = col0 - cols; col <= col0 + cols; col++) {
      const { built, levels, p90 } = raster.at((row + .5) * LAT_STEP, (col + .5) * LON_STEP)
      if (built <= 0) continue
      const area = LAT_STEP * NORTH_M * LON_STEP * east
      const count = Math.min(MAX_PER_SQUARE, Math.max(1, Math.round((built * area) / LOT_M2)))
      const sideM = Math.min(30, Math.max(9, Math.sqrt((built * area) / count) * .6))
      const random = seeded(hashId(`eye:${row}:${col}`))
      for (let i = 0; i < count; i++) {
        const e = (col + random()) * LON_STEP * east - place.lon * east
        const n = (row + random()) * LAT_STEP * NORTH_M - place.lat * NORTH_M
        const heightM = Math.min(40, roofHeight(levels, p90, random()))
        const seed = Math.floor(random() * 2 ** 30)
        const d = Math.hypot(e, n)
        if (d < NEAREST_M || d > REACH_M) continue
        const azimuth = ((Math.atan2(e, n) / RAD) + 360) % 360
        const x = xOf(azimuth, camera)
        if (x < -10 || x > camera.width + 10) continue
        const km = d / 1000
        const seen = sight(terrain, x, km, heightM)
        if (seen.hidden) continue
        const baseY = angleY(seen.base)
        const h = baseY - angleY(seen.top)
        if (h < .35) continue
        out.push({ x: x * scale, baseY, h: Math.max(.6, h), w: Math.max(.8, (sideM / d) * pxPerRad * scale),
          row: 0, lit: seed % 3 !== 0, seed, storeys: heightM > 7 ? 2 : undefined, d })
      }
    }
  }
  return out.sort((a, b) => b.d - a.d).map(({ d: _d, ...house }) => house)
}

/** y of the ground at `km` in scene column `x` (scene units), on the land's own vertical scale. */
export function groundYAt(terrain: SceneTerrain, x: number, km: number): number | null {
  const angleY = villageY(terrain)
  if (!angleY) return null
  return angleY(sight(terrain, x, Math.max(.05, km), 0).base)
}
