import { daylitShare } from '../../domain/cloudDaylight'
import { solarBeam } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { atLuminance, luminanceOf } from './cloudChromaticity'
import { REF_BEAM, SUN_TO_SKY } from './landIrradiance'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { DAY_CLOUD_DHI_GAIN } from './landSkyIrradiance'
import { mixRgb } from './tone'

/*
 * The daylit side of a cloud: the beam as it arrives at the cloud's own height, added in linear light to the diffuse
 * light its body stands in. Under the last degrees of sun the tones are the twilight's own.
 */

const RAD = Math.PI / 180
/** Clear-sky diffuse proxy in klx. The square-root fit in docs/briefs/found/sky-colour.diagnosis.md
 * has 0.8 klx at the horizon and 16.3 klx at zenith, a span of 15.5 klx. */
const clearDiffuse = (altitude: number) => 0.8 + 15.5 * Math.sqrt(Math.sin(altitude * RAD))
/** The eye is adapted to a clean high sun, whose light on a cloud is white. */
const WHITE_BEAM = solarBeam(90).transmission

/** The direct beam `km` up against the diffuse light of the sky, and its colour (linear, a clean high sun's is white). */
function beamAt(world: WorldState, km: number) {
  const { altitude } = world.bodies.sun
  const { transmission, strength } = solarBeam(altitude, world.air, km)
  const diffuse = clearDiffuse(altitude) / clearDiffuse(38) * (1 + DAY_CLOUD_DHI_GAIN * world.light.diffuse)
  const white = transmission.map((t, i) => t / WHITE_BEAM[i])
  const y = linearLuminance([white[0], white[1], white[2]])
  return { ratio: SUN_TO_SKY * strength / REF_BEAM / diffuse, colour: white.map((v) => v / y) }
}

/**
 * A cloud's lit tone `km` up, `through` the share of the beam that shows on it, from its body and from `twilight`, the tone
 * it has under the last of the sun. Its brightness is that tone's, and never below the body's: a beam only adds light.
 */
export function sunlitTone(world: WorldState, km: number, through: number, body: RGB, twilight: RGB): RGB {
  const share = daylitShare(world.bodies.sun.altitude)
  if (!share) return twilight
  const own = srgbRgbToLinear(body), y = linearLuminance(own)
  const { ratio, colour } = beamAt(world, km)
  const band = (i: 0 | 1 | 2) => own[i] / y + through * ratio * colour[i]
  return mixRgb(twilight, atLuminance([band(0), band(1), band(2)], Math.max(y, luminanceOf(twilight))), share)
}
