import { expect, it } from 'vitest'
import type { PlaceRow } from '../../src/data/city/types'
import { applyPopulation, groupFaith, looseName, matchPlaces, plainName, readLocalities, type Locality } from './population'

const row = (lat: number, lon: number, name: string, faith: PlaceRow[3] = 0): PlaceRow => [lat, lon, 2, faith, 8, name]

it('reads names past brackets, punctuation and spelling', () => {
  expect(plainName('טמרה (יזרעאל)')).toBe(plainName('טמרה'))
  expect(plainName('תלמי ביל״ו')).toBe(plainName('תלמי ביל"ו'))
  expect(looseName('דלית אל-כרמל')).toBe(looseName('דאלית אל-כרמל'))
  expect(looseName('סכנין')).toBe(looseName("סח'נין"))
})

it('maps the CBS group over the worship faith', () => {
  expect(groupFaith(1, 2)).toBe(1)
  expect(groupFaith(4, 1)).toBe(5)
  expect(groupFaith(2, 0)).toBe(2)
  expect(groupFaith(2, 1)).toBe(2)
  expect(groupFaith(2, 4)).toBe(4)
  expect(groupFaith(3, 3)).toBe(3)
})

it('matches by name near the point, and loosely only where no exact match claimed the locality', () => {
  const localities: Locality[] = [
    [831, 30.9877, 34.9311, 1, 'ירוחם', 'Yeroham'],
    [8900, 32.8535, 35.1979, 2, 'טמרה', 'Tamra'],
    [977, 32.6346, 35.4033, 2, 'טמרה (יזרעאל)', 'Tamra (Yizreel)'],
  ]
  const yeruham = row(30.988, 34.93, 'ירוחם'), rakhma = row(30.99, 34.94, "רח'מה")
  const town = row(32.85349, 35.19787, 'טמרה'), valley = row(32.63435, 35.40425, 'טמרה')
  const far = row(31.5, 34.9, 'טמרה'), other = row(32.86, 35.2, 'כאבול')
  const matches = matchPlaces([yeruham, rakhma, town, valley, far, other], localities)
  expect(matches.get(yeruham)?.[0]).toBe(831)
  expect(matches.has(rakhma)).toBe(false)
  expect(matches.get(town)?.[0]).toBe(8900)
  expect(matches.get(valley)?.[0]).toBe(977)
  expect(matches.has(far) || matches.has(other)).toBe(false)
  const rows = [yeruham, town]
  expect(applyPopulation(rows, localities)).toBe(2)
  expect(rows.map(r => r[3])).toEqual([1, 2])
})

it('ships a CBS list of every locality group', async () => {
  const localities = await readLocalities()
  expect(localities.length).toBeGreaterThan(1200)
  expect(new Set(localities.map(l => l[3]))).toEqual(new Set([1, 2, 3, 4]))
  expect(localities.find(l => l[0] === 494)).toEqual([494, 32.6933, 35.0506, 2, 'דאלית אל-כרמל', 'Daliyat Al-Karmel'])
})
