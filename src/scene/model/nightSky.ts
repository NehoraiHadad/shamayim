//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { crestOf } from './crest'
import { skyGeom, type SkyGeom } from './sky'
import type { LayerOf, PlanetDot, Pt, RGB, SceneBox, Star } from './types'

/*
 * The night sky's true objects (C10) as layers: the planets at their true places, steady (they do not twinkle), on the
 * bodies' own scale (the moon's: a planet by the moon stands where it is seen by it); the brightest stars twinkling (a
 * strip each); the Milky Way at its true orientation, spread on the dome as the clouds and the stars are, only in a truly
 * dark sky.
 */

const q = (v: number, step: number) => Math.round(v / step)

const PLANET_RGB: Record<string, RGB> = {
  venus: [1, 1, 0.96], jupiter: [1, 0.95, 0.84], mars: [1, 0.66, 0.45], saturn: [1, 0.9, 0.66], mercury: [1, 0.93, 0.84],
}

/** The planets (sky): a point each, its size and glow by its magnitude, hidden behind the land. */
export function planetsLayer(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'planets'> | null {
  const crest = crestOf(world, box, geom)
  const planets: PlanetDot[] = []
  for (const p of world.nightSky.planets) {
    const x = geom.x(p.azimuth), y = geom.y(p.altitude)
    if (x < -4 || x > geom.width + 4 || y > crest(x) - 1.5) continue
    const bright = Math.max(0, Math.min(5, 1.5 - p.magnitude))
    planets.push({ name: p.name, x, y, r: (0.75 + 0.22 * bright) * Math.max(0.85, geom.s), rgb: PLANET_RGB[p.name], alpha: p.alpha,
      glow: smoothstep(1.5, 5.5, bright) * p.alpha })
  }
  if (!planets.length) return null
  return {
    kind: 'planets', id: 'planets', surface: 'sky', z: 2.2, planets, bounds: { x: 0, y: 0, w: geom.width, h: Math.ceil(geom.horizon) },
    key: layerKey('planets', skyBoxKey(box), planets.map((p) => [p.name, q(p.x, 0.25), q(p.y, 0.25), q(p.alpha, 0.03)])),
  }
}

/** How many of the brightest stars twinkle, each its own small strip. */
const TWINKLERS = 8

/**
 * The brightest stars of the field twinkle (scintillation): more near the horizon (a longer path through the turbulent
 * air) and in a stronger wind aloft; the rest of the field stays as it is. Returns the stars kept steady and the twinklers.
 */
export function twinkleOf(world: WorldState, box: SceneBox, stars: readonly Star[], geom: SkyGeom): { steady: Star[]; layers: LayerOf<'twinkle'>[] } {
  if (!stars.length) return { steady: [...stars], layers: [] }
  const chosen = [...stars].map((s, i) => ({ s, i })).filter(({ s }) => s.r > 0.75).sort((a, b) => b.s.alpha - a.s.alpha).slice(0, TWINKLERS)
  const set = new Set(chosen.map((c) => c.i))
  const wind = Math.min(1, world.wind.aloft.high / 40)
  const layers = chosen.map(({ s }, k): LayerOf<'twinkle'> => {
    const low = 1 - Math.min(1, (geom.horizon - s.y) / Math.max(1, geom.horizon))
    const amp = Math.min(0.75, 0.22 + 0.25 * wind + 0.35 * low)
    const pad = Math.ceil(s.r * 4) + 1
    const bounds = { x: Math.floor(s.x) - pad, y: Math.floor(s.y) - pad, w: 2 * pad + 1, h: 2 * pad + 1 }
    const id = `twinkle.${k}`
    return {
      kind: 'twinkle', id, surface: 'sky', z: 2.05, star: s, amp, seed: hashId(id), loop: 4, bounds,
      animated: { mode: 'frames', frames: { count: 24, fps: 6 } },
      key: layerKey(id, skyBoxKey(box), bounds.x, bounds.y, q(s.alpha, 0.02), q(s.r, 0.05), q(amp, 0.05)),
    }
  })
  return { steady: stars.filter((_, i) => !set.has(i)), layers }
}

/** The band's half width on screen at most (px at the reference width), at its brightest; less where it is faint. */
const MAX_HALF = 34

/**
 * The Milky Way (sky): its band at its true place (the galactic plane, `astro/galaxy.ts`), on the dome as the stars and
 * the clouds are, only when the world says the sky is dark enough. Its edges stand at their true angle from the spine,
 * held under `MAX_HALF` where the view's cylinder spreads the sky near the zenith, its width swelling and narrowing with
 * its light and with the star clouds and the dust (seeded, smooth along it); its brightness dimmed in the thick air low
 * down and faded out going up toward the zenith, where the cylinder can no longer hold a direction.
 */
export function milkyWayLayer(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'milkyWay'> | null {
  const { strength, band } = world.nightSky.milkyWay
  if (strength < 0.03 || band.length < 3) return null
  const at = (p: { azimuth: number; altitude: number }): Pt => [geom.x(p.azimuth), geom.dome(Math.max(-3, p.altitude))]
  // Round the whole band (the last point joined to the first); a point out of the drawn stretch has no brightness and the
  // painter skips its segments: under the horizon, behind the eye (the camera's seam), or near the zenith.
  const ring = [...band, band[0]]
  const shown = (p: (typeof band)[number]) => p.spine.altitude > 0.5 && p.spine.altitude < 84 && Math.abs(geom.x(p.spine.azimuth) - geom.width / 2) < geom.width * 0.75
  if (ring.filter(shown).length < 3) return null
  const spine = ring.map((p) => at(p.spine))
  // An irregular width: a seeded value per point, smoothed along the band (closed round it).
  const r = seeded(hashId('milkyWay:edges'))
  const raw = band.map(() => [r(), r()])
  const smooth = (side: 0 | 1) => band.map((_, i) => {
    const n = band.length
    return 0.7 + 0.6 * (0.25 * raw[(i + n - 1) % n][side] + 0.5 * raw[i][side] + 0.25 * raw[(i + 1) % n][side])
  })
  const ragged = [smooth(0), smooth(1)]
  const edge = (side: 'upper' | 'lower') => ring.map((p, i): Pt => {
    const [sx, sy] = spine[i], [ex, ey] = at(p[side])
    const d = Math.hypot(ex - sx, ey - sy) || 1
    const swell = ragged[side === 'upper' ? 0 : 1][i % band.length] * (1 + 0.25 * p.cloud)
    const cap = MAX_HALF * geom.s * (0.5 + 0.5 * p.bright)
    const len = Math.min(d * swell, cap * swell)
    return [sx + ((ex - sx) / d) * len, sy + ((ey - sy) / d) * len]
  })
  const upper = edge('upper'), lower = edge('lower')
  const bright = ring.map((p) => (shown(p) ? p.bright * smoothstep(0.5, 10, p.spine.altitude) * (1 - smoothstep(60, 82, p.spine.altitude)) : 0))
  const rgb: RGB = [0.82, 0.85, 0.95]
  return {
    kind: 'milkyWay', id: 'milkyWay', surface: 'sky', z: 1.5, soft: true, spine, upper, lower, bright,
    rift: ring.map((p) => p.rift), clouds: ring.map((p) => p.cloud), rgb, alpha: strength, seed: hashId('milkyWay'),
    bounds: { x: 0, y: 0, w: geom.width, h: Math.ceil(geom.horizon) },
    key: layerKey('milkyWay', skyBoxKey(box, true), spine.map(([x, y]) => [q(x, 1), q(y, 1)]), bright.map((b) => q(b, 0.05)), q(strength, 0.03)),
  }
}
