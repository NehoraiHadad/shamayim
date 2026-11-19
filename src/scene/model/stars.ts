import { hashId, seeded } from '../../data/landmarks/hash'
import { STAR_CLASSES, starShare } from '../../ui/starField'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { skyGeom, type SkyGeom } from './sky'
import type { LayerOf, SceneBox, Star } from './types'

/**
 * Stars per class over a 375 × 300 px sky (the app's 5 / 15 / 26, with more of the faint ones the canvas can draw finely):
 * the brightest appear once civil twilight ends, the bulk through nautical twilight, the faint ones near full night
 * (`STAR_CLASSES`, `starShare`).
 */
const PER_AREA = [6, 22, 64]
const AREA = 375 * 300
const RADIUS = [0.95, 0.65, 0.45]

/**
 * The night sky's stars (sky px). One fixed field for every place (seeded), spread over the sky above the land; each
 * star shows only through the clear share of the sky (`night.starsThrough`: the same seeded subset stays as the cover
 * changes, none under full cover; the banks drawn over them hide the rest), fades into the haze near the horizon, and the
 * faint ones drown in a bright moon's light.
 */
export function starField(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): Star[] {
  const through = world.night.starsThrough
  const sunAlt = world.bodies.sun.altitude
  if (through <= 0 || sunAlt > -4) return []
  const { moon } = world.bodies
  const moonWash = moon.up ? moon.illumination * smoothstep(-2, 20, moon.altitude) : 0
  const bottom = geom.horizon - 4
  const area = geom.width * bottom
  const out: Star[] = []
  STAR_CLASSES.forEach((cls, k) => {
    const share = starShare(sunAlt, cls)
    if (share <= 0) return
    const wash = 1 - moonWash * [0.1, 0.4, 0.8][k]
    const r = seeded(hashId(`stars:${k}`))
    const count = Math.round((PER_AREA[k] * area) / AREA)
    for (let i = 0; i < count; i++) {
      // More stars high up (the haze near the horizon takes the faint ones first).
      const x = r() * geom.width, y = bottom * r() ** 1.25, b = r(), gate = r()
      if (gate >= through) continue
      const lift = (geom.horizon - y) / Math.max(1, geom.horizon)
      const alpha = (cls.alpha[0] + (cls.alpha[1] - cls.alpha[0]) * b) * share * wash * smoothstep(0.02, 0.25, lift)
      if (alpha < 0.03) continue
      out.push({ x, y, r: RADIUS[k] * (0.8 + 0.4 * b), alpha })
    }
  })
  return out
}

export function starsLayer(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'stars'> | null {
  const stars = starField(world, box, geom)
  if (!stars.length) return null
  return {
    kind: 'stars', id: 'stars', surface: 'sky', z: 2, stars, through: world.night.starsThrough,
    bounds: { x: 0, y: 0, w: geom.width, h: Math.ceil(geom.horizon) },
    key: layerKey('stars', skyBoxKey(box), stars.length, stars.map((s) => Math.round(s.alpha * 64))),
  }
}
