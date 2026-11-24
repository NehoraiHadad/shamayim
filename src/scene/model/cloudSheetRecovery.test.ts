import { expect, it, vi } from 'vitest'
import * as daylight from '../../domain/cloudDaylight'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import type { LayerOf } from './types'

it('reduces the local tone contrast of the Haifa 16:30 smudge', async () => {
  stubPublicFetch()
  try {
    const haifa = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))).get('haifa')!
    const world = buildWorld(worldInput(haifa, '2026-11-17T16:30'))
    const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
    const sheet = (state: typeof world) => cloudLayersOf(state, box).find((l): l is LayerOf<'cloudSheet'> =>
      l.kind === 'cloudSheet' && l.lattice === 'low')!
    const corrected = sheet(world)
    const recovery = vi.spyOn(daylight, 'sheetRecoveryShare').mockReturnValue(0)
    try {
      const raw = sheet({ ...world })
      expect(corrected.genus).toBe('sc')
      expect(raw.alpha).toEqual(corrected.alpha)
      const before = patchContrast(raw), after = patchContrast(corrected)
      // Tone 0 is the lit side: the red stain lies below its surroundings.
      expect(before.tone).toBeLessThan(-2 / 255)
      // Require a tenth of the local tone contrast to disappear.
      expect(Math.abs(after.tone)).toBeLessThan(0.9 * Math.abs(before.tone))
      expect(after.alpha).toBe(before.alpha)
    } finally {
      recovery.mockRestore()
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)

function patchContrast({ xs, ys, tone, alpha }: LayerOf<'cloudSheet'>) {
  const patch = { area: 0, tone: 0, alpha: 0 }, ring = { area: 0, tone: 0, alpha: 0 }
  for (const [row, y] of ys.entries()) {
    // Grid rows crowd near the horizon. Weight by each row's midpoint-to-midpoint height.
    const area = ((ys[row + 1] ?? y) - (ys[row - 1] ?? y)) / 2
    for (const [column, x] of xs.entries()) {
      // The stain spans about 60 px in the reference. Sample its immediate surroundings
      // out to 45 px, halfway from the quoted edge to another stain-width from centre.
      const radius = Math.hypot(x - 195, y - 135)
      if (radius >= 45) continue
      const region = radius < 30 ? patch : ring
      const index = row * xs.length + column
      region.area += area
      region.tone += tone[index] * area
      region.alpha += alpha[index] * area
    }
  }
  expect(patch.area).toBeGreaterThan(0)
  expect(ring.area).toBeGreaterThan(0)
  return { tone: patch.tone / patch.area - ring.tone / ring.area, alpha: patch.alpha / patch.area - ring.alpha / ring.area }
}
