import { OWN_GLYPH_EVIDENCE } from '../../../test/glyphEvidence'
import { afterAll, expect, it, vi } from 'vitest'
import { smoothstep } from '../../../domain/smoothstep'
import type { LocalTime } from '../../../domain/types'
import { SCENE_PLACES } from '../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../../test/sceneWorld'
import { GLYPH_SPECS, type GlyphKind } from '../../../world/glyphSpecs'
import { makeWorldBuilder } from '../../../world/world'
import { sceneModel } from '../../model'
import type { GlyphDesc, LayerOf, SceneBox, Shine } from '../../model/types'
import { paintStars } from '../bodies'
import { css, type Ctx2D, type PaintEnv } from '../hand'
import { paintAircraft } from '../life'
import { tree } from '../marks'
import { paintPlanets } from '../nightSky'
import { drawGlyph, drawLamps, glyphShadow } from '.'

const FORM = new Set(['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'beginPath', 'moveTo',
  'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'closePath', 'clip', 'fill', 'stroke', 'fillRect', 'strokeRect'])
const rounded = (args: unknown[]) => args.map((arg) => typeof arg === 'number' ? Math.round(arg * 1e6) / 1e6 : arg)
const colour = (value: string) => {
  const [r, g, b, alpha = 1] = (value.match(/[\d.]+/g) ?? []).map(Number)
  return [r / 255, g / 255, b / 255, alpha]
}
function recording() {
  const form: unknown[][] = [], light: unknown[][] = [], channels: number[] = []
  const paint = (op: string, value: unknown) => {
    light.push([op, value])
    if (typeof value === 'string') channels.push(...colour(value))
  }
  let gradientId = 0
  const ctx = new Proxy({}, {
    get: (_, key: string) => (...args: unknown[]) => {
      if (FORM.has(key)) form.push([key, ...rounded(args)])
      if (key.startsWith('create') && key.endsWith('Gradient')) {
        light.push([key, ...rounded(args)])
        return {
          id: gradientId++,
          addColorStop(offset: number, value: string) {
            light.push(['offset', offset])
            paint('stop', value)
          },
        }
      }
    },
    set: (_, key: string, value: unknown) => {
      if (key === 'fillStyle' || key === 'strokeStyle') paint(key, value)
      return true
    },
  }) as Ctx2D
  return { form, light, channels, ctx }
}
function record(glyph: GlyphDesc, shine: Shine) {
  const drawing = recording()
  const lamps = drawGlyph(drawing.ctx, glyph, shine)
  return { ...drawing, lamps: lamps.map(({ x, y }) => [x, y]) }
}
function distance(a: readonly number[], b: readonly number[]) {
  expect(a.length).toBe(b.length)
  return a.reduce((max, v, i) => Math.max(max, Math.abs(v - b[i])), 0)
}
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const KINDS = Object.keys(GLYPH_SPECS) as GlyphKind[]
const place = SCENE_PLACES.find(({ id }) => id === 'shadmot-mehola')!
const loaded = () => {
  stubPublicFetch()
  return loadPlaces([place]).then((places) => places.get(place.id)!)
}
afterAll(() => vi.unstubAllGlobals())
const evenTone = [0.35, 0.38, 0.42] as const
const litTone = [0.72, 0.62, 0.5] as const
const shade = [0.18, 0.21, 0.25] as const
const tones = { wall: evenTone, lit: litTone, shade, deep: shade, rim: litTone, refl: evenTone,
  roof: evenTone, roofLit: litTone, stone: evenTone, stoneLit: litTone, glass: evenTone, glassLit: litTone,
  soot: shade, green: evenTone, greenLit: litTone, panel: shade, gold: litTone, win: litTone, mist: evenTone }
const shine: Shine = { night: 0.8, aviationStrength: 1, windows: 0.4, lean: 0, direct: 0.5,
  faces: { front: 0.2, top: 0.3, rim: 0.15, left: 0, right: 0, across: 0 }, cast: { dx: 0, alpha: 0, length: 0 } }

it.each([1, -1] as const)('keeps all 22 glyph forms and night lamps fixed with hand %i', (hand) => {
  expect(KINDS).toHaveLength(22)
  for (const kind of KINDS) {
    const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind, seed: 43, hand, tones, x: 40, base: 60,
      w: GLYPH_SPECS[kind].w, h: 20, scale: 1.4, famous: false, ground: [0, 1, 0] }
    const at = (l: number) => record(glyph, { ...shine,
      faces: { ...shine.faces, left: Math.max(0, l * glyph.hand), right: Math.max(0, -l * glyph.hand) } })
    const sweep = Array.from({ length: 41 }, (_, i) => at((i - 20) / 20))
    const even = sweep[20]
    if (kind === 'minaret') {
      expect(even.lamps[0][0]).toBeCloseTo(glyph.x + hand * 3.2 * glyph.scale)
      // The minaret's first box paints the front, followed by its fixed left face.
      expect(at(hand).light[1]).toEqual(['fillStyle', css(hand === 1 ? litTone : shade)])
    }
    const form = JSON.stringify(even.form)
    for (const frame of sweep) {
      expect(JSON.stringify(frame.form), kind).toBe(form)
      expect(frame.lamps, kind).toEqual(even.lamps)
      expect(frame.light.length, kind).toBe(even.light.length)
    }
    expect(JSON.stringify(sweep[0].light), kind).not.toBe(JSON.stringify(sweep[40].light))
    expect(distance(at(-0.001).channels, at(0.001).channels), kind).toBeLessThan(0.01)
    const steps = sweep.slice(1).map((frame, i) => distance(frame.channels, sweep[i].channels)).sort((a, b) => a - b)
    // CSS serializes RGB to bytes. Allow one byte of rounding on top of the relative bound.
    expect(steps.at(-1)!, kind).toBeLessThanOrEqual(3 * steps[20] + 1 / 255)
  }
})

it('fades every glyph lamp and flood with fixed geometry through dusk', () => {
  const step = .005
  // A width-.2 smoothstep has slope at most 7.5. An aviation core is at most .8 in its ramp
  // and its base alpha can grow by .5 per night unit. CSS rounds alpha to .001 and RGB to bytes.
  const alphaLimit = (.5 + .8 * 7.5) * step + .001
  const colourLimit = 7.5 * step + 1 / 255
  const withLamps: GlyphKind[] = ['minaret', 'waterTower', 'chimney', 'highrise', 'silo', 'mast', 'lighthouse',
    'turbine', 'azrieli', 'babShrine', 'chordsBridge']
  for (const kind of KINDS) {
    const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind, seed: 43, hand: 1, tones, x: 40, base: 60,
      w: GLYPH_SPECS[kind].w, h: 20, scale: 1, famous: false, ground: [0, 1, 0] }
    const at = (night: number) => {
      const drawing = recording()
      const lamps = drawGlyph(drawing.ctx, glyph, { ...shine, night, windows: 0, aviationStrength: smoothstep(.2, .4, night) })
      const lampStart = drawing.channels.length
      drawLamps(drawing.ctx, lamps, .5)
      return { ...drawing, lampAlpha: drawing.channels.slice(lampStart).filter((_, i) => i % 4 === 3) }
    }
    let previous = at(0)
    const fixed = JSON.stringify(previous.form)
    expect(previous.lampAlpha, kind).toHaveLength(withLamps.includes(kind) ? 4 : 0)
    expect(previous.lampAlpha.every((alpha) => alpha === 0), kind).toBe(true)
    for (let i = 1; i <= 200; i++) {
      const frame = at(i * step)
      expect(JSON.stringify(frame.form), kind).toBe(fixed)
      expect(frame.channels, kind).toHaveLength(previous.channels.length)
      for (let j = 0; j < frame.channels.length; j++) {
        const change = Math.abs(frame.channels[j] - previous.channels[j])
        if (change > (j % 4 === 3 ? alphaLimit : colourLimit)) {
          expect.fail(`${kind} paint channel ${j} changed by ${change} at night ${i * step}`)
        }
      }
      previous = frame
    }
    if (withLamps.includes(kind)) expect(previous.lampAlpha.at(-1), kind).toBeGreaterThan(0)
  }
})

it('fades aircraft lights and planet halos without changing their geometry', () => {
  const base = { id: 'dusk', surface: 'sky', z: 1, key: 'dusk', bounds: { x: 0, y: 0, w: 100, h: 100 } } as const
  const aircraft: LayerOf<'aircraft'> = { ...base, kind: 'aircraft', x: 40, y: 40, size: 3, angle: 0,
    lights: 0, landing: true, trail: 0, rgb: evenTone, lit: litTone, trailRgb: litTone, seed: 0 }
  for (const phase of [0, .5]) { // Both flashed lights, plus the steady navigation and landing lights.
    const env: PaintEnv = { phase, scale: 1, hand: { grain: 0 }, canvas: () => { throw new Error('Unexpected scratch canvas') } }
    const at = (night: number) => {
      const draw = recording()
      paintAircraft(draw.ctx, { ...aircraft, lights: night }, env)
      paintPlanets(draw.ctx, { ...base, kind: 'planets',
        planets: [{ name: 'venus', x: 20, y: 20, r: 1, rgb: litTone, alpha: night, glow: night }] }, env)
      return draw
    }
    let previous = at(0)
    const fixed = JSON.stringify(previous.form)
    for (let i = 1; i <= 200; i++) {
      const frame = at(i / 200)
      expect(JSON.stringify(frame.form)).toBe(fixed)
      // The steepest change is the aircraft body. Its .1-wide ramp has slope at most 15,
      // its base alpha is at most .28 during that ramp and changes by .8 per night unit.
      expect(distance(frame.channels, previous.channels)).toBeLessThanOrEqual((.8 + .28 * 15) / 200 + .001)
      previous = frame
    }
  }
})

it.each([[0.4, false], [0.5, false], [0.501, true], [0.55, true], [0.6, true]] as const)(
  'keeps the star halo appearance at full-night alpha %f',
  (alpha, halo) => {
    const draw = recording()
    const env: PaintEnv = { phase: 0, scale: 1, hand: { grain: 0 }, canvas: () => { throw new Error('Unexpected scratch canvas') } }
    paintStars(draw.ctx, { id: 'stars', kind: 'stars', z: 2, key: 'stars', surface: 'sky',
      bounds: { x: 0, y: 0, w: 100, h: 100 }, through: 1, stars: [{ x: 30, y: 30, r: 1, alpha }] }, env)
    expect(draw.light.filter(([op]) => op === 'createRadialGradient')).toHaveLength(Number(halo))
    expect(draw.light.filter(([op]) => op === 'stop')).toEqual(halo ? [
      ['stop', `rgb(232 238 255 / ${(0.25 * alpha).toFixed(3)})`], ['stop', 'rgb(232 238 255 / 0)'],
    ] : [])
  },
)

it('keeps Shadmot Mehola glyph form fixed from 05:30 through 21:00', async () => {
  const source = await loaded()
  const build = makeWorldBuilder()
  const baseline = new Map<string, unknown[][]>()
  let frames = 0
  for (let minute = 330; minute <= 1260; minute += 30) {
    const hh = String(Math.floor(minute / 60)).padStart(2, '0')
    const mm = String(minute % 60).padStart(2, '0')
    const time: LocalTime = `2026-11-17T${hh}:${mm}`
    const { layers } = sceneModel(build(worldInput(source, time)), BOX)
    const seen = new Set<string>()
    for (const layer of layers) {
      const glyphs = layer.kind === 'marks' ? layer.glyphs : layer.kind === 'outside'
        ? layer.items.flatMap((item) => item.kind === 'mark' ? [item.glyph] : []) : null
      if (!glyphs || !('shine' in layer)) continue
      for (const glyph of glyphs) {
        const key = `${layer.id}:${glyph.kind}:${glyph.seed}`
        const { form } = record(glyph, layer.shine)
        seen.add(key)
        if (frames === 0) baseline.set(key, form)
        else expect(form, `${time} ${key}`).toEqual(baseline.get(key))
      }
    }
    expect(seen).toEqual(new Set(baseline.keys()))
    frames++
  }
  expect(baseline.size).toBeGreaterThan(0)
  expect([...baseline.keys()].some((key) => key.includes(':synagogue:'))).toBe(true)
})
it('reduces the glyph shadow to its contact shade at zero lateral reach', () => {
  const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind: 'minaret', x: 40, base: 60, w: 10, h: 20, scale: 1, seed: 3,
    hand: 1, famous: false, tones }
  const at = (dx: number) => {
    const result = recording()
    glyphShadow(result.ctx, glyph, { ...shine, cast: { dx, length: 2, alpha: 0.5 } })
    return result
  }
  expect(at(0).form).toEqual([['fillRect', 34.8, 59.7, 10.4, 0.9]])
  for (const dx of [-0.00001, 0.00001]) {
    const drawing = at(dx)
    const gradient = drawing.light.find(([op]) => op === 'createLinearGradient')!
    expect(Math.abs(Number(gradient[3]) - Number(gradient[1]))).toBeLessThan(0.001)
    expect(drawing.channels[7]).toBeLessThan(0.001)
  }
})
it('fills all six palm fronds with even green at zero lateral light', () => {
  const { ctx, light } = recording()
  tree(ctx, { kind: 'palm', x: 40, base: 60, w: 6, h: 10, seed: 43 }, tones, shine, 0)
  expect(light.slice(2)).toEqual(Array.from({ length: 6 }, () => ['fillStyle', css(tones.green)]))
})

it('attenuates famous-icon lamps with the far-city Allard transmission without moving them', () => {
  const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind: 'highrise', seed: 43, hand: 1, tones, x: 40,
    base: 60, w: 10, h: 20, scale: 1, famous: true }
  const own = drawGlyph(recording().ctx, glyph, shine)
  const distant = drawGlyph(recording().ctx, { ...glyph, contrast: .125 }, shine)
  expect(own.length).toBeGreaterThan(0)
  expect(distant.map(l => [l.x, l.y, l.r])).toEqual(own.map(l => [l.x, l.y, l.r]))
  distant.forEach((lamp, i) => expect(lamp.fade).toBeCloseTo((own[i].fade ?? 1) * .5, 10))
})
