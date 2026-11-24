import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { VILLAGE_PLACES } from '../../test/scenePlaces'
import { ICONS } from './curated'
import type { LandmarkCell } from './israelData'
import { panoramaShortlist } from './shortlist'
import { loadLandmarkSource } from './useLandmarks'
import type { Landmark } from './types'

it('keeps named site icons in the panorama shortlist and leaves bundled minarets out', () => {
  const dir = path.resolve(__dirname, '../../../public/data/landmarks/il')
  const minarets: Landmark[] = []
  for (const file of fs.readdirSync(dir).filter(file => /^\d+_\d+\.json$/.test(file))) {
    const payload = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as LandmarkCell
    for (const [kind, lat, lon, heightM] of Array.isArray(payload) ? payload : payload.rows) {
      if (kind === 'minaret') minarets.push({ id: `il-${kind}-${lat}-${lon}`, kind, lat, lon, heightM, source: 'osm' })
    }
  }
  expect(minarets.length).toBeGreaterThan(0)
  const place = VILLAGE_PLACES.find(place => place.id === 'bardala')!
  for (const { mark } of ICONS) {
    expect(panoramaShortlist({ ...place, lat: mark.lat, lon: mark.lon }, [...minarets, mark])).toEqual([mark])
  }
  expect(panoramaShortlist({ ...place, lat: minarets[0].lat, lon: minarets[0].lon }, [minarets[0]])).toEqual([])
})

it('keeps the water tower through every drawing shortlist when minarets would fill the budget', async () => {
  const place = VILLAGE_PLACES.find(place => place.id === 'bardala')!
  const tower: Landmark = { id: 'tank', kind: 'waterTower', source: 'osm', lat: place.lat, lon: place.lon, heightM: 16 }
  const minarets: Landmark[] = Array.from({ length: 16 }, (_, i) => ({
    ...tower, id: `mosque-${i}`, kind: 'minaret', heightM: 30, lat: tower.lat + i * .0001,
  }))
  const signal = new AbortController().signal
  const load = (marks: Landmark[]) => loadLandmarkSource(place, signal, { israel: async () => marks })
  const baseline = await load([tower])
  expect(baseline.sceneMarks.map(mark => mark.id)).toContain(tower.id)
  expect(await load([...minarets, tower])).toEqual(baseline)
})
