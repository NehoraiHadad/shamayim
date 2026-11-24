import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { projectCell } from '../../world/field/project'
import { buildWorld } from '../../world/world'
import { sheetThrough } from './cloudDust'
import { cloudLayersOf } from './cloudLayers'

it('attenuates tower shares with the same below-base transmission as sheet rows', async () => {
  stubPublicFetch()
  try {
    const jerusalem = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'jerusalem'))).get('jerusalem')!
    const input = worldInput(jerusalem, '2026-11-17T11:30')
    const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
    function frame(dust: number) {
      const world = buildWorld({ ...input, forcedLayers: { low: 0.5, mid: 0.2, high: 0.2 },
        forced: { precipitation: 6, weatherCode: 95, cloudCover: 70, windSpeed: 25, windDirection: 250, humidity: 90,
          pm10: dust, dust, visibilityKm: 3 } })
      const towers = cloudLayersOf(world, box).find((layer) => layer.kind === 'cloudCells')!
      return { world, towers }
    }
    const clean = frame(0)
    const { world, towers } = frame(400)
    const cells = world.cloudField!.snapshot.find(({ layer }) => layer?.lattice === 'tower')!.cells
    const cleanShares = new Map(clean.towers.cells.map(({ sprite }) => [sprite.seed, sprite.share]))
    let checked = 0
    for (const { sprite } of towers.cells) {
      const share = cleanShares.get(sprite.seed)
      if (!share) continue
      const cell = cells.find(({ seed }) => seed === sprite.seed)!
      const through = sheetThrough(world.air, cell.baseKm, [projectCell(cell).aSide], world.bodies.sun.altitude)?.[0] ?? 1
      if (through === 1) continue
      // Sheet rows store transmission to the nearest hundredth.
      expect(Math.abs(sprite.share / share - through)).toBeLessThanOrEqual(0.005 + Number.EPSILON)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
