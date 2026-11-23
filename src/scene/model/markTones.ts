import { wrap180 } from '../../domain/camera'
import { NORMALS, type Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { RGB, WorldState } from '../../world/types'
import { accentSurface } from './buildingIncidence'
import { groundLighting } from './buildingGround'
import { landIrradiance, srgbRgbToLinear, surfaceNormal } from './landRadiance'
import { hazeAt, hazeOf } from './landVeil'
import { mixLight } from './tone'
import type { Tones } from './types'

const WALL: RGB = [0.64, 0.64, 0.64]
const STONE: RGB = [0.82, 0.80, 0.74]
const TILE: RGB = [0.64, 0.30, 0.21]
const LEAF: RGB = [0.19, 0.28, 0.21]
const PANEL: RGB = [0.11, 0.17, 0.30]
const LAMP: RGB = [1, 0.85, 0.63]
const BLACK: RGB = [0, 0, 0]
const ROOF = surfaceNormal(0, 0.25)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Preserve the reflective palette of the solar field glyphs. */
function glassBacklight(world: WorldState): number {
  const sun = world.bodies.sun
  const ahead = smoothstep(-0.1, 0.4, Math.cos(wrap180(sun.azimuth - world.camera.heading) * Math.PI / 180))
  const low = 1 - smoothstep(12, 40, sun.altitude)
  const up = smoothstep(-8, -1, sun.altitude)
  return clamp01(ahead * low * up * (1 - world.night.dark))
}

const palettes = new WeakMap<WorldState, Map<number, Tones>>()

export function tonesAt(world: WorldState, km: number): Tones {
  let known = palettes.get(world)
  if (!known) palettes.set(world, known = new Map())
  const hit = known.get(km)
  if (hit) return hit
  const sky = hazeOf(world)
  const receive = accentSurface(groundLighting(world).accents, hazeAt(world, km))
  const shadeMat = (albedo: RGB, n: Normal, open = 1, beam = 1) => receive(srgbRgbToLinear(albedo), n, open, beam)
  const { front, top } = NORMALS
  const side = smoothstep(-.025, .025, landIrradiance(world).sunDir.across)
  const lateral = (material: RGB) => side === 0 ? shadeMat(material, NORMALS.left)
    : side === 1 ? shadeMat(material, NORMALS.right)
      : mixLight(shadeMat(material, NORMALS.left), shadeMat(material, NORMALS.right), side)
  const wall = shadeMat(WALL, front), lit = lateral(WALL)
  const shade = shadeMat(WALL, front, 0.64, 0)
  const roof = shadeMat(TILE, ROOF), green = shadeMat(LEAF, ROOF)
  const tones: Tones = {
    wall, lit, shade, rim: lateral(STONE),
    deep: shadeMat(WALL, front, 0.24, 0),
    roof, roofLit: shadeMat(TILE, top),
    stone: shadeMat(STONE, front), stoneLit: lateral(STONE),
    glass: mixLight(shadeMat(BLACK, front), sky, 0.13),
    glassLit: mixLight(wall, sky, 0.34 * (1 - 0.6 * glassBacklight(world))),
    soot: shadeMat([0.25, 0.22, 0.20], front, 0.45, 0),
    green, greenLit: shadeMat(LEAF, top),
    panel: shadeMat(PANEL, ROOF),
    win: LAMP, mist: sky,
  }
  known.set(km, tones)
  return tones
}
