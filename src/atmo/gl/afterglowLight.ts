import type { Program } from './glUtil'
import type { Layout } from './renderer'

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * How strong the afterglow is (0..1) at this sun altitude: it builds as the sun drops under ~3° and the light turns
 * gold, and is gone by ~5° below, when Earth's shadow has climbed past the highest clouds (the shader's height gate
 * does the rest, low clouds first).
 */
export const afterglowStrength = (altitude: number) => smooth((3 - altitude) / 2.5) * (1 - smooth((altitude + 3.5) / -1.5))

/** Afterglow uniforms; zero when the scene publishes none (always so with `?scene=flat`). */
export function setAfterglow(gl: WebGLRenderingContext, air: Program, L: Layout) {
  const a = L.afterglow
  gl.uniform1f(air.u('uAfter'), a ? afterglowStrength(a.altitude) : 0)
  // No afterglow: a high sun, so the shadow arch stays off as well.
  gl.uniform2f(air.u('uAfterAt'), a?.x ?? 0, a?.altitude ?? 90)
  gl.uniform3fv(air.u('uAfterCol'), a?.rgb ?? [0, 0, 0])
}
