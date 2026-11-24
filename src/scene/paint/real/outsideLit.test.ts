import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../../domain/time'
import { glyphPaintEvidence, OWN_GLYPH_EVIDENCE } from '../../../test/glyphEvidence'
import { BOX, FORM, recordOutside } from '../../../test/outsideRecording'
import { SCENE_PLACES } from '../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../../test/sceneWorld'
import { GLYPH_SPECS } from '../../../world/glyphSpecs'
import { makeWorldBuilder } from '../../../world/world'
import { outsideLayer } from '../../model/outside'
import type { GlyphDesc, Shine } from '../../model/types'
import type { Ctx2D } from '../shared/base/hand'
import { PAINT_PASS } from '../shared/base/paintPass'
import { drawGlyph } from '../shared/town/glyphs'
import { paintOutside } from './outside'

const WINDOW_GLYPHS = ['church', 'synagogue', 'homes', 'chimney', 'highrise', 'silo', 'azrieli', 'babShrine'] as const

/** Identifies each warm, opaque window fill by its path in glyph space. */
function glyphWindows(glyph: GlyphDesc, shine: Shine) {
  let emissive = false
  const lit = new Set<string>()
  let path: [string, ...number[]][] = [], fill: unknown
  const ctx = new Proxy({}, {
    get: (_, op: string | symbol) => op === PAINT_PASS ? (_: unknown, draw: () => void) => {
      emissive = true
      draw()
      emissive = false
      return true
    } : (...args: number[]) => {
      if (op === 'createLinearGradient' || op === 'createRadialGradient') return { addColorStop() {} }
      if (op === 'beginPath') path = []
      else if (op === 'fill') {
        if (typeof fill === 'string' && emissive) lit.add(`${glyph.seed}:${JSON.stringify(path)}`)
      } else if (typeof op === 'string' && FORM.has(op)) path.push([op, ...args])
    },
    set: (_, key, value) => { if (key === 'fillStyle') fill = value; return true },
  }) as Ctx2D
  drawGlyph(ctx, { ...glyph, ...glyphPaintEvidence(glyph.tones) }, shine)
  return lit
}

let jerusalem: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'jerusalem'))
  jerusalem = places.get('jerusalem')!
})
afterAll(() => vi.unstubAllGlobals())

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
    const { lit } = recordOutside(paintOutside, layer, true)
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
        const glyph: GlyphDesc = { ...OWN_GLYPH_EVIDENCE, kind, seed, hand: 1, x: 0, base: 0, w: GLYPH_SPECS[kind].w, h: 24, scale: 1, famous: false,
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
