import { afterEach, expect, it, vi } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { buildWorld } from '../../world/world'
import { SCENE_W } from '../../world/sceneBox'
import { neighbourhood } from './outsideNeighbourhood'
import { outsideShape } from './outsideShape'
import type { SceneBox } from './types'

const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }

afterEach(() => vi.unstubAllGlobals())

it('matches an all-pairs neighbourhood sum in several outside places', { timeout: 60_000 }, async () => {
  stubPublicFetch()
  const ids = ['haifa', 'jerusalem', 'tel-aviv']
  const places = await loadPlaces(SCENE_PLACES.filter(place => ids.includes(place.id)))
  for (const id of ids) {
    const world = buildWorld(worldInput(places.get(id)!, '2026-11-17T06:00'))
    const { items } = outsideShape(world, box, [])
    const blocks = items.filter(item => item.kind === 'box').filter(item => !item.beyond).map(item => ({ ...item }))
    expect(blocks.length).toBeGreaterThan(1)
    const original = blocks.slice()
    const sx = box.width / SCENE_W
    neighbourhood(blocks, sx)
    expect(blocks.every((block, i) => block === original[i])).toBe(true)
    const sorted = blocks.slice().sort((a, b) => a.x - b.x)
    const radius = 8 * sx, inverseRadius = 1 / radius
    for (const block of sorted) {
      let sum = 0
      for (const other of sorted) {
        if (other === block) continue
        const gap = Math.abs(other.x - block.x)
        if (gap >= radius) continue
        const dx = gap * inverseRadius, dy = (other.foot - block.foot) * .2
        const weight = 1 - dx * dx - dy * dy
        if (weight > 0) sum += weight * weight * Math.min(1, (other.foot - other.top) / 3)
      }
      expect(block.neighbours).toBe(1 - Math.exp(-sum / 2.6))
    }
  }
})
