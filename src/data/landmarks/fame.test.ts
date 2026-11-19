import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import { patchCell } from '../../../scripts/landmarks/fame'
import { ICONS, withIcons } from './curated'
import { fameOf, isLandmark, outranks } from './fame'
import type { Row } from './israelData'
import { parseOverpass } from './overpass'
import { score } from './rank'
import { panoramaShortlist } from './shortlist'
import type { Landmark } from './types'

const place: Place = { id: 'x', nameHe: 'מקום', regionHe: '', lat: 32.5, lon: 35.2, timezone: 'Asia/Jerusalem' }
const at = (id: string, values: Partial<Landmark> = {}): Landmark => ({ id, kind: 'waterTower', lat: place.lat - .01,
  lon: place.lon, heightM: 25, source: 'osm', ...values })
const element = (id: number, tags: Record<string, string>, lat = 32.49, lon = 35.2) => ({ id, lat, lon, tags })

describe('fame from OpenStreetMap links', () => {
  it('is 2 for a Wikipedia article, 1 for a Wikidata item alone, nothing for neither', () => {
    expect(fameOf({ wikipedia: 'he:מגדל שלום מאיר' })).toBe(2)
    expect(fameOf({ 'wikipedia:en': 'Western Wall', wikidata: 'Q134821' })).toBe(2)
    expect(fameOf({ wikidata: 'Q9163243' })).toBe(1)
    expect(fameOf({ name: 'מגדל מים' })).toBeUndefined()
  })

  it('ranks a famous mark above an anonymous one of the same kind, and above a taller one', () => {
    const anonymous = at('a')
    expect(score(at('f', { fame: 1 }), 0, 0, 1)).toBeGreaterThan(score(anonymous, 0, 0, 1))
    expect(score(at('f', { fame: 2 }), 0, 0, 1)).toBeGreaterThan(score(at('f', { fame: 1 }), 0, 0, 1))
    // A famous 25 m water tower over an anonymous one of 45 m (one point per 20 m).
    expect(score(at('f', { fame: 1 }), 0, 0, 1)).toBeGreaterThan(score(at('t', { heightM: 45 }), 0, 0, 1))
  })

  it('keeps the famous one of two duplicates side by side, then the taller', () => {
    expect(outranks({ fame: 1, heightM: 20 }, { heightM: 60 })).toBe(true)
    expect(outranks({ heightM: 60 }, { fame: 1, heightM: 20 })).toBe(false)
    expect(outranks({ heightM: 60 }, { heightM: 20 })).toBe(true)
    const [mark] = parseOverpass({ elements: [
      element(1, { man_made: 'tower', 'tower:type': 'minaret', height: '35' }),
      element(2, { building: 'mosque', height: '17', wikipedia: 'he:כיפת הסלע', 'name:he': 'כיפת הסלע' }, 32.4905),
    ] })
    expect(mark).toMatchObject({ kind: 'minaret', nameHe: 'כיפת הסלע', heightM: 17, fame: 2 })
  })

  it('is a landmark of its place only for buildings and structures, famous or hand-drawn', () => {
    expect(isLandmark(at('f', { fame: 1 }))).toBe(true)
    expect(isLandmark(at('a'))).toBe(false)
    expect(isLandmark(at('g', { kind: 'orchard', fame: 2 }))).toBe(false)
    expect(isLandmark(at('m', { kind: 'mast', fame: 2 }))).toBe(false)
    expect(isLandmark(ICONS[0].mark)).toBe(true)
  })
})

describe('famous marks drawn with the generic glyph of their kind', () => {
  it.each([
    [{ amenity: 'place_of_worship', religion: 'christian', building: 'cathedral', wikipedia: 'en:Church of the Holy Sepulchre' }, 'church'],
    [{ amenity: 'place_of_worship', religion: 'muslim', building: 'mosque', wikidata: 'Q1' }, 'minaret'],
    [{ amenity: 'place_of_worship', religion: 'jewish', building: 'yes', wikidata: 'Q2' }, 'synagogue'],
    [{ historic: 'castle', building: 'yes', wikidata: 'Q1177765' }, 'castle'],
    [{ man_made: 'tower', 'tower:type': 'cooling', height: '75', wikipedia: 'he:הלבניות' }, 'cooling'],
    [{ man_made: 'lighthouse', wikipedia: 'he:מגדלור יפו' }, 'lighthouse'],
    [{ man_made: 'water_tower', wikidata: 'Q3' }, 'waterTower'],
    [{ building: 'office', height: '130', wikipedia: 'he:מגדל שלום מאיר' }, 'highrise'],
    [{ man_made: 'chimney', height: '150', wikidata: 'Q4' }, 'chimney'],
  ])('%o is a famous %s', (tags, kind) => {
    const [mark] = parseOverpass({ elements: [element(1, tags as Record<string, string>)] })
    expect(mark).toMatchObject({ kind, source: 'osm' })
    expect(mark.fame).toBe(fameOf(tags as Record<string, string>))
    expect(mark.glyph).toBeUndefined()
  })

  it('leaves out a famous object no generic kind draws (a Bahá\'í shrine, a monument)', () => {
    expect(parseOverpass({ elements: [element(1, { amenity: 'place_of_worship', religion: 'bahai', building: 'shrine',
      wikipedia: 'he:מקדש הבאב' }), element(2, { historic: 'memorial', wikipedia: 'he:קבר הרצל' })] })).toEqual([])
  })
})

describe('the place\'s shortlist', () => {
  it('offers the famous one of a kind in the portrait, not the taller anonymous one, and few marks', () => {
    const anonymous = Array.from({ length: 12 }, (_, i) => at(`a${i}`, { heightM: 40, lon: place.lon + i * .004 }))
    const famous = at('famous', { lat: place.lat + .005, fame: 2 })
    const listed = panoramaShortlist(place, [...anonymous, famous]).map(mark => mark.id)
    expect(listed).toContain('famous')
    expect(listed.length).toBeLessThanOrEqual(8 + 6)
  })

  it('always offers a hand-drawn icon within the portrait\'s reach', () => {
    const wall = ICONS.find(({ mark }) => mark.id === 'jerusalem-wall')!.mark
    const jerusalem = { ...place, lat: 31.769, lon: 35.2163 }
    const crowd = Array.from({ length: 20 }, (_, i) => at(`h${i}`, { kind: 'highrise', heightM: 150, lat: 31.77,
      lon: 35.2 + i * .004, fame: 2 }))
    expect(panoramaShortlist(jerusalem, withIcons(jerusalem, crowd)).map(mark => mark.id)).toContain('jerusalem-wall')
    expect(panoramaShortlist(place, withIcons(place, [wall])).map(mark => mark.id)).not.toContain('jerusalem-wall')
  })
})

describe('icons', () => {
  const jerusalem = { lat: 31.769, lon: 35.2163 }
  it('stand in for the mapped objects at their spot, and only there', () => {
    const wallAsSynagogue = at('wall-osm', { kind: 'synagogue', lat: 31.77683, lon: 35.23443, fame: 2 })
    const domeOfTheRock = at('dome', { kind: 'minaret', lat: 31.7780, lon: 35.2354, fame: 2 })
    const sepulchre = at('sepulchre', { kind: 'church', lat: 31.7785, lon: 35.2296, fame: 2 })
    const hurva = at('hurva', { kind: 'synagogue', lat: 31.7751, lon: 35.2313, fame: 2 })
    const ids = withIcons(jerusalem, [wallAsSynagogue, domeOfTheRock, sepulchre, hurva]).map(mark => mark.id)
    expect(ids).toEqual(expect.arrayContaining(['sepulchre', 'hurva', 'jerusalem-wall', 'jerusalem-bridge']))
    expect(ids).not.toContain('wall-osm')
    expect(ids).not.toContain('dome')
    // Tel Aviv's and Haifa's icons are out of Jerusalem's reach.
    expect(ids).not.toContain('tel-aviv-azrieli')
    expect(ids).not.toContain('haifa-bab')
  })

  it('are few: special art only where no generic glyph says what it is', () => {
    expect(ICONS.map(({ mark }) => mark.id).sort()).toEqual(['haifa-bab', 'jerusalem-bridge', 'jerusalem-wall', 'tel-aviv-azrieli'])
    for (const { mark } of ICONS) expect(mark).toMatchObject({ kind: 'custom', source: 'curated', fame: 2 })
  })
})

describe('patching fame into shipped cells', () => {
  it('replaces the row a famous mark was merged with, and leaves out one with no row', () => {
    const rows: Row[] = [['minaret', 31.77664, 35.23639, 30, 'הכניסה המערבית'], ['church', 31.776, 35.2307, 25]]
    const dome = at('dome', { kind: 'minaret', lat: 31.778, lon: 35.2354, heightM: 17, nameHe: 'כיפת הסלע', fame: 2 })
    const lone = at('lone', { kind: 'castle', lat: 31.7, lon: 35.2, fame: 1 })
    const result = patchCell(rows, [dome, lone])
    expect(result.rows).toEqual([['minaret', 31.778, 35.2354, 17, 'כיפת הסלע', 2], ['church', 31.776, 35.2307, 25]])
    expect(result).toMatchObject({ patched: 1, missed: 1 })
  })
})
