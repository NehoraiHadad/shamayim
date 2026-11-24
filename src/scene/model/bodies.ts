import { coinOf } from '../../world/air'
import { moonLook } from '../../world/moonShape'
import { sunFlattening, sunLight, aerosolDepth } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { coversOf, skyGeom, veilOf, type SkyGeom } from './sky'
import { skyGradeOf, unfilterDisc } from './skyGrade'
import { mixRgb } from './tone'
import type { Disc, LayerOf, MoonDisc, RGB, SceneBox } from './types'

const WHITE: RGB = [1, 1, 1]
/** The discs' radii (px), as the SVG scene draws them (an 18 px sun, a 14 px moon). */
export const SUN_R = 9
export const MOON_R = 7
/** The pale coin dust makes of the sun (the SVG's #F3E3B8). */
const COIN: RGB = [0xf3 / 255, 0xe3 / 255, 0xb8 / 255]

/**
 * The sun's disc where the world puts it (`bodies.sun`: its true azimuth across, its apparent altitude up on the shared
 * relief), while it is up: hot core, redder limb, squashed by refraction near the horizon, a close aureole as wide as the
 * aerosol makes it; veiled by the cloud in front (the share of its direct light the layers take). Behind a ridge it is
 * still drawn: whatever land and structures are drawn in front of it hide it (the land surface lies over the sky), and the
 * light judges it on that same drawn line (`world/drawnSkyline.ts`).
 */
export function sunDisc(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): Disc | null {
  const sun = world.bodies.sun
  if (!sun.up) return null
  const aerosol = world.air
  const { rgb, strength } = sunLight(Math.max(0, sun.altitude), aerosol)
  const coin = coinOf(aerosol)
  const core = mixRgb(mixRgb(rgb, WHITE, 0.5 * strength), COIN, coin)
  const limb: RGB = mixRgb([rgb[0] * 0.86, rgb[1] * 0.78, rgb[2] * 0.66], COIN, coin)
  return {
    x: geom.left + sun.x * geom.s, y: box.landTop + sun.y, r: SUN_R, rgb, veil: veilOf(world), core, limb, halo: rgb,
    aureole: Math.min(1.6, 0.55 + aerosolDepth(aerosol)[1]) * (1 - coin), flatten: sunFlattening(sun.altitude), coin,
  }
}

/**
 * The moon where the world puts it, in its true phase with the lit limb turned to the sun (`moon.tilt`), as the SVG scene
 * shows it (`moonLook`): bone by night, sky-pale by day, veiled from 40 % cover up, gone under overcast or thick haze.
 */
export function moonDisc(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): MoonDisc | null {
  const moon = world.bodies.moon
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const thick = 1 - (1 - low) * (1 - mid)
  // As `moonCloud`: thick cloud counts in full, the thin high cloud above it for a fifth.
  const cloud = 100 * (thick + 0.2 * (union - thick))
  const look = moonLook({ altitude: moon.altitude, fraction: moon.illumination, sunAltitude: world.bodies.sun.altitude, cloudCover: cloud,
    farFade: world.air.farFade })
  if (!look || !moon.up) return null
  const bone: RGB = [0xe9 / 255, 0xe4 / 255, 0xd4 / 255], day: RGB = [0xf3 / 255, 0xf6 / 255, 0xfa / 255]
  return {
    x: geom.left + moon.x * geom.s, y: box.landTop + moon.y, r: MOON_R, rgb: mixRgb(bone, day, look.daylight), alpha: look.opacity * world.light.clear,
    fraction: moon.illumination, tilt: moon.tilt, daylight: look.daylight, ring: look.ring,
    earthshine: moon.illumination < 0.35 ? 0.12 * world.night.dark : 0,
  }
}

const r1 = (v: number) => Math.round(v * 4) / 4
/** Over the clouds (6–8) and the rain's edge (8.5), under the flashes (9) and the near fall (11). */
const AUREOLE_Z = 8.6

/** The sun and the moon, each its own small layer round its disc (a scrub repaints only the disc that moved). */
export function bodyLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'bodies'>[] {
  const out: LayerOf<'bodies'>[] = []
  const grade = skyGradeOf(world, box)
  const physicalMoon = moonDisc(world, box, geom)
  const moon = physicalMoon && { ...physicalMoon, rgb: unfilterDisc(grade, physicalMoon.y, physicalMoon.rgb) }
  if (moon) {
    const pad = MOON_R + 3
    out.push({ kind: 'bodies', id: 'bodies.moon', surface: 'sky', z: 4, sun: null, moon,
      bounds: { x: Math.floor(moon.x - pad), y: Math.floor(moon.y - pad), w: 2 * pad + 1, h: 2 * pad + 1 },
      key: layerKey('moon', skyBoxKey(box), r1(moon.x), r1(moon.y), colourKey(moon.rgb), Math.round(moon.alpha * 255),
        Math.round(moon.fraction * 200), Math.round(moon.tilt), Math.round(moon.daylight * 50), moon.ring, Math.round(moon.earthshine * 255)) })
  }
  const physicalSun = sunDisc(world, box, geom)
  const sun = physicalSun && { ...physicalSun,
    core: unfilterDisc(grade, physicalSun.y, physicalSun.core),
    limb: unfilterDisc(grade, physicalSun.y, physicalSun.limb),
    ...(grade && physicalSun.veil > 0.15 && { cloudGlow: physicalSun.core }) }
  if (sun) {
    const pad = Math.ceil(SUN_R * 3.2)
    out.push({ kind: 'bodies', id: 'bodies.sun', surface: 'sky', z: 5, sun, moon: null,
      bounds: { x: Math.floor(sun.x - pad), y: Math.floor(sun.y - pad), w: 2 * pad + 1, h: 2 * pad + 1 },
      key: layerKey('sun', skyBoxKey(box), r1(sun.x), r1(sun.y), colourKey(sun.core), colourKey(sun.limb), Math.round(sun.veil * 100),
        Math.round(sun.aureole * 50), Math.round(sun.flatten * 100), Math.round(sun.coin * 50),
        ...(sun.cloudGlow ? [colourKey(sun.cloudGlow)] : [])) })
    // C9 (defect 2): the aureole is the air's own forward glow between the eye and the sun, nearer than any cloud: it lies
    // over a bank in front of the sun as over the clear sky (the disc stays behind the bank), so a lobe over the disc never
    // reads as a black coin in a bright ring. Under the near rain and the sky's grains.
    const reach = Math.ceil(SUN_R * 2.6) + 1
    if (sun.aureole > 0 && sun.veil < 0.995) {
      out.push({ kind: 'bodies', id: 'bodies.aureole', surface: 'sky', z: AUREOLE_Z, sun, moon: null, part: 'aureole',
        bounds: { x: Math.floor(sun.x - reach), y: Math.floor(sun.y - reach), w: 2 * reach + 1, h: 2 * reach + 1 },
        key: layerKey('aureole', skyBoxKey(box), r1(sun.x), r1(sun.y), colourKey(sun.halo), Math.round(sun.veil * 100),
          Math.round(sun.aureole * 50)) })
    }
  }
  return out
}
