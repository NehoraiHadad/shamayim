//# allFunctionsCalledOnLoad
import type { Camera } from '../../domain/camera'
import { MOON_RGB } from '../../world/light'
import { cloudLight } from '../../world/lightCloud'
import { moonlightStrength } from '../../world/moonlight'
import type { LightDir, Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import { aerosolDepth, solarBeam } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { dirAtBearing, linearLuminance, unitChroma, WET_REFLECTANCE_DROP } from './landRadiance'
import { DAY_CLOUD_DHI_GAIN, diffuseSky } from './landSkyIrradiance'

export type RadianceLight = Pick<WorldState['light'], 'azimuth' | 'altitude' | 'dir' | 'palette' | 'ambient' | 'shares' | 'diffuse'>
  & Partial<Pick<WorldState['light'], 'afterglow'>>

export type RadianceWorld = Pick<WorldState, 'ground'> & {
  light: RadianceLight
  bodies?: Pick<WorldState['bodies'], 'sun' | 'moon'>
  air?: Pick<WorldState['air'], 'visibilityKm' | 'dustWeight'> & Partial<Pick<WorldState['air'], 'farFade'>>
  camera?: Pick<Camera, 'heading' | 'handed'>
  cloudField?: WorldState['cloudField']
}
export interface LandIrradiance {
  eSunPi: number; eMoonPi: number; eSkyPi: number
  cSun: [number, number, number]; cMoon: [number, number, number]; cSky: [number, number, number]
  sunDir: LightDir; moonDir: LightDir; sunAz: number; sunAlt: number; moonAz: number; moonAlt: number
  yHorizon: number; wetFactor: number; skyBias: number
  eSunVec: [number, number, number]; eMoonVec: [number, number, number]; eSkyVec: [number, number, number]
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const scale = (rgb: RGB, k: number): [number, number, number] => [rgb[0] * k, rgb[1] * k, rgb[2] * k]
const normalized = (rgb: RGB) => scale(rgb, 1 / Math.max(1e-6, linearLuminance(rgb)))

/** Cosine integral of an isotropic dome plus the first azimuthal moment of the solar-side lobe. */
export function skyView(normal: Normal, sun: LightDir, bias: number) {
  const horizontal = Math.hypot(sun.across, sun.ahead) || 1
  return clamp01((1 + normal[2]) * 0.5 + bias * (normal[0] * sun.across + normal[1] * sun.ahead) / horizontal)
}

// Bird & Hulstrom (SERI/TR-642-761), evaluated at 52° zenith, air mass 1.62, 101325 Pa,
// 1361 W/m² extraterrestrial DNI, 0.30 atm-cm ozone, 1.5 cm water, 0.116 AOD at 500 nm,
// 0.166 at 380 nm (Ångström 1.3), 0.85 aerosol asymmetry and 0.18 ground albedo:
// DNI ≈ 828 W/m², DHI ≈ 109 W/m². This reference fixes the clear beam/fill ratio.
// The 5.65 divisor is the illustration's daytime radiance scale, independent of horizon azimuth.
const DAY_DHI = 1 / 5.65
const DAY_DNI = 7.62 * DAY_DHI
const REF_AIR = { visibilityKm: 30, dustWeight: 0 }
const REF_BEAM = solarBeam(38, REF_AIR).strength
const REF_SCATTER = 0.099 + aerosolDepth(REF_AIR)[1]

// Kyba, Mohar & Posch 2017, doi:10.1093/astrogeo/atx025: ~0.05–0.1 lx typical moonlight,
// peak near 0.3 lx. Moon share carries phase, height, air and open deck. Use 0.30 lx full moon
// against a 0.625 lx illustration reference at night, with a daylight-relative fade in twilight.
const FULL_MOON_LUX = 0.30
const NIGHT_EXPOSURE_LUX = 0.625
const memo = new WeakMap<RadianceWorld, LandIrradiance>()

export function landIrradiance(world: RadianceWorld): LandIrradiance {
  const known = memo.get(world)
  if (known) return known
  const { light } = world
  const sunAz = world.bodies?.sun.azimuth ?? light.azimuth
  const sunAlt = world.bodies?.sun.altitude ?? (light.shares.moon > light.shares.sun ? -15 : light.altitude)
  const moonAz = world.bodies?.moon.azimuth ?? light.azimuth
  const moonAlt = world.bodies?.moon.altitude ?? (light.shares.moon > light.shares.sun ? light.altitude : -15)
  const air = world.air ?? REF_AIR
  const beam = solarBeam(sunAlt, air)
  const field = world.cloudField?.field
  const open = field ? cloudLight({ low: 0, mid: 0, high: 0 }, field).open : undefined
  // The viewer's disc can be below a ridge while the terrain across the valley is in the beam.
  // Solar and lunar terrain clearance are evaluated at the receiver. Minimal worlds without
  // a cloud field use their supplied world light shares.
  const openVisible = open === undefined ? clamp01(light.shares.sun / Math.max(1e-4, beam.strength ** 0.35))
    : open * smoothstep(-0.265, 0.265, sunAlt)
  const moon = world.bodies?.moon
  const moonShare = open === undefined || !moon ? light.shares.moon
    : open * moonlightStrength({ altitude: moon.altitude, azimuth: moon.azimuth, fraction: moon.illumination },
      sunAlt, 0, world.air?.farFade ?? 0)
  const day = smoothstep(2, 15, sunAlt)
  const tau = 0.099 + aerosolDepth(air)[1]
  const scatter = Math.min(0.7, Math.max(0, 1 - Math.exp(REF_SCATTER - tau)))
  const sky = diffuseSky(light, sunAlt, tau)
  const eSkyPi = sky.amount * (1 - day) + DAY_DHI * (1 + DAY_CLOUD_DHI_GAIN * Math.max(clamp01(light.diffuse), scatter)) * day
  const eSunPi = DAY_DNI * openVisible * Math.min(1.15, beam.strength / REF_BEAM)
  const eMoonPi = FULL_MOON_LUX / NIGHT_EXPOSURE_LUX * clamp01(moonShare)
  const cSun = normalized(beam.transmission as unknown as RGB), cMoon = unitChroma(MOON_RGB), cSky = normalized(sky.rgb)
  const wetFactor = 1 - WET_REFLECTANCE_DROP * clamp01(world.ground.wet)
  const heading = world.camera?.heading ?? 180, handed = world.camera?.handed ?? 1
  const sunDir = world.bodies ? dirAtBearing(sunAz, sunAlt, heading, handed) : light.dir
  const moonDir = world.bodies ? dirAtBearing(moonAz, moonAlt, heading, handed) : light.dir
  const irr: LandIrradiance = {
    eSunPi, eMoonPi, eSkyPi, cSun, cMoon, cSky, sunDir, moonDir, sunAz, sunAlt, moonAz, moonAlt,
    yHorizon: sky.exposure, wetFactor, skyBias: sky.bias,
    eSunVec: scale(cSun, eSunPi * wetFactor), eMoonVec: scale(cMoon, eMoonPi * wetFactor), eSkyVec: scale(cSky, eSkyPi * wetFactor),
  }
  memo.set(world, irr)
  return irr
}
