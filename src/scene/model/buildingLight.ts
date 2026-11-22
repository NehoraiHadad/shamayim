import { wrap180 } from '../../domain/camera'
import { lambert, NORMALS, type Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB, WorldState } from '../../world/types'
import { nearGroundAlbedo } from './landColour'
import { skyView } from './landIrradiance'
import { landIrradiance, linearRgbToSrgb, shadeLinearRgb, srgbRgbToLinear, surfaceNormal } from './landRadiance'
import { hazeAt, hazeOf } from './landVeil'
import { mixLight } from './tone'
import type { Tones } from './types'

const WALL: RGB = [0.64, 0.64, 0.64]
const STONE: RGB = [0.82, 0.80, 0.74]
const TILE: RGB = [0.64, 0.30, 0.21]
const LEAF: RGB = [0.19, 0.28, 0.21]
const PANEL: RGB = [0.11, 0.17, 0.30]
const GOLD: RGB = [0.84, 0.66, 0.28]
const LAMP: RGB = [1, 0.85, 0.63]
const BLACK: RGB = [0, 0, 0]
const ROOF = surfaceNormal(0, 0.25)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * How much the light stands beyond the land (C9 defect 1): the walls the eye sees face it, so with the sun low in the
 * half of the sky the eye looks into (its azimuth within 90° of the view's heading) they face away from the sun and from
 * the bright half of the sky, and see only the dim sky behind the eye. 1 for a low sun ahead (sunrise and sunset over the
 * land), falling as it climbs (a high sun lights the ground in front, which lights the walls back) and as it turns to the
 * eye's side; through twilight while its glow is still beyond the land; none by night.
 */
export function againstLight(world: WorldState): number {
  const sun = world.bodies.sun
  const ahead = smoothstep(-0.1, 0.4, Math.cos(wrap180(sun.azimuth - world.camera.heading) * Math.PI / 180))
  const low = 1 - smoothstep(12, 40, sun.altitude)
  const up = smoothstep(-8, -1, sun.altitude)
  return clamp01(ahead * low * up * (1 - world.night.dark))
}

export function brightWall(world: WorldState): Normal {
  return landIrradiance(world).sunDir.across < 0 ? NORMALS.left : NORMALS.right
}

const surroundings = new WeakMap<WorldState, ReturnType<typeof buildingSurroundings>>()

function buildingSurroundings(world: WorldState) {
  const irr = landIrradiance(world)
  const rhoGround = srgbRgbToLinear(nearGroundAlbedo(world))
  const upSun = Math.max(0, irr.sunDir.up), upMoon = Math.max(0, irr.moonDir.up)
  // Illustration calibration for unknown surroundings: treat 18% of the ground-facing
  // hemisphere as diffuse terrain fill, with the rest occupied by the building and nearby shade.
  const bounceFill = 0.18
  const ground = rhoGround.map((rho, i) => bounceFill * rho * (irr.eSkyVec[i] + upSun * irr.eSunVec[i] + upMoon * irr.eMoonVec[i]))
  return { irr, ground, air: srgbRgbToLinear(hazeOf(world)) }
}

/** Shading for architecture with unknown orientation: view-aligned façades and roof pitches. */
export function buildingLight(world: WorldState, km: number) {
  let state = surroundings.get(world)
  if (!state) surroundings.set(world, state = buildingSurroundings(world))
  const { irr, ground, air } = state
  const share = hazeAt(world, km)
  return (albedo: RGB, n: Normal, open = 1): RGB => {
    const view = skyView(n, irr.sunDir, irr.skyBias) * open
    // The ground hemisphere occupies (1 − n_up)/2. The reflected contribution is
    // limited to the portion of the nearby landscape seen by a façade.
    const bounceView = (1 - n[2]) * 0.5
    const sky: [number, number, number] = [
      irr.eSkyVec[0] * view + ground[0] * bounceView,
      irr.eSkyVec[1] * view + ground[1] * bounceView,
      irr.eSkyVec[2] * view + ground[2] * bounceView,
    ]
    return linearRgbToSrgb(shadeLinearRgb(srgbRgbToLinear(albedo), irr.eSunVec, irr.eMoonVec, sky,
      lambert(n, irr.sunDir), lambert(n, irr.moonDir), 1, irr.yHorizon, share, air))
  }
}

const palettes = new WeakMap<WorldState, Map<number, Tones>>()

export function tonesAt(world: WorldState, km: number): Tones {
  let known = palettes.get(world)
  if (!known) palettes.set(world, known = new Map())
  const hit = known.get(km)
  if (hit) return hit
  const sky = hazeOf(world)
  const shadeMat = buildingLight(world, km)
  const { front, top } = NORMALS, side = brightWall(world)
  const wall = shadeMat(WALL, front), lit = shadeMat(WALL, side)
  const shade = shadeMat(WALL, front, 0.64)
  const roof = shadeMat(TILE, ROOF), green = shadeMat(LEAF, ROOF)
  const tones: Tones = {
    wall, lit, shade, rim: shadeMat(STONE, side),
    deep: shadeMat(WALL, front, 0.24),
    refl: mixLight(shade, sky, 0.18),
    roof, roofLit: shadeMat(TILE, top),
    stone: shadeMat(STONE, front), stoneLit: shadeMat(STONE, side),
    glass: mixLight(shadeMat(BLACK, front), sky, 0.13),
    glassLit: mixLight(wall, sky, 0.34 * (1 - 0.6 * againstLight(world))),
    soot: shadeMat([0.25, 0.22, 0.20], front, 0.45),
    green, greenLit: shadeMat(LEAF, top),
    panel: shadeMat(PANEL, ROOF), gold: shadeMat(GOLD, top),
    win: LAMP, mist: sky,
  }
  known.set(km, tones)
  return tones
}
