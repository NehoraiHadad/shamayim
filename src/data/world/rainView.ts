import { azimuthAt, type Camera } from '../../domain/camera'
import type { RadarOutlook } from '../../domain/outlookNow'
import type { Band, EchoGrid } from '../../domain/rainNowcast'
import { apparentAngle } from '../terrain/panorama'

/** Cloud base above the eye (m) a shower falls from: Israel's winter showers, ~1–2 km. */
export const CLOUD_BASE_M = 1500
/** Rain is looked for this far (km); past it the curtain sinks under the horizon and the haze. */
const REACH_KM = 90
const STEP_KM = 1

/** Cloud tops above the eye (m) by rain strength: light showers, moderate rain, heavy (towering) storms. */
export const CLOUD_TOP_M = [0, 3500, 5000, 7000]

/**
 * The rain seen in one column: how far its nearest curtain is, how strong, and where it stands on screen: `top` the
 * cloud base (the curtain's top), `cloudTop` the top of the cloud it falls from.
 */
export interface RainColumn { left: number; right: number; km: number; band: Band; top: number; cloudTop: number }

/**
 * Where the rain is, as the place's eye sees it: along each column's own direction, the nearest radar echo (walked
 * outward in 1 km steps through the newest frame) and its curtain's top, the cloud base at that distance on the sky's
 * angle scale. Columns with no rain within reach are left out. The curtain's foot is wherever the land in front hides
 * it (the caller layers it by `km` against the near and far ridges).
 */
export function rainColumns(grid: EchoGrid, camera: Camera, angleY: (deg: number) => number, step = 2): RainColumn[] {
  const out: RainColumn[] = []
  const c = (grid.size - 1) / 2
  for (let left = 0; left < camera.width; left += step) {
    const azimuth = (azimuthAt((left + step / 2) / camera.width, camera) * Math.PI) / 180
    const east = Math.sin(azimuth), north = Math.cos(azimuth)
    for (let km = 2; km <= REACH_KM; km += STEP_KM) {
      const x = Math.round(c + (east * km) / grid.kmPerCell), y = Math.round(c - (north * km) / grid.kmPerCell)
      if (x < 0 || y < 0 || x >= grid.size || y >= grid.size) break
      const band = grid.cells[y * grid.size + x] as Band
      if (!band) continue
      // The strongest echo a little further along the same line sets the cloud's height (a storm's core behind its edge).
      let core: Band = band
      for (let k = km + 1; k <= km + 8; k++) {
        const cx = Math.round(c + (east * k) / grid.kmPerCell), cy = Math.round(c - (north * k) / grid.kmPerCell)
        if (cx < 0 || cy < 0 || cx >= grid.size || cy >= grid.size) break
        core = Math.max(core, grid.cells[cy * grid.size + cx]) as Band
      }
      // Billowed tops: the cloud's height wanders with the direction (fixed by azimuth, so it never moves as the view
      // turns), within a fifth of its height.
      const deg = (azimuth * 180) / Math.PI
      const billow = 1 + .1 * Math.sin(deg * .41) + .07 * Math.sin(deg * 1.13 + 1.7) + .04 * Math.sin(deg * 2.9 + .4)
      out.push({ left, right: Math.min(camera.width, left + step), km, band, top: angleY(apparentAngle(CLOUD_BASE_M, km, 0)),
        cloudTop: angleY(apparentAngle(CLOUD_TOP_M[core] * billow, km, 0)) })
      break
    }
  }
  return out
}

const NAMES = ['בצפון', 'בצפון־מזרח', 'במזרח', 'בדרום־מזרח', 'בדרום', 'בדרום־מערב', 'במערב', 'בצפון־מערב']
/** "במערב" for a bearing. */
export const directionHe = (bearing: number) => NAMES[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]

/**
 * The compass's rain: where the rain on its way here is (else the nearest within reach), and one line about it, from the
 * radar's own outlook (the same verdict as the rain page).
 */
export function rainMark(rain: RadarOutlook | null): { azimuth: number; text: string } | null {
  if (!rain) return null
  if (rain.now > 0) return rain.nearest ? { azimuth: rain.nearest.bearing, text: 'יורד גשם עכשיו' } : null
  const where = rain.approach ?? rain.nearest
  if (!where || where.km > 80) return null
  const km = `כ־${Math.max(1, Math.round(where.km))} ק״מ`
  const when = rain.arrivesIn !== null ? `, מגיע בעוד כ־${Math.round(rain.arrivesIn / 5) * 5} דק׳` : rain.motion ? ', לא בדרך לכאן' : ''
  return { azimuth: where.bearing, text: `גשם ${directionHe(where.bearing)}, ${km}${when}` }
}

