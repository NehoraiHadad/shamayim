import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { CityCell, PlaceRow } from '../../src/data/city/types'
import { offsetKm, type Coordinate } from '../../src/data/landmarks/project'

/**
 * The CBS localities list (הלמ"ס, "קובץ יישובים" 2022, bycode2022.xlsx from cbs.gov.il), cut to what the build needs:
 * the CBS code, the point (ITM converted to WGS84, 4 places), its population group (CBS "דת יישוב": 1 Jewish, 2 non-Jewish
 * (Arab, Druze, Circassian), 3 Bedouin tribe, 4 mixed) and the Hebrew and English names.
 */
export type Locality = [code: number, lat: number, lon: number, group: 1 | 2 | 3 | 4, he: string, en: string]
export const LOCALITIES = resolve(import.meta.dirname, 'cbs-localities.json')

export async function readLocalities(path = LOCALITIES): Promise<Locality[]> {
  return JSON.parse(await readFile(path, 'utf8'))
}

const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
/** A name without its bracketed note, punctuation, spaces and final letters: "טמרה (יזרעאל)" and "טמרה" agree. */
export function plainName(name: string) {
  return name.replace(/\([^)]*\)/g, '').replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
/** Spelling aside: Hebrew transcriptions of Arabic names differ in vowel letters and in ח'/כ (דאלית / דלית, סח'נין / סכנין). */
export const looseName = (name: string) => plainName(name.replace(/ח['׳]/g, 'כ')).replace(/[אויה]/g, '')
const contains = (a: string, b: string) => a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))

const distance = (a: Coordinate, b: Coordinate) => Math.hypot(offsetKm(a, b).dx, offsetKm(a, b).dy)

/**
 * The CBS locality each OSM place node stands for. First the same name within 5 km; then, for the rest and only among
 * localities no node has claimed, a looser spelling or one name inside the other ("קבוצת כנרת", "כנרת (קבוצה)") within
 * 2 km, so Rakhma near Yeruham does not take Yeruham's group. The nearest wins.
 */
export function matchPlaces(rows: PlaceRow[], localities: Locality[]) {
  const matches = new Map<PlaceRow, Locality>()
  const nearby = (row: PlaceRow, km: number) => localities
    .map((locality) => ({ locality, km: distance({ lat: row[0], lon: row[1] }, { lat: locality[1], lon: locality[2] }) }))
    .filter((near) => near.km <= km).sort((a, b) => a.km - b.km).map(({ locality }) => locality)
  for (const row of rows) {
    const name = plainName(row[5])
    const found = name && nearby(row, 5).find(([, , , , he, en]) => plainName(he) === name || (en && plainName(en) === name))
    if (found) matches.set(row, found)
  }
  const claimed = new Set(matches.values())
  for (const row of rows) {
    if (matches.has(row)) continue
    const plain = plainName(row[5]), loose = looseName(row[5])
    const found = nearby(row, 2).find((locality) => !claimed.has(locality) && (looseName(locality[4]) === loose ||
      contains(plainName(locality[4]), plain) || contains(looseName(locality[4]), loose)))
    if (found) matches.set(row, found)
  }
  return matches
}

/**
 * The place's faith from its CBS group, which beats the worship counted round it: Jewish 1, mixed 5; an Arab or Bedouin
 * place keeps a Muslim, Christian or Druze answer from its worship and is Muslim (2) otherwise.
 */
export function groupFaith(group: Locality[3], worship: PlaceRow[3]): PlaceRow[3] {
  if (group === 1) return 1
  if (group === 4) return 5
  return worship >= 2 && worship <= 4 ? worship : 2
}

/** Sets each matched row's faith from the CBS list; returns how many rows matched. */
export function applyPopulation(rows: PlaceRow[], localities: Locality[]) {
  const matches = matchPlaces(rows, localities)
  for (const [row, locality] of matches) row[3] = groupFaith(locality[3], row[3])
  return matches.size
}

/** Applies the CBS list to the place rows of built cells in place (the shipped data, without rebuilding from OSM). */
export async function patchCells(dir: string, localities: Locality[]) {
  const cells = new Map<string, { cell: CityCell & { v: 2 }; before: string }>()
  for (const name of (await readdir(dir)).filter((file) => /^-?\d+_-?\d+\.json$/.test(file)).sort()) {
    const text = await readFile(join(dir, name), 'utf8')
    const cell = JSON.parse(text) as CityCell
    if (cell.v === 2) cells.set(name, { cell, before: JSON.stringify(cell) })
  }
  const rows = [...cells.values()].flatMap(({ cell }) => cell.p)
  const matched = applyPopulation(rows, localities)
  let changed = 0
  for (const [name, { cell, before }] of cells) {
    const after = JSON.stringify(cell)
    if (after === before) continue
    changed++
    await writeFile(join(dir, name), after)
  }
  return { rows: rows.length, matched, changed }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? 'public/data/city/il'
  console.log(await patchCells(dir, await readLocalities()))
}
