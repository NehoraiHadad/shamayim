import type { SceneStyle } from '../../paint/painters'
import { penPath, pencilPath, type Stroke } from './strokes'

/** How a hand letters and rules a caption; the facts are the same for both. */
export interface CaptionHand {
  font: string; size: number; weight: number
  /** The halo's width (px) and how much of it shows. */
  halo: number; haloAlpha: number
  /** The strokes a rule is drawn with: its path, width and how much of it shows. */
  rule: { path: Stroke; width: number; alpha: number }[]
}

export const CAPTION_HANDS: Record<SceneStyle, CaptionHand> = {
  real: { font: 'var(--font-sans)', size: 12, weight: 600, halo: 3, haloAlpha: .72,
    rule: [{ path: penPath, width: 1, alpha: .92 }] },
  drawn: { font: 'var(--font-serif)', size: 13.5, weight: 500, halo: 3, haloAlpha: .72,
    rule: [{ path: pencilPath(0), width: 1.15, alpha: .85 }, { path: pencilPath(1), width: .7, alpha: .5 }] },
}
