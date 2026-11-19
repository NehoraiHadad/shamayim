import type { Box, LayerOf, Pt, Wash } from '../model/types'
import { displace, sample, tube } from './core'
import { css, outline, type Ctx2D, type PaintEnv } from './hand'

/*
 * A plane of land in the enriched hand (prototype `styleRich.ts`, after the anidoodle skill's craft notes). MEDIUM: the
 * app's own scene hand, flat opaque bodies cut from the ridge colour, soft one-sided light, haze by distance, no
 * outlines. ORDER: the form first (light-free, in values round a neutral grey: the ground's mottle and grain, gullies
 * cut down the slopes, terraces along the contours, scrub drifts with their contact shade), then the light laid over it
 * with `overlay` (the tones after haze, the shade and lit bands below the crest, the floor shadow, the rim, snow, and
 * the side the small things catch the light on). Texture without filters: a seeded noise field drawn small and back up
 * (the skill's "draw small and draw back up"), edges softened by stacked copies.
 */

/** A seeded hash of a lattice point, 0…1. */
function hash(seed: number, x: number, y: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise (a seeded lattice, eased between points), 0…1: cheap enough to sample every texel cold. */
function valueNoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1)
  return a + (b - a) * sx + (c - a + (d - c - b + a) * sx) * sy
}

/** Scene px per texel of the ground's texture (drawn back up to the device: a soft mottle, no filter). */
const TEXEL = 3

/**
 * The ground's texture over a plane's bounds: a low-frequency mottle (two octaves of seeded value noise) with a grain,
 * laid as dark and (faintly) light marks round the neutral form. Computed at one texel per `TEXEL` scene px and drawn
 * back up to the device's ratio (the skill's "draw small and draw back up"), clipped to the plane.
 */
function paintTexture(ctx: Ctx2D, bounds: Box, amount: number, seed: number, env: PaintEnv) {
  if (amount <= 0) return
  const cols = Math.max(1, Math.ceil(bounds.w / TEXEL)), rows = Math.max(1, Math.ceil(bounds.h / TEXEL))
  const scratch = env.canvas(cols, rows)
  const image = scratch.ctx.createImageData(cols, rows)
  const data = image.data
  const gx0 = Math.round(bounds.x / TEXEL), gy0 = Math.round(bounds.y / TEXEL)
  for (let j = 0; j < rows; j++) {
    const y = bounds.y + j * TEXEL
    for (let i = 0; i < cols; i++) {
      const x = bounds.x + i * TEXEL
      // Two octaves of mottle (~17 × 10 px and half that) and a grain per texel.
      const v = valueNoise(seed, x * 0.06, y * 0.1) * 0.67 + valueNoise(seed + 7, x * 0.12, y * 0.2) * 0.33 - 0.5
        + (hash(seed + 3, i + gx0, j + gy0) - 0.5) * 0.14
      const o = (j * cols + i) * 4
      if (v < -0.035) {
        data[o + 3] = Math.round(255 * Math.min(0.12, (-v - 0.02) * 0.34 * amount))
      } else if (v > 0.07) {
        data[o] = data[o + 1] = data[o + 2] = 255
        data[o + 3] = Math.round(255 * Math.min(0.04, (v - 0.07) * 0.12 * amount))
      }
    }
  }
  scratch.ctx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'low'
  ctx.drawImage(scratch.canvas as CanvasImageSource, bounds.x, bounds.y, cols * TEXEL, rows * TEXEL)
}

/** The form of a plane: neutral ground, its texture, gullies, terraces and scrub, light-free (no side, no colour). */
export function paintPlane(ctx: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv): void {
  outline(ctx, desc.outline)
  ctx.fillStyle = css(desc.fill)
  ctx.fill()
  ctx.save()
  outline(ctx, desc.outline)
  ctx.clip()
  paintTexture(ctx, desc.bounds, desc.grain.amount * env.hand.grain, desc.grain.seed, env)
  ctx.restore()
  // Gullies, terraces and scrub lie under the crest by construction (`world/land.ts`): no clip.

  // Gullies: a tapered cut down the slope, darkest at its head and fading as it runs out, its edge softened by a
  // wider, fainter copy; the line wobbles a little (displaced geometry, seeded).
  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.1, 0.3, 2, desc.grain.seed + i * 13)
    const n = line.length
    for (const [from, to, fade] of [[0, 0.45, 1], [0.4, 0.75, 0.65], [0.7, 1, 0.35]] as const) {
      const piece = line.slice(Math.floor(from * (n - 1)), Math.ceil(to * (n - 1)) + 1)
      if (piece.length < 2) continue
      const w0 = gully.w * (1 - from * 0.7), w1 = gully.w * (1 - to * 0.7)
      for (const [k, a] of [[1, 0.35], [0.45, 1]] as const) {
        outline(ctx, tube(piece, w0 * k / 2, w1 * k / 2, false))
        ctx.fillStyle = `rgb(0 0 0 / ${(gully.alpha * a * fade).toFixed(3)})`
        ctx.fill()
      }
    }
  })

  // Terraces: the shade line under each step of the hillside.
  if (desc.terraces.length) {
    ctx.beginPath()
    for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.45) : ctx.moveTo(x, y + 0.45)))
    ctx.strokeStyle = 'rgb(0 0 0 / 0.11)'
    ctx.lineWidth = 0.55
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // Scrub: each bush a dot of dark green-grey, and its contact shade on the ground under it.
  if (desc.scrub.length) {
    ctx.beginPath()
    for (const dot of desc.scrub) ctx.rect(dot.x - dot.r * 0.2, dot.y + dot.r * 0.55, dot.r * 1.5, Math.max(0.35, dot.r * 0.3))
    ctx.fillStyle = 'rgb(0 0 0 / 0.2)'
    ctx.fill()
    // One fill per tone (the bushes of a tone share it; their order does not matter, they do not overlap much).
    const byTone = new Map<string, typeof desc.scrub>()
    for (const dot of desc.scrub) {
      const tone = css(dot.rgb, 0.8)
      byTone.set(tone, [...(byTone.get(tone) ?? []), dot])
    }
    for (const [tone, dots] of byTone) {
      ctx.beginPath()
      for (const dot of dots) {
        ctx.moveTo(dot.x + dot.r, dot.y)
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
      }
      ctx.fillStyle = tone
      ctx.fill()
    }
  }
}

/** The nested bands of a wash: each depth's share of the band and its strength (a soft fall-off, no filter). */
const WASH = [[1, 0.22], [0.78, 0.22], [0.57, 0.22], [0.37, 0.22], [0.18, 0.22]] as const

/** Washes below crest lines, fading downward: nested bands, each a little shallower, one path per depth for all. */
function paintWashes(ctx: Ctx2D, washes: readonly Wash[]) {
  if (!washes.length) return
  for (const [f, w] of WASH) {
    ctx.beginPath()
    for (const wash of washes) {
      wash.top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      for (let i = wash.top.length - 1; i >= 0; i--) ctx.lineTo(wash.top[i][0], wash.top[i][1] + wash.depth[i] * f)
      ctx.closePath()
    }
    // A plane's washes of one kind share their colour and strength.
    ctx.fillStyle = css(washes[0].rgb, washes[0].alpha * w)
    ctx.fill()
  }
}

/** A shape with its edge softened by stacked offset copies (the skill's blur without a filter). */
function paintSoft(ctx: Ctx2D, points: Pt[], fill: string, soft: number) {
  const offsets: [number, number][] = soft > 0
    ? [[0, 0], [-soft, 0], [soft, 0], [0, -soft / 2], [0, soft / 2], [-soft / 2, -soft / 4], [soft / 2, soft / 4]]
    : [[0, 0]]
  ctx.fillStyle = fill
  for (const [dx, dy] of offsets) {
    ctx.beginPath()
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)))
    ctx.closePath()
    ctx.fill()
  }
}

/**
 * The light of a plane, inside the plane's shape (the compositor lays it over the form with `overlay`): the tone along
 * the crest after haze and wet ground (aerial perspective by distance), snow, the shade and lit bands below the crests,
 * the floor shadow, the rim, and the side the scrub and the gully lips catch the light on.
 */
export function paintPlaneLight(ctx: Ctx2D, desc: LayerOf<'plane'>, _env: PaintEnv): void {
  const light = desc.light
  const { x, w } = desc.bounds
  // The tone: the plane's own shape filled.
  outline(ctx, desc.outline)
  if (light.tones.length > 1) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0)
    for (const [at, rgb] of light.tones) g.addColorStop(Math.min(1, Math.max(0, (at - x) / (w || 1))), css(rgb))
    ctx.fillStyle = g
  } else ctx.fillStyle = css(light.tint)
  ctx.fill()
  // Everything after the tone is laid on it with `source-atop`: it takes the plane's own edge (its antialiased coverage,
  // exactly), so no clip, and no dark fringe where a light shape (snow, the rim) meets the edge.
  ctx.globalCompositeOperation = 'source-atop'
  if (light.snow) {
    // Snow above the snow line, its lower edge thinning out over a few px.
    const { edge, rgb, alpha } = light.snow
    for (const [dy, a] of [[-3, 0.45], [0, 0.35], [2.5, 0.3]] as const) {
      ctx.beginPath()
      ctx.moveTo(edge[0][0], desc.bounds.y - 20)
      ctx.lineTo(edge.at(-1)![0], desc.bounds.y - 20)
      for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(edge[i][0], edge[i][1] + dy)
      ctx.closePath()
      ctx.fillStyle = css(rgb, alpha * a)
      ctx.fill()
    }
  }
  paintWashes(ctx, light.shade)
  paintWashes(ctx, light.lit)
  for (const face of light.faces) paintSoft(ctx, face.points, css(face.rgb, face.alpha / (face.soft ? 4 : 1)), face.soft ?? 0)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // The rim: one stroke per strength (the runs of a plane share its colour).
  ctx.lineWidth = 0.7
  for (const alpha of [...new Set(light.rims.map((rim) => rim.alpha))]) {
    const rims = light.rims.filter((rim) => rim.alpha === alpha)
    ctx.beginPath()
    for (const rim of rims) rim.points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.strokeStyle = css(rims[0].rgb, alpha)
    ctx.stroke()
  }

  // The small things of the ground catch the light on its side.
  const lift = light.lift
  if (lift) {
    if (desc.scrub.length) {
      ctx.beginPath()
      for (const dot of desc.scrub) {
        if (dot.r < 0.7) continue
        const cx = dot.x + lift.dx * dot.r * 0.35, cy = dot.y + lift.dy * dot.r * 0.45
        ctx.rect(cx - dot.r * 0.45, cy - dot.r * 0.4, dot.r * 0.9, dot.r * 0.8)
      }
      ctx.fillStyle = css(lift.rgb, lift.alpha)
      ctx.fill()
    }
    if (desc.gullies.length) {
      ctx.beginPath()
      for (const gully of desc.gullies) {
        const lip = gully.points.slice(0, Math.max(2, Math.ceil(gully.points.length * 0.7)))
        lip.forEach(([px, py], i) => (i ? ctx.lineTo(px + lift.dx * gully.w * 0.6, py) : ctx.moveTo(px + lift.dx * gully.w * 0.6, py)))
      }
      ctx.strokeStyle = css(lift.rgb, lift.alpha * 0.3)
      ctx.lineWidth = 0.45
      ctx.stroke()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}
