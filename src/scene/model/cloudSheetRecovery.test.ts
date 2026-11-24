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
      const all: number[][] = []
      for (let x = 45; x <= 330; x += 15) for (let y = 45; y <= 285; y += 10) {
        const b = patchContrast(raw, x, y), a = patchContrast(corrected, x, y)
        all.push([x, y, +b.tone.toFixed(4), +a.tone.toFixed(4), +b.least.toFixed(3), +b.mean.toFixed(3), +(a.tone / b.tone).toFixed(3)])
      }
      const opaque = all.filter((n) => n[5] > 0.9)
      console.info('DIAG at175', all.filter((n) => Math.abs(n[0] - 175) < 8 && Math.abs(n[1] - 115) < 8),
        'DIAG low', JSON.stringify([...opaque].sort((p, q) => p[2] - q[2]).slice(0, 14)),
        'DIAG high', JSON.stringify([...opaque].sort((p, q) => q[2] - p[2]).slice(0, 6)),
        'DIAG gain', JSON.stringify([...opaque].filter((n) => Math.abs(n[2]) > 2 / 255).sort((p, q) => p[6] - q[6]).slice(0, 10)),
        'DIAG lift', Math.max(...corrected.tone.map((t, n) => t - raw.tone[n])), 'rows', JSON.stringify(corrected.ys.map(Math.round)))
      const before = patchContrast(raw), after = patchContrast(corrected)
      expect(Math.abs(before.tone)).toBeGreaterThan(2 / 255)
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

function patchContrast({ xs, ys, tone, alpha }: LayerOf<'cloudSheet'>, cx = 175, cy = 115) {
  let least = 1
  const patch = { area: 0, tone: 0, alpha: 0 }, ring = { area: 0, tone: 0, alpha: 0 }
  for (const [row, y] of ys.entries()) {
    // Grid rows crowd near the horizon. Weight by each row's midpoint-to-midpoint height.
    const area = ((ys[row + 1] ?? y) - (ys[row - 1] ?? y)) / 2
    for (const [column, x] of xs.entries()) {
      // The stain spans about 60 px in the reference. Sample its immediate surroundings
      // out to 45 px, halfway from the quoted edge to another stain-width from centre.
      const radius = Math.hypot(x - cx, y - cy)
      if (radius >= 45) continue
      const region = radius < 30 ? patch : ring
      const index = row * xs.length + column
      region.area += area
      if (radius < 30) least = Math.min(least, alpha[index])
      region.tone += tone[index] * area
      region.alpha += alpha[index] * area
    }
  }
  expect(patch.area).toBeGreaterThan(0)
  expect(ring.area).toBeGreaterThan(0)
  return { tone: patch.tone / patch.area - ring.tone / ring.area, least, mean: patch.alpha / patch.area, alpha: patch.alpha / patch.area - ring.alpha / ring.area }
}
