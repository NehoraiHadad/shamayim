import type { BuildingFaces, FaceTones } from '../../../model/buildingLight'
import type { RGB, Shine, Tones } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { css, mix, type Ctx2D } from '../../shared/base/hand'
import type { Alley } from './alleys'

/*
 * The form of a built body in the real hand, at a few px: what separates one plastered box from the next where their
 * fronts share a normal and, after sunset, one sky. One light (the true sun's side, `Shine.faces.across`); each box its
 * own plaster (a seeded albedo, every face of it scaled alike, so it holds by day and by night); the street between two
 * bodies in shade on the far one beside the near one's edges (occlusion, never an outline); the parapet catching the
 * open sky; the foot losing sky and bounce down to the street, on a short plinth that runs into the ground (a hill
 * village's terrace wall), so no body hovers over a slope. Geometry never depends on the light: only colours and
 * alphas move with it. Screen px. Pure: randomness only from the body's seed.
 */

/** How far (± share) one body's plaster departs from the receiver's; in a stone town, its stone's own. */
const ALBEDO = .1, STONE_ALBEDO = .18
/**
 * A stone town's walls (Jerusalem limestone, the Judean hills' and the Dead Sea's villages): the receiver's grey plaster
 * turned to the limestone's albedo, channel by channel (`LIME`, a luminance of 1: red over green over blue), so the stone
 * takes the light on it (warm in the sun, cooler in the sky's shade, grey at dusk) and keeps its value; each body a
 * quarry's own hue about it (some honey, some grey).
 */
const LIME_HUE: RGB = [1.09, 1.0, .82], QUARRY: RGB = [.04, 0, -.07]
const LIME = LIME_HUE.map((c) => c / (.2126 * LIME_HUE[0] + .7152 * LIME_HUE[1] + .0722 * LIME_HUE[2])) as unknown as RGB
/** How far a glass front is drawn to its own grey by day (it mirrors a pale sky and the town, not a blue). */
const GLASS_GREY = .55
/** The street's shade on what stands behind a body: its depth under the sky, and more as the sun rakes along it. */
const ALLEY_SKY = .16, ALLEY_SUN = .12
/** The front's own turn away from the sun: the share of the width (at most, px) that darkens, and how much. */
const TURN = .4, TURN_MAX = 1.6, TURN_DEPTH = .1
/** Where the eave's shadow begins under the tile line (px, the tiles keep their own lower edge), and its depth. */
const EAVE_GAP = .2, EAVE = .26
/** The parapet's sky-lit line (px) and its strength. */
const PARAPET = .4, PARAPET_SKY = .5
/** The street at the foot: the height (px, at most, and a share of the wall) that darkens, and how deep. */
const FOOT = 2.2, FOOT_SHARE = .3, FOOT_DEPTH = .32
/** The plinth under a body: its depth (px) against the body's width, at most, and its cover where it leaves the wall. */
const PLINTH = .22, PLINTH_MAX = 1.1, PLINTH_DEPTH = .9

/** A flat roof's cap: how far it goes from the wall's tone to the sky-lit top's, and at most how much brighter than the
 *  lit wall it stands (the sun on a roof is real; the stripes of the brightest caps in a town were not). */
const CAP_TOP = .6, CAP_OVER_WALL = 1.3
/** The soft edge's reach (px) and strength. */
const SOFT = .3, SOFT_ALPHA = .3

/** A body's own plaster: −1…1 from its seed (its own draw, so the window grid's draws stay its own). */
export const albedoOf = (seed: number) => rng(seed * 31 + 7)() * 2 - 1

const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

const lum = (c: RGB) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]

/** What a body's walls are, beyond the receiver's: the town's stone (0–1), the body's quarry (−1…1), a glass front by day (0–1). */
export interface Walls { stone: number; quarry: number; glass: number }
const PLAIN: Walls = { stone: 0, quarry: 0, glass: 0 }

/**
 * The receiver's faces in this body's own plaster: every face scaled alike (an albedo, not a light). Its clay keeps the
 * receiver's own value: the eave's shadow parts roof from wall (`frontForm`). In a stone town its walls are the stone's
 * (`Walls`); a glass front by day its own grey. Its roof keeps the receiver's colour.
 */
export function ownPlaster(f: BuildingFaces, own: number, walls: Walls = PLAIN): BuildingFaces {
  const k = 1 + (ALBEDO + (STONE_ALBEDO - ALBEDO) * walls.stone) * own
  const tint = [0, 1, 2].map((c) => k * (1 + walls.stone * (LIME[c] - 1 + walls.quarry * QUARRY[c])))
  const wall = (c: RGB): RGB => {
    const y = lum(c), grey = walls.glass ? mix(c, [y, y, y], GLASS_GREY * walls.glass) : c
    return [grey[0] * tint[0], grey[1] * tint[1], grey[2] * tint[2]]
  }
  const face = (t: FaceTones): FaceTones => ({ wall: wall(t.wall), foot: wall(t.foot), eave: wall(t.eave) })
  const front = face(f.front), shared = f.left === f.front
  return { ...f, front, left: shared ? front : face(f.left), right: shared ? front : face(f.right),
    unresolved: wall(f.unresolved), top: scale(f.top, k) }
}

/** How far a low sun's direct light dulls the clay toward its own grey (a raking light shows a roof's dust, not its red). */
const CLAY_DULL = .45

/** The body's clay under a low sun: its tiles' red dulled by the direct light that rakes them. */
export function dulledClay(f: BuildingFaces, s: Pick<Shine, 'direct' | 'faces'>): BuildingFaces {
  const k = CLAY_DULL * s.direct * Math.min(1, Math.max(0, (.5 - s.faces.top) / .4))
  if (!f.tile || k <= 0) return f
  const dull = (c: RGB): RGB => mix(c, [lum(c), lum(c), lum(c)], k)
  return { ...f, tile: [dull(f.tile[0]), dull(f.tile[1]), dull(f.tile[2])], ...(f.tileBase ? { tileBase: dull(f.tileBase) } : {}) }
}

/** A body's own quarry (−1…1), a draw of its own seed apart from its plaster's. */
export const quarryOf = (seed: number) => rng(seed * 53 + 11)() * 2 - 1

/**
 * The flat roof's cap seen from a little above: the sky-lit plane, held near the lit wall so the caps do not stripe the
 * town as its brightest marks.
 */
export function capTone(f: BuildingFaces): RGB {
  const wall = f.front.wall, top = mix(f.unresolved, f.top, .75)
  const held = mix(wall, top, CAP_TOP), over = lum(held) / Math.max(1e-3, lum(wall) * CAP_OVER_WALL)
  return over > 1 ? scale(held, 1 / over) : held
}

/**
 * The street's shade on the bodies standing behind this one, just outside its two edges (`town/alleys`): the street's
 * sky shade, deeper as the sun rakes along it.
 */
export function alleyShade(ctx: Ctx2D, rects: Alley | undefined,
  t: Pick<Tones, 'deep'>, s: Shine) {
  if (!rects) return
  const across = Math.abs(s.faces.across) * Math.min(1, s.direct * 4)
  ctx.fillStyle = css(t.deep, ALLEY_SKY * (1 - .6 * s.night) + ALLEY_SUN * across)
  for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h)
}

/**
 * The front's form over its faces: the far side from the sun turning away, the parapet's sky line. `detail` fades it
 * with the facade's own resolution (an unresolved block takes neither); `roofed` (a tile roof's eave over it) drops the
 * parapet for the eave's shadow.
 */
export function frontForm(ctx: Ctx2D, x: number, top: number, w: number, foot: number, f: BuildingFaces,
  t: Pick<Tones, 'deep'>, s: Shine, detail: number, roofed: boolean) {
  if (!detail) return
  const h = foot - top, band = Math.min(TURN_MAX, w * TURN)
  const across = s.faces.across * Math.min(1, s.direct * 4)
  ctx.fillStyle = css(t.deep, TURN_DEPTH * detail * Math.max(0, across))
  ctx.fillRect(x, top, band, h)
  ctx.fillStyle = css(t.deep, TURN_DEPTH * detail * Math.max(0, -across))
  ctx.fillRect(x + w - band, top, band, h)
  if (roofed) {
    // The eave's shadow on the wall under the tiles.
    ctx.fillStyle = css(t.deep, EAVE * Math.max(.4, detail) * (1 - .5 * s.night))
    ctx.fillRect(x, top + EAVE_GAP, w, Math.min(.36, h * .3))
  } else {
    ctx.fillStyle = css(mix(f.top, f.front.wall, .3), PARAPET_SKY * detail * (1 - .7 * s.night))
    ctx.fillRect(x, top, w, Math.min(PARAPET, h * .25))
  }
}

/**
 * Where a body meets the ground, in one fill: the street's shade up its foot (lost sky and bounce), then the plinth it
 * stands on, its own wall darkened, running down into the ground (a hill village's terrace wall), so no body hovers.
 * `ground`: the dark of the ground it stands on (its shadowed ground's contact), else the town's deep shade.
 */
export function seat(ctx: Ctx2D, x: number, foot: number, w: number, h: number, f: BuildingFaces, t: Pick<Tones, 'deep'>, detail: number,
  ground?: RGB) {
  const up = Math.min(FOOT, h * FOOT_SHARE), down = Math.min(PLINTH_MAX, PLINTH * w + .2, .6 * h)
  const stone = mix(f.front.foot, ground ?? t.deep, .35), at = up / (up + down)
  const g = ctx.createLinearGradient(0, foot - up, 0, foot + down)
  g.addColorStop(0, css(stone, 0))
  g.addColorStop(at, css(stone, FOOT_DEPTH * (.5 + .5 * detail)))
  g.addColorStop(at, css(stone, PLINTH_DEPTH))
  g.addColorStop(1, css(stone, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - .1, foot - up, w + .2, up + down)
}

/**
 * A body's edge as soft as the ground's at its distance: its own plaster spread a fraction of a px past its sides at a
 * low alpha (a penumbra of the eye's focus, not a glow), under the body.
 */
export function softEdge(ctx: Ctx2D, x: number, top: number, w: number, foot: number, f: BuildingFaces) {
  ctx.fillStyle = css(f.unresolved, SOFT_ALPHA)
  ctx.fillRect(x - SOFT, top - SOFT * .5, w + 2 * SOFT, foot - top + SOFT * .5)
}
