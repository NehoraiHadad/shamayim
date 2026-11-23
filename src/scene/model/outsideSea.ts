//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { hits } from '../../world/sceneClearance'
import type { RGB, WorldState } from '../../world/types'
import { facetShare } from '../../world/water'
import { aerialFor, hazeOf } from './landVeil'
import { skyAt } from './sky'
import { mixRgb } from './tone'
import type { Box, SceneBox, SeaDesc, Streak } from './types'
import { openWaterTone } from './water'

/** The sea's mirrored sky: grazing at the far edge, steeper at the near (deg below the horizon, the virtual eye's). */
const SEA_DEPRESSION: [number, number] = [1.2, 5]
const DEEP: RGB = [0.06, 0.17, 0.21]
const SAND: RGB = [0.86, 0.8, 0.66]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * The coastal sea (C5b item 1): its tones from the horizon down to the sheet by C3's rule for open water (`openWaterTone`:
 * the sky mirrored by Fresnel at each row's angle below eye level, over the water's dark, then the air at the row's
 * distance), the shore, the horizon's fine light line, ripples shorter and fainter toward the horizon, and the light's
 * path toward the sun (or moon) where it stands over the water, widening toward the eye.
 */
export function outsideSea(world: WorldState, box: SceneBox, sx: number, clear: readonly Box[]): SeaDesc | null {
  const sea = world.water.coastalSea
  if (!sea) return null
  const haze = hazeOf(world)
  const aerial = aerialFor(world, haze)
  const tone = openWaterTone(world, box)
  const kmAt = (y: number) => {
    const k = sea.km
    if (y <= k[0][0]) return k[0][1]
    for (let i = 1; i < k.length; i++) if (y <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (y - k[i - 1][0]) / (k[i][0] - k[i - 1][0])
    return k.at(-1)![1]
  }
  const span = Math.max(1, sea.bottom - sea.top)
  const stops: [number, RGB][] = [0, .08, .2, .4, .65, 1].map((t) => { const y = sea.top + t * span; return [t, tone(y, kmAt(y))] })
  const midKm = kmAt((sea.top + sea.bottom) / 2)
  const shore = aerial(mixRgb(mixRgb(SAND, world.light.colour, 0.25 * clamp01(world.light.direct)), haze, 0.35 + 0.4 * world.night.dark), midKm)
  const xs = sea.points.map(([x]) => x * sx)
  const left = Math.min(...xs), right = Math.max(...xs)
  // The light's path: under the sun (or moon) where it stands over the water, its strength the share of facets the one
  // wind tilts toward the eye at the water's depression, dimmed by the cloud in front (`light.eye`).
  const { light, wind } = world
  // The living light: the path goes with the source's direct share (fading as its disc sinks), not with a side.
  const byMoon = light.shares.moon > light.shares.sun
  const beam = light.eye
  const body = beam > 0 ? (byMoon ? world.bodies.moon : world.bodies.sun) : null
  let glint: SeaDesc['glint'] = null
  const coastX = (y: number) => {
    const c = sea.coast
    for (let i = 1; i < c.length; i++) if (y <= c[i][1]) return (c[i - 1][0] + (c[i][0] - c[i - 1][0]) * (y - c[i - 1][1]) / Math.max(.01, c[i][1] - c[i - 1][1])) * sx
    return c.at(-1)![0] * sx
  }
  const wet = (x: number, y: number) => sea.side === 'right' ? x > coastX(y) : x < coastX(y)
  if (body?.up) {
    const x = body.x * sx
    const share = Math.max(facetShare(body.altitude, SEA_DEPRESSION[0], wind.ms), facetShare(body.altitude, SEA_DEPRESSION[1], wind.ms))
    const strength = clamp01(beam) * (byMoon ? 0.4 : 1)
    const alpha = 1 - Math.exp(-12 * share * strength)
    if (x > left + 1 && x < right - 1 && alpha > 0.03) {
      const random = seeded(hashId(`${world.place.id}:coast-glint`))
      const sparks: Streak[] = []
      const spread = 1.5 + 6 * Math.min(1, wind.ms / 10)
      for (let i = 0; i < 60; i++) {
        const v = random(), a = random(), b = random()
        const y = sea.top + .4 + v * v * (span - .4)
        const w = (0.6 + 1.6 * random()) * (0.4 + v)
        const across = (a + b - 1) * spread * (0.2 + v)
        const s = alpha * Math.exp(-((across / spread) ** 2)) * (0.4 + 0.6 * random())
        if (s < 0.04 || !wet(x + across, y) || hits(clear, x + across - w / 2, y - .3, x + across + w / 2, y + .3)) continue
        sparks.push({ x: x + across - w / 2, y, w, alpha: s })
      }
      glint = { x, rgb: byMoon ? [0.88, 0.91, 0.96] : mixRgb(light.colour, [1, 1, 1], 0.5), alpha, sparks }
    }
  }
  // Ripples: short strokes over the water, more with the wind (seeded by the place, never the hour), shorter and fainter
  // toward the horizon (perspective).
  const random = seeded(hashId(`${world.place.id}:coast-ripples`))
  const ripples: Streak[] = []
  const count = Math.min(220, Math.round((right - left) * span / 26 * (0.3 + Math.min(1, wind.ms / 8))))
  for (let i = 0; i < count; i++) {
    const v = random()
    const x = left + random() * (right - left), y = sea.top + .6 + v * (span - .6), w = (0.6 + 2.4 * random()) * (0.35 + 0.65 * v)
    const alpha = (0.05 + 0.12 * random()) * (0.4 + 0.6 * v)
    if (!wet(x, y) || !wet(x + w, y) || hits(clear, x, y - .3, x + w, y + .3)) continue
    ripples.push({ x, y, w, alpha })
  }
  const horizonRgb = aerial(mixRgb(skyAt(world, box)(0.3), [1, 1, 1], 0.35 * (1 - world.night.dark)), sea.km[0][1])
  const edge = sea.side === 'right' ? right : left
  return { points: sea.points.map(([x, y]) => [x * sx, y]), coast: sea.coast.map(([x, y]) => [x * sx, y]), stops,
    top: sea.top, bottom: sea.bottom, shore, glint, ripples, light: tone(sea.top + 1, midKm), dark: mixRgb(stops.at(-1)![1], DEEP, 0.4),
    horizon: { y: sea.horizon, x0: Math.min(edge, coastX(sea.horizon)), x1: Math.max(edge, coastX(sea.horizon)), rgb: horizonRgb,
      alpha: 0.35 * (1 - 0.55 * world.night.dark) },
    drift: (Math.abs(wind.across) > 0.05 ? Math.sign(wind.across) : 0) * 2.4 * Math.min(1, wind.ms / 9) * sx }
}
