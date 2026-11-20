//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import { aerosolDepth, sunLight } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { coinOf, skyAt, skyGeom, veilOf, type SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { LayerOf, Ray, RGB, SceneBox } from './types'
import { brokenness } from './weather'

/*
 * Sun rays (C9, the owner's item 11), wherever they really occur, from the one world state. Every ray is light scattered
 * by the air toward the eye along a sunbeam, or its absence along a shadow, so all of them need air that scatters (haze,
 * aerosol: `hazeOfRays`) and a long enough path through it (a low sun), and none come by night or from a coin of a sun in
 * dust. Four general cases, each its own small cached layer on the sky, laid at composite time like the rest:
 * - **crepuscular** (`rays`): the sun behind broken cloud, the gaps' beams and the clouds' shadows fanning from its true
 *   spot, at any height when the air is hazy enough (strongest low, where the path is long), none in clear dry air at a
 *   high sun;
 * - **over the ridge** (`rays.ridge`): the sun just behind or at the crest at sunrise or sunset, its light through the
 *   crest's notches and trees fanning up from its spot;
 * - **anticrepuscular** (`rays.anti`): the same beams seen running on overhead and down to the point opposite the sun,
 *   converging there below the far horizon, only at a low sun when the crepuscular rays are strong;
 * - **glare** (`rays.corona`): the soft corona of fine rays round a directly seen sun, what the eye's own lens and the haze
 *   make of a bright source: by how clear the disc shows and how much the air scatters, none at a high sun in clean air.
 * In fog every case fades again (`beamThrough`): the air that scatters the beam also blocks it, and the rays need gaps and
 * contrast that a fog fills in.
 */

const WHITE: RGB = [1, 1, 1]
const q = (v: number, step: number) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))
/** Below this a case draws nothing. */
const MIN = 0.05

/**
 * How much the air scatters for rays (0–1): its aerosol optical depth at 550 nm (from the visibility, `aerosolDepth`), from
 * a clean ~0.08 (40 km and more: none) to a hazy 0.6 (10 km: full).
 */
export function hazeOfRays(world: WorldState): number {
  const tau = aerosolDepth({ visibilityKm: world.air.visibilityKm, dust: world.air.dust })[1]
  return smoothstep(0.08, 0.6, tau)
}

/** How far off (km) the beams the eye sees stand, on the whole: the scattering that shows them comes from about here. */
const BEAM_KM = 2.5

/**
 * What reaches the eye of a beam in the air (0–1): fog scatters the light but also blocks it. The light a sunbeam sends
 * toward the eye grows with the air's extinction β (more scattering) and dims on its way through the same air, as
 * β·d·e^(−β·d) for a beam `BEAM_KM` off, which peaks at β·d = 1 (a ~10 km visibility) and is held at 1 in clearer air
 * (there `hazeOfRays` takes the clean end down). Past it the beam fades: ~0.75 at 5 km, ~0.35 at 3 km, nearly none in a
 * fog of 1.5 km, where the light is already spread through the whole air and no gap or shadow keeps its contrast. The
 * glare round the disc goes the same way: it is the direct light scattered just off the disc.
 */
export function beamThrough(world: WorldState): number {
  const beta = 3.912 / Math.max(0.05, world.air.visibilityKm)
  const x = beta * BEAM_KM
  return x <= 1 ? 1 : x * Math.exp(1 - x)
}

/** The sun's height as a path through the air: 1 at the horizon, falling to 0 by 45°. */
const lowness = (altitude: number) => 1 - smoothstep(8, 45, altitude)

/** The strengths of the four cases (0–1) for a world: what the tests check and the layers draw. */
export function rayStrengths(world: WorldState) {
  const sun = world.bodies.sun
  const dark = world.night.dark
  const haze = hazeOfRays(world)
  // Fog scatters the beams and blocks them: every case is seen through the same air (`beamThrough`).
  const beam = beamThrough(world)
  const low = lowness(sun.altitude)
  const coin = coinOf(world)
  const up = smoothstep(-3, -0.5, sun.altitude) * (1 - dark)
  const seen = 1 - veilOf(world)
  // Through cloud gaps: a low sun's long path shows them in any air; higher, only as the haze has it.
  const crepuscular = up * brokenness(world) * (1 - coin) * (low + (1 - low) * haze) * (0.55 + 0.45 * haze) * beam
  // Over the crest: within ~10 px under it to a few px over it (the clearance on the drawn land), at a low sun.
  const c = sun.clearance ?? (sun.overLand ? 20 : -20)
  const atCrest = smoothstep(-10, -1, c) * (1 - smoothstep(3, 9, c)) * smoothstep(-3, -1, sun.altitude) * (1 - smoothstep(6, 10, sun.altitude))
  const ridge = atCrest * (1 - coin) * (1 - dark) * seen * (0.3 + 0.7 * haze) * beam
  const anti = crepuscular * 0.55 * smoothstep(0.5, 0.9, low) * smoothstep(0.2, 0.3, crepuscular)
  // The glare round a seen sun goes as its disc sinks behind the land (the share of it over the land, `visible`).
  const corona = (sun.visible ?? (sun.overLand ? 1 : 0)) * up * seen * (1 - coin) * smoothstep(0.1, 0.7, haze + 0.6 * low) * beam
  return { crepuscular, ridge, anti, corona }
}

/** A fan of wedges from −`span` to `span` (rad from straight up), seeded: shadows across a lit haze, a few lit beams. */
function fan(seed: string, span: number, strength: number, litShare: number, widths: [number, number], gaps: [number, number]): Ray[] {
  const r = seeded(hashId(seed))
  const rays: Ray[] = []
  for (let a = -span; a < span;) {
    const width = widths[0] + widths[1] * r()
    const lit = r() < litShare
    rays.push({ angle: a + width / 2, width: lit ? width * 0.6 : width, alpha: (0.3 + 0.7 * r()) * strength, lit })
    a += width + gaps[0] + gaps[1] * r()
  }
  return rays
}

/** Every case of rays this world shows, each its own layer on the sky (C9). */
export function rayLayersOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'rays'>[] {
  const s = rayStrengths(world)
  const sun = world.bodies.sun
  const x = geom.left + sun.x * geom.s
  const y = box.landTop + sun.y
  const rgb = mixRgb(sunLight(Math.max(0, sun.altitude), { visibilityKm: world.air.visibilityKm, dust: world.air.dust }).rgb, WHITE, 0.3)
  const shade = mixRgb(skyAt(world, box)(4), [0.2, 0.22, 0.3], 0.35)
  const out: LayerOf<'rays'>[] = []
  const layer = (id: string, z: number, ox: number, oy: number, reach: number, rays: Ray[], strength: number,
    look: 'fan' | 'corona', bottom: number) => {
    const x0 = Math.max(0, Math.floor(ox - reach)), x1 = Math.min(geom.width, Math.ceil(ox + reach))
    const y0 = Math.max(0, Math.floor(oy - reach)), y1 = Math.min(box.skyHeight, Math.ceil(bottom))
    if (x1 <= x0 || y1 <= y0) return
    out.push({ kind: 'rays', id, surface: 'sky', z, soft: true, x: ox, y: oy, reach, rays, rgb, shade, look,
      bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
      key: layerKey(id, skyBoxKey(box, true), q(ox, 0.5), q(oy, 0.5), q(strength, 0.02), tone(rgb), tone(shade)) })
  }
  const horizon = geom.horizon + 2
  if (s.crepuscular >= MIN) {
    layer('rays', 5.5, x, y, Math.min(box.skyHeight, 240), fan(`${world.place.id}:rays`, 1.45, s.crepuscular, 0.35, [0.04, 0.12], [0.04, 0.14]),
      s.crepuscular, 'fan', horizon)
  }
  if (s.ridge >= MIN) {
    // Through the crest's notches: narrower, more of them lit, shorter (the beams lose themselves in the clear sky).
    layer('rays.ridge', 5.45, x, y, Math.min(box.skyHeight, 170), fan(`${world.place.id}:rays.ridge`, 1.3, s.ridge, 0.6, [0.03, 0.08], [0.05, 0.12]),
      s.ridge, 'fan', horizon)
  }
  if (s.anti >= MIN) {
    // The point opposite the sun, as far below the horizon as the sun stands over it; drawn where it is in view.
    const ax = geom.x(sun.azimuth + 180)
    if (ax > -40 && ax < geom.width + 40) {
      layer('rays.anti', 5.4, ax, geom.y(-Math.max(0, sun.altitude)), Math.min(box.skyHeight, 260),
        fan(`${world.place.id}:rays.anti`, 1.2, s.anti, 0.3, [0.05, 0.12], [0.05, 0.15]), s.anti, 'fan', horizon)
    }
  }
  if (s.corona >= MIN) {
    // Fine and many, all round the disc, short: glare, not a starburst.
    const r = seeded(hashId(`${world.place.id}:rays.corona`))
    const rays: Ray[] = []
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 - Math.PI + (r() - 0.5) * 0.12
      rays.push({ angle, width: 0.012 + 0.03 * r(), alpha: (0.35 + 0.65 * r()) * s.corona, lit: true })
    }
    layer('rays.corona', 5.3, x, y, 64, rays, s.corona, 'corona', y + 64)
  }
  return out
}
