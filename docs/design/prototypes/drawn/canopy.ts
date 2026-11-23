import { plantInk, TREE_TONE_STRIDE } from '../../../../src/scene/model/canopyTones'
import { plantVisible } from '../../../../src/scene/model/plantVisibility'
import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { treeBend, treeCrownAnchor } from '../../../../src/scene/paint/shared/land/landVegPose'
import { paintVegTufts } from '../../../../src/scene/paint/shared/land/landVegTufts'
import { receiverBrush } from '../../../../src/scene/paint/shared/land/receiverBrush'
import { bump, carve, closed, type P } from './carve'
import { pigment, valued } from './palette'

/*
 * Trees as prints: each crown one bumped shape, its ink wiped from the light to the shade, a key line round it and leaf cuts
 * inside, a trunk under the ones big enough to show it. The model's own plants, places, kinds and light.
 */

const CAST: RGB = [0.07, 0.08, 0.14]

export function paintCutCanopy(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv): void {
  lay(ctx, desc, env, desc.tones)
  if (env.shade) lay(env.shade, desc, env, desc.shadedTones ?? desc.tones)
}

function lay(ctx: Ctx2D, desc: LayerOf<'canopy'>, env: PaintEnv, tones: LayerOf<'canopy'>['tones']) {
  ctx.save()
  const { vegetation: veg } = desc, wind = desc.wind.lean || desc.wind.gust ? desc.wind : undefined
  const time = desc.animated?.frames ? env.phase : 0
  paintVegTufts(receiverBrush(ctx), veg, wind, time, tones && pure(tones.tufts), undefined)
  for (let i = 0; i < veg.trees.length / 6; i++) {
    const alpha = (veg.treeMeta[i * 3 + 2] ?? 255) / 255
    if (!plantVisible(alpha)) continue
    const [x, y, r, height, phase] = veg.trees.subarray(i * 6, i * 6 + 5), kind = veg.treeMeta[i * 3]
    const ink = (slot: number): RGB => (tones ? plantInk(tones.trees, i * TREE_TONE_STRIDE + slot * 3) : veg.tones[veg.treeMeta[i * 3 + 1]])
    const crown = treeCrownAnchor(x, y, r, height, phase, kind, treeBend(kind, height, alpha, phase, wind, time))
    ctx.globalAlpha = Math.min(1, alpha * 1.1)
    ctx.fillStyle = css(CAST, 0.28)
    ellipse(ctx, x + r * 0.3, y + 0.3, crown.rx * 1.05, Math.max(0.4, crown.ry * 0.3))
    if (kind === 3) palm(ctx, x, y, r, crown.cx, crown.cy, phase, ink)
    else tree(ctx, x, y, r, kind, crown, phase, ink)
  }
  ctx.globalAlpha = 1
  for (const zone of desc.clear) ctx.clearRect(zone.x, zone.y, zone.w, zone.h)
  ctx.globalCompositeOperation = 'destination-in'
  outline(ctx, desc.outline)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
}

const inks = new WeakMap<Uint8Array, Uint8Array>()

/** A plant's inks as the hand mixes them. */
function pure(bytes: Uint8Array): Uint8Array {
  const held = inks.get(bytes)
  if (held) return held
  const out = new Uint8Array(bytes.length)
  for (let o = 0; o < bytes.length; o += 3) out.set(pigment(plantInk(bytes, o), 0.2).map((c) => Math.round(c * 255)), o)
  inks.set(bytes, out)
  return out
}

type Crown = { cx: number; cy: number; rx: number; ry: number }

function tree(ctx: Ctx2D, x: number, y: number, r: number, kind: number, c: Crown, phase: number, ink: (slot: number) => RGB) {
  const small = r < 0.85, body = pigment(ink(0), 0, 1.25)
  const dark = pigment(valued(small ? ink(0) : mix(ink(0), ink(1), 0.7), -0.07), -0.9, 1.25)
  const lit = pigment(valued(small ? ink(0) : mix(ink(0), ink(2), 0.75), 0.06), 0.8, 1.25), key = pigment(valued(dark, -0.12), -0.9, 1)
  if (r > 1.6) {
    ctx.fillStyle = css(pigment(mix(dark, [0.36, 0.24, 0.17], 0.45)))
    ctx.fillRect(x - r * 0.09, c.cy, r * 0.18, y - c.cy + 0.3)
  }
  const rx = c.rx * (kind === 1 ? 1 : 1.06), ry = c.ry * 1.06, random = rng(Math.round(phase * 1000) + 5), edge = crown(c.cx, c.cy, rx, ry, phase, random)
  const wipe = ctx.createLinearGradient(c.cx - rx * 0.5, c.cy - ry, c.cx + rx * 0.4, c.cy + ry)
  wipe.addColorStop(0, css(lit))
  wipe.addColorStop(0.4, css(body))
  wipe.addColorStop(1, css(dark))
  ctx.beginPath()
  closed(ctx, edge)
  ctx.fillStyle = wipe
  ctx.fill()
  if (small) return
  ctx.beginPath()
  carve(ctx, [...edge, edge[0]], Math.min(0.8, 0.22 + 0.09 * r), Math.round(phase * 77), 0)
  // Leaf cuts: short arcs that follow the crown's round, closer on its shade side.
  const many = Math.min(16, Math.round(r * 2.2))
  for (let n = 0; n < many; n++) {
    const a = random() * Math.PI * 2, k = 0.75 * Math.sqrt(random()), lx = c.cx + rx * (0.12 + Math.cos(a) * k), ly = c.cy + ry * (0.14 + Math.sin(a) * k), s = 0.16 + 0.1 * random()
    carve(ctx, bump([lx - rx * s, ly], [lx + rx * s, ly], 0.4), Math.min(0.55, 0.16 + 0.06 * r), n, 0.9)
  }
  ctx.fillStyle = css(key, 0.8)
  ctx.fill()
}

/** A crown's edge: bumps round an ellipse. */
function crown(cx: number, cy: number, rx: number, ry: number, phase: number, random: () => number): P[] {
  const many = rx < 1.5 ? 5 : rx < 4 ? 8 : 11
  const at = Array.from({ length: many }, (_, n): P => {
    const a = phase + (n / many) * Math.PI * 2, k = 0.88 + 0.16 * random()
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]
  })
  return at.flatMap((p, n) => bump(p, at[(n + 1) % many], 0.3))
}

/** A palm: a tapered trunk and broad cut fronds, the upper ones lit. */
function palm(ctx: Ctx2D, x: number, y: number, r: number, topX: number, topY: number, phase: number, ink: (slot: number) => RGB) {
  const leaf = pigment(ink(0)), dark = pigment(valued(ink(0), -0.07), -0.8), lit = pigment(mix(ink(0), ink(2), 0.6), 0.8), w = Math.max(0.35, r * 0.16)
  ctx.fillStyle = css(pigment(ink(1), 0.2))
  outline(ctx, [[x - w, y], [topX - w * 0.6, topY], [topX + w * 0.6, topY], [x + w, y]])
  ctx.fill()
  const random = rng(Math.round(phase * 1000)), many = 7
  for (let n = 0; n < many; n++) {
    const a = Math.PI * (1 + (n + 0.5) / many), len = r * (1.15 + 0.3 * random()), tipX = topX + Math.cos(a) * len, tipY = topY + Math.sin(a) * len * 0.55 + len * 0.34
    const midX = topX + Math.cos(a) * len * 0.55, midY = topY + Math.sin(a) * len * 0.75
    ctx.fillStyle = css(n % 3 === 0 ? dark : n === 3 || n === 4 ? lit : leaf)
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.quadraticCurveTo(midX, midY - r * 0.2, tipX, tipY)
    ctx.quadraticCurveTo(midX, midY + r * 0.2, topX, topY)
    ctx.fill()
  }
}

function ellipse(ctx: Ctx2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}
