import { smoothstep } from '../../domain/smoothstep'
import type { LayerOf, RGB } from '../model/types'
import { mix } from './hand'

/*
 * How a cloud sheet is drawn (the owner's call, 22 Nov: the first WebGL sky's soft, translucent, white-blue veils, not
 * grey cardboard). The field says where the cloud is and how thick (`alpha`, `tone`); this says how an open deck looks:
 * thin parts clearly translucent so the blue shows through, lit white, grey kept for the thick cores, softened over a
 * few px that shrink with perspective. A closed deck (overcast, rain: no gaps) and the high veils keep the model's own
 * numbers. Pure: a function of the desc alone, nothing per place.
 */

/** Below this a node is open sky: one of the deck's gaps. */
const CLEAR = 0.05
/** Share of clear nodes over which a deck turns from closed (overcast, rain ≤ 0.03) to open (broken, showers ≈ 0.2). */
const OPEN_FROM = 0.05, OPEN_TO = 0.15
/** Opacity curve exponent: thin parts thin out faster than linear, so the sky shows through them. */
const VEIL_CURVE = 1.6
/** Opacity of the thickest core: near-opaque, with a breath of sky still behind it. */
const CORE_OPACITY = 0.92
/** Share of the model's shaded colour a thick core keeps: grey only there; the rest leans to the lit side. */
const CORE_GREY = 0.55
/** How fast that grey fades toward the thin edges (exponent on alpha): the edges are lit white. */
const GREY_CURVE = 2
/** The softening at most, in sky px: about a third of a fingertip, soft shapes rather than fog. */
const SOFT_MAX = 6
/** The softening as a share of the local row spacing: far rows, packed toward the horizon, stay small soft puffs. */
const SOFT_SHARE = 0.3

/** The softening radius in sky px for a band of rows `spacing` px apart. */
export const softRadius = (spacing: number) => Math.min(SOFT_MAX, SOFT_SHARE * spacing)

/** Each node's drawn colour times its drawn alpha, and that alpha: the quantities that interpolate without dark fringes. */
export function sheetTexels(desc: LayerOf<'cloudSheet'>): number[][] {
  const count = desc.xs.length * desc.ys.length
  const open = desc.lattice === 'high' ? 0 : openness(desc.alpha, count)
  return Array.from({ length: count }, (_, n) => {
    const a = Math.min(1, Math.max(0, desc.alpha[n] ?? 0))
    const [rgb, alpha] = openLook(desc.lit, toneOf(desc, desc.tone[n] ?? 0), a, open)
    return [rgb[0] * alpha, rgb[1] * alpha, rgb[2] * alpha, alpha]
  })
}

/** 0 for a closed deck, 1 for one with gaps: from the share of its nodes that are open sky. */
function openness(alpha: readonly number[], count: number): number {
  let clear = 0
  for (let n = 0; n < count; n++) if ((alpha[n] ?? 0) < CLEAR) clear++
  return smoothstep(OPEN_FROM, OPEN_TO, clear / count)
}

/** A node as an open deck draws it, blended by `open` from the model's own colour and alpha. */
function openLook(lit: RGB, model: RGB, a: number, open: number): [RGB, number] {
  if (!open) return [model, a]
  const veil = CORE_OPACITY * a ** VEIL_CURVE
  const soft = mix(lit, model, CORE_GREY * a ** GREY_CURVE)
  return [mix(model, soft, open), a + open * (veil - a)]
}

/** The model's colour for a tone: lit at 0, the body at ½, the shaded underside at 1. */
function toneOf({ lit, body, shade }: LayerOf<'cloudSheet'>, tone: number): RGB {
  const t = Math.min(1, Math.max(0, tone))
  return t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
}
