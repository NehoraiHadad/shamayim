import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { expect, it, vi } from 'vitest'
import { buildWorld } from '../../world/world'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { sceneModel } from '../model'
import type { SceneBox } from '../model/types'
import { DEFAULT_STYLE, SCENE_STYLES } from './painters'
import { STYLES } from './styles'

const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const ids = ['haifa', 'jerusalem', 'tel-aviv', 'rosh-pina', 'shadmot-mehola', 'ein-gedi', 'beit-shean', 'neve-zohar']
const times = ['06:00', '06:30', '07:00', '10:00', '12:00', '15:30', '16:00', '16:50', '21:00'] as const

// Opt in on CI and run this file in a fresh process on each revision.
it.runIf(process.env.SCENE_MODEL_COLD === '1')('reports cold model time and byte fingerprints',
  { timeout: 180_000 }, async () => {
    stubPublicFetch()
    try {
      const places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(place => ids.includes(place.id)))
      expect(places.size).toBe(ids.length)
      const fingerprints: Record<string, string> = {}
      let modelColdMs = 0
      for (const id of ids) {
        for (const time of times) {
          const world = buildWorld(worldInput(places.get(id)!, `2026-11-17T${time}`))
          for (const style of SCENE_STYLES) {
            const start = performance.now()
            const model = sceneModel(world, box, null, undefined, STYLES[style].light)
            if (id === 'haifa' && time === '06:00' && style === DEFAULT_STYLE) modelColdMs = performance.now() - start
            fingerprints[`${id}/${time}/${style}`] = createHash('sha256').update(JSON.stringify(model)).digest('hex')
          }
        }
      }
      expect(Object.keys(fingerprints)).toHaveLength(ids.length * times.length * SCENE_STYLES.length)
      console.log(JSON.stringify({ modelColdMs, fingerprints }))
    } finally {
      vi.unstubAllGlobals()
    }
  })
