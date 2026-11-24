import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { vi } from 'vitest'
import { metalSkyLobe } from './landSkyIrradiance'
import { paintedSkySampler } from './reflectedSkyLobe'

let loaded: Awaited<ReturnType<typeof loadPlaces>> | undefined

export async function worldAtHaifaTwilight(time: '16:27' | '16:30' | '17:00') {
  if (!loaded) {
    stubPublicFetch()
    try {
      loaded = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))
    } finally {
      vi.unstubAllGlobals()
    }
  }
  const at = `2026-11-17T${time}` as const
  return buildWorld(worldInput(loaded.get('haifa')!, at))
}

/** Reference on a 48 × 32 equal-solid-angle midpoint grid. Smaller grids are trial rules. */
export function referenceSkyLobe(world: WorldState, elevations = 48, bearings = 32): RGB {
  const paintAt = paintedSkySampler(world)
  const sum: [number, number, number] = [0, 0, 0]
  let total = 0
  for (let i = 0; i < elevations; i++) {
    const up = (i + .5) / elevations
    const row = paintAt(Math.asin(up) * 180 / Math.PI)
    for (let j = 0; j < bearings; j++) {
      const bearing = (j + .5) * 2 * Math.PI / bearings - Math.PI
      const weight = metalSkyLobe(up, Math.sqrt(1 - up * up) * Math.cos(bearing))
      row(bearing * 180 / Math.PI).forEach((channel, k) => { sum[k] += weight * channel })
      total += weight
    }
  }
  return [sum[0] / total, sum[1] / total, sum[2] / total]
}
