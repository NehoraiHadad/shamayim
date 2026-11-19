//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { STOREY_M } from '../../data/city/skylineHeight'
import { HOUSE_TOP_M } from '../../data/city/outsideView'
import { rowKm } from '../../world/outside'
import { SCENE_W } from '../../world/sceneBox'
import { facetShare } from '../../world/water'
import { groundFn } from '../../data/landmarks/seat'
import type { OutsideView, RGB, WorldMark, WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { shineOf, SWAY_FRAMES, tonesAt } from './marks'
import { aerialFor, hazeOf, toneAt } from './planeLight'
import { skyAt } from './sky'
import { mixRgb } from './tone'
import type { Box, GlyphDesc, LayerOf, OutsideItem, Pt, SceneBox, SeaDesc, Shine, Streak, Tones } from './types'
import { openWaterTone } from './water'

/**
 * The place seen from outside (stage C5, variant B; the world's `outside.ts`): one layer over the near ridge holding, back
 * to front, the towers beyond the place (true bearing, far first), then the place itself: its built squares as one
 * jagged mass at their real heights, the towers that clear it as spires, the famous and the very tall as full towers,
 * and the place's own marks (icons included) among them at their depth. Under them, a coastal place's own sea.
 *
 * Every tone comes from the one world light and air: walls cut from the ridge and lifted toward the air, the face toward
 * the true sun lit, the other in shade (`tonesAt`), each row hazed by its distance (the near ridge's at the near edge,
 * further south hazier), windows lit by the evening's lit share, aviation lights on the tall. The layer is all light
 * over an empty form (as the marks): its shapes follow the place and the box, its colours the hour.
 */

const Z = 38
/** The haze of the place's rows is quantised to this many km (a scrub reuses the tones of a step). */
const KM_STEP = .5
/** The sea's mirrored sky: grazing at the far edge, steeper at the near (deg below the horizon, the virtual eye's). */
const SEA_DEPRESSION: [number, number] = [1.2, 5]
const DEEP: RGB = [0.06, 0.17, 0.21]
const SAND: RGB = [0.86, 0.8, 0.66]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const tonesKey = (t: Tones) => (Object.keys(t) as (keyof Tones)[]).map((k) => colourKey(t[k]))
const hits = (clear: readonly Box[], left: number, top: number, right: number, bottom: number) =>
  clear.some((b) => left < b.x + b.w && right > b.x && top < b.y + b.h && bottom > b.y)

/**
 * The coastal sea (C5b item 1): its tones from the horizon down to the sheet by C3's rule for open water (`openWaterTone`:
 * the sky mirrored by Fresnel at each row's angle below eye level, over the water's dark, then the air at the row's
 * distance), the shore, the horizon's fine light line, ripples shorter and fainter toward the horizon, and the light's
 * path toward the sun (or moon) where it stands over the water, widening toward the eye.
 */
function seaOf(world: WorldState, box: SceneBox, sx: number, clear: readonly Box[]): SeaDesc | null {
  const sea = world.water.coastalSea
  if (!sea) return null
  const haze = hazeOf(world)
  const aerial = aerialFor(world, haze)
  const tone = openWaterTone(world, box)
  const kmAt = (y: number) => {
    const k = sea.km
    if (y <= k[0][0]) return k[0][1]
    for (let i = 1; i < k.length; i++) if (y <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (y - k[i - 1][0]) / (k[i][0] - k[i - 1][0])
    return k.at(-1)![1]
  }
  const span = Math.max(1, sea.bottom - sea.top)
  const stops: [number, RGB][] = [0, .08, .2, .4, .65, 1].map((t) => { const y = sea.top + t * span; return [t, tone(y, kmAt(y))] })
  const midKm = kmAt((sea.top + sea.bottom) / 2)
  const shore = aerial(mixRgb(mixRgb(SAND, world.light.colour, 0.25 * clamp01(world.light.direct)), haze, 0.35 + 0.4 * world.night.dark), midKm)
  const xs = sea.points.map(([x]) => x * sx)
  const left = Math.min(...xs), right = Math.max(...xs)
  // The light's path: under the sun (or moon) where it stands over the water, its strength the share of facets the one
  // wind tilts toward the eye at the water's depression, dimmed by the cloud in front (`light.direct`).
  const { light, wind } = world
  const body = light.source === 'moon' ? world.bodies.moon : light.source === 'sun' ? world.bodies.sun : null
  let glint: SeaDesc['glint'] = null
  const coastX = (y: number) => {
    const c = sea.coast
    for (let i = 1; i < c.length; i++) if (y <= c[i][1]) return (c[i - 1][0] + (c[i][0] - c[i - 1][0]) * (y - c[i - 1][1]) / Math.max(.01, c[i][1] - c[i - 1][1])) * sx
    return c.at(-1)![0] * sx
  }
  const wet = (x: number, y: number) => sea.side === 'right' ? x > coastX(y) : x < coastX(y)
  if (body?.up && light.side) {
    const x = body.x * sx
    const share = Math.max(facetShare(body.altitude, SEA_DEPRESSION[0], wind.ms), facetShare(body.altitude, SEA_DEPRESSION[1], wind.ms))
    const strength = clamp01(light.direct) * (light.source === 'moon' ? 0.4 : 1)
    const alpha = 1 - Math.exp(-12 * share * strength)
    if (x > left + 1 && x < right - 1 && alpha > 0.03) {
      const random = seeded(hashId(`${world.place.id}:coast-glint`))
      const sparks: Streak[] = []
      const spread = 1.5 + 6 * Math.min(1, wind.ms / 10)
      for (let i = 0; i < 60; i++) {
        const v = random(), a = random(), b = random()
        const y = sea.top + .4 + v * v * (span - .4)
        const w = (0.6 + 1.6 * random()) * (0.4 + v)
        const across = (a + b - 1) * spread * (0.2 + v)
        const s = alpha * Math.exp(-((across / spread) ** 2)) * (0.4 + 0.6 * random())
        if (s < 0.04 || !wet(x + across, y) || hits(clear, x + across - w / 2, y - .3, x + across + w / 2, y + .3)) continue
        sparks.push({ x: x + across - w / 2, y, w, alpha: s })
      }
      glint = { x, rgb: light.source === 'moon' ? [0.88, 0.91, 0.96] : mixRgb(light.colour, [1, 1, 1], 0.5), alpha, sparks }
    }
  }
  // Ripples: short strokes over the water, more with the wind (seeded by the place, never the hour), shorter and fainter
  // toward the horizon (perspective).
  const random = seeded(hashId(`${world.place.id}:coast-ripples`))
  const ripples: Streak[] = []
  const count = Math.min(220, Math.round((right - left) * span / 26 * (0.3 + Math.min(1, wind.ms / 8))))
  for (let i = 0; i < count; i++) {
    const v = random()
    const x = left + random() * (right - left), y = sea.top + .6 + v * (span - .6), w = (0.6 + 2.4 * random()) * (0.35 + 0.65 * v)
    const alpha = (0.05 + 0.12 * random()) * (0.4 + 0.6 * v)
    if (!wet(x, y) || !wet(x + w, y) || hits(clear, x, y - .3, x + w, y + .3)) continue
    ripples.push({ x, y, w, alpha })
  }
  const horizonRgb = aerial(mixRgb(skyAt(world, box)(0.3), [1, 1, 1], 0.35 * (1 - world.night.dark)), sea.km[0][1])
  const edge = sea.side === 'right' ? right : left
  return { points: sea.points.map(([x, y]) => [x * sx, y]), coast: sea.coast.map(([x, y]) => [x * sx, y]), stops,
    top: sea.top, bottom: sea.bottom, shore, glint, ripples, light: tone(sea.top + 1, midKm), dark: mixRgb(stops.at(-1)![1], DEEP, 0.4),
    horizon: { y: sea.horizon, x0: Math.min(edge, coastX(sea.horizon)), x1: Math.max(edge, coastX(sea.horizon)), rgb: horizonRgb,
      alpha: 0.35 * (1 - 0.55 * world.night.dark) },
    drift: (Math.abs(wind.across) > 0.05 ? Math.sign(wind.across) : 0) * 2.4 * Math.min(1, wind.ms / 9) * sx }
}

/**
 * The light the place's mass takes from the sky (C5b item 4), under any cloud: a roof sees the whole sky, a wall half of
 * it and the foot of a wall among others less (the mass shades itself), and the face turned toward the sun's part of the
 * sky sees its brighter half. Strongest as the direct light fades (overcast: the form is the sky's), none by night.
 */
function skyFormOf(world: WorldState, box: SceneBox, kms: number[], tiers: Tones[], sx: number) {
  const { light, night } = world
  const day = 1 - night.dark
  const strength = day * (0.35 + 0.65 * (1 - clamp01(light.direct)))
  const sun = world.bodies.sun
  const across = (sun.x * sx - box.width / 2) / (box.width / 2)
  // The brighter half of an overcast sky is the sun's: its side on the screen while it is up.
  const side = sun.altitude > -2 && Math.abs(across) > 0.08 ? (across < 0 ? 1 : -1) : 0
  const sky = skyAt(world, box)
  const aerial = aerialFor(world, hazeOf(world))
  const mean = mixRgb(sky(35), sky(8), 0.4)
  return { strength, side: side as -1 | 0 | 1, tiers: kms.map((km, i) => {
    const t = tiers[i]
    const lit = aerial(mean, km)
    // The brighter half of the sky round the sun takes the sun's own colour through the cloud.
    const bright = aerial(mixRgb(mean, light.colour, 0.35 * day), km)
    return { top: mixRgb(t.wall, lit, 0.62), face: mixRgb(t.wall, bright, 0.38), foot: mixRgb(t.wall, t.deep, 0.7) }
  }) }
}

/** A full tower or a spire as a glyph-like item (screen px), its seed from its spot. */
function towerItem(t: { x: number; baseY: number; w: number; h: number; heightM: number; seed: number; crown: 0 | 1 | 2;
  lod: string; famous: boolean }, sx: number, tier: number): OutsideItem {
  return { kind: 'tower', x: t.x * sx, base: t.baseY, w: t.w, h: t.h, tier, seed: t.seed, crown: t.crown,
    full: t.lod === 'glyph', famous: t.famous, storeys: Math.max(1, Math.round(t.heightM / STOREY_M)) }
}

interface Shape {
  items: OutsideItem[]
  /** The km of each tier the items refer to (their tones are the hour's). */
  kms: number[]
  /** The marks among the items: where they sit in `items`, and the world mark (its tones are the hour's). */
  marks: { at: number; km: number }[]
}

/** The layer's shapes, independent of the hour: kept per place view, width and text zones (a scrub reuses them). */
const shapes = new WeakMap<object, Map<string, Shape>>()

function shapeOf(world: WorldState, box: SceneBox, clear: readonly Box[]): Shape {
  const view = world.place3 as OutsideView
  let byKey = shapes.get(view)
  if (!byKey) shapes.set(view, byKey = new Map())
  const key = `${box.width}|${clear.map((c) => [c.x, c.y, c.w, c.h].map((v) => v.toFixed(2)).join(',')).join(';')}|${world.keys.marks}`
  const cached = byKey.get(key)
  if (cached) return cached
  const sx = box.width / SCENE_W
  const kms: number[] = []
  const index = new Map<number, number>()
  const tier = (km: number) => {
    const q = Math.round(km / KM_STEP) * KM_STEP
    let i = index.get(q)
    if (i === undefined) { i = kms.length; index.set(q, i); kms.push(q) }
    return i
  }
  const { frame, skyline, baseKm } = view
  const out: OutsideItem[] = []
  const free = (left: number, top: number, right: number, bottom: number) => !hits(clear, left, top, right, bottom)
  // The towers beyond the place: at their true distance, far first, behind the place.
  for (const t of view.beyond) {
    const x = t.x * sx
    if (!free(x - t.w / 2, t.baseY - t.h, x + t.w / 2, t.baseY)) continue
    out.push(towerItem(t, sx, tier(t.km)))
  }
  // The place: its mass, its spires and full towers, its trees, its own marks, back to front by where they stand.
  const own: { y: number; item: OutsideItem; km?: number }[] = []
  const depthOf = (near: number) => frame.n - near * (frame.n - frame.s)
  for (const b of skyline.boxes) {
    const x = b.x * sx, w = b.w * sx
    if (!free(x - w / 2, b.top, x + w / 2, b.foot)) continue
    const seed = b.seed ?? hashId(`${b.x.toFixed(2)}:${b.foot.toFixed(2)}`)
    const heightM = b.heightM ?? 3 * STOREY_M
    // The data's continuum: a low roof is a house (its roof by the evidence, mixed half and half), a higher one a block.
    const r = seeded(seed + 7)
    const roof = heightM >= HOUSE_TOP_M ? null : view.roofs === 'mixed' ? (r() < .5 ? 'tile' : 'flat') : view.roofs
    own.push({ y: b.foot - .001 * b.near, item: { kind: 'box', x, w, top: b.top, foot: b.foot, tier: tier(rowKm(frame, baseKm, depthOf(b.near))),
      seed, storeys: Math.max(1, Math.round((heightM - 1) / STOREY_M)), folded: (b.heightM ?? 0) > 60, roof,
      heater: roof === 'flat' && r() < .45 } })
  }
  for (const t of skyline.towers) {
    const x = t.x * sx
    if (!free(x - t.w / 2, t.baseY - t.h, x + t.w / 2, t.baseY)) continue
    own.push({ y: t.baseY, item: towerItem(t, sx, tier(rowKm(frame, baseKm, depthOf(t.near)))) })
  }
  for (const t of view.trees) {
    const x = t.x * sx
    if (!free(x - t.w, t.base - t.h, x + t.w, t.base)) continue
    own.push({ y: t.base + .002, item: { kind: 'tree', tree: { kind: t.kind, x, base: t.base, w: t.w, h: t.h, seed: t.seed }, tier: tier(t.km) } })
  }
  for (const m of world.marks.filter((mk) => mk.plane === 'near')) {
    // A mark under the label (when the label found no free spot) or a note gives way to the text.
    if (!free(m.x * sx - m.w / 2, m.base - m.h * m.scale, m.x * sx + m.w / 2, m.base + (m.depth !== undefined ? m.h : 0))) continue
    const glyph: GlyphDesc = { kind: m.glyphKind, x: m.x * sx, base: m.base, h: m.h, scale: m.scale, w: m.w, seed: hashId(m.id),
      litSide: null, tones: undefined as unknown as Tones, famous: m.named,
      ...(m.depth !== undefined ? { ground: groundUnder(world, m) } : {}) }
    own.push({ y: m.base + .01, item: { kind: 'mark', glyph }, km: m.km })
  }
  own.sort((a, b) => a.y - b.y)
  const marks: Shape['marks'] = []
  for (const o of own) {
    if (o.km !== undefined) marks.push({ at: out.length, km: o.km })
    out.push(o.item)
  }
  const shape = { items: out, kms, marks }
  if (byKey.size > 8) byKey.clear()
  byKey.set(key, shape)
  return shape
}

/** The place seen from outside, as one layer (null for a portrait). */
export function outsideLayer(world: WorldState, box: SceneBox, clear: readonly Box[] = []): LayerOf<'outside'> | null {
  if (world.place3.kind !== 'outside') return null
  const sx = box.width / SCENE_W
  const shine: Shine = shineOf(world)
  const shape = shapeOf(world, box, clear)
  // The hour's tones per tier, and the marks' glyphs in them (the rest of the shapes kept as they are).
  const tones = shape.kms.map((km) => tonesAt(world, km))
  const out = [...shape.items]
  const near = shape.marks
  for (const { at, km } of near) {
    const item = out[at] as Extract<OutsideItem, { kind: 'mark' }>
    out[at] = { kind: 'mark', glyph: { ...item.glyph, litSide: world.light.side, tones: tonesAt(world, km) } }
  }
  const sea = seaOf(world, box, sx, clear)
  const view = world.place3
  // The place's own ground where it rises over the ridge line: the near land's tone at its distance, its crest lit by
  // the sky as the ridge's is.
  const landDesc = view.land ? { top: view.land.top.map(([x, y]): Pt => [x * sx, y]), base: view.land.base.map(([x, y]): Pt => [x * sx, y]),
    tone: toneAt(world, view.land.km), rim: mixRgb(toneAt(world, view.land.km), skyAt(world, box)(2), 0.35) } : null
  const form = skyFormOf(world, box, shape.kms, tones, sx)
  if (!out.length && !sea) return null
  // The layer's box: everything with the longest cast shadow either side, independent of the light (a scrub never resizes it).
  const reach = (left: number, top: number, right: number, bottom: number, height: number) => {
    const cast = Math.min(14, 2.5 * height * .6 + 1)
    return { left: left - cast - 2, top: top - 4, right: right + cast + 2, bottom: bottom + 2 }
  }
  const boxes = out.map((item) => item.kind === 'box' ? reach(item.x - item.w / 2, item.top - 2.5, item.x + item.w / 2, item.foot, item.foot - item.top)
    : item.kind === 'tree' ? reach(item.tree.x - item.tree.w, item.tree.base - item.tree.h - 1, item.tree.x + item.tree.w, item.tree.base, 0)
    : item.kind === 'tower' ? reach(item.x - item.w / 2, item.base - item.h - 4, item.x + item.w / 2, item.base, item.h)
      : reach(item.glyph.x - item.glyph.w / 2, item.glyph.base - item.glyph.h * item.glyph.scale, item.glyph.x + item.glyph.w / 2,
        item.glyph.base, item.glyph.h * item.glyph.scale))
  if (sea) boxes.push({ left: Math.min(...sea.points.map(([x]) => x)), right: Math.max(...sea.points.map(([x]) => x)), top: sea.top - 1, bottom: sea.bottom + 1 })
  if (landDesc) boxes.push({ left: landDesc.top[0][0], right: landDesc.top.at(-1)![0], top: Math.min(...landDesc.top.map(([, y]) => y)) - 1,
    bottom: Math.max(...landDesc.base.map(([, y]) => y)) + 1 })
  const x0 = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.left)))), x1 = Math.min(box.width, Math.ceil(Math.max(...boxes.map((b) => b.right))))
  const y0 = Math.max(0, Math.floor(Math.min(...boxes.map((b) => b.top)))), y1 = Math.min(box.landHeight, Math.ceil(Math.max(...boxes.map((b) => b.bottom))))
  if (x1 <= x0 || y1 <= y0) return null
  const formKey = layerKey('outside', world.keys.place, world.keys.marks, landBoxKey(box))
  const seaKey = sea ? [sea.stops.map(([, c]) => colourKey(c)), colourKey(sea.shore), sea.glint && [Math.round(sea.glint.x * 4),
    Math.round(sea.glint.alpha * 64), sea.glint.sparks.length], colourKey(sea.horizon.rgb)] : null
  const skyKey = [Math.round(form.strength * 64), form.side, form.tiers.map((t) => [colourKey(t.top), colourKey(t.face), colourKey(t.foot)]),
    landDesc && [colourKey(landDesc.tone), colourKey(landDesc.rim)]]
  // C7: its trees sway in the wind and its sea's ripples run with it, in a strip of frames (the light canvas only).
  const moving = (out.some((item) => item.kind === 'tree') && (shine.sway ?? 0) > 0.005) || Boolean(sea && (sea.ripples.length || sea.glint))
  return {
    kind: 'outside', id: 'outside', surface: 'land', z: Z, bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, key: formKey,
    items: out, tiers: tones, sea, shine, litSide: world.light.side, land: landDesc, form,
    ...(moving ? { animated: { mode: 'frames' as const, frames: SWAY_FRAMES } } : {}),
    light: { key: layerKey('outside:light', formKey, tones.map(tonesKey), near.map((m) => Math.round(m.km / KM_STEP)), world.light.side,
      [Math.round(shine.night * 64), Math.round(shine.direct * 64), Math.round(shine.cast.dx * 32), Math.round(shine.cast.alpha * 64),
        Math.round(shine.windows * 64), shine.aviation, Math.round(shine.lean * 100), Math.round((shine.sway ?? 0) * 200)], seaKey,
      sea && Math.round((sea.drift ?? 0) * 4), skyKey),
    blend: 'source-over', tint: tones[0]?.wall ?? [0.2, 0.2, 0.25], faces: [] },
  }
}

/** A field's ground under it (relative to its base), every glyph px across, as the portrait's fields take it. */
function groundUnder(world: WorldState, m: WorldMark): number[] {
  const g = groundFn(world.terrain.near.points.map(([x, y]) => [x, y]), SCENE_W)
  const n = Math.max(2, Math.round(m.w))
  return Array.from({ length: n + 1 }, (_, i) => g(m.x - m.w / 2 + i * m.w / n) + m.depth! - m.base)
}
