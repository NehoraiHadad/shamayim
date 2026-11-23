import { smoothstep } from '../../domain/smoothstep'

/** Cross-fade facet light as the block grows past the scene's minimum legible width
 * and height. Size is measured in CSS px, independent of the device pixel ratio. */
export function facadeDetail(w: number, h: number) {
  return smoothstep(1.05, 4.8, w) * smoothstep(.85, 2.9, h)
}

/** Across a distant town the eye first groups small blocks into its fabric. */
export function farFacadeDetail(w: number, h: number) {
  return smoothstep(2.1, 5.2, w) * smoothstep(1.8, 3.5, h)
}
