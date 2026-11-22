//# allFunctionsCalledOnLoad
import { BOW, HALO_DEG, onCircle } from '../../world/optics'
import { spanDeg, wrap180 } from '../../domain/camera'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { sheetAlphaAt } from './cloudSheetGrid'
import { layerKey, skyBoxKey } from './keys'
import { crestOf } from './life'
import { skyGeom, type SkyGeom } from './sky'
import { bearingOfScreen, tangentFrame, tangentScale, type TangentFrame } from './tangent'
import type { LayerOf, Pt, SceneBox, SunDog } from './types'

/*
 * The sky's optics (C10) as layers: the rainbow round the antisolar point and the 22° halo with its sun dogs round the sun.
 * Each is a true circle, drawn in the sky's tangent frame at its centre (`tangent.ts`: the same px per degree across and
 * up), so it stays round wherever the scene's projection stretches the sky; the land hides what falls under it (`clip`).
 * - The halo: centred on the sun as drawn, at the sky's own px per degree across at the sun's height (where a body's x
 *   moves there), so the sun dogs at the sun's altitude stand where the sun's geometry puts their direction.
 * - The rainbow: centred on the antisolar point under the horizon, its top where the sky puts the top's altitude (the part
 *   seen), its round shape following with that same px per degree (held within 1–2× the sky's scale across).
 */

const q = (v: number, step: number) => Math.round(v / step)

/** How many alphas the rainbow's mask has round its circle (every 3°). */
export const MASK_STEPS = 120

/**
 * The sky's outline over the land between two x (sky px): from the top down to the land's crest, or to the eye's horizon
 * where the land stands lower (what is under the horizon is not seen in the sky either). Clockwise, in 2 px steps.
 */
export function skyClip(crest: (x: number) => number, horizon: number, x0: number, x1: number, top: number): Pt[] {
  const out: Pt[] = [[x0, top], [x1, top]]
  for (let x = x1; x >= x0; x -= 2) out.push([x, Math.min(crest(x), horizon)])
  out.push([x0, Math.min(crest(x0), horizon)])
  return out
}

const inRange = (az: number, from: number, to: number) => {
  const a = ((az - from) % 360 + 360) % 360, span = ((to - from) % 360 + 360) % 360
  return a <= span
}

/** The rainbow's frame: centred on the antisolar point, `k` from its top's altitude (see the header). */
export function rainbowFrame(world: WorldState, geom: SkyGeom): TangentFrame | null {
  const bow = world.optics.rainbow
  if (!bow) return null
  const h = -bow.antisolar.altitude
  const across = tangentScale(world, geom, 0)
  const topAlt = BOW.primary[1] - h
  const k = Math.max(across, Math.min(2 * across, (geom.horizon - geom.y(topAlt)) / Math.max(1, topAlt)))
  // The antisolar point stands h° under the horizon in the frame: the frame's horizon is the eye's at that azimuth.
  return tangentFrame(bow.antisolar, [geom.x(bow.antisolar.azimuth), geom.horizon + k * h], k, world.camera.handed)
}

/** The rainbow (sky, over the clouds the rain falls from): primary and secondary, brighter where the rain is. */
export function rainbowLayer(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'bow'> | null {
  const bow = world.optics.rainbow
  const frame = rainbowFrame(world, geom)
  if (!bow || !frame) return null
  const crest = crestOf(world, box, geom)
  const rainAt = (az: number) => {
    let best = bow.around
    for (const r of bow.rain) {
      // The rain's own span, feathered ~12° either side.
      const d = inRange(az, r.from, r.to) ? 0 : Math.min(Math.abs(((az - r.from) % 360 + 540) % 360 - 180), Math.abs(((az - r.to) % 360 + 540) % 360 - 180))
      best = Math.max(best, 1 - smoothstep(0, 12, d))
    }
    return best
  }
  // Round the circle (screen angles): the rain's presence where the bow's direction falls, fading into the rain's foot.
  // Only what lies in the view's own span of azimuth (never across the camera's seam behind the eye).
  const half = spanDeg(world.camera) / 2
  const inView = (az: number) => 1 - smoothstep(half - 8, half - 2, Math.abs(wrap180(az - world.camera.heading)))
  const mid = (BOW.primary[0] + BOW.primary[1]) / 2
  let seen = false
  const mask = Array.from({ length: MASK_STEPS }, (_, i) => {
    const phi = (i / MASK_STEPS) * 2 * Math.PI
    const d = onCircle(bow.antisolar, mid, bearingOfScreen(frame, phi))
    const a = rainAt(d.azimuth) * (0.35 + 0.65 * smoothstep(0, 6, d.altitude)) * inView(d.azimuth)
    const x = frame.at[0] + Math.cos(phi) * mid * frame.k, y = frame.at[1] + Math.sin(phi) * mid * frame.k
    if (a > 0.05 && x > 0 && x < geom.width && y < Math.min(crest(x), geom.horizon) - 1) seen = true
    return a
  })
  // Nothing of it over the land in view (the bow behind the eye, or all under the land): no layer.
  if (!seen) return null
  const R = BOW.secondary[1] * frame.k + 6
  return bowLayer('rainbow', world, box, geom, crest, frame, bow.strength, bow.secondary, mask, [], R, 8.7)
}

/** The halo's frame: centred on the sun as drawn, at the sky's own px per degree across at the sun's height. */
export function haloFrame(world: WorldState, box: SceneBox, geom: SkyGeom): TangentFrame | null {
  const halo = world.optics.halo
  if (!halo) return null
  const sun = world.bodies.sun
  return tangentFrame(halo.sun, [geom.left + sun.x * geom.s, box.landTop + sun.y], tangentScale(world, geom, halo.sun.altitude), world.camera.handed)
}

/** The 22° halo and the sun dogs (sky, in the high cloud). */
export function haloLayer(world: WorldState, box: SceneBox, geom: SkyGeom, veil: LayerOf<'cloudSheet'>): LayerOf<'bow'> | null {
  const halo = world.optics.halo
  const frame = haloFrame(world, box, geom)
  if (!halo || !frame) return null
  const [cx, cy] = frame.at
  const opacity = sheetAlphaAt(veil, cx, cy)
  if (!opacity) return null
  const crest = crestOf(world, box, geom)
  const dogs: SunDog[] = []
  if (halo.dogs > 0.04 && halo.dogOffset !== null) {
    for (const side of [-1, 1] as const) {
      const x = cx + side * frame.k * halo.dogOffset
      if (cy < Math.min(crest(x), geom.horizon) - 2 && x > -10 && x < geom.width + 10) {
        dogs.push({ x, y: cy, r: 3 * frame.k, alpha: 0.85 * halo.dogs * opacity, side })
      }
    }
  }
  return bowLayer('halo', world, box, geom, crest, frame, halo.strength * opacity, 0, [], dogs, (HALO_DEG + 10) * frame.k, 6.2)
}

function bowLayer(look: 'rainbow' | 'halo', world: WorldState, box: SceneBox, geom: SkyGeom, crest: (x: number) => number, frame: TangentFrame,
  strength: number, secondary: number, mask: number[], dogs: SunDog[], reach: number, z: number): LayerOf<'bow'> | null {
  const [cx, cy] = frame.at
  let x0 = cx - reach, x1 = cx + reach, y0 = cy - reach
  let y1 = cy + reach
  for (const d of dogs) { x0 = Math.min(x0, d.x - 3 * d.r); x1 = Math.max(x1, d.x + 3 * d.r) }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0))
  x1 = Math.min(geom.width, Math.ceil(x1))
  // Down to the lowest sky over the land in its span.
  let floor = 0
  for (let x = x0; x <= x1; x += 2) floor = Math.max(floor, Math.min(crest(x), geom.horizon))
  y1 = Math.min(box.skyHeight, Math.ceil(Math.min(y1, floor + 1)))
  if (x1 - x0 < 2 || y1 - y0 < 2) return null
  const clip = skyClip(crest, geom.horizon, x0, x1, y0)
  const bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  const id = `bow.${look}`
  return {
    kind: 'bow', id, surface: 'sky', z, soft: true, look, cx, cy, k: frame.k, strength, secondary, mask, dogs, clip, bounds,
    key: layerKey(id, skyBoxKey(box, true), q(cx, 0.25), q(cy, 0.25), q(frame.k, 0.01), q(strength, 0.02), q(secondary, 0.02),
      mask.map((a) => q(a, 0.03)), dogs.map((d) => [q(d.x, 0.25), q(d.r, 0.1), q(d.alpha, 0.02)]), clip.map(([, y]) => q(y, 0.5)), world.keys.optics),
  }
}
