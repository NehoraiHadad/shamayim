import { setAfterglow } from './afterglowLight'
import { SCENE_25D } from '../../ui/sceneFlag'
import type { Program } from './glUtil'
import type { Layout } from './renderer'

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** Low-sun reddening (0..1): fades in over the lowest third of the sky above the scene. CSS y grows downward. */
export function cloudWarmth(sunY: number, sceneTop: number): number {
  if (sceneTop <= 0) return 0
  return smooth((sunY - sceneTop * 2 / 3) / (sceneTop / 3))
}

/**
 * How front-lit the clouds are (0..1). The viewer faces north (east is on the right), so near noon the sun is high in
 * the south, behind them: clouds take light from above. The drawn disc nears the middle of the picture at noon and the
 * ridges toward rise and set, where light comes from the disc's side.
 */
export function cloudFront(sunX: number, width: number): number {
  if (width <= 0) return 0
  return 1 - smooth((Math.abs(sunX / width - 0.5) - 0.08) / 0.27)
}

/** Sun-side cloud lighting uniforms (the lit scene); all zero with `?scene=flat`, so the shader is unchanged. */
export function setCloudLight(gl: WebGLRenderingContext, air: Program, L: Layout) {
  const on = SCENE_25D && L.sun !== null
  gl.uniform1f(air.u('uLit'), SCENE_25D ? 1 : 0)
  gl.uniform1f(air.u('uWarm'), on ? cloudWarmth(L.sun!.y, L.sceneTop) : 0)
  gl.uniform1f(air.u('uFront'), on ? cloudFront(L.sun!.x, L.w) : 0)
  setAfterglow(gl, air, L)
  const moon = SCENE_25D && !L.sun ? L.moon : null
  gl.uniform3f(air.u('uMoon'), moon?.x ?? 0, moon?.y ?? 0, moon?.light ?? 0)
}
