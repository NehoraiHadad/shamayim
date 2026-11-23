import { expect } from 'vitest'
import type { WorldState } from '../world/types'
import { LANDMARK_MAX_PX } from '../world/neighbourSize'
import { glyphSurfaces } from '../scene/model/glyphSurfaces'
import { tonesAt } from '../scene/model/marks'
import { toneAt } from '../scene/model/landVeil'
import { PLAIN_LIGHT } from '../scene/model/styleLight'
import { mixRgb } from '../scene/model/tone'
import type { GlyphDesc } from '../scene/model/types'

/** Independent oracle: keep the visibility equation here, without calling the production atmosphere helper. */
export function assertLandmarkTones(world: WorldState, glyph: GlyphDesc, km: number, hint: string) {
  const tier = Math.max(0, Math.min(18, Math.floor(Math.log(km / 2) / Math.log(1.22))))
  expect(glyph.hazeKm, hint).toBeCloseTo(glyph.famous ? km : 2 * 1.22 ** tier * 1.1, 8)
  // The building's lit faces at its true haze distance, before any far-city contrast.
  const material = glyphSurfaces(world, glyph, glyph.hazeKm!, tonesAt(world, glyph.hazeKm!), (c) => c, PLAIN_LIGHT).tones
  if (!glyph.famous) { expect(glyph.tones, hint).toEqual(material); return }
  const visibility = world.air.visibilityKm > 0 ? world.air.visibilityKm : 25
  const contrast = Math.exp(-3.912 * km / visibility), land = toneAt(world, km)
  expect(glyph.contrast, hint).toBeCloseTo(contrast, 10)
  for (const key of Object.keys(material) as (keyof typeof material)[]) {
    const color = key === 'mist' ? material[key]
      : mixRgb(land, material[key], key === 'win' ? Math.cbrt(contrast) : contrast)
    expect(glyph.tones[key], hint).toEqual(color)
  }
  expect(glyph.h * glyph.scale, hint).toBeLessThanOrEqual(LANDMARK_MAX_PX + 1e-9)
}
