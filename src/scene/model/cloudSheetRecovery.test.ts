import { expect, it, vi } from 'vitest'
import * as daylight from '../../domain/cloudDaylight'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import type { LayerOf } from './types'

it('raises the darkest opaque texels around the Haifa 16:30 smudge', async () => {
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
      // The reviewed patch is at scene (175, 115). Include surrounding texels because raster pixels interpolate rows.
      const opaquePatch = corrected.tone.flatMap((_, i) =>
        Math.abs(corrected.xs[i % corrected.xs.length] - 175) <= 12
        && Math.abs(corrected.ys[Math.floor(i / corrected.xs.length)] - 115) <= 12
        && corrected.alpha[i] >= 0.9 ? [i] : [])
      expect(opaquePatch.length).toBeGreaterThan(0)
      const minimum = (layer: LayerOf<'cloudSheet'>) => Math.min(...opaquePatch.map((i) => layer.tone[i]))
      // Require at least one tone code in the sheet raster fingerprint.
      expect(minimum(corrected) - minimum(raw)).toBeGreaterThanOrEqual(1 / 255)
    } finally {
      recovery.mockRestore()
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
