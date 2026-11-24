import { expect, it } from 'vitest'
import { smoothstep } from '../../../../../domain/smoothstep'
import { glyphPaintEvidence, OWN_GLYPH_EVIDENCE } from '../../../../../test/glyphEvidence'
import { distance, recording } from '../../../../../test/glyphRecording'
import { shine, tones } from '../../../../../test/glyphTones'
import { GLYPH_SPECS, type GlyphKind } from '../../../../../world/glyphSpecs'
import type { GlyphDesc, Shine } from '../../../../model/types'
import { drawGlyph, drawLamps, glyphShadow } from '.'

function record(glyph: GlyphDesc, shine: Shine) {
  const drawing = recording()
  const lamps = drawGlyph(drawing.ctx, glyph, shine)
  return { ...drawing, lamps: lamps.map(({ x, y }) => [x, y]) }
}
const KINDS = Object.keys(GLYPH_SPECS) as GlyphKind[]

it.each([1, -1] as const)('keeps all 21 glyph forms and night lamps fixed with hand %i', (hand) => {
  expect(KINDS).toHaveLength(21)
  for (const kind of KINDS) {
    const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind, seed: 43, hand, tones, x: 40, base: 60,
      w: GLYPH_SPECS[kind].w, h: 20, scale: 1.4, famous: false, ground: [0, 1, 0] }
    const at = (l: number) => record({ ...glyph, ...glyphPaintEvidence(tones, l) }, { ...shine,
      faces: { ...shine.faces, left: Math.max(0, l * glyph.hand), right: Math.max(0, -l * glyph.hand) } })
    const sweep = Array.from({ length: 41 }, (_, i) => at((i - 20) / 20))
    const even = sweep[20]
    const form = JSON.stringify(even.form)
    for (const frame of sweep) {
      expect(JSON.stringify(frame.form), kind).toBe(form)
      expect(frame.lamps, kind).toEqual(even.lamps)
      expect(frame.light.length, kind).toBe(even.light.length)
    }
    if (kind !== 'solar') expect(JSON.stringify(sweep[0].light), kind).not.toBe(JSON.stringify(sweep[40].light))
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
  const withLamps: GlyphKind[] = ['waterTower', 'chimney', 'highrise', 'silo', 'mast', 'lighthouse',
    'turbine', 'azrieli', 'babShrine', 'chordsBridge']
  for (const kind of KINDS) {
    const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind, seed: 43, hand: 1, tones, x: 40, base: 60,
      w: GLYPH_SPECS[kind].w, h: 20, scale: 1, famous: false, ground: [0, 1, 0] }
    const at = (night: number) => {
      const drawing = recording()
      const lamps = drawGlyph(drawing.ctx, { ...glyph, ...glyphPaintEvidence(tones) }, { ...shine, night, windows: 0, aviationStrength: smoothstep(.2, .4, night) })
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

it('reduces the glyph shadow to its contact shade at zero lateral reach', () => {
  const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind: 'church', x: 40, base: 60, w: 10, h: 20, scale: 1, seed: 3,
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

it('attenuates famous-icon lamps with the far-city Allard transmission without moving them', () => {
  const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind: 'highrise', seed: 43, hand: 1, tones, x: 40,
    base: 60, w: 10, h: 20, scale: 1, famous: true, ...glyphPaintEvidence(tones) }
  const own = drawGlyph(recording().ctx, glyph, shine)
  const distant = drawGlyph(recording().ctx, { ...glyph, contrast: .125 }, shine)
  expect(own.length).toBeGreaterThan(0)
  expect(distant.map(l => [l.x, l.y, l.r])).toEqual(own.map(l => [l.x, l.y, l.r]))
  distant.forEach((lamp, i) => expect(lamp.fade).toBeCloseTo((own[i].fade ?? 1) * .5, 10))
})
