import { smoothstep } from '../../domain/smoothstep'
import { GENERA } from '../../world/field/genus'
import { layerMeanTransmission, SKY_CLOUD_DEPTH_SCALE } from '../../world/lightCloud'
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

// IES clear-sky diffuse illuminance in klx by day, extended by approximately
// one decade by −3 degrees and three by −8, using a quadratic in log illuminance.
export function diffuseIlluminance(altitude: number, diffuse: number) {
  const lux = altitude >= 0 ? 0.8 + 15.5 * Math.sqrt(Math.sin(altitude * RAD))
    : 0.8 * 10 ** (altitude / 3 - altitude * altitude / 192)
  return lux / LUX_AT_38 * (1 + DAY_CLOUD_DHI_GAIN * diffuse)
}

// Six tenths cover still exposes the sides of Sc rolls. At 0.95, the deck is closed.
export const deckClosure = (cover: number) => smoothstep(0.6, 0.95, cover)

// Area-weight the genera as the field morphs, so a genus handoff cannot step the light.
function cellularShare(deck: FieldLayer) {
  if (deck.lattice === 'low') return 1 - (deck.form.stratus ?? 0)
  if (deck.lattice === 'mid') return 1 - Math.max(deck.form.sheet, deck.form.nimbostratus ?? 0)
  return Number(deck.lattice === 'tower')
}

export function beamIncidence(deck: FieldLayer, altitude: number): number {
  const h = altitude * RAD
  const sin = Math.abs(Math.sin(h))
  if (deck.lattice === 'high') {
    // Ci scatters through its optically thin ice volume, while Cs is a slab.
    const ice = (1 - deck.form.veil) * -Math.expm1(-deck.kappa * deck.meanVKm)
    return ice + (1 - ice) * sin
  }
  const side = cellularShare(deck) * (1 - deckClosure(deck.cover))
  return sin * (1 - side) + Math.abs(Math.cos(h)) * side
}

export function cloudIncident(world: WorldState, height: number): RGB {
  height = Math.max(0, height)
  const altitude = world.bodies.sun.altitude
  // Body altitude is geometric. Treat this as a straight ray: the dense tangent column
  // already extinguishes light near the refracted limb.
  const dip = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + height)) / RAD
  const visible = smoothstep(-SUN_RADIUS, SUN_RADIUS, altitude + dip)
  if (!visible) return [0, 0, 0] as const
  const { transmission } = solarBeam(altitude, world.air, height)
  // A fixed daylight reference keeps the beam in the land's irradiance units through twilight.
  const scale = visible * SUN_TO_SKY / REF_BEAM
  // Solar bands are linear. Scale against the same clean-zenith photopic reference as solarBeam.strength.
  const factor = scale / CLEAN_ZENITH
  return [transmission[0] * factor, transmission[1] * factor, transmission[2] * factor] as const
}

const CLEAN_ZENITH = linearLuminance(solarBeam(90).transmission as [number, number, number])

export interface CloudBeam { direct: RGB; relay: RGB }

export function cloudBeam(world: WorldState, layer: CloudLayer, fieldLayer?: FieldLayer): CloudBeam {
  const field = world.cloudField?.field.layers
  const own = fieldLayer ?? field?.find(({ lattice }) => lattice === layer.level)
  const direct = cloudIncident(world, own ? own.baseKm + own.meanVKm / 2 : layer.baseM / 1000)
  const relay: [number, number, number] = [0, 0, 0]
  let skyView = 1
  const altitude = world.bodies.sun.altitude
  const horizontal = Math.abs(Math.sin(altitude * RAD))
  const high = field?.find(({ lattice }) => lattice === 'high')
  const mid = field?.find(({ lattice }) => lattice === 'mid')
  for (const deck of layer.level === 'low' ? [mid, high] : layer.level === 'mid' ? [high] : []) {
    if (!deck?.cover) continue
    const tau = deck.kappa * deck.meanVKm
    const escape = 1 / (1 + DIFFUSE_EXTINCTION * tau)
    const size = deck === mid ? GENERA.ac.elements : GENERA.ci.crossWidth
    const exposed = deck === mid ? cellularShare(deck) * (1 - deckClosure(deck.cover)) : 1 - deck.form.veil
    // Cylindrical elements expose projected side area 4h/(πd) per unit footprint.
    const side = exposed * 4 * deck.meanVKm / (Math.PI * Math.sqrt(size[0] * size[1])) * Math.abs(Math.cos(altitude * RAD))
    const projected = Math.min(1, horizontal + side)
    // A Lambertian deck's cover is its projected share of the receiver's sky.
    // Beer interception bounds the energy, half of which scatters down in the isotropic approximation.
    const intercepted = projected > 0 ? projected * -Math.expm1(-tau / projected) : 0
    const downward = 0.5 * (side + horizontal * (altitude < 0 ? 1 : escape)) / Math.max(Number.EPSILON, side + horizontal)
    const upperTransmission = deck === mid && high
      ? layerMeanTransmission(high.cover, high.kappa * high.meanVKm * SKY_CLOUD_DEPTH_SCALE) : 1
    const share = skyView * upperTransmission * deck.cover * intercepted * downward
    if (share > 0) {
      const upper = cloudIncident(world, deck.baseKm + deck.meanVKm / 2)
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
