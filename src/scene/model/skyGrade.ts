import { smoothstep } from '../../domain/smoothstep'
import { skyContrastCeiling } from '../../theme/contrast'
import type { WorldState } from '../../world/types'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { cloudGradeDepth } from './skyGradeClouds'
import { skyColours } from './skyColour'
import { multiplySky, SKY_FILTER_MID, skyFilterDepth, skyFilterGradientRow, skyFilterTransmission } from './skyFilter'
import { stopAt } from './skyGradient'
import type { LayerOf, RGB, SceneBox } from './types'

interface Grade { k: number; horizon: number; stops: [number, RGB][] }
const memo = new WeakMap<WorldState, { dimensions: string; grade: Grade | null }>()
const BYTE = 1 / 255

export function skyGradeOf(world: WorldState, box: SceneBox): Grade | null {
  const { top, mid, bandWeight } = skyColours(world)
  if (!bandWeight || box.width <= 0 || box.skyHeight <= 0) return null
  const dimensions = skyBoxKey(box).join(',')
  const cached = memo.get(world)
  if (cached?.dimensions === dimensions) return cached.grade
  const horizon = box.landTop + world.relief.horizonY
  if (horizon <= 0) return null
  const ceiling = skyContrastCeiling(world.light.palette.ink)
  // Two half-byte roundings (base raster and final blend); 2.4 / 1.055
  // bounds the sRGB decoding slope. Ease the reserve in with the scattered veil.
  const reserve = BYTE * (2.4 / 1.055) * smoothstep(0, 1, bandWeight)
  const k = Math.max(skyFilterDepth(top, ceiling, reserve),
    skyFilterDepth(mid, Math.min(ceiling, skyContrastCeiling('#E8F9FF')), reserve),
    cloudGradeDepth(world, box, horizon * SKY_FILTER_MID, reserve))
  const grade = k ? { k, horizon, stops: gradeStops(k) } : null
  memo.set(world, { dimensions, grade })
  return grade
}

function gradeStops(k: number): [number, RGB][] {
  // One constant section and fourteen linear intervals sampling the cubic fade.
  const intervals = 14
  return [[0, skyFilterTransmission(k, 0)], ...Array.from({ length: intervals + 1 }, (_, i): [number, RGB] => {
    const row = i === 0 ? SKY_FILTER_MID : i === intervals ? 1 : skyFilterGradientRow(k, i / intervals)
    return [row, skyFilterTransmission(k, row)]
  })]
}

/** Apply exactly the row interpolation the canvas uses. */
export function filterAt(grade: Grade | null, y: number, rgb: RGB): RGB {
  return grade ? multiplySky(rgb, stopAt(grade.stops, y / grade.horizon)) : rgb
}

export function skyFilterLayer(world: WorldState, box: SceneBox): LayerOf<'skyFilter'> | null {
  const grade = skyGradeOf(world, box)
  if (!grade) return null
  const { horizon: h, stops } = grade
  const w = box.skyWidth ?? box.width
  // Both solar parts precede the filter so they dim with the sky while retaining
  // their relative brightness. Lightning at z=9 follows it.
  return { kind: 'skyFilter', id: 'skyFilter', surface: 'sky', z: 8.9, blend: 'multiply',
    bounds: { x: 0, y: 0, w, h: Math.min(box.skyHeight, h) }, horizon: h, stops,
    key: layerKey('skyFilter', stops.map(([row, rgb]) => [row * h, colourKey(rgb)])) }
}
