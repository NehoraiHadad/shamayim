import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { VILLAGE_PLACES } from '../../test/scenePlaces'
import { ICONS } from './curated'
import { isDrawableMark } from './drawableMark'
import type { LandmarkCell } from './israelData'
import { loadLandmarkSource } from './useLandmarks'
import type { Landmark } from './types'

it('rejects every bundled minaret row and accepts the other marks and named site icons', () => {
  const dir = path.resolve(__dirname, '../../../public/data/landmarks/il')
  let minarets = 0
  let marks = 0
  for (const file of fs.readdirSync(dir).filter(file => /^\d+_\d+\.json$/.test(file))) {
    const payload = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as LandmarkCell
    for (const [kind, lat, lon] of Array.isArray(payload) ? payload : payload.rows) {
      if (kind === 'minaret') minarets++
      marks++
      expect(isDrawableMark({ kind }), `${kind} ${lat},${lon}`).toBe(kind !== 'minaret')
    }
  }
  for (const { mark } of ICONS) expect(isDrawableMark(mark), mark.id).toBe(true)
  expect(minarets).toBeGreaterThan(0)
  console.info(JSON.stringify({ bundledMarks: marks, minarets }))
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
