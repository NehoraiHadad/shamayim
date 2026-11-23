import { hashId } from '../../data/landmarks/hash'
import { genusOf } from '../../world/field/genus'
import type { FieldCell, FieldLayer } from '../../world/field/types'
import { sheetTexture } from './cloudSheetTexture'
import { cloudBodyPuffs } from './cloudBodyPuffs'

const SECTORS = 12
const RIM = Array.from({ length: SECTORS }, (_, i) => {
  const angle = 2 * Math.PI * i / SECTORS
  return [Math.cos(angle), Math.sin(angle)] as const
})
export const SOLAR_DIAMETER_RAD = 0.53 * Math.PI / 180

/** The same advected clumps the sky sheet uses for its local thickness.
 * Read them around the cell's rim, then interpolate the outline between them. */
export function shadowLobes(cell: FieldCell, layer: FieldLayer, placeId: string, heading: number, handed: number, sunOffset: number, cot: number) {
  if (layer.lattice === 'tower') return towerLobes(cell, sunOffset, handed, cot)
  const genus = genusOf(layer.lattice, layer.form, .5)
  const seed = hashId(`${placeId}:sheet:${layer.lattice}`)
  const sample = sheetTexture(genus, layer, seed)(2 * Math.PI * cell.r / SECTORS)
  const sin = Math.sin(heading), cos = Math.cos(heading)
  return RIM.map(([x, y]) => {
    const across = handed * x * cell.r, away = -y * cell.r
    const thickness = sample(cell.x + across * cos + away * sin, cell.y - across * sin + away * cos)
    return .25 * (thickness - 1) / (thickness + 1)
  })
}

function towerLobes(cell: FieldCell, sunOffset: number, handed: number, cot: number) {
  const lobes = new Array<number>(SECTORS).fill(-.20)
  const span = cell.r + cell.vKm * cot / 2
  const sin = Math.sin(sunOffset), cos = Math.cos(sunOffset)
  cloudBodyPuffs(cell.seed, 2 * cell.r, cell.vKm, 0, (x, y, rx) => {
    const along = (-y - cell.vKm / 2) * cot
    const u = (x - sin * along) * handed / span
    const v = cos * along / span
    const puff = rx / span
    const chordBase = puff * puff - u * u - v * v
    for (let i = 0; i < SECTORS; i++) {
      const dot = RIM[i][0] * u + RIM[i][1] * v
      const chord = chordBase + dot * dot
      if (chord > 0) lobes[i] = Math.max(lobes[i], Math.min(.20, dot + Math.sqrt(chord) - .75))
    }
  })
  return lobes
}

/** 10–90% width as a fraction of a circular solar disc's diameter. */
export const DISC_EDGE_10_90 = .68
export const shadowEdgeWidth = (radius: number, penumbra: number) => Math.hypot(.4 * radius, penumbra)

/** Effective depth after spatially averaging the transmission through the
 * cloud edge. Blurring depth before exponentiating would bring back the rim. */
export function shadowCoverage(distance: number, radius: number, penumbra: number) {
  // The mixing shell widens with the footprint. The solar disc imposes a
  // lower bound even on a smooth, sharply bounded cloud.
  const width = shadowEdgeWidth(radius, penumbra)
  const t = 2 * (radius - distance) / width
  if (t <= -1) return 0
  if (t >= 1) return 1
  return .5 + (Math.asin(t) + t * Math.sqrt(1 - t * t)) / Math.PI
}
