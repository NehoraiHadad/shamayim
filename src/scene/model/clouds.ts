import { rainBanks } from '../../world/rain'
import { hashId, seeded } from '../../data/landmarks/hash'
import { sunLight } from '../../world/sceneLight'
import type { CloudBank, CloudLayer, CloudLevel, WorldState } from '../../world/types'
import { litOf, nearest, THICK, tonesAt, WHITE, wrap, type CloudLight } from './cloudLight'
import { sheetZ } from './cloudSheet'
import { layerKey, skyBoxKey } from './keys'
import { coversOf, skyGeom, skyStops, type SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { BankDesc, LayerOf, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** The drawn bank against its angular width: puff banks overhang their core (the world's width is the core's). */
const SPREAD: Record<CloudLevel, number> = { low: 1.5, mid: 1.6, high: 2.2 }
/** Height against width as drawn: heaped low cloud, flatter altocumulus, thin cirrus. */
const ASPECT: Record<CloudLevel, number> = { low: 0.4, mid: 0.26, high: 0.1 }
const Z: Record<CloudLevel, number> = { high: 6, mid: 7, low: 8 }

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
  const rains = raining.has(bank.id)
  const tones = tonesAt(world, box, stops, level, y - h / 2, union, Number(rains), bank.distanceKm)
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
    b.toward ? q(Math.atan2(b.toward[1], b.toward[0]) * 57.3, 8) : null, q(b.under, 1 / 20), q(b.silver, 1 / 20),
    q(b.rainWeight ?? Number(b.rains), 1 / 64)]
}

/** Project the shaft adapter on the cloud band without adding it to the painted clouds. */
export function rainBankDescs(world: WorldState, box: SceneBox, geom: SkyGeom, layer: CloudLayer) {
  return world.rain ? bankDescsOf(world, box, geom, layer, rainBanks(world.rain)) : []
}

/** The banks that snow, projected as the rain's are (their flakes fall under them). */
export function snowBankDescs(world: WorldState, box: SceneBox, geom: SkyGeom, layer: CloudLayer) {
  const cells = new Set(world.snowfall?.cells.map((c) => c.bank) ?? [])
  return bankDescsOf(world, box, geom, layer, layer.banks.filter((b) => cells.has(b.id)))
}

function bankDescsOf(world: WorldState, box: SceneBox, geom: SkyGeom, layer: CloudLayer,
  banks: (CloudBank & { level?: CloudLevel })[]) {
  const { low, mid, high } = coversOf(world)
  const union = 1 - (1 - low) * (1 - mid) * (1 - high)
  const stops = skyStops(world, box)
  const ids = new Set(banks.map(bank => bank.id))
  return banks.map(bank => ({ bank, drawn: snap(bankDesc(world, box, geom, stops,
    !bank.level || bank.level === layer.level ? layer : world.clouds.find(cloud => cloud.level === bank.level)!, bank, null, union,
    ids)) }))
}

/** A level's place in the stack and its drift (the layer's own), so rain and lightning keep moving with their cloud. */
export function bandOf(layer: CloudLayer, geom: SkyGeom): { z: number; speed: number } {
  return { z: Z[layer.level], speed: layer.drift * geom.s }
}

export function rainSheetZ(world: WorldState): number {
  return Math.max(0, ...(world.cloudField?.snapshot ?? []).map(({ layer, heightKm }) =>
    layer && heightKm > 0 && layer.cover > 0 ? sheetZ[layer.lattice] : 0))
}

/** The flash's colour: the blue-white of lightning seen through cloud. */
const FLASH: RGB = [0.86, 0.9, 1]

/**
 * In-cloud lightning at positive `rain.thunderWeight`: the largest banks that rain in view (two at most)
 * each light from within on a seeded schedule of flashes (`anim.ts`), drifting with their layer.
 */
export function flashLayersOf(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)):
  LayerOf<'flash'>[] {
  if (!world.rain || world.rain.thunderWeight <= 0) return []
  const strength = world.rain.thunderWeight
  const layer = world.clouds.find((l) => l.rains)
  if (!layer) return []
  const { speed } = bandOf(layer, geom)
  const mid = geom.left + box.width / 2
  const inView = (b: BankDesc) => {
    // The bank's x nearest the middle of the view, among its copies round the band.
    const k = Math.round((mid - b.x) / geom.period)
    return b.x + k * geom.period
  }
  // The largest raining banks in view (the near ones, high on the dome, where a flash shows over the land).
  const half = box.width / 2
  const candidates = rainBankDescs(world, box, geom, layer).map(({ drawn: b }) => ({ b, x: inView(b) }))
    .filter(({ b, x }) => Math.abs(x - mid) < half + b.w / 4)
    .sort((a, c) => c.b.w * c.b.h - a.b.w * a.b.h).slice(0, 2)
  return candidates.map(({ b, x }, i) => {
    const pad = b.w * 0.45
    const bank = { ...b, x }
    return {
      kind: 'flash' as const, id: `flash.${i}`, surface: 'sky' as const, z: 9, soft: true, bank, rgb: FLASH, period: geom.period,
      bounds: { x: Math.floor(x - b.w / 2 - pad), y: Math.floor(b.y - b.h * 1.8 - pad * 0.5), w: Math.ceil(b.w + 2 * pad), h: Math.ceil(b.h * 2.3 + pad) },
      animated: { mode: 'drift' as const, speed, period: geom.period,
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
