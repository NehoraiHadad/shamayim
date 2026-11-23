import { smoothstep } from '../../domain/smoothstep'
import type { FallMark, LayerOf, MistBandDesc } from '../model/types'
import { rng } from './core'
import { curtain, type Fibres } from './curtain'
import { css, type Ctx2D, type PaintEnv } from './hand'

/*
 * The weather in the enriched hand (stage C7), after the anidoodle skill's craft notes (`realism-and-craft.md`: no
 * filter, soft edges by stacked copies and gradients, marks sized to what they draw; `craft-bar.md`: no even scatter, lost
 * edges). Real reference, from life and photographs of the Galilee and the coast in winter: rain shafts under a cumulus
 * line seen 5–20 km off (dark fibrous curtains leaning downwind, densest under the base, thinning toward the ground, the
 * far ridge showing through); near rain as thin bright streaks against dark ground and grey streaks against the sky;
 * valley fog lying level after a wet night with the ridges standing out of it; a cooling tower's plume bending over in
 * the wind; wet limestone and roads sending back the sky in short level glints; crepuscular rays fanning from a low sun
 * through gaps in a broken deck. MEDIUM: the scene's soft hand, no outlines. ORDER: a curtain's body, then its strands;
 * a fog's body, then the puffs on its top; a plume's puffs old to young.
 *
 * Animation is never painted per frame: falling tiles and drifting bands are laid by the compositor; a strip (smoke) is
 * painted once per frame of its loop at `env.phase`, and its motion is periodic over the loop.
 */

const STEPS = [0.25, 0.5, 0.75, 1]

/** Each mark of a tile, and its copies across the tile's edges (the tile repeats as a pattern). */
function wrapped(marks: readonly FallMark[], w: number, h: number, reach: number, each: (m: FallMark, x: number, y: number) => void) {
  for (const m of marks) {
    for (const dx of [-w, 0, w]) {
      for (const dy of [-h, 0, h]) {
        const x = m.x + dx, y = m.y + dy
        if (x < -reach || x > w + reach || y < -reach || y > h + reach) continue
        each(m, x, y)
      }
    }
  }
}

/**
 * A falling tile: rain as streaks along the slant (a bright head and a fainter tail: motion seen in one glance), snow as
 * soft flakes, batched by strength. The compositor lays it as a moving pattern inside the areas it falls in.
 */
export function paintFall(ctx: Ctx2D, desc: LayerOf<'fall'>, env: PaintEnv): void {
  const { w, h } = desc.bounds
  const hair = Math.max(0.5, 1 / env.scale)
  if (desc.precip === 'rain') {
    const len = Math.hypot(desc.slant, 1)
    const ux = desc.slant / len, uy = 1 / len
    ctx.lineCap = 'round'
    STEPS.forEach((step, k) => {
      for (const [part, width, a] of [[1, 1, 0.45], [0.55, 1.15, 1]] as const) {
        ctx.beginPath()
        let any = false
        wrapped(desc.marks, w, h, 24, (m, x, y) => {
          if (m.alpha > step || m.alpha <= step - 0.25) return
          // Head at (x, y); the tail runs back up the slant.
          ctx.moveTo(x, y)
          ctx.lineTo(x - ux * m.len * part, y - uy * m.len * part)
          any = true
        })
        if (!any) continue
        ctx.lineWidth = hair * (m0(desc.marks) > 10 ? 1.2 : 1) * width
        ctx.strokeStyle = css(desc.rgb, (step - 0.125) * a * (k === 3 ? 1 : 0.9))
        ctx.stroke()
      }
    })
    return
  }
  STEPS.forEach((step) => {
    for (const [grow, a] of [[1.8, 0.3], [1, 0.85]] as const) {
      ctx.beginPath()
      let any = false
      wrapped(desc.marks, w, h, 4, (m, x, y) => {
        if (m.alpha > step || m.alpha <= step - 0.25) return
        const r = Math.max(hair * 0.6, m.r * grow)
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
        any = true
      })
      if (!any) continue
      ctx.fillStyle = css(desc.rgb, (step - 0.125) * a)
      ctx.fill()
    }
  })
}
const m0 = (marks: readonly FallMark[]) => marks.reduce((max, m) => Math.max(max, m.len), 0)

/** A soft ellipse: a radial gradient squashed by the transform (no filter). */
export function soft(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, rgb: readonly [number, number, number],
  alpha: number, fadesWithLight = false) {
  if (rx <= 0 || ry <= 0 || (!fadesWithLight && alpha <= 0.003)) return
  const opacity = fadesWithLight ? alpha * smoothstep(0, 0.006, alpha) : alpha
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, css(rgb, opacity))
  g.addColorStop(0.55, css(rgb, opacity * 0.55))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Mist lying level: its body fading in at its top, the soft puffs along the top (wrapping round the tile). */
export function paintMist(ctx: Ctx2D, desc: LayerOf<'mist'>, _env: PaintEnv): void {
  mistBands(ctx, desc.bands, desc.bounds)
}

/** Bands of mist over a tile `bounds` wide (C7's mist, C8's loading bank): each body, then the puffs along its top. */
export function mistBands(ctx: Ctx2D, bands: readonly MistBandDesc[], bounds: { x: number; w: number }) {
  const { x: bx, w } = bounds
  for (const band of bands) {
    const g = ctx.createLinearGradient(0, band.top - band.fade, 0, band.bottom)
    const span = Math.max(1, band.bottom - (band.top - band.fade))
    g.addColorStop(0, css(band.rgb, 0))
    g.addColorStop(Math.min(0.95, (2 * band.fade) / span), css(band.rgb, band.alpha * 0.75))
    g.addColorStop(1, css(band.rgb, band.alpha))
    ctx.fillStyle = g
    ctx.fillRect(bx, band.top - band.fade, w, span)
    for (const p of band.puffs) {
      for (const dx of [-w, 0, w]) {
        const x = bx + p.x + dx
        if (x + p.rx < bx || x - p.rx > bx + w) continue
        soft(ctx, x, p.y, p.rx, p.ry, band.rgb, band.alpha * p.alpha * 0.8, true)
      }
    }
  }
}

/** Dust grains (short streaks along the wind) or a gale's long faint streaks, wrapping round the tile. */
export function paintGrains(ctx: Ctx2D, desc: LayerOf<'grains'>, env: PaintEnv): void {
  const { x: bx, y: by, w } = desc.bounds
  const hair = Math.max(0.5, 1 / env.scale)
  ctx.lineCap = 'round'
  STEPS.forEach((step) => {
    const peak = Math.max(...desc.marks.map((m) => m.alpha), 0.001)
    ctx.beginPath()
    let any = false
    for (const m of desc.marks) {
      const k = m.alpha / peak
      if (k > step || k <= step - 0.25) continue
      for (const dx of [-w, 0, w]) {
        const x = bx + m.x + dx
        if (x + m.len < bx || x > bx + w) continue
        ctx.moveTo(x, by + m.y)
        ctx.lineTo(x + m.len, by + m.y + m.len * 0.04)
        any = true
      }
    }
    if (!any) return
    ctx.lineWidth = Math.max(hair, (desc.marks[0]?.r ?? 0.5) * 1.4)
    ctx.strokeStyle = css(desc.rgb, peak * (step - 0.125))
    ctx.stroke()
  })
}

/**
 * Rays (C7, C9): lit and shadowed wedges fanning from their point (the sun, or the point opposite it), each fading out
 * along its length, soft-edged; a corona's fine lit rays brightest near the disc.
 */
export function paintRays(ctx: Ctx2D, desc: LayerOf<'rays'>, _env: PaintEnv): void {
  const { x, y, reach } = desc
  for (const ray of desc.rays) {
    const rgb = ray.lit ? desc.rgb : desc.shade
    const g = ctx.createRadialGradient(x, y, reach * 0.08, x, y, reach)
    g.addColorStop(0, css(rgb, 0))
    if (desc.look === 'corona') {
      // Glare: brightest just off the limb, gone within its short reach.
      g.addColorStop(0.18, css(rgb, ray.alpha * 0.16))
      g.addColorStop(0.45, css(rgb, ray.alpha * 0.05))
    } else {
      g.addColorStop(0.15, css(rgb, ray.alpha * (ray.lit ? 0.11 : 0.12)))
      g.addColorStop(0.5, css(rgb, ray.alpha * (ray.lit ? 0.06 : 0.07)))
    }
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    for (const k of [1, 0.6]) {
      const a0 = ray.angle - (ray.width * k) / 2, a1 = ray.angle + (ray.width * k) / 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(a0) * reach, y - Math.cos(a0) * reach)
      ctx.lineTo(x + Math.sin(a1) * reach, y - Math.cos(a1) * reach)
      ctx.closePath()
      ctx.fill()
    }
  }
}

/**
 * Smoke and steam: puffs rising along the plume, old to young, growing and thinning as they go; the frame's phase moves
 * each puff one place along over the strip's loop (so the last frame runs into the first), the wobble a function of the
 * place along the plume alone. The top of each puff catches the light.
 */
export function paintSmoke(ctx: Ctx2D, desc: LayerOf<'smoke'>, env: PaintEnv): void {
  const frames = desc.animated?.frames
  const loop = frames ? frames.count / frames.fps : 1
  const p = ((env.phase / loop) % 1 + 1) % 1
  for (const plume of desc.plumes) {
    const r = rng(plume.seed)
    const wob = r() * Math.PI * 2, wobAmp = 0.6 + 1.2 * r()
    for (let k = plume.puffs - 1; k >= 0; k--) {
      const u = (k + p) / plume.puffs
      const along = u ** 0.85
      const px = plume.x + plume.dx * along + Math.sin(u * 9 + wob) * wobAmp * u
      const py = plume.y + plume.dy * u
      const rad = plume.r0 + (plume.r1 - plume.r0) * u ** 0.7
      const a = plume.alpha * (1 - u) ** 1.3 * Math.min(1, u / 0.1)
      soft(ctx, px, py, rad, rad * 0.85, plume.rgb, a)
      soft(ctx, px, py - rad * 0.3, rad * 0.7, rad * 0.55, plume.lit, a * 0.6)
    }
  }
}

/** The wet ground's sheen: short level strokes, a brighter core in a fainter glint, sending back the sky. */
export function paintSheen(ctx: Ctx2D, desc: LayerOf<'sheen'>, env: PaintEnv): void {
  const hair = Math.max(0.5, 1 / env.scale)
  for (const [grow, a] of [[1, 0.5], [0.55, 1]] as const) {
    STEPS.forEach((step) => {
      const peak = Math.max(...desc.strokes.map((s) => s.alpha), 0.001)
      ctx.beginPath()
      let any = false
      for (const s of desc.strokes) {
        const k = s.alpha / peak
        if (k > step || k <= step - 0.25) continue
        const w = s.w * grow
        ctx.rect(s.x + (s.w - w) / 2, s.y - hair / 2, w, hair * (grow === 1 ? 1.4 : 1))
        any = true
      }
      if (!any) return
      ctx.fillStyle = css(desc.rgb, peak * (step - 0.125) * a)
      ctx.fill()
    })
  }
}

/** The edge mark: a heavy bank cut by the frame's edge, its curtain leaning downwind to the horizon. */
export function paintEdge(ctx: Ctx2D, desc: LayerOf<'edge'>, env: PaintEnv, fibres: Fibres): void {
  const { x, y, w, h, side, seed } = desc
  const dir = side === 'left' ? 1 : -1
  const cx = x + dir * w * 0.35
  const r = rng(seed)
  curtain(ctx, { x: cx, top: y - h * 0.15, bottom: desc.bounds.y + desc.bounds.h, w: w * 0.75, lean: desc.lean,
    rgb: desc.curtain, alpha: desc.alpha * 0.9, seed }, desc.precip === 'snow', env, fibres)
  // The bank: a shower cloud heaped on a flat base, towering on the side toward the frame (its body grows into the view):
  // puffs of seeded sizes along a rising profile, the base's shade as flattened puffs under them, the body over.
  const n = 11
  const puffs: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.3 + 0.4 * r()) / n
    // Higher toward the view's side (t → 1 runs inward from the edge).
    const rise = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.55 + 0.6 * t)
    const rad = h * (0.38 + 0.4 * r()) * (0.75 + 0.5 * rise)
    puffs.push({ x: x + dir * (t * w * 0.95 - w * 0.08), y: y - rad * 0.55 - h * rise * (0.45 + 0.25 * r()), r: rad })
  }
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6
    soft(ctx, x + dir * (t * w * 0.9 - w * 0.05), y - h * 0.08, w * 0.16, h * 0.2, desc.shade, desc.alpha * 0.85)
  }
  for (const p of puffs) soft(ctx, p.x, p.y + p.r * 0.25, p.r * 1.05, p.r * 0.8, desc.shade, desc.alpha * 0.7)
  for (const p of puffs) soft(ctx, p.x - dir * p.r * 0.1, p.y - p.r * 0.1, p.r, p.r * 0.85, desc.body, desc.alpha)
}
