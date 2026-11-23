import type { Advect } from '../model/types'

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
interface Rect { x: number; y: number; w: number; h: number }

/*
 * A carried layer laid (`Advect`): its cached canvas cut into its bands, each shifted by its own speed × `seconds`. A band
 * that moves leaves its upwind edge open, filled with the band's own edge mirrored there, so the sky's rim never shows a
 * bare strip; the next minute's model draws what truly comes in. `rect` and `y` in device px, the bands in surface px.
 */
export function layCarried(ctx: Ctx, source: CanvasImageSource, rect: Rect, y: number, advect: Advect, seconds: number, d: number) {
  const { bands } = advect
  for (let i = 0; i < bands.length; i++) {
    const top = Math.max(0, Math.round(bands[i].y * d) - rect.y)
    const bottom = i + 1 < bands.length ? Math.min(rect.h, Math.round(bands[i + 1].y * d) - rect.y) : rect.h
    if (bottom <= top) continue
    // Never past the canvas's own width: the mirror below must still reach the edge it fills.
    const dx = Math.max(-rect.w, Math.min(rect.w, bands[i].speed * seconds * d))
    const h = bottom - top, at = y + top
    ctx.drawImage(source, 0, top, rect.w, h, rect.x + dx, at, rect.w, h)
    const open = Math.min(rect.w, Math.abs(dx))
    if (open < 0.5) continue
    // The mirror of the band's edge that moved away, laid in the gap it left.
    const edge = dx > 0 ? rect.x : rect.x + rect.w
    ctx.save()
    ctx.translate(edge + dx, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(source, dx > 0 ? 0 : rect.w - open, top, open, h, dx > 0 ? 0 : -open, at, open, h)
    ctx.restore()
  }
}
