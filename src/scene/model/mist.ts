//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { coinOf } from '../../world/air'
import { smoothstep } from '../../world/ridgeLighting'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { landBoxKey, layerKey } from './keys'
import { hazeOf } from './landVeil'
import { skyAt } from './sky'
import { mixRgb } from './tone'
import type { LayerOf, MistBandDesc, MistPuff, Pt, RGB, SceneBox } from './types'

/*
 * Mist and fog on the land (stage C7), reading the world's mist state (`world.air.mist`):
 * valley mist lies level behind the near ridge, thinning and clearing as radiation fog burns off; ground fog rises over
 * the near ridge's foot only when measured or forecast visibility is down to a few km. Pure: seeded puffs, no clock.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]
const q = (v: number, step: number) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))
/** A tile's size in CSS px that is a whole number of device px (a pattern repeats on its device size). */
const whole = (px: number, dpr: number) => Math.max(1, Math.round(px * dpr)) / dpr
const lightPart = (key: string, tint: RGB) => ({ key, blend: 'source-over' as const, tint })

/** The crest's y (land px) at a reference x, from a plane's points. */
function crestAt(points: readonly Pt[], x: number): number {
  if (!points.length) return 0
  let i = 1
  while (i < points.length - 1 && points[i][0] < x) i++
  const [x0, y0] = points[i - 1], [x1, y1] = points[i]
  const t = x1 === x0 ? 0 : clamp01((x - x0) / (x1 - x0))
  return y0 + (y1 - y0) * t
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

/** How misty the air is (0–1), after the world's dust attenuation. */
export function mistiness(world: WorldState): number {
  return world.air.mist.amount
}

/** Seeded puffs along a band's top, wrapping round the tile. */
function puffsOf(seed: string, w: number, top: number, depth: number, n: number): MistPuff[] {
  const r = seeded(hashId(seed))
  return Array.from({ length: n }, (_, i) => {
    const rx = 14 + 26 * r()
    return { x: ((i + 0.5 * r()) / n) * w, y: top + depth * (0.15 + 0.6 * r()), rx, ry: 2.5 + 4 * r(), alpha: 0.35 + 0.5 * r() }
  })
}

/**
 * Mist and fog (land): lying level in the low ground, the valleys first. Radiation mist fills the valley between the
 * near ridge and the far one and burns off after sunrise; persistent low visibility, rain or a damp marine deck keeps it
 * through the day. Measured/forecast fog down to a few km also raises a ground fog over the near ridge's foot. Each is a
 * tile drifting slowly with the wind at the ground.
 */
export function mistLayers(world: WorldState, box: SceneBox): LayerOf<'mist'>[] {
  const m = mistiness(world)
  const clearShare = 1 - world.air.dustWeight
  // Apply the band thresholds to the water mist, then fade its opacity as dust replaces it.
  if (clearShare === 0 || m <= 0.08 * clearShare) return []
  const moisture = m / clearShare
  const sx = box.width / SCENE_W
  const xs = Array.from({ length: 16 }, (_, i) => (i + 0.5) * (SCENE_W / 16))
  const nearMed = median(xs.map((x) => crestAt(world.terrain.near.points, x)))
  const farMed = world.terrain.far.points.length ? median(xs.map((x) => crestAt(world.terrain.far.points, x))) : nearMed - 20
  const dark = world.night.dark
  const sky = skyAt(world, box)
  const rgb = mixRgb(mixRgb(sky(3), hazeOf(world), 0.35), WHITE, 0.3 * (1 - dark) * (1 - 0.5 * coinOf(world.air)))
  const period = whole(240, box.dpr)
  const across = world.wind.across
  const speed = (2 * smoothstep(-0.05, 0.05, across) - 1) * (0.5 + 0.55 * world.wind.ms) * sx
  const out: LayerOf<'mist'>[] = []
  const add = (id: string, z: number, band: MistBandDesc) => {
    const y0 = Math.max(0, Math.floor(band.top - 10)), y1 = Math.min(box.landHeight, Math.ceil(band.bottom))
    if (y1 <= y0) return
    out.push({ kind: 'mist', id, surface: 'land', z, soft: true, bands: [band],
      bounds: { x: 0, y: y0, w: period, h: y1 - y0 },
      animated: { mode: 'drift', speed, period },
      key: layerKey(id, landBoxKey(box, true), period, y0, y1),
      light: lightPart(layerKey(id, 'light', q(band.top, 0.5), q(band.fade, 0.5), q(band.bottom, 0.5), tone(band.rgb), Math.round(band.alpha * 255),
        band.puffs.length), band.rgb) })
  }
  // The valley's lake of mist: its top a few px over the near crest at first, rising toward the far crest.
  const rise = Math.max(4, nearMed - farMed)
  const top = nearMed - (5 + 0.75 * m * rise)
  const valleyAlpha = (0.35 + 0.5 * m) * clearShare * smoothstep(0.08, 0.25, moisture)
  add('mist.valley', 20, { top, fade: 6 + 10 * m, bottom: Math.min(box.landHeight, nearMed + 24), rgb, alpha: valleyAlpha,
    puffs: puffsOf(`${world.place.id}:mist.valley`, period, top - 4, 10, 9) })
  // Ground fog over the near ridge's foot, only on data-reported fog; alpha eases continuously from 0 at the threshold.
  const fog = Math.min(m, world.air.mist.fog) / clearShare
  if (fog > 0.3) {
    const k = Math.min(1, (fog - 0.3) / 0.7)
    const gTop = box.landHeight - (14 + k * (box.landHeight - nearMed) * 0.75)
    const groundAlpha = (0.2 + 0.4 * k) * clearShare * smoothstep(0.3, 0.5, fog)
    add('mist.ground', 45, { top: gTop, fade: 14 + 12 * k, bottom: box.landHeight, rgb, alpha: groundAlpha,
      puffs: puffsOf(`${world.place.id}:mist.ground`, period, gTop - 4, 12, 8) })
  }
  return out
}
