import type { LayerOf, Pt } from '../../../model/types'
import { frameOf, poseAt } from '../../../model/birdFlight'
import { stroke } from './life'
import { css, mix, type Ctx2D, type PaintEnv } from '../base/hand'

/*
 * Birds in the hand (C10), each its own silhouette and way of flying (`birdFlight.ts`), drawn in its own frame as seen:
 * `u` ahead, `v` along the right wing, `h` up its back. A pure function of the desc and `env.phase` (a strip's frame).
 */

const TAU = Math.PI * 2

/** The wings' beat at `t`: −1 (down) … 1 (up); held (0.2) through a glide, a share `soar` of each strip's loop. */
function beatAt(beat: number, t: number, loop: number, flap: number, soar: number): number {
  if (!flap) return 0.15
  const cycle = ((t / loop + beat) % 1 + 1) % 1
  return soar > 0 && cycle < soar ? 0.2 : Math.sin(TAU * (flap * t + beat))
}

type Frame = (u: number, v: number, h?: number) => Pt

/** Both wings from the body at the beat `w` (−1 down … 1 up), the wrists bent `bend` (of `S`): an M seen from ahead. */
function wings(ctx: Ctx2D, f: Frame, S: number, w: number, ink: string, width: number, bend: number) {
  const wrist = w * 0.16 * S + bend * S, tip = w * 0.36 * S - 0.06 * S
  for (const side of [-1, 1]) stroke(ctx, [f(-0.04 * S, side * 0.5 * S, tip), f(0, side * 0.22 * S, wrist), f(0.03 * S, 0, 0)], width, ink)
}

export function paintBirds(ctx: Ctx2D, desc: LayerOf<'birds'>, env: PaintEnv): void {
  const t = env.phase
  const ink = css(desc.rgb)
  const pale = css(mix(desc.lit, [1, 1, 1], 0.15 * desc.litA))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const b of desc.birds) {
    const pose = poseAt(b, desc.bird, t, desc.loop, desc.yaw, desc.view)
    const f = frameOf(pose)
    const w = beatAt(b.beat, t, desc.loop, desc.flap, desc.soar)
    const S = b.size
    const line = Math.max(0.7, S * 0.11)
    switch (desc.bird) {
      case 'stork': {
        // Soaring: long straight wings, white with the black flight feathers behind; neck and bill out, red legs trailing.
        stroke(ctx, [f(-0.06 * S, -0.5 * S), f(-0.06 * S, 0.5 * S)], line * 1.5, ink)
        stroke(ctx, [f(0.03 * S, -0.46 * S), f(0.03 * S, 0.46 * S)], line, pale)
        stroke(ctx, [f(0.42 * S, 0), f(-0.42 * S, 0)], line * 0.9, pale)
        stroke(ctx, [f(-0.42 * S, 0), f(-0.58 * S, 0)], line * 0.7, css(mix(desc.rgb, [0.8, 0.3, 0.25], 0.6)))
        break
      }
      case 'raptor': {
        // Broad wings with spread fingers, a fanned tail; dark, a paler bar along the underwing in the sun.
        ctx.fillStyle = ink
        ctx.beginPath()
        const outline: Pt[] = [f(0.18 * S, 0), f(0.06 * S, -0.5 * S), f(-0.1 * S, -0.48 * S), f(-0.12 * S, -0.08 * S), f(-0.34 * S, -0.1 * S),
          f(-0.34 * S, 0.1 * S), f(-0.12 * S, 0.08 * S), f(-0.1 * S, 0.48 * S), f(0.06 * S, 0.5 * S)]
        outline.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
        ctx.closePath()
        ctx.fill()
        for (const side of [-1, 1]) {
          for (const k of [0, 1, 2]) stroke(ctx, [f((0.04 - k * 0.05) * S, side * 0.48 * S), f((0.06 - k * 0.06) * S, side * 0.58 * S, 0.03 * S)], line * 0.7, ink)
        }
        const bar = desc.litA * pose.under
        if (bar > 0.25) stroke(ctx, [f(-0.02 * S, -0.4 * S), f(-0.02 * S, 0.4 * S)], line * 0.6, css(mix(desc.rgb, desc.lit, 0.35 * bar)))
        break
      }
      case 'swift': {
        // Scythe wings swept back from a short body, beating in bursts; the sweep opens on the up-stroke.
        const sweep = (0.22 + 0.08 * w) * S
        for (const side of [-1, 1]) stroke(ctx, [f(-0.3 * S - sweep * 0.2, side * 0.5 * S, 0.04 * S * w), f(0.02 * S, side * 0.22 * S), f(0.1 * S, 0)], line * 1.1, ink)
        stroke(ctx, [f(0.12 * S, 0), f(-0.22 * S, 0)], line * 1.3, ink)
        break
      }
      case 'bat': {
        // Fluttering, jagged: the scalloped trailing edge, a quick erratic beat.
        wings(ctx, f, S, w, ink, line * 1.2, 0.02)
        for (const side of [-1, 1]) {
          stroke(ctx, [f(-0.08 * S, side * 0.4 * S, w * 0.28 * S - 0.12 * S), f(-0.1 * S, side * 0.28 * S, w * 0.12 * S - 0.06 * S),
            f(-0.12 * S, side * 0.14 * S, -0.1 * S)], line * 0.8, ink)
        }
        break
      }
      case 'gull': {
        // Long angled wings, white below with black tips, the wrists held up.
        wings(ctx, f, S, w, pale, line * 1.2, 0.07)
        const tip = w * 0.36 * S - 0.06 * S
        for (const side of [-1, 1]) stroke(ctx, [f(-0.04 * S, side * 0.5 * S, tip), f(-0.03 * S, side * 0.42 * S, tip * 0.8 + 0.01 * S)], line * 1.2, ink)
        break
      }
      case 'crane': {
        // A slow deep beat of broad wings, held a little forward at the wrist, the tips swept back; half a span long in all
        // (the neck out ahead ~0.3, the legs trailing ~0.25), so it reads as a bird and never as an airframe.
        const wrist = (0.16 * w + 0.07) * S, tip = (0.42 * w + 0.02) * S
        for (const side of [-1, 1]) {
          stroke(ctx, [f(-0.1 * S, side * 0.5 * S, tip), f(0.06 * S, side * 0.24 * S, wrist), f(0.02 * S, 0, 0)], Math.max(0.75, 0.15 * S), ink)
        }
        stroke(ctx, [f(0.12 * S, 0), f(-0.1 * S, 0)], Math.max(0.8, 0.17 * S), ink)
        stroke(ctx, [f(0.3 * S, 0, 0.02 * S), f(-0.25 * S, 0)], Math.max(0.45, 0.06 * S), ink)
        break
      }
      case 'crow': {
        // Broad rowing wings, a black bird with a grey body (the hooded crow), steady beats.
        wings(ctx, f, S, w, ink, line * 1.6, 0)
        stroke(ctx, [f(0.18 * S, 0), f(-0.2 * S, 0)], 0.14 * S, css(mix(desc.rgb, desc.lit, 0.35)))
        break
      }
      case 'pigeon': {
        // Small and quick, pointed wings, grey; the flock turns together and flashes pale as its underside turns to the light.
        const colour = css(mix(desc.rgb, desc.lit, 0.25 + 0.5 * pose.under * desc.litA))
        wings(ctx, f, S, w, colour, line * 1.2, 0.01)
        break
      }
    }
  }
}
