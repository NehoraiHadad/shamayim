import { afterAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../../../../domain/types'
import { recording } from '../../../../../test/glyphRecording'
import { SCENE_PLACES } from '../../../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../../../../test/sceneWorld'
import { makeWorldBuilder } from '../../../../../world/world'
import { sceneModel } from '../../../../model'
import type { GlyphDesc, SceneBox, Shine } from '../../../../model/types'
import { drawGlyph } from '.'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const place = SCENE_PLACES.find(({ id }) => id === 'shadmot-mehola')!
const loaded = () => {
  stubPublicFetch()
  return loadPlaces([place]).then((places) => places.get(place.id)!)
}
afterAll(() => vi.unstubAllGlobals())

function draw(glyph: GlyphDesc, shine: Shine) {
  const drawing = recording()
  drawGlyph(drawing.ctx, glyph, shine)
  return drawing
}

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
        const { form } = draw(glyph, layer.shine)
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
