import type { WorldState } from '../../world/types'
import { apparentAltitude } from '../../world/skyProjection'
import { clearNoonBeamShare } from './landIrradiance'
import type { Lamp, LampKind, LampPlace as Place } from './layers/lamp'
import { skyGeom } from './sky'
import type { LayerDesc, SceneBox } from './types'

type LampSurface = 'sky' | 'land'
type LampProjection = (surface: LampSurface) => Lamp

const quantise = (value: number, step: number) => Math.round(value / step) * step || 0
const hasPosition = (body: { altitude: number; azimuth: number }) =>
  Number.isFinite(body.altitude) && Number.isFinite(body.azimuth)

/** Compute the shared beam and projection once, then express it in either surface's coordinates. */
export function lampOf(world: WorldState, box: SceneBox): LampProjection | undefined {
  const { sun, moon } = world.bodies
  const sunAlt = apparentAltitude(sun.altitude)
  const moonAlt = moon ? apparentAltitude(moon.altitude) : -Infinity
  // The lamp follows the brief's −4° switch and keeps the sun through nautical twilight (−12°).
  const keepSun = hasPosition(sun) && sunAlt >= -12
  const body = keepSun && sunAlt >= -4 ? 'sun'
    : moon && hasPosition(moon) && moonAlt >= 0 && moon.illumination > 0 ? 'moon'
    : keepSun ? 'sun' : undefined
  if (!body) return
  const source = world.bodies[body]
  const altitude = body === 'sun' ? sunAlt : moonAlt
  const geom = skyGeom(world, box)
  // Store on the requested 2 px, half-degree and 1/64 beam grids before keying.
  const strength = quantise(altitude < 0 ? 0 : clearNoonBeamShare(world, body), 1 / 64)
  const place = (azimuth: number, altitude: number): Place => ({
    // geom.x uses xOf's seam behind the camera, like the discs.
    x: quantise(geom.x(azimuth) - geom.left, 2),
    y: quantise(geom.y(altitude) - box.landTop, 2),
    // Cloud cells aim toward the disc plane (y) for silver lining. Use domeY for direction
    // in a sheet painted on the stretched dome above DOME_ALT.
    domeY: quantise(geom.dome(altitude) - box.landTop, 2),
    altitude: quantise(altitude, 0.5),
  })
  const at = place(source.azimuth, altitude)
  const sunPlace = body === 'moon' && keepSun ? place(sun.azimuth, sunAlt) : undefined
  return (target) => {
    // Translate the grid with the surface, so odd offsets still point at the same device pixel.
    const local = (p: Place): Place => target === 'land' ? p : {
      x: (p.x + geom.left) || 0, y: (p.y + box.landTop) || 0,
      domeY: (p.domeY + box.landTop) || 0, altitude: p.altitude,
    }
    return { ...local(at), body, strength, ...(sunPlace ? { sun: local(sunPlace) } : {}) }
  }
}

function lampBits(lamp: Lamp) {
  const at = ({ x, y, domeY, altitude }: Place) => [x, y, domeY, altitude].join(',')
  // The dyadic beam step survives intact, unlike the decimal rounding in layerKey.
  return `:lamp:${lamp.body},${at(lamp)},${lamp.strength}${lamp.sun ? `;${at(lamp.sun)}` : ''}`
}

export function withLamp(layers: LayerDesc[], world: WorldState, box: SceneBox, kinds?: readonly LampKind[]): LayerDesc[] {
  if (!kinds?.length) return layers
  const project = lampOf(world, box)
  if (!project) return layers
  const bySurface: Partial<Record<LampSurface, { lamp: Lamp; bits: string }>> = {}
  return layers.map((layer) => {
    const { kind } = layer
    if (kind !== 'cloudSheet' && kind !== 'plane' && kind !== 'canopy' && kind !== 'water') return layer
    if (!kinds.includes(kind)) return layer
    const surface = kind === 'cloudSheet' ? 'sky' : 'land'
    if (!bySurface[surface]) {
      const lamp = project(surface)
      bySurface[surface] = { lamp, bits: lampBits(lamp) }
    }
    const { lamp, bits } = bySurface[surface]
    // Cloud sheets have no light part. Land receivers keep their form and paired raster contracts.
    if (kind === 'cloudSheet' || !layer.light) return { ...layer, lamp, key: layer.key + bits }
    if (kind === 'plane') return { ...layer, lamp, light: { ...layer.light, key: layer.light.key + bits } }
    return { ...layer, lamp, light: { ...layer.light, key: layer.light.key + bits } }
  })
}
