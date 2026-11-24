import type { SceneStyle } from '../../paint/painters'
import { penPath, pencilPath, type Stroke } from './strokes'

/** How a hand letters and rules a caption; the facts are the same for both. */
export interface CaptionHand {
  font: string; size: number; weight: number
  /** The halo: its stroke (px), how soft it is (px) and how much of it shows. */
  halo: { width: number; blur: number; alpha: number }
  /** The strokes a rule is drawn with: its path, width and how much of it shows. */
  rule: { path: Stroke; width: number; alpha: number }[]
}

const HALO = { width: 3.2, blur: 1.1, alpha: .85 }

export const CAPTION_HANDS: Record<SceneStyle, CaptionHand> = {
  real: { font: 'var(--font-sans)', size: 12, weight: 600, halo: HALO, rule: [{ path: penPath, width: .9, alpha: .78 }] },
  drawn: { font: 'var(--font-serif)', size: 13, weight: 500, halo: HALO,
    rule: [{ path: pencilPath(0), width: 1, alpha: .75 }, { path: pencilPath(1), width: .6, alpha: .45 }] },
}
