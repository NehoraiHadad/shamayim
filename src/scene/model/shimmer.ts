//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { sunLight } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { WHITE } from './cloudLight'
import { layerKey, skyBoxKey } from './keys'
import { skyGeom, type SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { LayerOf, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const q = (v: number, step: number) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))

/** The shimmer tile's width (px): its waves repeat across it, so the tile can be laid edge to edge. */
const SHIMMER_TILE = 48

/**
 * Heat shimmer (rebuilt from the WebGL air's heat lines): on a hot, sunny, dry hour (`air.heat`, from 35 °C up), fine
 * wavering lines of the sun's light in a band just over the far horizon, the hotter the taller and stronger, moving with
 * the wind (or rising off the land in a calm).
 */
export function shimmerLayerOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'shimmer'> | null {
  const amp = world.air.heat
  if (amp <= 0 || world.bodies.sun.altitude < 10) return null
  const t = clamp01((amp - 0.6) / 1.2)
  const band = 24 + 32 * t
  const r = seeded(hashId(`${world.place.id}:shimmer`))
  const lines = Array.from({ length: 7 }, (_, i) => {
    const v = (i + 0.3 + 0.4 * r()) / 7
    return { y: band * (0.15 + 0.85 * v), amp: 0.5 + amp * (0.4 + 0.6 * v), waves: 1 + Math.floor(r() * 2), phase: r() * Math.PI * 2,
      alpha: (0.03 + 0.05 * t) * (0.4 + 0.6 * v) }
  })
  const rgb = mixRgb(sunLight(Math.max(0, world.bodies.sun.altitude)).rgb, WHITE, 0.4)
  const across = world.wind.across
  const speed = (Math.abs(across) > 0.1 ? Math.sign(across) : 1) * (10 + 2 * world.wind.ms) * geom.s
  return {
    kind: 'shimmer', id: 'shimmer', surface: 'sky', z: 10, lines, rgb,
    bounds: { x: 0, y: Math.floor(geom.horizon - band), w: SHIMMER_TILE, h: Math.ceil(band) + 2 },
    animated: { mode: 'drift', speed, period: SHIMMER_TILE },
    key: layerKey('shimmer', skyBoxKey(box), lines.map((l) => [q(l.y, 0.25), q(l.amp, 0.05), l.waves, l.alpha.toFixed(3)]), tone(rgb)),
  }
}
