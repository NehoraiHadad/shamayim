import { smoothstep } from '../../domain/smoothstep'
import { addLight } from '../model/tone'
import type { LayerOf, RGB } from '../model/types'
import { mix } from './hand'

/*
 * How a cloud sheet is drawn (the owner's call, 22 Nov: the first WebGL sky's soft, translucent, white-blue veils, not
 * grey cardboard). The field says where the cloud is and how thick (`alpha`, `tone`); this says how an open deck looks:
 * thin parts clearly translucent so the blue shows through, lit white, grey kept for the thick cores, a lit top and a
 * shaded base on each mass (the SVG sky's hand), softened wider than tall over px that shrink with perspective. A closed
 * deck (overcast, rain: no gaps) and the high veils keep the model's own numbers. Pure: the desc alone, nothing per place.
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
/** Shade a mass's base takes, per unit of alpha falling below it: the underside of a cloud seen from below. */
const BASE_SHADE = 0.6
/** Light a mass's top takes, per unit of alpha falling above it: the sunlit crown, toward the lit white. */
const TOP_LIGHT = 0.8
/** The vertical softening at most, in sky px: a quarter of a fingertip, soft shapes rather than fog. */
const SOFT_MAX = 4
/** The vertical softening as a share of the local row spacing: far rows, packed at the horizon, stay small puffs. */
const SOFT_SHARE = 0.2
/** Horizontal over vertical softening: masses stretch along the horizon, as a deck seen at a slant does. */
const SOFT_STRETCH = 2
/** Drawn alpha below which a softened edge is pulled in: the mass keeps a soft but defined rim, not a long photo fade. */
const RIM = 0.3
/** Detail tile width on the sky at the zenith, px: its coarsest grain ~30 px, its finest ~4 px, a cloud's own texture. */
const DETAIL_PX = 120
/** Row spacing (px) at which the detail has its full size; closer rows, toward the horizon, take finer grain. */
const DETAIL_SPACING = 20
/** How far the detail moves alpha at a half-thick part (±): torn, wispy edges and a mottled thin body. */
const DETAIL = 1.4
/** Detail level that leaves alpha as it is: a little above the mean, so the grain eats more than it adds (more blue). */
const DETAIL_BIAS = 0.55

/** The softening radii in sky px, [across, down], for a band of rows `spacing` px apart. */
export function softRadii(spacing: number): [number, number] {
  const down = Math.min(SOFT_MAX, SOFT_SHARE * spacing)
  return [SOFT_STRETCH * down, down]
}

/** The detail tile's width in sky px for a band of rows `spacing` px apart: finer with distance. */
export const detailTilePx = (spacing: number) => DETAIL_PX * Math.sqrt(Math.min(1, spacing / DETAIL_SPACING))

/**
 * A softened alpha as drawn on an open deck (`open` from `deckOpenness`): moved by the pixel's `detail` (0…1) where the
 * cloud is part-thick, never in open sky or a full core, then its rim drawn in.
 */
export function drawnAlpha(alpha: number, detail: number, open: number): number {
  if (!open) return alpha
  const grained = Math.min(1, Math.max(0, alpha + open * DETAIL * (detail - DETAIL_BIAS) * 4 * alpha * (1 - alpha)))
  return grained * (1 + open * (smoothstep(0, RIM, grained) - 1))
}

/** 0 for a closed deck (overcast, rain) or a high veil, 1 for a low or mid deck with gaps: its share of open-sky nodes. */
export function deckOpenness(desc: LayerOf<'cloudSheet'>): number {
  if (desc.lattice === 'high') return 0
  const count = desc.xs.length * desc.ys.length
  let clear = 0
  for (let n = 0; n < count; n++) if ((desc.alpha[n] ?? 0) < CLEAR) clear++
  return smoothstep(OPEN_FROM, OPEN_TO, clear / count)
}

/**
 * Each node's drawn colour (by night with the towns' light added) times its drawn alpha, and that alpha: the quantities
 * that interpolate without dark fringes.
 */
export function sheetTexels(desc: LayerOf<'cloudSheet'>, open: number): number[][] {
  const cols = desc.xs.length, count = cols * desc.ys.length
  const alphaAt = (n: number) => Math.min(1, Math.max(0, desc.alpha[Math.min(count - 1, Math.max(0, n))] ?? 0))
  return Array.from({ length: count }, (_, n) => {
    const a = alphaAt(n), relief = alphaAt(n - cols) - alphaAt(n + cols)
    const [rgb, alpha] = openLook(desc, toneOf(desc, desc.tone[n] ?? 0), a, relief, open)
    const drawn = desc.city ? addLight(rgb, desc.city.rgb, desc.city.weight[n] ?? 0) : rgb
    return [drawn[0] * alpha, drawn[1] * alpha, drawn[2] * alpha, alpha]
  })
}

/**
 * A node as an open deck draws it, blended by `open` from the model's own colour and alpha. `relief` is the alpha above
 * the node less the alpha below it: positive on a mass's base (shaded), negative on its top (lit).
 */
function openLook({ lit, shade }: LayerOf<'cloudSheet'>, model: RGB, a: number, relief: number, open: number): [RGB, number] {
  if (!open) return [model, a]
  const soft = mix(lit, model, CORE_GREY * a ** GREY_CURVE)
  const formed = relief > 0 ? mix(soft, shade, Math.min(1, BASE_SHADE * relief))
    : mix(soft, lit, Math.min(1, -TOP_LIGHT * relief))
  return [mix(model, formed, open), openAlpha(a, open)]
}

/** A node's alpha as an open deck draws it: thin parts thinner, the core near-opaque. */
export const openAlpha = (a: number, open: number) => a + open * (CORE_OPACITY * a ** VEIL_CURVE - a)

/** The model's colour for a tone: lit at 0, the body at ½, the shaded underside at 1. */
export function toneOf({ lit, body, shade }: LayerOf<'cloudSheet'>, tone: number): RGB {
  const t = Math.min(1, Math.max(0, tone))
  return t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
}
