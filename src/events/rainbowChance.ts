import { BOW, rainbowOf } from '../world/optics'
import { cloudLight, SKY_CLOUD_DEPTH_SCALE } from '../world/lightCloud'
import { hazeDirect } from '../world/sceneLight'
import type { Detector, EventSky } from './types'

/** Rain in this share of the models' runs, and a bow this plain (0–1), make a chance worth a look. */
const LIKELY = 40
/** Less than this (mm in the hour) is no shower. */
const WET = 0.1
const PLAIN = 0.2

/** The bow of the forecast hour: showers with the sun low behind the eye and between the clouds (`rainbowOf`). */
function bowAt(sky: EventSky, ms: number) {
  const hour = sky.hourAt(ms), covers = sky.coversAt(ms), sun = sky.sunAt(ms)
  if (!hour || !covers || hour.precipProb == null || hour.precipProb < LIKELY || hour.precipitation < WET || sun.altitude < 2 || !sky.clear(sun)) return null
  const visibilityKm = hour.visibility == null ? 25 : hour.visibility / 1000
  const direct = cloudLight(covers, undefined, SKY_CLOUD_DEPTH_SCALE).clear * hazeDirect(sun.altitude, { visibilityKm })
  const bow = rainbowOf({ sun, direct, sunLights: true, covers, coin: 0,
    rain: { rateMmH: hour.precipitation, cells: [{ fromAzimuth: 0, toAzimuth: 360, bank: 'forecast' }] } })
  return bow && bow.strength >= PLAIN ? { azimuth: bow.antisolar.azimuth, altitude: BOW.primary[1] + bow.antisolar.altitude } : null
}

/** A chance of a rainbow in the forecast's showers. */
export const rainbowChance: Detector = (sky) =>
  [{ what: 'תיתכן קשת בענן', perYear: 8, tell: 'span', weatherDependent: true, from: sky.from, to: sky.to, stepMin: 15, leastMin: 30,
    at: (ms) => bowAt(sky, ms) }]
