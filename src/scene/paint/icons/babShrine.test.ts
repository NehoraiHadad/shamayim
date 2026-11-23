import { expect, it } from 'vitest'
import { glyphPaintEvidence, OWN_GLYPH_EVIDENCE } from '../../../test/glyphEvidence'
import { recording } from '../../../test/glyphRecording'
import { GLYPH_SPECS } from '../../../world/glyphSpecs'
import type { GlyphDesc, Shine } from '../../model/types'
import { drawGlyph } from '../glyphs'
import type { Ctx2D } from '../hand'

const gold = [0.6, 0.5, 0.2] as const, stone = [0.5, 0.5, 0.5] as const, dark = [0.2, 0.2, 0.2] as const
const tones = { wall: stone, lit: stone, shade: dark, deep: dark, rim: stone, roof: stone, roofLit: stone, stone,
  stoneLit: stone, glass: stone, glassLit: stone, soot: dark, green: stone, greenLit: stone, panel: dark, gold, win: gold, mist: stone }
const shine: Shine = { night: 0.5, aviationStrength: 0, windows: 0, lean: 0, direct: 0,
  faces: { front: 0, top: 0, rim: 0, left: 0, right: 0, across: 0 }, cast: { dx: 0, alpha: 0, length: 0 } }

/** The canvas opacity at every fill that follows the dome's quadratic outline. */
function domeFillAlphas(strength: number) {
  const { ctx } = recording()
  const stack: number[] = [], alphas: { dome: boolean; alpha: number }[] = []
  let alpha = 1, dome = false
  const traced = new Proxy(ctx, {
    get(target, key: string) {
      if (key === 'globalAlpha') return alpha
      const draw = Reflect.get(target, key) as ((...args: unknown[]) => unknown) | undefined
      return (...args: unknown[]) => {
        if (key === 'save') stack.push(alpha)
        if (key === 'restore') alpha = stack.pop() ?? 1
        if (key === 'beginPath') dome = false
        if (key === 'quadraticCurveTo') dome = true
        if (key === 'fill') alphas.push({ dome, alpha })
        return draw?.(...args)
      }
    },
    set(target, key: string, value: unknown) {
      if (key === 'globalAlpha') alpha = value as number
      return Reflect.set(target, key, value)
    },
  }) as Ctx2D
  const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind: 'babShrine', seed: 43, hand: 1, tones, x: 40, base: 60,
    w: GLYPH_SPECS.babShrine.w, h: 20, scale: 1, famous: false, ground: [0, 1, 0], ...glyphPaintEvidence(tones),
    floodlitDome: { strength, tones: { gold, rim: stone, shade: dark, refl: stone } } }
  drawGlyph(traced, glyph, shine)
  return alphas
}

it.each([0.1, 0.5, 0.9, 1])('keeps the shrine dome opaque through the twilight fade (strength %f)', strength => {
  const alphas = domeFillAlphas(strength)
  expect(alphas.filter(({ dome }) => dome).map(({ alpha }) => alpha)).toEqual([1])
  expect(alphas.at(-1)!.alpha).toBeCloseTo(strength === 1 ? 1 : 1 - strength)
})
