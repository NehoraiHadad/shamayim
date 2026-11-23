import { smoothstep } from '../../world/ridgeLighting'
import type { CloudLevel, WorldState } from '../../world/types'
import type { SkyGeom } from './sky'
import { addLight, mixRgb, rgbOf } from './tone'
import type { Glow, RGB } from './types'

/*
 * The towns' light at night, where the towns really are (`world/townLights.ts`): on the base of a cloud over them, in the
 * air between, and in a clear sky as a low wide dome over each town's bearing (over the whole sky inside a city). It is
 * light added to what is there, so it lightens and warms a night and never darkens a dusk.
 */

/** The towns' light as the air and a cloud base give it back: sodium and warm LED, with little blue to add. */
export const CITY_RGB: RGB = [0.36, 0.3, 0.14]
/** How much of the towns' light reaches a layer's base: the low deck is nearest and takes most. */
const CITY_REACH: Record<CloudLevel, number> = { low: 1, mid: 0.65, high: 0.3 }
/** The built share under a base that lights it to 1 − 1/e of a bright city's (a village's few hundredths show faintly). */
const FULL_BUILT = 0.1
/** The sky glow (Walker's units) that lights the air to 1 − 1/e of a metropolis's. */
const FULL_GLOW = 4
/** The most of the city's light a base overhead gives back, and the long path of lit air before a far one. */
const ON_BASE = 0.28, IN_AIR = 0.65
/** The most of it clear air over a metropolis gives at eye level (there is little in it to give light back). */
const ON_SKY = 0.09
/** The most a dome of lit air stands out of the sky round it. */
const ON_DOME = 0.3

/** How far the towns are lit: the dark, and the windows and streets still on. */
const townsOn = (world: WorldState) => world.night.dark * (0.5 + 0.5 * world.night.litShare)
const airShare = (glow: number) => 1 - Math.exp(-glow / FULL_GLOW)
const fallen = (altitude: number, height: number) => 0.5 ** (Math.max(0, altitude) / height)

/** Toward a bearing, the share of the city's light on a level's base over (`e`, `n`) km, seen `altitude` up at `km`. */
export type CityOnBase = (azimuth: number) => (e: number, n: number, altitude: number, km: number) => number

/** A layer's base lit from below by the towns at night; null by day, or with no cloud to give the light back. */
export function cityLit(world: WorldState, level: CloudLevel, cover: number): CityOnBase | null {
  const on = townsOn(world) * CITY_REACH[level] * smoothstep(0.3, 0.9, cover)
  if (on < 1 / 256) return null
  const { under, air } = world.townLights, { toward } = air()
  return (azimuth) => {
    const { glow, height } = toward(azimuth), lit = IN_AIR * airShare(glow)
    return (e, n, altitude, km) => {
      const base = ON_BASE * (1 - Math.exp(-under(level, e, n) / FULL_BUILT))
      return on * (base + (lit * fallen(altitude, height) - base) * world.air.fade(km))
    }
  }
}

/** A colour of the night sky `altitude` up with the towns' light every side alike gets of it. */
export function cityOnSky(world: WorldState, rgb: RGB, altitude: number): RGB {
  const on = townsOn(world)
  if (!on) return rgb
  const { glow, height } = world.townLights.air().even
  return addLight(rgb, CITY_RGB, ON_SKY * on * airShare(glow) * fallen(altitude, height))
}

/** The domes of lit air over the towns that stand out of it, each over its true bearing on the horizon (sky px). */
export function cityDomes(world: WorldState, geom: SkyGeom): Glow[] {
  const on = townsOn(world)
  if (!on) return []
  const { even, domes } = world.townLights.air(), { horizon, mid } = world.light.palette
  const { period } = geom.azimuthRange, y = geom.horizon
  return domes.flatMap((d) => {
    const alpha = ON_DOME * on * (airShare(even.glow + d.glow) - airShare(even.glow))
    if (alpha < 0.005) return []
    // The sky behind it (its mid tone stands ~30° up) with the town's light on it; it falls to nothing at twice its half.
    const rgb = addLight(mixRgb(rgbOf(horizon), rgbOf(mid), d.height / 60), CITY_RGB, 1)
    const r = 2 * d.width * period / 360, ry = Math.max(1, y - geom.dome(Math.min(90, 2 * d.height)))
    const at = geom.x(d.azimuth)
    // Wherever the turn of the horizon brings it into view.
    return [at - period, at, at + period].flatMap((x) => x + r < 0 || x - r > geom.width ? [] : [{ x, y, r, ry, rgb, alpha }])
  })
}
