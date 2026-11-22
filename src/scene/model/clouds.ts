import { hashId, seeded } from '../../data/landmarks/hash'
import { coinOf } from '../../world/air'
import { cloudTransmit, MOON_RGB } from '../../world/light'
import { smoothstep } from '../../world/ridgeLighting'
import { sunLight } from '../../world/sceneLight'
import type { CloudBank, CloudLayer, CloudLevel, WorldState } from '../../world/types'
import { layerKey, skyBoxKey } from './keys'
import { coversOf, skyGeom, skyStops, stopAt, veilOf, type SkyGeom } from './sky'
import { mixRgb, rgbOf } from './tone'
import type { BankDesc, LayerOf, RGB, SceneBox, Veil } from './types'

const WHITE: RGB = [1, 1, 1]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** How much a layer's banks hold (their body's alpha, and how far their shade and lit sides go): low cloud is thick. */
const THICK: Record<CloudLevel, number> = { low: 1, mid: 0.8, high: 0.42 }
/** The drawn bank against its angular width: puff banks overhang their core (the world's width is the core's). */
const SPREAD: Record<CloudLevel, number> = { low: 1.5, mid: 1.6, high: 2.2 }
/** Height against width as drawn: heaped low cloud, flatter altocumulus, thin cirrus. */
const ASPECT: Record<CloudLevel, number> = { low: 0.4, mid: 0.26, high: 0.1 }
const Z: Record<CloudLevel, number> = { high: 6, mid: 7, low: 8 }
/** The grey of a thick deck's underside by day, and of a deck that rains. */
const DECK_GREY: RGB = [0.5, 0.55, 0.61]
const RAIN_GREY: RGB = [0.29, 0.34, 0.39]

/** Where the light that reaches a layer comes from (sky px), its colour and strength, and how much is direct sun. */
/** `above`: the share of the light the layers above let through (as an expected value: a bank is in a gap or not, `litOf`). */
interface CloudLight { x: number; y: number; rgb: RGB; strength: number; sun: boolean; under: number; above: number
  /** The sun's disc as the eye sees it through the cloud (1 − its veil): what lights a bank's edge from behind. */
  seen: number }

/**
 * The light on one layer: the sun while it is up, its strength after the cloud above the layer (a low bank under an
 * overcast of mid cloud is lit by the sky alone); after sunset and before sunrise the afterglow from under the horizon,
 * which the higher layers keep longest (`litUnderside`, the world's); by night the moon by its phase and height.
 */
function lightOn(world: WorldState, box: SceneBox, geom: SkyGeom, layer: CloudLayer): CloudLight | null {
  const { sun, moon } = world.bodies
  const covers = coversOf(world)
  const above = layer.level === 'low' ? cloudTransmit({ low: 0, mid: covers.mid, high: covers.high })
    : layer.level === 'mid' ? cloudTransmit({ low: 0, mid: 0, high: covers.high }) : 1
  const aerosol = world.air
  if (sun.altitude > -0.5) {
    const up = smoothstep(-0.5, 2, sun.altitude)
    const rgb = mixRgb(sunLight(Math.max(0, sun.altitude), aerosol).rgb, WHITE, 0.25 + 0.45 * smoothstep(6, 40, sun.altitude))
    return { x: geom.left + sun.x * geom.s, y: box.landTop + sun.y, rgb, strength: up * (1 - 0.7 * coinOf(world.air)), above, sun: true,
      under: layer.litUnderside, seen: 1 - veilOf(world) }
  }
  const after = world.light.afterglow
  if (after && layer.litUnderside > 0.02) {
    return { x: geom.left + after.x * geom.s, y: geom.horizon + 60, rgb: after.rgb, strength: layer.litUnderside, above, sun: false,
      under: layer.litUnderside, seen: 0 }
  }
  if (moon.up && world.night.dark > 0.1 && moon.illumination > 0.05) {
    return { x: geom.left + moon.x * geom.s, y: box.landTop + moon.y, rgb: MOON_RGB,
      strength: 0.55 * moon.illumination * smoothstep(0, 12, moon.altitude) * world.night.dark, above, sun: false, under: 0, seen: 0 }
  }
  return null
}

/** The copy of a band x (every `period`) nearest `ref`. */
const nearest = (x: number, ref: number, period: number) => x + Math.round((ref - x) / period) * period

/** Wraps an x into the band `0…period`. */
const wrap = (x: number, period: number) => ((x % period) + period) % period

/**
 * The tones of a bank at its place on the sky: its body in the sky's own light (whiter by day, the sky's horizon grey by
 * night), darker as the cover closes and darkest where it rains; its shade side; its lit side by the layer's light.
 */
type Tones = { body: RGB; shade: RGB; behind: RGB; fade: number }
/** The tones of a world, by what they depend on (rounded to what shows): many banks share a row of the sky. */
const toneMemo = new WeakMap<WorldState, Map<string, Tones>>()

function tonesAt(world: WorldState, box: SceneBox, stops: [number, RGB][], level: CloudLevel, y0: number, union: number, rains: boolean,
  km0: number): Tones {
  // The sky behind changes slowly down the sky, the haze slowly with distance: 4 px rows, 5 % steps of distance.
  const y = Math.round(y0 / 4) * 4
  const km = Math.exp(Math.round(Math.log(Math.max(0.1, km0)) / 0.05) * 0.05)
  const key = `${box.skyHeight}:${box.landTop}:${level}:${y}:${union.toFixed(3)}:${rains}:${km.toFixed(3)}`
  let memo = toneMemo.get(world)
  if (!memo) toneMemo.set(world, (memo = new Map()))
  const hit = memo.get(key)
  if (hit) return hit
  const tones = tonesOf(world, box, stops, level, y, union, rains, km)
  memo.set(key, tones)
  return tones
}

function tonesOf(world: WorldState, box: SceneBox, stops: [number, RGB][], level: CloudLevel, y: number, union: number, rains: boolean,
  km: number): Tones {
  const behind = stopAt(stops, clamp01(y / Math.max(1, box.skyHeight)))
  const { palette } = world.light
  const thick = THICK[level]
  const day = smoothstep(-8, 3, world.bodies.sun.altitude)
  // Fair-weather cloud is whiter than the sky behind it; as the sky closes the cloud is the sky, its base a grey that
  // deepens where it rains.
  const fair = mixRgb(behind, [0.95, 0.96, 0.98], 0.55 + 0.3 * thick)
  const closed = mixRgb(behind, rains ? RAIN_GREY : DECK_GREY, (rains ? 0.55 : 0.3) * thick)
  const dayBody = mixRgb(fair, closed, smoothstep(0.35, 0.95, union))
  const nightBody = mixRgb(behind, mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.6), 0.55 * thick)
  const near = mixRgb(nightBody, dayBody, day)
  const nearShade = mixRgb(near, day > 0.5 ? [0.3, 0.34, 0.45] : [0.03, 0.04, 0.1], (0.22 + 0.18 * union) * thick)
  // The air between: a far bank fades toward the sky behind it, as the far land fades toward the haze (and in dust).
  const fade = 0.85 * world.air.fade(km)
  return { body: mixRgb(near, behind, fade), shade: mixRgb(nearShade, behind, fade), behind, fade }
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
function litOf(light: CloudLight | null, cx: number, cy: number, w: number, h: number, thick: number, seed: number) {
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

/** A world bank as drawn: on the band at its true azimuth, standing on the dome at its altitude. */
function bankDesc(world: WorldState, box: SceneBox, geom: SkyGeom, stops: [number, RGB][], layer: CloudLayer, bank: CloudBank,
  light: CloudLight | null, union: number, raining: ReadonlySet<string>): BankDesc {
  const level = layer.level
  const thick = THICK[level]
  const pxPerDeg = world.camera.pxPerDeg * geom.s
  // Low on the dome a bank is seen edge on (flat); overhead from below (rounder).
  const up = Math.sin((Math.min(80, bank.altitude) * Math.PI) / 180)
  const w = Math.min(0.6 * geom.period, Math.max(14 * geom.s, bank.w * pxPerDeg * SPREAD[level]))
  const h = Math.max(level === 'high' ? 2 : 5, w * ASPECT[level] * (0.75 + 0.6 * up))
  const y = geom.dome(bank.altitude)
  const rains = layer.rains && raining.has(bank.id)
  const tones = tonesAt(world, box, stops, level, y - h / 2, union, rains, bank.distanceKm)
  const x = wrap(geom.x(bank.azimuth), geom.period)
  // The light's direction the short way round the horizon (the bank's copy on the band nearest the source).
  const lit = litOf(light, light ? nearest(x, light.x, geom.period) : x, y - h / 2, w, h, thick, bank.seed)
  const body = mixRgb(tones.body, tones.shade, 0.5 * lit.backlit)
  return {
    id: `${level}:${bank.id}`, x, y, w, h, seed: bank.seed,
    puffs: level === 'high' ? bank.puffs + 2 : bank.puffs + 6,
    kind: level === 'high' ? 'streak' : 'heap',
    alpha: (bank.seen ? 0.95 : 0.88) * (level === 'high' ? 0.55 : level === 'mid' ? 0.85 : 1) * (bank.share ?? 1),
    body, shade: tones.shade, lit: light ? mixRgb(light.rgb, tones.behind, tones.fade) : body, litA: lit.litA, toward: lit.toward,
    under: light ? light.under * light.strength * lit.through : 0, silver: lit.silver, rains,
  }
}

/**
 * The layer's field: what its cover makes of the whole dome besides the world's named banks (which carry the rain and
 * the satellite's clouds). As many clouds as the cover asks for, spread over the dome, more of them low (the far field
 * foreshortened), larger overhead; heaps for broken low cloud, flat sheets once it closes into a deck (and for the mid
 * layer), streaks for cirrus; over a wash that closes the gaps as the cover goes to full. Seeded by the place, the level and
 * the index, so a growing cover keeps the clouds it had and adds more; it drifts with its banks.
 */
function deckOf(world: WorldState, box: SceneBox, geom: SkyGeom, stops: [number, RGB][], layer: CloudLayer, light: CloudLight | null,
  union: number, lowest: boolean): { sheets: BankDesc[]; veil: Veil | null } {
  const c = layer.cover
  const deck = smoothstep(0.7, 1, c)
  const field = smoothstep(0.06, 1, c) ** 0.8
  if (field <= 0.01 && !lowest) return { sheets: [], veil: null }
  const level = layer.level
  const thick = THICK[level]
  const sheets: BankDesc[] = []
  const rains = layer.rains
  // Sheets spread over the dome, more of them low (the far deck foreshortened); seeded by the place, the level and the
  // sheet's index, so a growing cover keeps the sheets it had and adds more.
  const max = Math.round((level === 'high' ? 12 : 30) * geom.period / 540)
  const count = Math.round(max * field)
  const kind: BankDesc['kind'] = level === 'high' ? 'streak' : level === 'low' && deck < 0.5 ? 'heap' : 'sheet'
  for (let j = 0; j < count; j++) {
    const r = seeded(hashId(`${world.place.id}:deck:${level}:${j}`))
    const alt = 3 + 84 * r() ** 1.5
    const up = Math.sin((alt * Math.PI) / 180)
    const y = geom.dome(alt)
    const heap = kind === 'heap'
    const w = geom.period * (heap ? 0.05 + 0.08 * r() : 0.1 + 0.2 * r()) * (0.6 + 0.9 * up)
    const h = heap ? w * (0.32 + 0.18 * up) : (level === 'high' ? 2.5 : 5) + (level === 'high' ? 5 : 20) * up * (0.6 + 0.8 * r())
    const x = r() * geom.period
    const tones = tonesAt(world, box, stops, level, y - h / 2, union, rains, layer.baseM / 1000 / Math.tan((alt * Math.PI) / 180))
    const lit = litOf(light, light ? nearest(x, light.x, geom.period) : x, y - h / 2, w, h, thick, hashId(`${world.place.id}:deck:${level}:${j}`))
    sheets.push({ id: `${level}:deck:${j}`, x, y, w, h, seed: hashId(`${world.place.id}:deck:${level}:${j}`),
      puffs: kind === 'heap' ? Math.max(5, Math.round(w / 12)) : Math.max(3, Math.round(w / 26)), kind,
      alpha: (0.55 + 0.35 * r()) * (level === 'high' ? 0.5 : 1),
      body: tones.body, shade: tones.shade, lit: light ? mixRgb(light.rgb, tones.behind, tones.fade) : tones.body, litA: 0.6 * lit.litA, toward: lit.toward,
      under: light ? 0.6 * light.under * light.strength * lit.through : 0, silver: Math.max(0.4 * lit.silver, 0.9 * lit.front), rains })
  }
  sheets.sort((a, b) => b.y - a.y)
  // The wash: this layer's own deck, or (on the lowest layer there is) the whole sky closing over, whatever the layers.
  const close = Math.max(smoothstep(0.7, 1, c) * (level === 'high' ? 0.35 : 0.85), lowest ? 0.85 * smoothstep(0.75, 1, union) : 0)
  const bottom = geom.dome(4)
  const veil = close > 0.02 ? { top: 0, bottom, rgb: tonesAt(world, box, stops, level, bottom * 0.6, union, rains, 3).body, alpha: close } : null
  return { sheets, veil }
}

const q = (v: number, step: number) => Math.round(v / step)
/** Tones in 1/64 steps: a cloud's soft wash shows no step finer (and a scrub repaints less often). */
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))

/**
 * A bank's light-dependent numbers snapped to the steps its key counts (tones 1/64, strengths 1/20, the light's direction
 * 8°): the key names exactly what the pixels are painted from, and a scrub repaints the clouds only when a step is crossed.
 */
function snap(b: BankDesc): BankDesc {
  const t = (rgb: RGB): RGB => [Math.round(rgb[0] * 64) / 64, Math.round(rgb[1] * 64) / 64, Math.round(rgb[2] * 64) / 64]
  const s20 = (v: number) => Math.round(v * 20) / 20
  const angle = b.toward ? Math.round((Math.atan2(b.toward[1], b.toward[0]) * 180) / Math.PI / 8) * 8 * (Math.PI / 180) : 0
  return { ...b, body: t(b.body), shade: t(b.shade), lit: t(b.lit), litA: s20(b.litA), under: s20(b.under), silver: s20(b.silver),
    toward: b.toward ? [Math.cos(angle), Math.sin(angle)] : null }
}

function bankKey(b: BankDesc) {
  return [b.id, q(b.x, 0.5), q(b.y, 0.5), q(b.w, 1), q(b.h, 0.5), b.alpha.toFixed(2), tone(b.body), tone(b.shade), tone(b.lit), q(b.litA, 1 / 20),
    b.toward ? q(Math.atan2(b.toward[1], b.toward[0]) * 57.3, 8) : null, q(b.under, 1 / 20), q(b.silver, 1 / 20), b.rains]
}

/**
 * The clouds (C6), one layer per level, high behind low: the world's banks (its cover, seeded round the whole horizon,
 * the satellite's single clouds among the low ones) drawn as heaped puffs (low, mid) or streaks (high) at their true
 * azimuths, a deck of sheets over a wash where the cover is high. Lit by the layer's light (`lightOn`): the side toward it
 * catches it, the undersides at a low sun, a silver edge near the sun. Each layer drifts with the wind at its own height
 * (`layer.drift`, + left → right), its band repeating round the horizon (`period`), so nothing pops in or out.
 */
export function cloudLayersOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)): LayerOf<'clouds'>[] {
  const stops = skyStops(world, box)
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const raining = new Set(world.rain?.cells.map((c) => c.bank) ?? [])
  const out: LayerOf<'clouds'>[] = []
  const lowest = world.clouds.find((l) => l.cover >= 0.05)
  for (const layer of world.clouds) {
    if (!layer.banks.length && layer.cover < 0.05) continue
    const light = lightOn(world, box, geom, layer)
    const banks = layer.banks.map((bank) => bankDesc(world, box, geom, stops, layer, bank, light, union, raining))
    const { sheets, veil } = deckOf(world, box, geom, stops, layer, light, union, layer === lowest)
    const all = [...sheets, ...banks].map(snap)
    if (!all.length && !veil) continue
    const top = veil ? 0 : Math.max(0, Math.floor(Math.min(...all.map((b) => b.y - b.h * 1.6)) - 4))
    const bottom = Math.min(box.skyHeight, Math.ceil(Math.max(veil?.bottom ?? 0, ...all.map((b) => b.y + b.h * 0.5)) + 6))
    if (bottom <= top) continue
    const speed = layer.drift * geom.s
    out.push({
      kind: 'clouds', id: `clouds.${layer.level}`, surface: 'sky', z: Z[layer.level], soft: true, level: layer.level,
      banks: all, veil, period: geom.period,
      bounds: { x: 0, y: top, w: geom.period, h: bottom - top },
      animated: Math.abs(speed) > 0.01 ? { mode: 'drift', speed, period: geom.period } : undefined,
      key: layerKey('clouds', layer.level, skyBoxKey(box, true), geom.period, all.map(bankKey),
        veil && [q(veil.bottom, 0.5), tone(veil.rgb), veil.alpha.toFixed(2)]),
    })
  }
  return out
}

/** The flash's colour: the blue-white of lightning seen through cloud. */
const FLASH: RGB = [0.86, 0.9, 1]

/**
 * In-cloud lightning, only when the world has thunder (`rain.thunder`): the largest banks that rain in view (two at most)
 * each light from within on a seeded schedule of flashes (`anim.ts`), drifting with their layer.
 */
export function flashLayersOf(world: WorldState, box: SceneBox, clouds: readonly LayerOf<'clouds'>[], geom: SkyGeom = skyGeom(world, box)):
  LayerOf<'flash'>[] {
  if (!world.rain || world.rain.thunderWeight <= 0) return []
  const strength = world.rain.thunderWeight
  const layer = world.clouds.find((l) => l.rains)
  const drawn = clouds.find((l) => l.level === layer?.level)
  if (!layer || !drawn) return []
  const cells = new Set(world.rain.cells.map((c) => `${layer.level}:${c.bank}`))
  const mid = geom.left + box.width / 2
  const inView = (b: BankDesc) => {
    // The bank's x nearest the middle of the view, among its copies round the band.
    const k = Math.round((mid - b.x) / geom.period)
    return b.x + k * geom.period
  }
  // The largest raining banks in view (the near ones, high on the dome, where a flash shows over the land).
  const half = box.width / 2
  const candidates = drawn.banks.filter((b) => cells.has(b.id)).map((b) => ({ b, x: inView(b) }))
    .filter(({ b, x }) => Math.abs(x - mid) < half + b.w / 4)
    .sort((a, c) => c.b.w * c.b.h - a.b.w * a.b.h).slice(0, 2)
  return candidates.map(({ b, x }, i) => {
    const pad = b.w * 0.45
    const bank = { ...b, x }
    return {
      kind: 'flash' as const, id: `flash.${i}`, surface: 'sky' as const, z: 9, soft: true, bank, rgb: FLASH, period: geom.period,
      bounds: { x: Math.floor(x - b.w / 2 - pad), y: Math.floor(b.y - b.h * 1.8 - pad * 0.5), w: Math.ceil(b.w + 2 * pad), h: Math.ceil(b.h * 2.3 + pad) },
      animated: { mode: 'drift' as const, speed: drawn.animated?.speed ?? 0, period: geom.period,
        pulse: { strength, seed: b.seed, first: 1.5 + (Math.abs(b.seed) % 7), every: [7, 22] as [number, number] } },
      key: layerKey('flash', skyBoxKey(box, true), bankKey(bank)),
    }
  })
}

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
