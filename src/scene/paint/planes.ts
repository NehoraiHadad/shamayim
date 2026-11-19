import type { LayerOf } from '../model/types'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'

/** The form of a plane: its shape in its light-free tone (C2 adds texture, gullies, terraces, scrub). */
export function paintPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, _env: PaintEnv): void {
  outline(ctx, desc.outline)
  ctx.fillStyle = css(desc.fill)
  ctx.fill()
}

/**
 * The light of a plane, inside the plane's shape (the compositor lays it over the form with the light's blend): C1 the
 * tone after light and haze, then the lit faces (C2).
 */
export function paintPlaneLight(ctx: Ctx2D, desc: LayerOf<'plane'>, _env: PaintEnv): void {
  outline(ctx, desc.outline)
  ctx.fillStyle = css(desc.light.tint)
  ctx.fill()
  if (!desc.light.faces.length) return
  ctx.save()
  outline(ctx, desc.outline)
  ctx.clip()
  for (const face of desc.light.faces) {
    outline(ctx, face.points)
    ctx.fillStyle = css(face.rgb, face.alpha)
    ctx.fill()
  }
  ctx.restore()
}
