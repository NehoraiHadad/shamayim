import { hashId, seeded } from '../../data/landmarks/hash'
import type { RGB, WorldState } from '../../world/types'
import { colourKey, layerKey } from './keys'
import { mixRgb, rgbOf } from './tone'
import type { LayerDesc, LayerOf, Pt, Sway, WearBead, WearEnd, WearItem } from './types'
import { hangingOf, type Hanging } from './wearKit'
import { lambert, NORMALS, SHADING, type Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'

/*
 * The "מה ללבוש" clothesline (the wear card) drawn in the scene's hand, from the same world the valley is drawn from:
 * today's clothes pegged on a rope strung across the card, in the order the sentence names them (RTL: the first on the
 * right). The rope hangs in a true catenary and kinks under each peg's load; the wind of the shown hour swings and
 * shears the cloth (its sign the scene's own `wind.across`, through the camera), gusts swing harder, a calm hangs still;
 * rain darkens the cloth, weighs it down and beads the rope; the sun lights the cloth from its true side on screen, in
 * its colour; by night everything is dim and moonlit; snow lies on the shoulders and the rope, dust dulls the cloth.
 * Pure: no canvas, no DOM, no clock.
 *
 * Coordinates: the card's line box is `W` × `H` units at the reference (335 px wide), drawn `box.width / W` px a unit;
 * the surface stands `PAD` px out from the box on every side (the cloth hangs below the box, as the SVG's overflow did).
 */

/** The line's box (units), as the SVG's viewBox was: the card reserves exactly this. */
export const W = 335
export const H = 86
/** The rope is tied to two tabs just inside the page's top edge, at the gutters. */
const END_Y = 6
/** The rope's own sag at the middle (units), dry. */
const SAG = 20
const STEP = 70
/** Garments are drawn ~34 units wide; on a full-width line they read best a third larger. */
const SCALE = 1.3
/** How far (units) a garment of weight 1 drags the line down at its pegs. */
const DROP = 2.6
/** How far a point load drags its neighbours down with it (units): the line kinks at the peg and eases away. */
const REACH = 24

/** The surface's margin round the line box (CSS px): pegs over the rope, the swing to the sides, long coats below. */
export const PAD = { x: 14, top: 8, bottom: 34 } as const

export interface WearBox { width: number; dpr: number }
/** The paper the card is printed on (its CSS colours, `theme/sheetLight.ts`). */
export interface WearPaper { sheet: string; ink: string; muted: string; accent: string }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const mul = (c: RGB, k: number | RGB): RGB => (typeof k === 'number' ? [c[0] * k, c[1] * k, c[2] * k]
  : [c[0] * k[0], c[1] * k[1], c[2] * k[2]])

/** The surface's size (CSS px) for a line box `width` px wide. */
export const wearSurface = (width: number) => ({ width: width + 2 * PAD.x, height: (width * H) / W + PAD.top + PAD.bottom })

/**
 * How the wind of the shown hour moves the line (degrees and units, as the SVG's were): `blow` 0…1 (still below ~8 km/h,
 * full by ~38), `gusty` 0…1 (the gust over the mean), `lean` the cloth's rest shear downwind and `flap` its swing at a
 * gust's peak (signed like `wind.across`: + toward the right of the screen), `lift` how far the line rises at its middle
 * in a gust, `period` the gust cycle (s). `calm`: nothing moves. Heavier when wet (`heavy` < 1).
 */
export interface WearAir { calm: boolean; blow: number; gusty: number; lean: number; flap: number; lift: number; period: number
  heavy: number }

export function wearAir(world: WorldState, wet = wearWet(world)): WearAir {
  const kmh = world.wind.ms * 3.6, gustKmh = world.wind.gustMs * 3.6
  const blow = clamp01((kmh - 8) / 30)
  const gusty = clamp01((gustKmh - Math.max(kmh, 8) - 6) / 30)
  const heavy = 1 - 0.4 * wet
  const across = Math.max(-1, Math.min(1, world.wind.across))
  // A wind straight toward or away from the eye still shakes the cloth: its swing keeps a third of its size, on its side.
  const side = across < 0 ? -1 : 1
  const calm = blow <= 0 && gusty <= 0
  const lean = 24 * blow * across * heavy
  const flap = calm ? 0 : (2 + 9 * blow + 7 * gusty) * side * Math.max(0.35, Math.abs(across)) * heavy
  return { calm, blow, gusty, lean, flap, lift: calm ? 0 : (1 + 6 * blow + 3 * gusty) * heavy, period: 7 - 4 * blow - 1.2 * gusty, heavy }
}

/** How wet the cloth is (0–1): raining now, or the ground still wet from the hours before. */
export function wearWet(world: WorldState): number {
  const now = world.rain ? clamp01(world.rain.rateMmH / 2) : 0
  return Math.max(now, 0.7 * world.ground.wet)
}

/**
 * The light on the cloth (the living light): the line hangs across the view, its cloth facing the eye, so each garment
 * takes the world's light by its normals (`livingLight.ts`): `shine` the direct share (the moon's fainter), `across` the
 * signed strength of its side light (−1 from the left … 1 from the right, the difference of the two sides' Lambert light:
 * 0 with the light straight ahead, behind or absent), `front` the light on the face toward the eye, `back` the light
 * through it from behind (the sun beyond the line: thin cloth glows), `up` from above; its colour, the sky's, how dark it is
 * (0 day … 1 full night). `side` is the sign of `across`. All continuous: the lit side turns, never flips.
 */
export interface WearLight { side: -1 | 0 | 1; shine: number; across: number; front: number; back: number; up: number; rgb: RGB; ambient: RGB
  dark: number; moon: boolean }

export function wearLight(world: WorldState): WearLight {
  const { light, night } = world
  const moon = light.source === 'moon'
  const shine = clamp01(light.shares.sun + 0.45 * light.shares.moon)
  const on = smoothstep(SHADING[0], SHADING[1], shine)
  const dir = light.dir
  const k = (n: Normal, wrap: number) => on * lambert(n, dir, wrap) ** 0.7
  // Quantised to steps a small sprite shows (a fortieth of a light, 1/48 of a colour), so a scrub through the hours
  // repaints the cloth only when its light visibly turns (a fortieth: no step a minute's scrub can see).
  const q = (v: number, n: number) => Math.round(v * n) / n
  const rgb = (c: RGB): RGB => [q(c[0], 48), q(c[1], 48), q(c[2], 48)]
  const across = q(light.across, 40)
  return { side: across > 0 ? 1 : across < 0 ? -1 : 0, shine: q(shine, 40), across, front: q(k(NORMALS.front, 0.3), 40),
    back: q(on * clamp01(dir.ahead) ** 0.8, 40), up: q(on * clamp01(dir.up), 40), rgb: rgb(light.colour), ambient: rgb(light.ambient),
    dark: q(clamp01(night.dark), 40), moon }
}

/** By night every colour on the line dims and cools toward moonlight (`dark` 0…1). */
export function dimmed(rgb: RGB, dark: number): RGB {
  return dark <= 0 ? rgb : mixRgb(rgb, mul(rgb, [0.34, 0.38, 0.52]), 0.85 * dark)
}

/** A line hung between two posts `w` apart at the same height, sagging `sag` at its middle: a catenary, y down. */
export function catenary(w: number, sag: number): (x: number) => number {
  if (sag <= 0) return () => 0
  // sag = a (cosh(w / 2a) − 1), solved for a by bisection (a falls as the sag grows).
  let lo = 1e-3, hi = 1e6
  for (let i = 0; i < 80; i++) {
    const a = Math.sqrt(lo * hi)
    if (a * (Math.cosh(w / (2 * a)) - 1) > sag) lo = a
    else hi = a
  }
  const a = Math.sqrt(lo * hi), top = Math.cosh(w / (2 * a))
  return (x) => a * (top - Math.cosh((x - w / 2) / a))
}

interface Load { x: number; drop: number }

/** The rope (units): the catenary's sag, each peg's load kinking it down where it pulls; the ends stay tied. */
export function ropeOf(sag: number, loads: readonly Load[]) {
  const hang = catenary(W, sag)
  const y = (x: number) => {
    const pull = loads.reduce((s, l) => s + l.drop * Math.exp(-Math.abs(x - l.x) / REACH), 0)
    return END_Y + hang(x) + pull * Math.sin((Math.PI * Math.min(W, Math.max(0, x))) / W)
  }
  const xs = [...Array.from({ length: Math.ceil(W / 4) + 1 }, (_, i) => Math.min(W, i * 4)), ...loads.map((l) => l.x)]
  const at = [...new Set(xs.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b)
  return { y, points: at.map((x): Pt => [x, y(x)]) }
}

/** A hand-placed look: each peg leans a little, never the same way twice along the line (degrees). */
const pegTilt = (garment: number, peg: number) => ((garment * 7 + peg * 13) % 5) * 2.4 - 4.8

const DEG = Math.PI / 180

/**
 * The clothesline's layers on the `wear` surface: the rope, each garment (with the stretch of rope in front of a hook),
 * and in the wet, the drops falling from the cloth. Garments the drawing does not know are left out.
 */
export function wearLayers(world: WorldState, garments: readonly string[], paper: WearPaper, box: WearBox): LayerDesc[] {
  const items = garments.map((g) => [g, hangingOf(g)] as const).filter((e): e is readonly [string, Hanging] => Boolean(e[1]))
  if (!items.length || box.width <= 0) return []
  const k = box.width / W
  const sx = (u: number) => PAD.x + u * k, sy = (v: number) => PAD.top + v * k
  const wet = wearWet(world)
  const snow = clamp01(world.snowfall?.amount ?? 0)
  const dust = world.air.dustWeight * clamp01((12 - world.air.visibilityKm) / 9)
  const air = wearAir(world, wet)
  const light = wearLight(world)
  const P = rgbOf(paper.sheet), I = rgbOf(paper.ink), M = rgbOf(paper.muted), A = rgbOf(paper.accent)
  const dim = (c: RGB) => dimmed(c, light.dark)
  const n = items.length
  const first = W / 2 + ((n - 1) * STEP) / 2
  const xOf = (i: number) => first - i * STEP
  // Wet cloth and lying snow weigh more: the pegs drag the line further down, and the line itself sags more.
  const heavier = 1 + 0.6 * wet + 0.3 * snow
  const loads: Load[] = items.flatMap(([, item], i) => {
    const at = item.pegs.length ? item.pegs : [0]
    return at.map((px) => ({ x: xOf(i) + px * SCALE, drop: (DROP * item.weight * heavier) / at.length }))
  })
  const sag = SAG * (1 + 0.15 * wet)
  const rope = ropeOf(sag, loads)
  const midSag = rope.y(W / 2) - END_Y
  const period = Math.round(air.period * 100) / 100
  const ropeRgb = dim(M)
  const key = (...parts: unknown[]) => layerKey('wear', box.width, box.dpr, ...parts)
  const ropeSway = (lift: number): Sway | undefined => (air.calm ? undefined
    : { pivot: [0, sy(END_Y)], period, delay: 0, lift: 0, skew: 0, skew0: 0, turn: 0, turn0: 0, stretch: -(lift * k) / (midSag * k) })
  const swayAnim = (sway: Sway | undefined) => (sway ? { mode: 'sway' as const, sway } : undefined)
  const seed = hashId(`wear:${garments.join(',')}`)
  const surface = wearSurface(box.width)

  // Rain hangs in beads under the rope; a few, seeded along it.
  const beads: WearBead[] = []
  if (wet > 0.15) {
    const r = seeded(seed + 17)
    const count = Math.round(3 + 6 * wet)
    for (let j = 0; j < count; j++) {
      const u = 14 + r() * (W - 28)
      beads.push({ x: sx(u), y: sy(rope.y(u)) + 1.3 * k, r: (0.75 + 0.35 * r()) * k })
    }
  }
  const ends: WearEnd[] = [0, W].map((u, j) => ({ x: sx(u), y: sy(END_Y), w: 6 * k, rgb: rgbOf(world.light.palette.ridgeNear), side: j ? 1 : -1 }))
  const ropeDesc: LayerOf<'wearRope'> = {
    kind: 'wearRope', id: 'wear.rope', surface: 'wear', z: 1, part: 'line', bounds: { x: 0, y: 0, w: surface.width, h: surface.height },
    points: rope.points.map(([u, v]): Pt => [sx(u), sy(v)]), width: 1.5 * k, rgb: ropeRgb, lay: dim(mixRgb(M, P, 0.5)), ends, beads,
    snow, seed, key: '', animated: swayAnim(ropeSway(air.lift)),
  }
  ropeDesc.key = key('rope', ropeDesc.points, colourKey(ropeRgb), colourKey(ropeDesc.lay), ends.map((e) => colourKey(e.rgb)), beads,
    Math.round(snow * 64), Math.round(wet * 64))
  const layers: LayerDesc[] = [ropeDesc]

  // A garment's neighbour on the light's side shades it when the light runs along the line (low, from the side, little
  // of it toward or from the eye): the neighbour's outline, carried the line's spacing along the light, falls on it that
  // much lower (garment units, in its frame).
  const along = Math.abs(world.light.dir.across) / Math.max(1e-6, Math.hypot(world.light.dir.across, world.light.dir.ahead))
  const castOn = (i: number): WearItem['cast'] | undefined => {
    const toward = Math.sign(light.across)
    const j = toward > 0 ? i - 1 : i + 1
    const strength = 0.4 * light.shine * smoothstep(0.6, 0.97, along) * Math.min(1, Math.abs(light.across) * 1.5)
    if (!toward || j < 0 || j >= n || strength < 0.01) return undefined
    const dy = ((STEP * Math.max(0, world.light.dir.up)) / Math.max(0.05, Math.abs(world.light.dir.across)) + rope.y(xOf(j)) - rope.y(xOf(i))) / SCALE
    if (dy > 70) return undefined
    return { garment: items[j][0], dx: 0, dy: Math.round(dy * 4) / 4, alpha: Math.round(strength * 40) / 40 }
  }
  items.forEach(([garment, item], i) => {
    const u = xOf(i)
    const x = sx(u), y = sy(rope.y(u))
    // Pegged cloth hangs square to the chord between its own pegs; a hooked thing hangs plumb from its hook.
    const half = Math.max(6, ...item.pegs.map(Math.abs)) * SCALE
    const tilt = item.hook ? 0 : Math.atan2(rope.y(u + half) - rope.y(u - half), 2 * half)
    const scale = SCALE * k
    const hang = 1 + 0.035 * wet
    const tones = toneOf(rgbOf(item.cloth), { P, I, A, light, wet, dust, haze: world.air.haze, dim })
    const desc: WearItem = { garment, x, y, tilt, scale, hang, pegTilts: item.pegs.map((_, j) => pegTilt(i, j) * DEG), side: light.side,
      shine: light.shine, across: light.across, front: light.front, back: light.back, up: light.up, tones, wet, snow, dust,
      seed: hashId(`wear:${garment}:${i}`), ...(castOn(i) ? { cast: castOn(i)! } : {}) }
    // The sprite's box: the garment's own, turned and scaled, with a margin for the hand.
    const [x0, y0, x1, y1] = item.box
    const corners: Pt[] = [[x0, y0], [x1, y0], [x0, y1 * hang], [x1, y1 * hang]].map(([a, b]): Pt =>
      [x + scale * (a * Math.cos(tilt) - b * Math.sin(tilt)), y + scale * (a * Math.sin(tilt) + b * Math.cos(tilt))])
    const bx0 = Math.floor(Math.min(...corners.map((c) => c[0])) - 2), by0 = Math.floor(Math.min(...corners.map((c) => c[1])) - 2)
    const bounds = { x: bx0, y: by0, w: Math.ceil(Math.max(...corners.map((c) => c[0])) + 2) - bx0, h: Math.ceil(Math.max(...corners.map((c) => c[1])) + 2) - by0 }
    // How much of the line's lift this point carries: its share of the sag.
    const lift = air.lift * k * ((rope.y(u) - END_Y) / midSag)
    // A pendulum answers the gust late: hooked things swing a beat behind; each piece a little after the one before.
    const sway: Sway | undefined = air.calm ? undefined : item.hook
      ? { pivot: [x, y], period, delay: 0.22 * i - 0.45, lift, skew: 0, skew0: 0, turn: -0.8 * air.flap * DEG, turn0: -air.lean * DEG, stretch: 0 }
      : { pivot: [x, y], period, delay: 0.22 * i, lift, skew: air.flap * DEG, skew0: air.lean * DEG, turn: 0, turn0: 0, stretch: 0 }
    const z = 2 + i * 0.1
    layers.push({ kind: 'wearItem', id: `wear.item.${i}`, surface: 'wear', z, bounds, item: desc, animated: swayAnim(sway),
      key: key('item', garment, i, x, y, tilt, scale, hang, desc.pegTilts, light.shine, light.across, light.front, light.back, light.up,
        desc.cast && [desc.cast.garment, Math.round(desc.cast.dx * 4), Math.round(desc.cast.dy * 4), Math.round(desc.cast.alpha * 40)],
        Object.values(tones).map(colourKey),
        Math.round(wet * 64), Math.round(snow * 64), Math.round(dust * 64)) })
    // The rope runs in front of a hook's far arm, so the hook hangs over it rather than in front of it.
    if (item.over) {
      const [a, b] = item.over
      const pts = Array.from({ length: 5 }, (_, j): Pt => {
        const v = u + (a + ((b - a) * j) / 4) * SCALE
        return [sx(v), sy(rope.y(v))]
      })
      const bx = Math.floor(Math.min(pts[0][0], pts[4][0]) - 2), byy = Math.floor(Math.min(...pts.map((p) => p[1])) - 2)
      layers.push({ kind: 'wearRope', id: `wear.bit.${i}`, surface: 'wear', z: z + 0.01, part: 'bit', points: pts, width: 1.15 * k,
        rgb: ropeRgb, lay: ropeDesc.lay, ends: [], beads: [], snow, seed, animated: swayAnim(ropeSway(air.lift)),
        bounds: { x: bx, y: byy, w: Math.ceil(Math.max(pts[0][0], pts[4][0]) + 2) - bx, h: Math.ceil(Math.max(...pts.map((p) => p[1])) + 2) - byy },
        key: key('bit', pts, colourKey(ropeRgb), Math.round(snow * 64)) })
    }
    // Wet cloth drips: a drop swells at the hem and falls, on a seeded beat, riding the swing of what it drips from.
    if (wet > 0.2) {
      const r = seeded(desc.seed + 5)
      const drops = item.drips.slice(0, Math.max(1, Math.round(item.drips.length * Math.min(1, wet + 0.2))))
      drops.forEach(([dx, dy], j) => {
        const lx = scale * (dx * Math.cos(tilt) - dy * hang * Math.sin(tilt)), ly = scale * (dx * Math.sin(tilt) + dy * hang * Math.cos(tilt))
        const px = x + lx, py = y + ly + 0.6 * k
        const rr = 0.95 * k
        const cycle = Math.round((2.2 + 1.2 * r()) * 10) / 10
        const fall: Pt[] = [...Array.from({ length: 12 }, (): Pt => [0, 0]), ...[1, 2, 3, 4, 5, 6].map((s): Pt => [0, 16 * k * (s / 6) ** 2])]
        const track = { path: fall, step: 0.1, cycle, at: Math.round(r() * 11) / 10 }
        layers.push({ kind: 'wearDrip', id: `wear.drip.${i}.${j}`, surface: 'wear', z: z + 0.02, x: px, y: py, r: rr,
          rgb: mixRgb(tones.water, tones.body, 0.3), lit: tones.glint,
          bounds: { x: Math.floor(px - rr - 1), y: Math.floor(py - rr - 1), w: Math.ceil(2 * rr + 2) + 1, h: Math.ceil(2 * rr + 3) + 1 },
          animated: { mode: 'sway', flight: track, ...(sway ? { sway } : {}) },
          key: key('drip', px, py, rr, colourKey(tones.water)) })
      })
    }
  })
  return layers
}

interface ToneInput { P: RGB; I: RGB; A: RGB; light: WearLight; wet: number; dust: number; haze: RGB; dim: (c: RGB) => RGB }

/**
 * A cloth's tones on the paper after the light and the weather: the body (the cloth washed into the paper, as the SVG's
 * was, but richer), its lit side (toward the light's colour, by how strongly it shines), its shade (deeper, toward the
 * sky's ambient), the inside of the back, the rim on the lit edge; darker and deeper when wet, dulled toward the haze in
 * dust, dimmed and cooled by night.
 */
function toneOf(cloth: RGB, { P, I, A, light, wet, dust, haze, dim }: ToneInput): WearItem['tones'] {
  let body = mixRgb(P, cloth, 0.52)
  if (dust > 0) body = mixRgb(body, haze, 0.25 * dust)
  if (wet > 0) body = mixRgb(body, mul(cloth, 0.62), 0.55 * wet)
  const day = 1 - light.dark
  // The direct light's colour carries into the lit side; a low sun's warmth shows, the noon sun's barely.
  const tint = mixRgb([1, 1, 1], light.rgb, 0.8)
  const lit = mixRgb(body, mixRgb(body, tint, 0.75), 0.55 * light.shine)
  // Shade is filled by the sky (cooler, a little more of it under a clear sky) and never flat.
  const shade = mixRgb(mul(body, 0.74 - 0.08 * light.shine * day), light.ambient, 0.1 + 0.06 * light.shine * day)
  // Light through the cloth from behind: its own colour, saturated and lit by the light's colour.
  const glow = mixRgb(mul(mixRgb(cloth, [1, 1, 1], 0.4), tint), lit, 0.35)
  return {
    body: dim(body),
    glow: dim(glow),
    lit: dim(mixRgb(lit, [1, 1, 1], 0.08 * light.shine * day)),
    shade: dim(shade),
    deep: dim(mul(body, 0.55)),
    rim: dim(mixRgb(lit, tint, 0.55)),
    seam: dim(mixRgb(body, I, 0.4)),
    edge: dim(mixRgb(I, P, 0.28)),
    tag: dim(mixRgb(P, I, 0.1)),
    peg: dim(mixRgb(P, A, 0.52)),
    pegEdge: dim(mixRgb(A, I, 0.4)),
    pegLight: dim(mixRgb(P, A, 0.18)),
    spring: dim(mixRgb(I, P, 0.35)),
    glint: dim([0.97, 0.98, 1]),
    water: dim(mixRgb(P, cloth, 0.66)),
    cord: dim(mixRgb(cloth, I, 0.5)),
  }
}
