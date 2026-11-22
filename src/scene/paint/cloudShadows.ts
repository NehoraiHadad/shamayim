import type { LayerOf, Pt } from '../model/types'
import { css, type Ctx2D } from './hand'

type Clip = NonNullable<LayerOf<'cloudShadow'>['clip']>

/*
 * The field's cloud shadows on one land plane (`model/cloudShadowLayers.ts`). MEDIUM: soft washes of the sky-lit dark,
 * each a radial falloff squashed into the ground's foreshortened ellipse (no filter): a dense core (the umbra under the
 * cell's thick middle) easing to nothing at the rim (the penumbra of the sun's 0.53° disc and the cell's thinning edge).
 * ORDER: the plane's clip (at or below its own crest, above the crest of the plane in front, which hides that ground),
 * then the blobs. The surface lays the layer `source-atop` the land. Pure: every number is the model's.
 */
export function paintCloudShadow(ctx: Ctx2D, desc: LayerOf<'cloudShadow'>): void {
  const { blobs, rgb, clip, bounds } = desc
  if (!blobs.length) return
  ctx.save()
  if (clip) clipToPlane(ctx, clip, bounds.h)
  for (const b of blobs) {
    if (b.x + b.rx < 0 || b.x - b.rx > bounds.w || b.alpha <= 0) continue
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.scale(1, b.ry / b.rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.rx)
    g.addColorStop(0, css(rgb, b.alpha))
    g.addColorStop(0.45, css(rgb, b.alpha * 0.9))
    g.addColorStop(0.8, css(rgb, b.alpha * 0.35))
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, b.rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** The ground this plane shows: down from its crest, and above the nearer plane's crest where one stands in front. */
function clipToPlane(ctx: Ctx2D, { crest, front }: Clip, height: number): void {
  if (crest.length < 2) return
  ctx.beginPath()
  trace(ctx, crest, false)
  if (front && front.length >= 2) {
    const [x0, x1] = [crest[0][0], crest[crest.length - 1][0]]
    trace(ctx, front.filter(([x]) => x >= x0 && x <= x1), true, crest[crest.length - 1], crest[0])
  } else {
    ctx.lineTo(crest[crest.length - 1][0], height)
    ctx.lineTo(crest[0][0], height)
  }
  ctx.closePath()
  ctx.clip()
}

/** Lines through `pts`, back to front when `reverse`; a front that misses an end drops straight down to the bounds. */
function trace(ctx: Ctx2D, pts: Pt[], reverse: boolean, right?: Pt, left?: Pt): void {
  const run = reverse ? [...pts].reverse() : pts
  if (reverse && right && (!run.length || run[0][0] < right[0])) ctx.lineTo(right[0], run[0]?.[1] ?? right[1])
  run.forEach(([x, y], i) => (i === 0 && !reverse ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  if (reverse && left && run.length && run[run.length - 1][0] > left[0]) ctx.lineTo(left[0], run[run.length - 1][1])
}
