import { smoothstep } from '../../domain/smoothstep'
import type { FieldLayer } from '../../world/field/types'
import { EARTH_RADIUS_KM, solarBeam } from '../../world/sceneLight'
import type { CloudLayer, RGB, WorldState } from '../../world/types'
import { DIFFUSE_EXTINCTION } from './cloudSheetMath'
import { REF_BEAM, SUN_TO_SKY } from './landIrradiance'
import { linearLuminance } from './landRadiance'
import { DAY_CLOUD_DHI_GAIN } from './landSkyIrradiance'
import { toLinear, toSrgb } from './tone'

const RAD = Math.PI / 180
const SUN_RADIUS = 0.266 // mean angular semidiameter in degrees
const LUX_AT_38 = 0.8 + 15.5 * Math.sqrt(Math.sin(38 * RAD))

function incident(world: WorldState, height: number) {
  height = Math.max(0, height)
  const altitude = world.bodies.sun.altitude
  const dip = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + height)) / RAD
  const visible = smoothstep(-SUN_RADIUS, SUN_RADIUS, altitude + dip)
  if (!visible) return [0, 0, 0] as const
  const { transmission } = solarBeam(altitude, world.air, height)
  // IES clear-sky diffuse illuminance (klx) relative to the land reference, with the existing cloud DHI gain.
  const diffuse = (0.8 + 15.5 * Math.sqrt(Math.max(0, Math.sin(altitude * RAD)))) / LUX_AT_38
  const scale = visible * SUN_TO_SKY / (REF_BEAM * diffuse * (1 + DAY_CLOUD_DHI_GAIN * world.light.diffuse))
  // Solar bands are linear. Scale against the same clean-zenith photopic reference as solarBeam.strength.
  const factor = scale / CLEAN_ZENITH
  return [transmission[0] * factor, transmission[1] * factor, transmission[2] * factor] as const
}

const CLEAN_ZENITH = linearLuminance(solarBeam(90).transmission as [number, number, number])

export interface CloudBeam { direct: RGB; relay: RGB }

export function cloudBeam(world: WorldState, layer: CloudLayer, fieldLayer?: FieldLayer): CloudBeam {
  const field = world.cloudField?.field.layers
  const own = fieldLayer ?? field?.find(({ lattice }) => lattice === layer.level)
  const direct = incident(world, own ? own.baseKm + own.meanVKm / 2 : layer.baseM / 1000)
  const relay: [number, number, number] = [0, 0, 0]
  let skyView = 1
  const altitude = world.bodies.sun.altitude
  const horizontal = Math.abs(Math.sin(altitude * RAD))
  for (const level of ['mid', 'high'] as const) {
    if (!horizontal || layer.level === 'high' || layer.level === level) continue
    const deck = field?.find(({ lattice }) => lattice === level)
    if (!deck) continue
    // A Lambertian deck covering fraction c of the upper hemisphere contributes c of the cosine-weighted sky view.
    // Conservative isotropic scattering puts at most half the intercepted beam into the downward hemisphere.
    // Beer extinction gives intercepted energy; two-stream vertical transmission accounts for the deck screening its own base.
    const tau = deck.kappa * deck.meanVKm
    const escape = 1 / (1 + DIFFUSE_EXTINCTION * tau)
    // From below, single backscatter escapes through the incident face.
    const scatter = -Math.expm1(-tau / horizontal) * (altitude < 0 ? 1 : escape) / 2
    const share = skyView * deck.cover * horizontal * scatter
    if (share > 0) {
      const upper = incident(world, altitude < 0 ? deck.baseKm : deck.baseKm + deck.meanVKm)
      for (let i = 0; i < 3; i++) relay[i] += upper[i] * share
    }
    skyView *= 1 - deck.cover * (1 - escape)
  }
  return { direct, relay }
}

const room = (body: number, beam: number) => beam > 0 ? (1 - body) / beam : Infinity

/** Add beam in linear light, scaling all channels together as the brightest channel approaches display white. */
export function litTone(body: RGB, beam: RGB, through: number): RGB {
  const peak = Math.max(beam[0], beam[1], beam[2]) * through
  if (peak <= 0) return body
  const r = toLinear(body[0]), g = toLinear(body[1]), b = toLinear(body[2])
  // In the adapted display only the headroom above the diffuse luminance is available to the beam.
  // Let the beam take its share of that budget and apply a common limit before any channel clips.
  const available = 1 - linearLuminance([r, g, b])
  const share = Math.min(available * through / (1 + peak), room(r, beam[0]), room(g, beam[1]), room(b, beam[2]))
  return [toSrgb(r + beam[0] * share), toSrgb(g + beam[1] * share), toSrgb(b + beam[2] * share)]
}
