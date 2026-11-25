import type { BuildingFaces, FaceTones } from '../../../model/buildingLight'
import type { RGB, Shine, Tones } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { css, mix, type Ctx2D } from '../../shared/base/hand'

/*
 * The form of a built body in the real hand, at a few px: what separates one plastered box from the next where their
 * fronts share a normal and, after sunset, one sky. One light (the true sun's side, `Shine.faces.across`); each box its
 * own plaster (a seeded albedo, every face of it scaled alike, so it holds by day and by night); the street between two
 * bodies in shade on the far one beside the near one's edges (occlusion, never an outline); the parapet catching the
 * open sky; the foot losing sky and bounce down to the street, on a short plinth that runs into the ground (a hill
 * village's terrace wall), so no body hovers over a slope. Geometry never depends on the light: only colours and
 * alphas move with it. Screen px. Pure: randomness only from the body's seed.
 */

/** How far (± share) one body's plaster departs from the receiver's. */
const ALBEDO = .12
/** The street's shade on what stands behind a body: its width (px) beside each edge, and its depth by the light. */
const ALLEY = .9, ALLEY_SKY = .2, ALLEY_SUN = .22
/** The front's own turn away from the sun: the share of the width that darkens, and how much at the far edge. */
const TURN = .5, TURN_DEPTH = .16
/** The parapet's sky-lit line (px) and its strength. */
const PARAPET = .4, PARAPET_SKY = .5
/** The street at the foot: the height (px, at most, and a share of the wall) that darkens, and how deep. */
const FOOT = 2.4, FOOT_SHARE = .38, FOOT_DEPTH = .3
/** The plinth under a body: its depth (px) against the body's width, at most; it fades into the ground. */
const PLINTH = .22, PLINTH_MAX = 1.1

/** The soft edge's reach (px) and strength. */
const SOFT = .3, SOFT_ALPHA = .3

/** A body's own plaster: −1…1 from its seed (its own draw, so the window grid's draws stay its own). */
export const albedoOf = (seed: number) => rng(seed * 31 + 7)() * 2 - 1

const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]
const scaleFace = (f: FaceTones, k: number): FaceTones => ({ wall: scale(f.wall, k), foot: scale(f.foot, k), eave: scale(f.eave, k) })

/** The receiver's faces in this body's own plaster: every face scaled alike (an albedo, not a light). */
export function ownPlaster(f: BuildingFaces, own: number): BuildingFaces {
  const k = 1 + ALBEDO * own
  const front = scaleFace(f.front, k), shared = f.left === f.front
  return { ...f, front, left: shared ? front : scaleFace(f.left, k), right: shared ? front : scaleFace(f.right, k),
    unresolved: scale(f.unresolved, k), top: scale(f.top, k) }
}

/**
 * The flat roof's cap seen from a little above: the sky-lit plane, held near the lit wall so the caps do not stripe the
 * town as its brightest marks.
 */
export function capTone(f: BuildingFaces): RGB {
  const wall = f.front.wall, top = mix(f.unresolved, f.top, .75)
  const lum = (c: RGB) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
  const held = mix(wall, top, .45), over = lum(held) / Math.max(1e-3, lum(wall) * 1.06)
  return over > 1 ? scale(held, 1 / over) : held
}

/** The street's shade on whatever stands behind a body, just outside its two edges (over painted pixels only). */
export function alleyShade(ctx: Ctx2D, x: number, top: number, w: number, foot: number, t: Pick<Tones, 'deep'>, s: Shine) {
  const h = foot - top
  if (h <= 0) return
  const across = s.faces.across * Math.min(1, s.direct * 4)
  // The far side from the sun takes the near body's shadow; the sun's side only the street's sky shade.
  const left = ALLEY_SKY * (1 - .6 * s.night) + ALLEY_SUN * Math.max(0, across)
  const right = ALLEY_SKY * (1 - .6 * s.night) + ALLEY_SUN * Math.max(0, -across)
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  for (const [x0, x1, a] of [[x - ALLEY, x, left], [x + w + ALLEY, x + w, right]] as const) {
    const g = ctx.createLinearGradient(x1, 0, x0, 0)
    g.addColorStop(0, css(t.deep, a))
    g.addColorStop(1, css(t.deep, 0))
    ctx.fillStyle = g
    ctx.fillRect(Math.min(x0, x1), top + .3, ALLEY, h - .3)
  }
  ctx.restore()
}

/**
 * The front's form over its faces: the far side from the sun turning away, the parapet's sky line, the street's shade
 * up the foot. `detail` fades it with the facade's own resolution; `roofed` (a tile roof's eave over it) drops the
 * parapet for the eave's shadow.
 */
export function frontForm(ctx: Ctx2D, x: number, top: number, w: number, foot: number, f: BuildingFaces,
  t: Pick<Tones, 'deep'>, s: Shine, detail: number, roofed: boolean, grounded = true) {
  const h = foot - top
  const across = s.faces.across * Math.min(1, s.direct * 4)
  const turn = ctx.createLinearGradient(x, 0, x + w, 0)
  turn.addColorStop(0, css(t.deep, TURN_DEPTH * detail * Math.max(0, across)))
  turn.addColorStop(TURN, css(t.deep, 0))
  turn.addColorStop(1, css(t.deep, TURN_DEPTH * detail * Math.max(0, -across)))
  ctx.fillStyle = turn
  ctx.fillRect(x, top, w, h)
  if (roofed) {
    // The eave's shadow on the wall under the tiles.
    ctx.fillStyle = css(t.deep, .42 * Math.max(.4, detail) * (1 - .5 * s.night))
    ctx.fillRect(x, top, w, Math.min(.42, h * .3))
  } else {
    ctx.fillStyle = css(mix(f.top, f.front.wall, .3), PARAPET_SKY * (.15 + .85 * detail) * (1 - .7 * s.night))
    ctx.fillRect(x, top, w, Math.min(PARAPET, h * .25))
  }
  if (!grounded) return
  const fh = Math.min(FOOT, h * FOOT_SHARE)
  const g = ctx.createLinearGradient(0, foot - fh, 0, foot)
  g.addColorStop(0, css(t.deep, 0))
  g.addColorStop(1, css(t.deep, FOOT_DEPTH * Math.max(.5, detail)))
  ctx.fillStyle = g
  ctx.fillRect(x, foot - fh, w, fh)
}

/** The plinth a body stands on: its own wall darkened, running down into the ground under it. */
export function plinth(ctx: Ctx2D, x: number, foot: number, w: number, h: number, f: BuildingFaces, t: Pick<Tones, 'deep'>) {
  const d = Math.min(PLINTH_MAX, PLINTH * w + .2, .6 * h)
  const stone = mix(f.front.foot, t.deep, .35)
  const g = ctx.createLinearGradient(0, foot - .05, 0, foot + d)
  g.addColorStop(0, css(stone, .9))
  g.addColorStop(1, css(stone, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - .1, foot - .05, w + .2, d + .05)
}

/**
 * A body's edge as soft as the ground's at its distance: its own plaster spread a fraction of a px past its sides at a
 * low alpha (a penumbra of the eye's focus, not a glow), under the body.
 */
export function softEdge(ctx: Ctx2D, x: number, top: number, w: number, foot: number, f: BuildingFaces) {
  ctx.fillStyle = css(f.unresolved, SOFT_ALPHA)
  ctx.fillRect(x - SOFT, top - SOFT * .5, w + 2 * SOFT, foot - top + SOFT * .5)
}

/** Disjoint rectangles covering the union of the given ones (a vertical sweep), for clipping a union out of a fill. */
export function disjoint(rects: readonly (readonly [number, number, number, number])[]): [number, number, number, number][] {
  const xs = [...new Set(rects.flatMap(([x0, , x1]) => [x0, x1]))].sort((a, b) => a - b)
  const out: [number, number, number, number][] = []
  let open: { y0: number; y1: number; x0: number }[] = []
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = xs[i], b = xs[i + 1], mid = (a + b) / 2
    const spans = rects.filter(([x0, , x1]) => x0 <= mid && x1 >= mid).map(([, y0, , y1]) => [y0, y1] as const).sort((p, q) => p[0] - q[0])
    const merged: [number, number][] = []
    for (const [y0, y1] of spans) {
      const last = merged.at(-1)
      if (last && y0 <= last[1]) last[1] = Math.max(last[1], y1)
      else merged.push([y0, y1])
    }
    // Carry a span on while the next slab has it unchanged, so one wall is one rectangle.
    const next: typeof open = []
    for (const [y0, y1] of merged) {
      const kept = open.find((o) => o.y0 === y0 && o.y1 === y1)
      next.push(kept ?? { y0, y1, x0: a })
    }
    for (const o of open) if (!next.includes(o)) out.push([o.x0, o.y0, a, o.y1])
    open = next
  }
  for (const o of open) out.push([o.x0, o.y0, xs.at(-1)!, o.y1])
  return out
}
