import { afterAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../../domain/types'
import { SCENE_PLACES } from '../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../../test/sceneWorld'
import { GLYPH_SPECS, type GlyphKind } from '../../../world/glyphSpecs'
import { makeWorldBuilder } from '../../../world/world'
import { sceneModel } from '../../model'
import { glyphHand } from '../../model/glyphHand'
import type { GlyphDesc, SceneBox, Shine } from '../../model/types'
import type { Ctx2D } from '../hand'
import { drawGlyph, glyphShadow } from '.'

const FORM = new Set(['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'beginPath', 'moveTo',
  'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'closePath', 'clip', 'fillRect', 'strokeRect'])
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
const shine: Shine = { night: 0.8, aviation: true, windows: 0.4, lean: 0, direct: 0.5,
  faces: { front: 0.2, top: 0.3, rim: 0.15, left: 0, right: 0, across: 0 }, cast: { dx: 0, alpha: 0, length: 0 } }

it('keeps all 22 glyph forms and night lamps fixed as signed light crosses the scene', () => {
  expect(KINDS).toHaveLength(22)
  for (const kind of KINDS) {
    const seed = 43
    const glyph: GlyphDesc = { kind, seed, hand: glyphHand(kind, seed), tones, x: 40, base: 60,
      w: GLYPH_SPECS[kind].w, h: 20, scale: 1.4, famous: false, ground: [0, 1, 0] }
    const at = (l: number) => record(glyph, { ...shine,
      faces: { ...shine.faces, left: Math.max(0, l * glyph.hand), right: Math.max(0, -l * glyph.hand) } })
    const sweep = Array.from({ length: 41 }, (_, i) => at((i - 20) / 20))
    const even = sweep[20]
    if (kind === 'minaret') expect(even.lamps[0][0]).toBeCloseTo(glyph.x + 3.2 * glyph.scale * glyph.hand)
    const form = JSON.stringify(even.form)
    for (const frame of sweep) {
      expect(JSON.stringify(frame.form), kind).toBe(form)
      expect(frame.lamps, kind).toEqual(even.lamps)
      expect(frame.light.length, kind).toBe(even.light.length)
    }
    expect(sweep[0].light, kind).not.toEqual(sweep[40].light)
    expect(distance(at(-0.001).channels, at(0.001).channels), kind).toBeLessThan(0.01)
    const steps = sweep.slice(1).map((frame, i) => distance(frame.channels, sweep[i].channels)).sort((a, b) => a - b)
    // CSS serializes RGB to bytes. Allow one byte of rounding on top of the relative bound.
    expect(steps.at(-1)!, kind).toBeLessThanOrEqual(3 * steps[20] + 1 / 255)
  }
})

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
      if (!glyphs || (layer.kind !== 'marks' && layer.kind !== 'outside')) continue
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
  const glyph: GlyphDesc = { kind: 'minaret', x: 40, base: 60, w: 10, h: 20, scale: 1, seed: 3,
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
