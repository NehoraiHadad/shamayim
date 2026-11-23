import { seeded } from '../../data/landmarks/hash'
import { coinOf } from '../../world/air'
import { MOON_RGB } from '../../world/light'
import { cloudLight, layerMeanTransmission, SKY_CLOUD_DEPTH_SCALE } from '../../world/lightCloud'
import { smoothstep } from '../../world/ridgeLighting'
import { sunLight } from '../../world/sceneLight'
import type { CloudLayer, CloudLevel, WorldState } from '../../world/types'
import { cloudFade } from './cloudDust'
import { coversOf, stopAt, veilOf, type SkyGeom } from './sky'
import { mixRgb, rgbOf } from './tone'
import type { RGB, SceneBox } from './types'

/*
 * The light on a cloud and its tones at its place on the sky: shared by the field's sheets and its sprites (towers).
 * Pure: the world, the box and where the cloud stands.
 */
export const WHITE: RGB = [1, 1, 1]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** How much a layer's banks hold (their body's alpha, and how far their shade and lit sides go): low cloud is thick. */
export const THICK: Record<CloudLevel, number> = { low: 1, mid: 0.8, high: 0.42 }
/** The grey of a thick deck's underside by day, and of a deck that rains. */
export const DECK_GREY: RGB = [0.5, 0.55, 0.61]
export const RAIN_GREY: RGB = [0.29, 0.34, 0.39]

/** Where the light that reaches a layer comes from (sky px), its colour and strength, and how much is direct sun. */
/** `above`: the share of the light the layers above let through (as an expected value: a bank is in a gap or not, `litOf`). */
export interface CloudLight { x: number; y: number; referenceRgb: RGB; moonRgb?: RGB; strength: number; sun: boolean; under: number; above: number
  /** The sun's disc as the eye sees it through the cloud (1 − its veil): what lights a bank's edge from behind. */
  seen: number }

/** Expected direct transmission through the decks above the receiving layer. */
export function transmissionAbove(world: WorldState, layer: CloudLayer): number {
  const upper = world.cloudField?.field.layers.filter(({ lattice }) =>
    layer.level !== 'high' && (lattice === 'high' || (layer.level === 'low' && lattice === 'mid')))
  if (upper) return upper.reduce((beam, cloud) =>
    beam * layerMeanTransmission(cloud.cover, cloud.kappa * cloud.meanVKm * SKY_CLOUD_DEPTH_SCALE), 1)
  const covers = coversOf(world)
  return cloudLight({ low: 0, mid: layer.level === 'low' ? covers.mid : 0, high: layer.level === 'high' ? 0 : covers.high },
      undefined, SKY_CLOUD_DEPTH_SCALE).clear
}

/** Direction and masking for paint effects. The sheet’s incident light follows its own Earth shadow. */
export function lightOn(world: WorldState, box: SceneBox, geom: SkyGeom, layer: CloudLayer, above = transmissionAbove(world, layer)): CloudLight | null {
  const { sun, moon } = world.bodies
  if (sun.altitude > -0.5) {
    const up = smoothstep(-0.5, 2, sun.altitude)
    const referenceRgb = mixRgb(sunLight(Math.max(0, sun.altitude), world.air).rgb, WHITE, 0.25 + 0.45 * smoothstep(6, 40, sun.altitude))
    return { x: geom.left + sun.x * geom.s, y: box.landTop + sun.y, referenceRgb, strength: up * (1 - 0.7 * coinOf(world.air)), above, sun: true,
      under: layer.litUnderside, seen: 1 - veilOf(world) }
  }
  const after = world.light.afterglow
  if (after && layer.litUnderside > 0.02) {
    return { x: geom.left + after.x * geom.s, y: geom.horizon + 60, referenceRgb: after.rgb, strength: layer.litUnderside, above, sun: false,
      under: layer.litUnderside, seen: 0 }
  }
  if (moon.up && world.night.dark > 0.1 && moon.illumination > 0.05) {
    return { x: geom.left + moon.x * geom.s, y: box.landTop + moon.y, referenceRgb: MOON_RGB, moonRgb: MOON_RGB,
      strength: 0.55 * moon.illumination * smoothstep(0, 12, moon.altitude) * world.night.dark, above, sun: false, under: 0, seen: 0 }
  }
  return null
}

/** The copy of a band x (every `period`) nearest `ref`. */
export const nearest = (x: number, ref: number, period: number) => x + Math.round((ref - x) / period) * period

/** Wraps an x into the band `0…period`. */
export const wrap = (x: number, period: number) => ((x % period) + period) % period

/**
 * The tones of a bank at its place on the sky: its body in the sky's own light (whiter by day, the sky's horizon grey by
 * night), darker as the cover closes and darkest where it rains; its shade side; its lit side by the layer's light.
 */
export type Tones = { body: RGB; shade: RGB; behind: RGB; fade: number; referenceFade?: number; referenceBehind?: RGB }
/** The calibrated bea595f8 cloud exposure, used to construct reference tones. */
export const referenceCloudDay = (altitude: number) => smoothstep(-8, 3, altitude)

export function referenceCloudBeam(light: CloudLight | null, tones: Tones): RGB {
  return light ? mixRgb(light.referenceRgb, tones.referenceBehind ?? tones.behind, tones.referenceFade ?? tones.fade) : tones.body
}
/** The tones of a world, by what they depend on (rounded to what shows): many banks share a row of the sky. */
const toneMemo = new WeakMap<WorldState, Map<string, Tones>>()

export function tonesAt(world: WorldState, box: SceneBox, stops: [number, RGB][], level: CloudLevel, y0: number, union: number, rainWeight: number,
  km0: number): Tones {
  // The sky behind changes slowly down the sky, the haze slowly with distance: 4 px rows, 5 % steps of distance.
  const y = Math.round(y0 / 4) * 4
  const km = Math.exp(Math.round(Math.log(Math.max(0.1, km0)) / 0.05) * 0.05)
  const key = `${box.skyHeight}:${box.landTop}:${level}:${y}:${union.toFixed(3)}:${rainWeight}:${km.toFixed(3)}`
  let memo = toneMemo.get(world)
  if (!memo) toneMemo.set(world, (memo = new Map()))
  const hit = memo.get(key)
  if (hit) return hit
  const tones = tonesOf(world, box, stops, level, y, union, rainWeight, km)
  memo.set(key, tones)
  return tones
}

function tonesOf(world: WorldState, box: SceneBox, stops: [number, RGB][], level: CloudLevel, y: number, union: number, rainWeight: number,
  km: number): Tones {
  const behind = stopAt(stops, clamp01(y / Math.max(1, box.skyHeight)))
  const { palette } = world.light
  const thick = THICK[level]
  const day = referenceCloudDay(world.bodies.sun.altitude)
  // Fair-weather cloud is whiter than the sky behind it; as the sky closes the cloud is the sky, its base a grey that
  // deepens where it rains.
  const fair = mixRgb(behind, [0.95, 0.96, 0.98], 0.55 + 0.3 * thick)
  const closed = mixRgb(mixRgb(behind, DECK_GREY, 0.3 * thick), mixRgb(behind, RAIN_GREY, 0.55 * thick), rainWeight)
  const dayBody = mixRgb(fair, closed, smoothstep(0.35, 0.95, union))
  const nightBody = mixRgb(behind, mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.6), 0.55 * thick)
  const near = mixRgb(nightBody, dayBody, day)
  const nearShade = mixRgb(near, day > 0.5 ? [0.3, 0.34, 0.45] : [0.03, 0.04, 0.1], (0.22 + 0.18 * union) * thick)
  // The air between: a far bank fades toward the sky behind it, as the far land fades toward the haze (and in dust).
  const fade = cloudFade(world.air, km)
  const referenceFade = 0.85 * world.air.fade(km)
  return { body: mixRgb(near, behind, referenceFade), shade: mixRgb(nearShade, behind, referenceFade), behind, fade, referenceFade }
}

/** How far round the sun its light comes through a bank's thin edges (px): the aureole's reach (`SUN_R` 9 × 3.2). */
const BEHIND_REACH = 29

/**
 * The light's side of a bank: toward the source, its strength, a silver edge near the sun (forward scattering).
 * C9 (defect 2): a bank standing in front of the sun is lit from behind along the very line the eye sees the disc by, so
 * its thin edges toward the sun glow (the silver lining) as the disc shows through the cloud (`seen`; its square root, as the
 * veil counts the bank itself, whose edge is lit before its own cloud takes the light), whatever the layers above make of
 * its light from above (`through`). The aureole lies over it (`bodies.aureole`).
 */
export function litOf(light: CloudLight | null, cx: number, cy: number, w: number, h: number, thick: number, seed: number) {
  if (!light || light.strength < 0.02) return { toward: null, litA: 0, silver: 0, backlit: 0, through: 0, front: 0 }
  // The layers above are broken: a bank stands in one of their gaps (fully lit) or under them (in their shade), as often as
  // their cover says (seeded by the bank, so the same banks stay lit).
  const through = seeded(seed ^ 0x9e3779b9)() < light.above ? 1 : 0.12
  const strength = light.strength * through
  const dx = light.x - cx, dy = light.y - cy
  const d = Math.hypot(dx, dy) || 1
  const gap = Math.max(0, d - w / 2)
  const near = light.sun ? Math.exp(-gap / 70) : 0
  // The sun behind the bank's outline (an ellipse w × h round its middle) or within the aureole's reach of it.
  const outside = Math.max(0, Math.hypot(dx / (w / 2), dy / Math.max(1, h / 2)) - 1) * Math.min(w / 2, Math.max(1, h / 2))
  const front = light.sun ? light.strength * Math.sqrt(light.seen) * Math.exp(-outside / BEHIND_REACH) : 0
  return {
    toward: [dx / d, dy / d] as const,
    litA: strength * (0.55 + 0.3 * thick),
    silver: Math.max(0.9 * near * strength * (1 - 0.4 * thick), 0.9 * front),
    // A thick bank right in front of the sun is seen from its shadowed side.
    backlit: light.sun ? Math.exp(-gap / 110) * strength * thick : 0,
    through,
    front: Math.min(1, front),
  }
}
