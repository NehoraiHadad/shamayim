import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { GLYPH_SPECS } from '../../world/glyphSpecs'
import { makeWorldBuilder } from '../../world/world'
import { shineOf } from '../model/marks'
import { outsideLayer } from '../model/outside'
import type { GlyphDesc, LayerOf, SceneBox, Shine } from '../model/types'
import { drawGlyph } from './glyphs'
import { css, mix } from './hand'
import type { Ctx2D, PaintEnv } from './hand'
import { paintOutside } from './outside'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const FORM = new Set(['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'setTransform', 'beginPath',
  'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'closePath', 'clip', 'fill',
  'stroke', 'fillRect', 'strokeRect'])
const env: PaintEnv = { hand: { grain: 1 }, phase: 0, scale: 1, canvas: () => ({
  canvas: {} as OffscreenCanvas,
  ctx: { createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {} } as unknown as Ctx2D,
}) }

function colour(value: string) {
  const [r, g, b, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number)
  return [r / 255, g / 255, b / 255, a]
}

interface Gradient { cast: boolean; halo: boolean; span: number; stops: number[][] }

function record(layer: LayerOf<'outside'>, windowsOnly = false) {
  const form: [string, ...number[]][] = [], channels: number[] = []
  const casts: { span: number; alpha: number; path: typeof form }[] = []
  const halos: number[] = []
  const lit = new Set<string>()
  let pathStart = 0
  let fill: string | Gradient, stroke: string
  const ctx = new Proxy({}, {
    get: (_, op: string) => (...args: number[]) => {
      if (op === 'createLinearGradient' || op === 'createRadialGradient') {
        const stops: number[][] = []
        // Casts have two stops across the ground. Round glyph bodies have a multi-stop falloff.
        const cast = op === 'createLinearGradient' && args[1] === 0 && args[3] === 0
        return { cast, halo: op === 'createRadialGradient' && args[5] === 1.3, span: args[2] - args[0], stops,
          addColorStop: (_: number, css: string) => { if (!windowsOnly) stops.push(colour(css)) } }
      }
      if (op === 'fillRect' && typeof fill === 'string') {
        const [, , w, h] = args
        if ((w === .55 || (w === .5 && h === .55)) && !fill.includes('/')) lit.add(args.join(','))
      }
      if (windowsOnly || !FORM.has(op)) return
      if (op === 'beginPath') pathStart = form.length
      form.push([op, ...args])
      if (op === 'fill' && typeof fill !== 'string' && fill.cast && fill.stops.length === 2) {
        casts.push({ span: fill.span, alpha: fill.stops[0][3], path: form.splice(pathStart) })
      } else if (op === 'fill' || op === 'fillRect' || op === 'stroke') {
        const paint = op === 'stroke' ? stroke : fill
        if (typeof paint !== 'string' && paint.halo) halos.push(paint.stops[0][3])
        channels.push(...(typeof paint === 'string' ? colour(paint) : paint.stops.flat()))
      }
    },
    set: (_, key: string, value: string | Gradient) => {
      if (key === 'fillStyle') fill = value
      if (key === 'strokeStyle' && typeof value === 'string') stroke = value
      return true
    },
  }) as Ctx2D
  paintOutside(ctx, layer, env)
  return { form, channels, casts, lit, halos }
}

const WINDOW_GLYPHS = ['minaret', 'church', 'synagogue', 'homes', 'chimney', 'highrise', 'silo', 'azrieli', 'babShrine'] as const

/** Identifies each warm, opaque window fill by its path in glyph space. */
function glyphWindows(glyph: GlyphDesc, shine: Shine) {
  const { wall, win } = glyph.tones
  const warm = new Set([.5, .55, .6, .7, .75, .8, .85, .9].map((share) => css(mix(wall, win, share))))
  const lit = new Set<string>()
  let path: [string, ...number[]][] = [], fill: unknown
  const ctx = new Proxy({}, {
    get: (_, op: string) => (...args: number[]) => {
      if (op === 'createLinearGradient' || op === 'createRadialGradient') return { addColorStop() {} }
      if (op === 'beginPath') path = []
      else if (op === 'fill') {
        if (typeof fill === 'string' && warm.has(fill)) lit.add(`${glyph.seed}:${JSON.stringify(path)}`)
      } else if (FORM.has(op)) path.push([op, ...args])
    },
    set: (_, key, value) => { if (key === 'fillStyle') fill = value; return true },
  }) as Ctx2D
  drawGlyph(ctx, glyph, shine)
  return lit
}

let jerusalem: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  const place = SCENE_PLACES.find(({ id }) => id === 'jerusalem')!
  jerusalem = (await loadPlaces([place])).get(place.id)!
})
afterAll(() => vi.unstubAllGlobals())

it('keeps Jerusalem’s building geometry fixed as lateral light sweeps through even light', () => {
  const time = '2026-11-17T12:00'
  const layer = outsideLayer(makeWorldBuilder()(worldInput(jerusalem, time, time)), BOX)!
  expect(layer.sea).toBeNull()
  expect(layer.items.some(({ kind }) => kind === 'tower')).toBe(true)
  const at = (side: number) => record({ ...layer,
    form: { ...layer.form, side, strength: Math.max(.3, layer.form.strength) },
    shine: { ...layer.shine, night: .4, windows: .25, glint: .5,
      faces: { ...layer.shine.faces, across: side, left: Math.max(0, side), right: Math.max(0, -side) },
      cast: { dx: -side, length: 2, alpha: .25 } },
  })
  const even = at(0)
  expect(even.casts).toHaveLength(0)
  expect(even.form.length).toBeGreaterThan(0)
  const fixed = JSON.stringify(even.form)
  let previous = at(-1)
  const steps: number[] = []
  for (let i = 1; i <= 40; i++) {
    const side = (i - 20) / 20
    const frame = at(side)
    expect(JSON.stringify(frame.form) === fixed, `geometry at ${side}`).toBe(true)
    expect(frame.channels).toHaveLength(previous.channels.length)
    steps.push(frame.channels.reduce((max, value, j) => Math.max(max, Math.abs(value - previous.channels[j])), 0))
    previous = frame
  }
  steps.sort((a, b) => a - b)
  const median = (steps[19] + steps[20]) / 2
  expect(median).toBeGreaterThan(0)
  expect(steps.at(-1)).toBeLessThanOrEqual(3 * median + 1 / 255)

  // Cast paths alone may move. Near even light their projection and opacity both collapse to zero.
  for (const side of [-.0001, .0001]) {
    const { casts } = at(side)
    expect(casts.length).toBeGreaterThan(0)
    let towers = 0
    for (const { span, alpha, path } of casts) {
      const [, , base] = path.find(([op]) => op === 'moveTo')!
      const [edge, tip, tail] = path.filter(([op]) => op === 'lineTo')
      const dir = -Math.sign(side), reach = (tip[1] - edge[1]) * dir
      const tower = Math.abs(edge[2] - base + .3) < 1e-7
      if (tower) {
        towers++
        expect(tip[2] - base).toBeCloseTo(.5, 10)
        expect(tail[2] - base).toBeCloseTo(1.2, 10)
        expect((tip[1] - tail[1]) * dir).toBeCloseTo(1.2, 10)
      }
      expect(reach).toBeGreaterThan(0)
      expect(Math.abs(reach)).toBeLessThan(.02)
      expect(span * dir).toBeCloseTo(reach + (tower ? .5 : 0), 10)
      expect(alpha).toBeCloseTo(.25 * reach * (tower ? .8 : 1), 3)
    }
    expect(towers).toBe(layer.items.filter(({ kind }) => kind === 'tower').length)
  }
})

it('fades sky highlights and box lamp halos through their old cutoffs with fixed geometry', () => {
  const time = '2026-11-17T12:00'
  const layer = outsideLayer(makeWorldBuilder()(worldInput(jerusalem, time, time)), BOX)!
  const at = (strength: number, night: number) => record({ ...layer, land: null,
    items: layer.items.filter(({ kind }) => kind === 'box' || kind === 'tower'),
    form: { ...layer.form, strength, side: .5 },
    shine: { ...layer.shine, night, windows: 1, aviationStrength: 0, cast: { dx: 0, alpha: 0, length: 0 } },
  })
  const below = at(.019, .599), above = at(.021, .601), full = at(.8, .8)
  const fixed = JSON.stringify(below.form)
  expect(JSON.stringify(above.form) === fixed).toBe(true)
  expect(JSON.stringify(full.form) === fixed).toBe(true)
  expect(above.channels).toHaveLength(below.channels.length)
  const step = above.channels.reduce((max, value, i) => Math.max(max, Math.abs(value - below.channels[i])), 0)
  expect(step).toBeLessThanOrEqual(1 / 255 + Number.EPSILON)
  const towers = layer.items.filter((item) => item.kind === 'tower' && (item.full || item.storeys >= 30)).length
  expect(below.halos.length).toBeGreaterThan(towers)
  expect(below.halos.every((alpha) => alpha === 0)).toBe(true)
  expect(full.halos.filter((alpha) => alpha === 0)).toHaveLength(towers)
})

it('keeps outside aviation halos and cores fixed as darkness and evening windows fade them in', () => {
  const time = '2026-11-17T12:00'
  const world = makeWorldBuilder()(worldInput(jerusalem, time, time))
  const layer = outsideLayer(world, BOX)!
  const items = layer.items.filter((item) => item.kind === 'tower' && (item.full || item.storeys >= 30))
  expect(items.length).toBeGreaterThan(0)
  const at = (dark: number, litShare: number) => {
    const shine = shineOf({ ...world, night: { ...world.night, dark, litShare, aviation: false } })
    return record({ ...layer, items, land: null, shine: { ...shine, windows: 0, cast: { dx: 0, alpha: 0, length: 0 } } })
  }
  const day = at(0, 0)
  const fixed = JSON.stringify(day.form)
  expect(day.halos).toEqual(items.map(() => 0))
  expect(at(1, 0).halos).toEqual(items.map(() => .55))
  expect(at(0, .04).halos).toEqual(items.map(() => .275))

  const sweep = (frames: number, step: number, maxSlope: number, paint: (value: number) => ReturnType<typeof at>) => {
    let previous = day
    for (let i = 1; i <= frames; i++) {
      const frame = paint(i * step)
      expect(JSON.stringify(frame.form)).toBe(fixed)
      expect(frame.channels).toHaveLength(previous.channels.length)
      const maxAlphaStep = frame.channels.reduce((max, value, j) => j % 4 === 3
        ? Math.max(max, Math.abs(value - previous.channels[j])) : max, 0)
      expect(maxAlphaStep).toBeLessThanOrEqual(maxSlope * step + .001)
      previous = frame
    }
  }
  // Smoothstep's steepest slope is 1.5 / width. The core can reach .8 in the darkness ramp,
  // or .6 in the lit-share ramp at fixed darkness. Account for the changing core and CSS rounding.
  sweep(200, .005, .5 + .8 * 1.5 / .2, (dark) => at(dark, 0))
  sweep(40, .001, .6 * 1.5 / .04, (share) => at(0, share))
})

it('never extinguishes a lit box, tower or glyph window as the Jerusalem share rises from 16:30 to 18:30', () => {
  const from = '2026-11-17T16:30'
  const input = worldInput(jerusalem, from, from)
  const build = makeWorldBuilder()
  let previous = new Set<string>(), share = 0
  let previousGlyphs = new Map<string, Set<string>>()
  let increases = 0
  for (let minute = 0; minute <= 120; minute++) {
    const selected = addMinutes(from, minute)
    const layer = outsideLayer(build({ ...input, selected }), BOX)!
    const { lit } = record(layer, true)
    if (layer.shine.windows >= share) {
      expect(lit.size, selected).toBeGreaterThanOrEqual(previous.size)
      expect([...previous].filter((id) => !lit.has(id)), selected).toEqual([])
    }
    if (lit.size > previous.size) increases++
    previous = lit
    // Exercise glyph types that Jerusalem need not contain with the same minute-by-minute light.
    const glyphs = new Map<string, Set<string>>()
    for (const kind of WINDOW_GLYPHS) {
      const windows = new Set<string>()
      for (let seed = 1; seed <= 8; seed++) {
        const glyph: GlyphDesc = { kind, seed, hand: 1, x: 0, base: 0, w: GLYPH_SPECS[kind].w, h: 24, scale: 1, famous: false,
          tones: { ...layer.tiers[0], win: [1, .2, .01] } }
        for (const id of glyphWindows(glyph, layer.shine)) windows.add(id)
      }
      const old = previousGlyphs.get(kind)
      if (old && layer.shine.windows >= share) {
        expect(windows.size, `${kind} at ${selected}`).toBeGreaterThanOrEqual(old.size)
        expect([...old].filter((id) => !windows.has(id)), `${kind} at ${selected}`).toEqual([])
      }
      glyphs.set(kind, windows)
    }
    previousGlyphs = glyphs
    share = layer.shine.windows
  }
  expect(previous.size).toBeGreaterThan(0)
  expect(increases).toBeGreaterThan(0)
  for (const [kind, windows] of previousGlyphs) expect(windows.size, kind).toBeGreaterThan(0)
})
