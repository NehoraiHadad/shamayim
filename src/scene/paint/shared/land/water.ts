import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf, Streak } from '../../../model/types'
import { css, outline, type Ctx2D, type PaintEnv } from '../base/hand'

/*
 * Water in the enriched hand (prototype `styleRich.ts`'s bay, after the anidoodle skill's craft notes). MEDIUM: the
 * scene's own hand, flat bodies, soft light, haze by distance, no outlines. ORDER: the surface as one wash down its depth
 * (the mirrored sky over the water's dark, as the model mixed it), then on the water only (`source-atop`, so every mark
 * takes the surface's own antialiased edge, no clip): the light rim along the far edge, the wind's ripples (light and dark
 * strokes, horizontal, shorter toward the far edge), the light's path (a soft core and its sparks); last the dashed
 * sea-level datum. Every mark comes from the model: the painter only lays it down.
 */

/** Strokes of one tone, batched by strength (four steps: the eye cannot tell finer ones on a 1 px stroke). */
function paintStreaks(ctx: Ctx2D, streaks: readonly Streak[], rgb: readonly [number, number, number], height: number) {
  if (!streaks.length) return
  const steps = [0.25, 0.5, 0.75, 1]
  const peak = Math.max(...streaks.map((s) => s.alpha))
  if (peak <= 0.005) return
  for (const step of steps) {
    ctx.beginPath()
    let any = false
    for (const s of streaks) {
      const k = s.alpha / peak
      if (k > step || k <= step - 0.25) continue
      ctx.rect(s.x, s.y - height / 2, s.w, height)
      any = true
    }
    if (!any) continue
    ctx.fillStyle = css(rgb, peak * (step - 0.125))
    ctx.fill()
  }
}

/** Where the water's loop stands (0–1) at this frame's phase (C7); 0 for a still. */
function loopAt(desc: LayerOf<'water'>, env: PaintEnv): number {
  const frames = desc.animated?.frames
  if (!frames) return 0
  const loop = frames.count / frames.fps
  return ((env.phase / loop) % 1 + 1) % 1
}

/** A ripple's place in its own cycle: seeded by its index (golden ratio), one cycle per loop, so the loop has no seam. */
const cycle = (i: number, t: number, offset: number) => (t + i * 0.618034 + offset) % 1

/**
 * The ripples at this point of the loop: each runs `drift` px downwind over its cycle, rising and falling as it goes (a
 * ripple forms, travels and smooths out), so the water moves the way the wind does and every frame keeps as many.
 */
export function running(streaks: readonly Streak[], t: number, drift: number, offset: number): Streak[] {
  return streaks.map((s, i) => {
    const u = cycle(i, t, offset)
    return { ...s, x: s.x + drift * (u - 0.5), alpha: s.alpha * (0.3 + 0.7 * Math.sin(Math.PI * u)) }
  })
}

/** The glint's sparks coming and going: each flashes once or twice a loop at its own seeded moment. */
export function twinkling(sparks: readonly Streak[], t: number): Streak[] {
  return sparks.map((s, i) => {
    const k = 1 + (i % 2)
    const u = cycle(i, t * k, 0.25)
    return { ...s, alpha: s.alpha * (0.25 + 0.75 * (0.5 + 0.5 * Math.cos(2 * Math.PI * u))) }
  })
}

export function paintWater(ctx: Ctx2D, desc: LayerOf<'water'>, env: PaintEnv): void {
  // The surface: a wash from the far edge's mirrored horizon down to the near water's darker sky.
  for (const band of desc.bands) {
    const gradient = ctx.createLinearGradient(0, band.top, 0, Math.max(band.top + 0.5, band.bottom))
    for (const [at, rgb] of band.stops) gradient.addColorStop(at, css(rgb))
    outline(ctx, band.points)
    ctx.fillStyle = gradient
    ctx.fill()
  }
  // A hair is the device's px: strokes on the water are one device px thick at least, never thinner.
  const hair = Math.max(0.5, 1 / env.scale)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const band of desc.bands) {
    if (band.far.length < 2) continue
    ctx.beginPath()
    band.far.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + hair / 2) : ctx.moveTo(x, y + hair / 2)))
    ctx.strokeStyle = css(band.rim.rgb, band.rim.alpha * smoothstep(0, 0.04, band.rim.alpha))
    ctx.lineWidth = hair * 1.5
    ctx.stroke()
  }
  const { ruffle } = desc
  const t = loopAt(desc, env)
  paintStreaks(ctx, running(ruffle.shade, t, ruffle.drift, 0), ruffle.dark, hair)
  paintStreaks(ctx, running(ruffle.lit, t, ruffle.drift, 0.5), ruffle.light, hair)
  for (const glint of desc.glints) {
    // The path's soft core: a wedge under the light, widening toward the eye, in two strengths (a soft edge, no filter),
    // breathing a little with the waves over the loop.
    const depth = glint.bottom - glint.top
    const breathe = 1 + 0.07 * Math.sin(2 * Math.PI * t)
    for (const [k, a] of [[1, 0.16], [0.45, 0.26]] as const) {
      const top = 0.35 * k, foot = (0.5 + depth * glint.spread * 0.55) * k * breathe
      ctx.beginPath()
      ctx.moveTo(glint.x - top, glint.top)
      ctx.lineTo(glint.x + top, glint.top)
      ctx.lineTo(glint.x + foot, glint.bottom)
      ctx.lineTo(glint.x - foot, glint.bottom)
      ctx.closePath()
      ctx.fillStyle = css(glint.rgb, glint.alpha * a)
      ctx.fill()
    }
    paintStreaks(ctx, twinkling(glint.sparks, t), glint.rgb, hair * 1.2)
  }
  ctx.globalCompositeOperation = 'source-over'
  paintDatum(ctx, desc)
}

/**
 * The sea-level datum: a quiet dashed note one css px wide, in its note's tone (below sea level only), segment by segment;
 * an end that meets no land fades out to nothing.
 */
function paintDatum(ctx: Ctx2D, desc: LayerOf<'water'>) {
  const datum = desc.datum
  if (!datum) return
  ctx.setLineDash([1, 4])
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  for (const seg of datum.segments) {
    ctx.beginPath()
    ctx.moveTo(seg.x1, datum.y)
    ctx.lineTo(seg.x2, datum.y)
    if (seg.fadeLeft || seg.fadeRight) {
      const fade = ctx.createLinearGradient(seg.x1, 0, seg.x2, 0)
      const solid = css(datum.rgb, datum.alpha), none = css(datum.rgb, 0)
      const length = Math.max(1e-6, seg.x2 - seg.x1)
      fade.addColorStop(0, seg.fadeLeft ? none : solid)
      if (seg.fadeLeft) fade.addColorStop(Math.min(1, seg.fadeLeft / length), solid)
      if (seg.fadeRight) fade.addColorStop(Math.max(0, 1 - seg.fadeRight / length), solid)
      fade.addColorStop(1, seg.fadeRight ? none : solid)
      ctx.strokeStyle = fade
    } else ctx.strokeStyle = css(datum.rgb, datum.alpha)
    ctx.stroke()
  }
  ctx.setLineDash([])
}
