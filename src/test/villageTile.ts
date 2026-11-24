import { encodeHouses, type StoredHouse } from '../data/village/houseCode'
import { ODBL, type StoredGroup, type StoredTile } from '../data/village/tile'

/** A made-up tile: a street of three houses running east, and one house 100 m north of it, at 31.60, 35.10. */
export const CORNER: [number, number] = [31.6, 35.1]
const house = (x: number, y: number, more: Partial<StoredHouse> = {}): StoredHouse =>
  ({ x, y, across: false, size: 0, outline: false, ...more })
export const STREET = [house(0, 0, { across: true, outline: true }), house(10, 0, { size: 2 }), house(20, 0, { size: 3 })]
export const ALONE = house(10, 50, { across: true, size: 1, outline: true })

export const storedGroup = (more: Partial<StoredGroup> = {}): StoredGroup =>
  ({ o: CORNER, p: [[31.6003, 35.1003]], s: .9, r: [3], h: encodeHouses([...STREET, ALONE]), ...more })

export const storedTile = (more: Partial<StoredTile> = {}): StoredTile => ({
  v: 1, licence: ODBL.id, licenceUrl: ODBL.url, credits: ['© OpenStreetMap contributors, Overture Maps Foundation'],
  source: 'Overture Maps buildings', release: '2026-11-18.0', built: '2026-11-24', groups: [storedGroup()], ...more })
