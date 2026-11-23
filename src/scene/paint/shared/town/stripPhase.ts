import type { LayerOf } from '../../../model/types'
import type { PaintEnv } from '../base/hand'

/** Where in its strip's loop this frame stands (0…1); 0 for a still layer. */
export function stripPhase(desc: LayerOf<'outside'>, env: PaintEnv): number {
  const frames = desc.animated?.frames
  return frames ? (((env.phase * frames.fps) / frames.count) % 1 + 1) % 1 : 0
}
