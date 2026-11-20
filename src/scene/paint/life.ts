import type { BirdDesc, LayerOf, Pt } from '../model/types'
import { rng } from './core'
import { css, mix, type Ctx2D, type PaintEnv } from './hand'

/*
 * The sky's life in the hand (C10): birds by kind (each its own silhouette, wing beat and way of flying), aircraft (a small
 * plane, its lights by night, a short trail), contrails (soft lines that spread), meteors (a fine streak, brightest at its
 * head). A painter is a pure function of its desc and `env.phase` (a strip's frame): every motion is periodic over the
 * strip, seeded, with no clock.
 */

const TAU = Math.PI * 2

/** Where a bird of a flock is at `t` (s) and which way it goes on screen (a unit vector). */
function birdAt(b: BirdDesc, t: number, loop: number, heading: number, kind: LayerOf<'birds'>['bird']): { x: number; y: number; fx: number; fy: number } {
  // Swifts and bats dart round figure-eights; the rest go round their loop once a strip (pigeons together, as a wheeling flock).
  const turns = kind === 'swift' || kind === 'bat' ? 2 : 1
  const a = TAU * (turns * t / loop + b.lag) * b.turn
  if (kind === 'swift' || kind === 'bat') {
    const x = b.x + b.rx * Math.sin(a), y = b.y + b.ry * Math.sin(2 * a) * 0.5
    const fx = b.rx * Math.cos(a) * b.turn, fy = b.ry * Math.cos(2 * a) * b.turn
    const l = Math.hypot(fx, fy) || 1
    return { x, y, fx: fx / l, fy: fy / l }
  }
  const x = b.x + b.rx * Math.cos(a), y = b.y + b.ry * Math.sin(a)
  if (kind === 'stork' || kind === 'raptor' || kind === 'pigeon') {
    const fx = -b.rx * Math.sin(a) * b.turn, fy = b.ry * Math.cos(a) * b.turn
    const l = Math.hypot(fx, fy) || 1
    return { x, y, fx: fx / l, fy: fy / l }
  }
  return { x, y, fx: heading, fy: 0 }
}

/** The wings' beat at `t`: −1 (down) … 1 (up); 0 while gliding (a share `soar` of each strip's loop, by bird). */
function beatAt(b: BirdDesc, t: number, loop: number, flap: number, soar: number): number {
  if (!flap) return 0.15
  const cycle = ((t / loop + b.beat) % 1 + 1) % 1
  const gliding = soar > 0 && cycle < soar
  return gliding ? 0.2 : Math.sin(TAU * (flap * t + b.beat))
}

/** A point of a bird in its own frame (`u` ahead, `v` to its right), turned to its way and squashed (seen from below). */
const at = (x: number, y: number, fx: number, fy: number, squash: number) => (u: number, v: number): Pt =>
  [x + u * fx - v * fy, y + (u * fy + v * fx) * squash]

function stroke(ctx: Ctx2D, pts: readonly Pt[], width: number, colour: string) {
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

/** A flapping bird side-on: its wings an M from the body, up or down with the beat, wrists bent. */
function flapping(ctx: Ctx2D, x: number, y: number, S: number, w: number, dir: number, ink: string, width: number, bend: number) {
  const wristY = -w * 0.16 * S - bend * S, tipY = -w * 0.36 * S + 0.06 * S
  stroke(ctx, [[x - 0.5 * S, y + tipY], [x - 0.22 * S, y + wristY], [x + 0.03 * S * dir, y]], width, ink)
  stroke(ctx, [[x + 0.03 * S * dir, y], [x + 0.22 * S, y + wristY], [x + 0.5 * S, y + tipY]], width, ink)
}

export function paintBirds(ctx: Ctx2D, desc: LayerOf<'birds'>, env: PaintEnv): void {
  const t = env.phase
  const ink = css(desc.rgb)
  const pale = css(mix(desc.lit, [1, 1, 1], 0.15 * desc.litA))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const b of desc.birds) {
    const p = birdAt(b, t, desc.loop, desc.heading, desc.bird)
    const w = beatAt(b, t, desc.loop, desc.flap, desc.soar)
    const S = b.size
    const line = Math.max(0.7, S * 0.11)
    switch (desc.bird) {
      case 'stork': {
        // Soaring, seen from below: long straight wings, white with the black flight feathers behind, neck and bill out
        // ahead, the red legs trailing.
        const f = at(p.x, p.y, p.fx, p.fy, 0.62)
        stroke(ctx, [f(-0.06 * S, -0.5 * S), f(-0.06 * S, 0.5 * S)], line * 1.5, ink)
        stroke(ctx, [f(0.03 * S, -0.46 * S), f(0.03 * S, 0.46 * S)], line, pale)
        stroke(ctx, [f(0.42 * S, 0), f(-0.42 * S, 0)], line * 0.9, pale)
        stroke(ctx, [f(-0.42 * S, 0), f(-0.58 * S, 0)], line * 0.7, css(mix(desc.rgb, [0.8, 0.3, 0.25], 0.6)))
        break
      }
      case 'raptor': {
        // Broad wings with spread fingers, a fanned tail; dark, a paler bar along the wing in the sun.
        const f = at(p.x, p.y, p.fx, p.fy, 0.65)
        ctx.fillStyle = ink
        ctx.beginPath()
        const outline: Pt[] = [f(0.18 * S, 0), f(0.06 * S, -0.5 * S), f(-0.1 * S, -0.48 * S), f(-0.12 * S, -0.08 * S), f(-0.34 * S, -0.1 * S),
          f(-0.34 * S, 0.1 * S), f(-0.12 * S, 0.08 * S), f(-0.1 * S, 0.48 * S), f(0.06 * S, 0.5 * S)]
        outline.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
        ctx.closePath()
        ctx.fill()
        for (const side of [-1, 1]) {
          for (const k of [0, 1, 2]) stroke(ctx, [f((0.04 - k * 0.05) * S, side * 0.48 * S), f((0.06 - k * 0.06) * S, side * 0.58 * S)], line * 0.7, ink)
        }
        if (desc.litA > 0.3) stroke(ctx, [f(-0.02 * S, -0.4 * S), f(-0.02 * S, 0.4 * S)], line * 0.6, css(mix(desc.rgb, desc.lit, 0.35 * desc.litA)))
        break
      }
      case 'swift': {
        // Scythe wings swept back from a short body, beating in bursts.
        const f = at(p.x, p.y, p.fx, p.fy, 0.8)
        const sweep = 0.22 + 0.08 * w
        stroke(ctx, [f(-0.3 * S, -0.5 * S), f(0.02 * S, -0.22 * S), f(0.1 * S, 0), f(0.02 * S, 0.22 * S), f(-0.3 * S, 0.5 * S)].map(([px, py], i) =>
          i === 0 || i === 4 ? [px, py - sweep * S * 0.2] as Pt : [px, py] as Pt), line * 1.1, ink)
        stroke(ctx, [f(0.12 * S, 0), f(-0.22 * S, 0)], line * 1.3, ink)
        break
      }
      case 'bat': {
        // Fluttering, jagged: the wings' scalloped trailing edge, a quick erratic beat.
        const dir = p.fx >= 0 ? 1 : -1
        flapping(ctx, p.x, p.y, S, w, dir, ink, line * 1.2, 0.02)
        stroke(ctx, [[p.x - 0.4 * S, p.y - w * 0.28 * S + 0.12 * S], [p.x - 0.28 * S, p.y - w * 0.12 * S + 0.06 * S], [p.x - 0.14 * S, p.y + 0.1 * S]], line * 0.8, ink)
        stroke(ctx, [[p.x + 0.4 * S, p.y - w * 0.28 * S + 0.12 * S], [p.x + 0.28 * S, p.y - w * 0.12 * S + 0.06 * S], [p.x + 0.14 * S, p.y + 0.1 * S]], line * 0.8, ink)
        break
      }
      case 'gull': {
        // Long angled wings, white below with black tips, the wrists held up.
        const dir = p.fx >= 0 ? 1 : -1
        flapping(ctx, p.x, p.y, S, w, dir, pale, line * 1.2, 0.07)
        const tipY = -w * 0.36 * S + 0.06 * S
        stroke(ctx, [[p.x - 0.5 * S, p.y + tipY], [p.x - 0.42 * S, p.y + tipY * 0.8 - 0.01 * S]], line * 1.2, ink)
        stroke(ctx, [[p.x + 0.5 * S, p.y + tipY], [p.x + 0.42 * S, p.y + tipY * 0.8 - 0.01 * S]], line * 1.2, ink)
        break
      }
      case 'crane': {
        // A slow deep beat; the long neck out ahead and the legs trailing, grey.
        const dir = desc.heading
        flapping(ctx, p.x, p.y, S, w * 1.2, dir, ink, line * 1.1, 0.02)
        stroke(ctx, [[p.x - 0.45 * S * dir, p.y + 0.02 * S], [p.x + 0.5 * S * dir, p.y - 0.02 * S]], line * 0.75, ink)
        break
      }
      case 'crow': {
        // Broad rowing wings, a black bird with a grey body (the hooded crow), steady beats.
        const dir = desc.heading
        flapping(ctx, p.x, p.y, S, w, dir, ink, line * 1.6, 0)
        ctx.fillStyle = css(mix(desc.rgb, desc.lit, 0.35))
        ctx.beginPath()
        ctx.ellipse(p.x, p.y + 0.02 * S, 0.2 * S, 0.07 * S, 0, 0, TAU)
        ctx.fill()
        break
      }
      case 'pigeon': {
        // Small and quick, pointed wings, grey; the flock turns together and flashes pale as it banks into the light.
        const bank = Math.max(0, p.fy)
        const colour = css(mix(desc.rgb, desc.lit, 0.25 + 0.5 * bank * desc.litA))
        flapping(ctx, p.x, p.y, S, w, p.fx >= 0 ? 1 : -1, colour, line * 1.2, 0.01)
        break
      }
    }
  }
}

/** A small plane: its body along `angle`, swept wings, the tail; by night its landing light, strobes and beacon. */
export function paintAircraft(ctx: Ctx2D, desc: LayerOf<'aircraft'>, env: PaintEnv): void {
  const { x, y, size: S } = desc
  const c = Math.cos(desc.angle), s = Math.sin(desc.angle)
  const f = (u: number, v: number): Pt => [x + u * c - v * s, y + u * s + v * c]
  ctx.lineCap = 'round'
  if (desc.trail > 0.5) {
    // A short contrail behind it, thinning and fading as it goes.
    const steps = 8
    for (let i = 0; i < steps; i++) {
      const a = (1 - i / steps) * 0.75
      stroke(ctx, [f(-0.4 * S - (desc.trail * i) / steps, 0), f(-0.4 * S - (desc.trail * (i + 1)) / steps, 0)], Math.max(0.6, 0.35 * S * (1 + i / steps)),
        css(desc.trailRgb, a))
    }
  }
  const night = desc.lights
  if (night < 1) {
    const body = css(desc.rgb, 1 - night * 0.8)
    stroke(ctx, [f(0.5 * S, 0), f(-0.5 * S, 0)], Math.max(0.7, 0.13 * S), body)
    stroke(ctx, [f(0.08 * S, 0), f(-0.12 * S, -0.48 * S)], Math.max(0.6, 0.09 * S), body)
    stroke(ctx, [f(0.08 * S, 0), f(-0.12 * S, 0.48 * S)], Math.max(0.6, 0.09 * S), body)
    stroke(ctx, [f(-0.42 * S, 0), f(-0.52 * S, -0.18 * S)], Math.max(0.5, 0.07 * S), body)
    stroke(ctx, [f(-0.42 * S, 0), f(-0.52 * S, 0.18 * S)], Math.max(0.5, 0.07 * S), body)
    // The sun on its upper side.
    stroke(ctx, [f(0.42 * S, -0.03 * S), f(-0.3 * S, -0.03 * S)], Math.max(0.4, 0.05 * S), css(desc.lit, 0.7 * (1 - night)))
  }
  if (night > 0) {
    // One strip second: the strobes flash white twice, the red beacon once, the landing light steady.
    const frame = Math.round(env.phase * 10) % 10
    const light = (p: Pt, r: number, rgb: readonly [number, number, number], a: number) => {
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3)
      g.addColorStop(0, css(rgb, a))
      g.addColorStop(0.3, css(rgb, a * 0.4))
      g.addColorStop(1, css(rgb, 0))
      ctx.fillStyle = g
      ctx.fillRect(p[0] - r * 3, p[1] - r * 3, r * 6, r * 6)
    }
    if (desc.landing) light(f(0.5 * S, 0), 1.4, [1, 0.97, 0.88], 0.95 * night)
    light(f(-0.1 * S, -0.5 * S), 0.6, [1, 0.25, 0.2], 0.8 * night)
    light(f(-0.1 * S, 0.5 * S), 0.6, [0.3, 1, 0.45], 0.8 * night)
    if (frame === 0 || frame === 2) for (const v of [-0.5, 0.5]) light(f(-0.1 * S, v * S), 0.9, [1, 1, 1], night)
    if (frame === 5) light(f(0, 0), 0.8, [1, 0.2, 0.15], night)
  }
}

/**
 * A contrail: a soft line of its own widths and alphas, spreading and thinning toward its old end. Drawn in runs of a few
 * points (one path each, butt-ended, so no beads where strokes overlap), three passes from wide and faint to narrow.
 */
export function paintContrail(ctx: Ctx2D, desc: LayerOf<'contrail'>, _env: PaintEnv): void {
  const r = rng(desc.seed)
  const { points, widths, alphas } = desc
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'
  const RUN = 6
  for (let i = 0; i < points.length - 1; i += RUN) {
    const end = Math.min(points.length - 1, i + RUN)
    let w = 0, a = 0
    for (let j = i; j <= end; j++) { w += widths[j]; a += alphas[j] }
    w /= end - i + 1
    a /= end - i + 1
    if (a < 0.01) continue
    const lump = 0.9 + 0.2 * r()
    const run = points.slice(i, end + 1)
    const below = run.map(([x, y]): Pt => [x, y + w * 0.3])
    // A spread trail is a soft band: a broad faint veil round it first.
    if (w > 2.5) stroke(ctx, run, w * 2.8 * lump, css(desc.rgb, a * 0.08))
    stroke(ctx, below, w * 1.3 * lump, css(desc.shade, a * 0.18))
    stroke(ctx, run, w * 1.7 * lump, css(desc.rgb, a * 0.22))
    stroke(ctx, run, w * 1.1 * lump, css(desc.rgb, a * 0.3))
    stroke(ctx, run, w * 0.55 * lump, css(desc.rgb, a * 0.45))
  }
}

/** A meteor: a fine streak, faint at its start, brightest near its head, with a short glow there. */
export function paintMeteor(ctx: Ctx2D, desc: LayerOf<'meteor'>, _env: PaintEnv): void {
  const g = ctx.createLinearGradient(desc.x0, desc.y0, desc.x1, desc.y1)
  g.addColorStop(0, css(desc.rgb, 0))
  g.addColorStop(0.75, css(desc.rgb, 0.7))
  g.addColorStop(1, css(desc.rgb, 1))
  ctx.strokeStyle = g
  ctx.lineCap = 'round'
  ctx.lineWidth = desc.width
  ctx.beginPath()
  ctx.moveTo(desc.x0, desc.y0)
  ctx.lineTo(desc.x1, desc.y1)
  ctx.stroke()
  const h = ctx.createRadialGradient(desc.x1, desc.y1, 0, desc.x1, desc.y1, 2.6 * desc.width)
  h.addColorStop(0, css([1, 1, 1], 0.9))
  h.addColorStop(1, css(desc.rgb, 0))
  ctx.fillStyle = h
  ctx.fillRect(desc.x1 - 3 * desc.width, desc.y1 - 3 * desc.width, 6 * desc.width, 6 * desc.width)
}
