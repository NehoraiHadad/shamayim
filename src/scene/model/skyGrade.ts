import { skyContrastCeiling } from '../../theme/contrast'
import type { WorldState } from '../../world/types'
import { luminanceOf } from './cloudChromaticity'
import { colourKey, layerKey, skyBoxKey } from './keys'
import { inkSkySamples } from './skyGradeClouds'
import { dustBandEase, skyColours, skyStops, stopAt, unveiledSkyColours } from './skyColour'
import { multiplySky, SKY_FILTER_MID, skyFilterDepth, skyFilterGradientRows, skyFilterReserve, skyFilterTransmission } from './skyFilter'
import { mixSrgb } from './tone'
import type { LayerOf, RGB, SceneBox } from './types'

type Stops = [number, RGB][]
interface Grade { k: number; horizon: number; stops: Stops; rasterStops: Stops }
const memo = new WeakMap<WorldState, { dimensions: string; grade: Grade | null }>()
const byteRgb = (rgb: RGB): RGB => {
  const [r, g, b] = colourKey(rgb)
  return [r / 255, g / 255, b / 255]
}

export function skyGradeOf(world: WorldState, box: SceneBox): Grade | null {
  const { bandWeight } = skyColours(world)
  if (!bandWeight || box.width <= 0 || box.skyHeight <= 0) return null
  const dimensions = skyBoxKey(box).join(',')
  const cached = memo.get(world)
  if (cached?.dimensions === dimensions) return cached.grade
  const horizon = box.landTop + world.relief.horizonY
  if (horizon <= 0) return null
  const ceiling = skyContrastCeiling(world.light.palette.ink)
  const middle = Math.min(box.skyHeight, horizon * SKY_FILTER_MID)
  const sentence = Math.min(ceiling, skyContrastCeiling('#E8F9FF'))
  const ease = dustBandEase(bandWeight)
  const unveiled = ease < 1 ? skyStops(world, box, unveiledSkyColours(world)) : null
  let skyDepth = 0, cloudDepth = 0
  for (const [row, rgb, sky] of inkSkySamples(world, box, middle)) {
    const cap = row === middle ? sentence : ceiling
    const reserve = skyFilterReserve(sky)
    const cleanY = unveiled ? luminanceOf(stopAt(unveiled, row / box.skyHeight, mixSrgb)) : cap
    // Clear-day mid #3172B0 is Y≈0.158: below the sentence ceiling (~0.161) but inside its two-reserve knee.
    // Ease that existing debt, including any above-ceiling city light or cropped clean gradient.
    const skyCap = cap + (1 - ease) * Math.max(0, cleanY - cap)
    const skyReserve = ease * reserve + (1 - ease) * Math.min(reserve, Math.max(0, cap - cleanY) / 2)
    skyDepth = skyFilterDepth(sky, skyCap, skyReserve, skyDepth)
    if (rgb !== sky) cloudDepth = skyFilterDepth(rgb, cap, skyFilterReserve(rgb), cloudDepth)
  }
  const k = Math.max(skyDepth, ease * cloudDepth)
  const stops = k ? gradeStops(k) : []
  const grade: Grade | null = k ? { k, horizon, stops, rasterStops: stops.map(([row, rgb]) => [row, byteRgb(rgb)]) } : null
  memo.set(world, { dimensions, grade })
  return grade
}

function gradeStops(k: number): Stops {
  // One constant section and fourteen linear intervals sampling the cubic fade.
  return [[0, skyFilterTransmission(k, 0)], ...skyFilterGradientRows(k, 14)
    .map((row): [number, RGB] => [row, skyFilterTransmission(k, row)])]
}

/** Apply exactly the row interpolation the canvas uses. */
export function filterAt(grade: Grade | null, y: number, rgb: RGB): RGB {
  return grade ? multiplySky(rgb, filterTransmissionAt(grade, y)) : rgb
}

function filterTransmissionAt(grade: Grade, y: number): RGB {
  return byteRgb(stopAt(grade.rasterStops, y / grade.horizon, mixSrgb))
}

/** Recover the beam-lit disc at its centre while keeping it behind the clouds. */
export function unfilterDisc(grade: Grade | null, y: number, rgb: RGB): RGB {
  if (!grade) return rgb
  const [r, g, b] = filterTransmissionAt(grade, y)
  return [Math.min(1, rgb[0] / r), Math.min(1, rgb[1] / g), Math.min(1, rgb[2] / b)]
}

export function skyFilterLayer(world: WorldState, box: SceneBox): LayerOf<'skyFilter'> | null {
  const grade = skyGradeOf(world, box)
  if (!grade) return null
  const { horizon: h, stops } = grade
  const w = box.skyWidth ?? box.width
  // The aureole and rainbow dim with the sky. Lightning follows the filter.
  return { kind: 'skyFilter', id: 'skyFilter', surface: 'sky', z: 8.9, blend: 'multiply',
    bounds: { x: 0, y: 0, w, h: Math.min(box.skyHeight, h) }, horizon: h, stops,
    key: layerKey('skyFilter', stops.map(([row, rgb]) => [row * h, colourKey(rgb)])) }
}
