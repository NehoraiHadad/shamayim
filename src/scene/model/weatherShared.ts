//# allFunctionsCalledOnLoad
import type { RGB } from './types'

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const WHITE: RGB = [1, 1, 1]
export const q = (v: number, step: number) => Math.round(v / step)
export const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))
/** A tile's size in CSS px that is a whole number of device px (a pattern repeats on its device size). */
export const whole = (px: number, dpr: number) => Math.max(1, Math.round(px * dpr)) / dpr

/**
 * A weather layer of the land that is all light (mist, smoke, sheen: their colours follow the hour): its form is only its
 * place, so a scrub repaints the light canvas alone, as the water's and the far towns' (§1d).
 */
export const lightPart = (key: string, tint: RGB) => ({ key, blend: 'source-over' as const, tint })
