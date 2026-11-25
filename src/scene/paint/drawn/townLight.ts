import { smoothstep } from '../../../domain/smoothstep'
import { labOf, rgbOfLab } from '../../model/tone'
import type { RGB, Shine, Tones } from '../../model/types'
import { mix } from '../shared/base/hand'
import { KEY_STEP, type Tier } from './kit/lines'
import type { SkyForm } from './outsideOwn'
import { facesOf } from './outsideLight'

/*
 * The drawn town's light: two clear faces for every body, its front and the one side it shows, and its roof, each
 * one flat value from the model's own shares (the print's colour blocks; no value runs across a face, so no body turns
 * into a drum). An illustration never lets its two sides come out alike: where the direct light gives them little
 * difference (a high, hidden or facing sun), the brighter sky's side does, continuously, so the lit side turns with the
 * light and never jumps. Pure.
 */

/** How fast the side saturates with the light's lean; its least share with the sun out and under an even sky. */
const TURN = 2.6, LEAST = 0.55, LEAST_EVEN = 0.4
/** How far a side from the light goes to the shade, and to the deep; what the direct light adds. */
const SHADED = 0.55, SHADED_SUN = 0.3, DEEP = 0.35
/** The lit face's turn from its plaster to the light. */
const FRONT = 0.9
/** A roof's light with the sky alone, and with the light from above. */
const ROOF_SKY = 0.4, ROOF_SUN = 0.6

export interface TownLight {
  left: number; right: number; front: number; top: number; rim: number; on: number; glint: number; night: number
}

export function townLight(s: Shine, form: SkyForm): TownLight {
  const f = facesOf(s), day = 1 - s.night
  const lean = Math.tanh(TURN * (s.faces.across * f.on + (f.right - f.left) - form.side * form.strength * (1 - f.on)))
  const least = (LEAST_EVEN + (LEAST - LEAST_EVEN) * f.on) * (0.35 + 0.65 * day)
  return { left: Math.max(f.left, least * Math.max(0, -lean)), right: Math.max(f.right, least * Math.max(0, lean)),
    front: f.front, top: Math.min(1, ROOF_SKY + ROOF_SUN * f.top), rim: f.rim, on: f.on, glint: f.glint * day, night: s.night }
}

/** A body's plaster: its own stone (0…1). */
export const plasterOf = (t: Tones, stone: number): RGB => mix(mix(t.wall, t.shade, 0.35 * (1 - stone)), t.stone, 1.1 * stone)

/** The side a body shows against its width, at least and as it turns to the light, and at most (px); a lit side shown
 *  against the light, against the width: never more than about a third of the front, so the front stays the body's face. */
const SIDE = 0.17, SIDE_LIT = 0.08, SIDE_MAX = 3.2, SHOWN_LIT = 0.25, SHOWN_LIT_MAX = 4
/** The least step of value between a body's two faces under the sun: the print never lets them come out alike. */
const GAP = 0.4
/** How much of its sunlit step a body keeps under an even sky (overcast, rain, dusk): its faces close toward the plaster. */
const EVEN = 0.4
/** The lit face's least value under the sun, and how fast it takes the light: a lit wall reads as paper, never grey. */
const LIT_LEAST = 0.72, LIT_TURN = 1.6
/** The shade face's value under no light, how far its own light lifts it, and how far the direct light sinks it (a face
 *  turned from the sun is in the shade the sun makes, darker against the lit ground than under an even sky). */
const SHADE_LEAST = 0.52, SHADE_TURN = 0.35, SHADE_SUN = 0.2
/** The plaster's place on the faces' scale with no direct light (dusk, an even sky): a dull wall is the plaster gone a
 *  share of the way to its own shade, as the model's wall under a dull sky returns about what the ground does. */
const DULL_FACE = 0.35
/** A face's own direct light under which it is in its shade, and over which it is lit in full: a front turned from the sun
 *  (the sun in the view, behind the town) is printed at the shade value, never as sunlit paper. */
const FACE_SHADE = 0.05, FACE_LIT = 0.2
/** Against the light: a flat roof's slab goes this far to the light; the front's light under which the edge toward the
 *  sun takes a lit rim. */
const SLAB_LIT = 0.5, BACKLIT = 0.15

/** Against the light: the front's light under this, and a side's this much over it. */
const AGAINST = 0.1, OVER = 0.35

/**
 * The one side a body shows, beside its front. The front is the lit face and the side away from the light shows in
 * shade, as an illustrator sets a street up; only against the light (the front dark, a side well lit) does the lit side
 * show, the front then its shade. The whole town shows the same
 * side, as the light is one.
 */
export function sideOf(l: TownLight): { right: boolean; k: number; lit: boolean } {
  const bright = l.left > l.right ? 'left' : 'right', dim = bright === 'left' ? 'right' : 'left'
  const lit = l.front < AGAINST && l[bright] > l.front + OVER
  const show = lit ? bright : dim
  return { right: show === 'right', k: l[show], lit }
}

/** The width (px) of the side a body `w` wide shows. */
export const sideWidth = (l: TownLight, w: number) => {
  const { k, lit } = sideOf(l)
  return lit ? Math.min(SHOWN_LIT_MAX, w * SHOWN_LIT) : Math.min(SIDE_MAX, w * (SIDE + SIDE_LIT * k))
}

/**
 * The ground the town stands on (`light/meet`): its ink and how far the town is anchored to it (1 with no direct light by
 * day, none in the sun or by night).
 */
export interface Anchor { ground: RGB; k: number }

/**
 * A body's colour blocks: front, its one side, the roof seen from the front and its hip, the key's and the joins' ink;
 * against the light, the lit rim on the edge toward the sun; `tint` anchors any other block of the body to its ground as
 * its faces are (`by` its step of value from the ground's, `hue` how much of the ground's hue it takes).
 */
export interface Planes {
  front: RGB; side: RGB; right: boolean; roof: RGB; ink: RGB; joint: RGB
  rim: { rgb: RGB; right: boolean } | null
  tint: (rgb: RGB, by: number, hue?: number) => RGB
}

/** A face's step of value from its ground in a dull light: the front a hair over it, the side a step under, a flat roof's
 *  slab the sky's light on it; how much of the ground's hue they take. */
export const ANCHOR = { front: 0.02, side: -0.06, slab: 0.02, hue: 0.5 } as const

/** The blocks of a body of this plaster and stone: one value each, the lit one its stone in the light, the other its shade. */
export function planesOf(t: Tones, l: TownLight, plaster: RGB, stone: number, tier: Tier = 'far', anchor?: Anchor): Planes {
  const lit = mix(t.lit, t.stoneLit, 0.35 + 0.5 * stone)
  const dark = mix(mix(plaster, t.shade, SHADED + SHADED_SUN * l.on), t.deep, DEEP)
  const { right, k, lit: sideLit } = sideOf(l)
  const hi = Math.max(l.left, l.right, l.front), lo = Math.min(k, l.front)
  // The faces' values: 0 the shade's dark, 0.5 the plaster, 1 the light. Only the direct light lifts a face over its
  // plaster; with none (dusk, an even sky) the lit face sinks below it and the shade face further, a step apart.
  const sun = EVEN + (1 - EVEN) * l.on, gap = GAP * sun, direct = l.on * (1 - l.night)
  const mid = 0.5 - DULL_FACE * (1 - direct)
  const up = (light: number) => mid + (LIT_LEAST - 0.5 + (1 - LIT_LEAST) * Math.min(1, LIT_TURN * light)) * direct
  // The lit face takes its own light in the sun, the sky's brighter side under an even one.
  const litUp = up(sideLit ? k : l.front * direct + hi * (1 - direct))
  const down = Math.max(0, Math.min(litUp - gap, (SHADE_LEAST * (0.8 + 0.2 * l.on) * (1 - SHADE_SUN * direct) + SHADE_TURN * lo) * (mid * 2)))
  // A front turned from the sun is in its shade, whatever the sky does behind it.
  const frontLit = sideLit ? 0 : Math.max(1 - direct, smoothstep(FACE_SHADE, FACE_LIT, l.front))
  const front = down + (litUp - down) * frontLit
  const side = sideLit ? litUp : Math.max(0, Math.min(down, front - gap * 0.5))
  const face = (v: number) => v >= 0.5 ? mix(plaster, lit, (v - 0.5) * 2 * FRONT) : mix(dark, plaster, v * 2)
  const backlit = direct * (1 - smoothstep(0, BACKLIT, l.front))
  const roof = mix(mix(mix(plaster, t.rim, 0.5), mix(lit, t.rim, 0.25), l.top), lit, SLAB_LIT * backlit * l.top)
  const tint = anchorOf(anchor)
  // A face in the sun's shade takes the lit ground's colour back into it (its bounce): warm on a warm ground, never the
  // sky's blue alone.
  const bounced = (v: number) => anchor && v < 0.5 ? hued(face(v), anchor.ground, BOUNCE * direct * (1 - v * 2)) : face(v)
  const planes = { front: tint(bounced(front), ANCHOR.front), side: tint(bounced(side), ANCHOR.side), right, roof: tint(roof, ANCHOR.slab) }
  // The key: the body's darker face a step down, as the land's key is its block's (`kit/lines` KEY_STEP); a join, under half that.
  const darker = labOf(planes.front).l < labOf(planes.side).l ? planes.front : planes.side
  // Against the light, the edge toward the sun catches it: a rim of the light on the front, where no lit side shows.
  const rim = backlit > 0.5 && !sideLit && Math.abs(l.left - l.right) > 0.02 ? { rgb: face(up(1)), right: l.right > l.left } : null
  return { ...planes, ink: keyStep(darker, KEY_STEP[tier]), joint: keyStep(darker, KEY_STEP[tier] * 0.45), rim, tint }
}

/** How much of its ground's hue a face in the sun's shade takes back from it, at the shade's dark. */
const BOUNCE = 0.6

/** A colour's hue `k` of the way to another's, its value held. */
function hued(rgb: RGB, to: RGB, k: number): RGB {
  const lab = labOf(rgb), g = labOf(to)
  return rgbOfLab({ l: lab.l, a: lab.a + (g.a - lab.a) * k, b: lab.b + (g.b - lab.b) * k })
}

/** The value under which a key's step is made smaller, and its least share: no near-black line on a dusk block. */
const KEY_DIM = 0.7, KEY_DIMMEST = 0.35

/** An ink a step of value from a block's, the step smaller on a dark block (as the land's `stepped`), its hue held. */
function keyStep(rgb: RGB, by: number): RGB {
  const lab = labOf(rgb)
  return rgbOfLab({ ...lab, l: Math.max(0, lab.l + by * Math.min(1, Math.max(KEY_DIMMEST, lab.l / KEY_DIM))) })
}

/** A colour anchored to the ground by `a.k`: its value the ground's and `by`, its hue `hue` of the way to the ground's. */
export function anchorOf(a: Anchor | undefined): Planes['tint'] {
  if (!a || a.k <= 0) return (rgb) => rgb
  const g = labOf(a.ground), k = Math.min(1, a.k)
  return (rgb, by, hue = ANCHOR.hue) => {
    const lab = labOf(rgb), h = hue * k
    return rgbOfLab({ l: lab.l + (Math.max(0, g.l + by) - lab.l) * k, a: lab.a + (g.a - lab.a) * h, b: lab.b + (g.b - lab.b) * h })
  }
}
