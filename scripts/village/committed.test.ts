import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { landCellKey } from '../../src/data/land/grid'
import { footprintSettlement } from '../../src/data/village/footprintSource'
import { readTile } from '../../src/data/village/tile'
import list from '../../src/data/village/tileList.json'
import { sizeFaults } from './gates'
import { NOTICE_FILE, noticeOf } from './notice'
import { listOf, storedTiles } from './write'

const ROOT = 'public/data/village/il'
const texts = new Map((await storedTiles(ROOT)).keys().map(key => [key, readFileSync(`${ROOT}/${key}.json`, 'utf8')]))

describe('the committed tiles', () => {
  it('are the ones the app\'s list names, byte for byte', () => expect(list).toEqual(listOf(texts, list.release)))
  it('are all read by the app, each with its licence and credit', () => {
    for (const [key, text] of texts) {
      const tile = readTile(JSON.parse(text), list.release)
      expect(tile, key).toMatchObject({ licence: 'ODbL-1.0', source: 'Overture Maps buildings' })
      expect(tile!.credits[0]).toContain('OpenStreetMap contributors, Overture Maps Foundation')
    }
  })
  it('lie beside their licence', () => expect(readFileSync(`${ROOT}/${NOTICE_FILE}`, 'utf8')).toBe(noticeOf(list.release)))
  it('are small', () => expect(sizeFaults(new Map([...texts].map(([key, text]) => [key, Buffer.byteLength(text)])))).toEqual([]))

  const housesAt = (lat: number, lon: number) => {
    const text = texts.get(landCellKey(lat, lon))
    const tile = text ? readTile(JSON.parse(text)) : null
    const found = tile && footprintSettlement(tile, { lat, lon })
    return found?.spots.length ?? 0
  }
  it.each([['karmei-tzur', 31.60922, 35.10088, 130], ['nahalal', 32.6897, 35.1953, 894]])('hold %s, about as V2b measured it', (_, lat, lon, houses) =>
    expect(Math.abs(housesAt(lat, lon) / houses - 1)).toBeLessThan(.05))
  it('leave Bardala to its cells', () => expect(housesAt(32.38621, 35.4807)).toBe(0))
})
