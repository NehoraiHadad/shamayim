import type { Shine } from '../../model/types'

/** A box's face light and the direct share used for shading. */
export function facesOf(s: Shine) {
  const on = Math.min(1, Math.max(0, (s.direct - 0.04) / 0.41))
  return { ...s.faces, on, glint: s.glint ?? 0 }
}
