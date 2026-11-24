import type { Shine } from '../scene/model/types'

/* Even, lit and shaded tones, and a still night's light, for painter tests with no world model. */
export const evenTone = [0.35, 0.38, 0.42] as const
export const litTone = [0.72, 0.62, 0.5] as const
const shade = [0.18, 0.21, 0.25] as const
export const tones = { wall: evenTone, lit: litTone, shade, deep: shade, rim: litTone,
  roof: evenTone, roofLit: litTone, stone: evenTone, stoneLit: litTone, glass: evenTone, glassLit: litTone,
  soot: shade, green: evenTone, greenLit: litTone, panel: shade, gold: litTone, win: litTone, mist: evenTone }
export const shine: Shine = { night: 0.8, aviationStrength: 1, windows: 0.4, lean: 0, direct: 0.5,
  faces: { front: 0.2, top: 0.3, rim: 0.15, left: 0, right: 0, across: 0 }, cast: { dx: 0, alpha: 0, length: 0 } }
