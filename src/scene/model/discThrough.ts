import { rayThrough } from '../../world/field/transmit'
import type { WorldState } from '../../world/types'
import { sheetAlphaAt } from './cloudSheetGrid'
import { CORE_LEAK } from './cloudSprite'
import type { SkyGeom } from './sky'
import type { LayerDesc } from './types'

/** A disc's own contrast under a cloud of that slant transmission: the painted cloud lets the leak through at least, so
 *  under a thicker one the two together let through what the cloud truly does (half a code value of 255 at a depth of 6.2). */
export const shownThrough = (transmission: number) => Math.min(1, transmission / CORE_LEAK)

/** What the clouds let through of a disc as it is drawn (far larger than its half degree), from its middle and its limb:
 *  the sheets as they are drawn over it, the towers along the rays of where it is drawn. */
export function throughDisc({ cloudField }: WorldState, geom: SkyGeom, clouds: readonly LayerDesc[], x: number, y: number, r: number): number {
  // A part below the horizon is the land's: a pixel over it instead.
  const at = (dx: number, dy: number) => ({ x: x + dx, y: Math.min(geom.horizon - 1, y + dy) })
  const face = [at(0, 0), at(-r, 0), at(r, 0), at(0, -r), at(0, r)]
  const sheets = clouds.filter((layer) => layer.kind === 'cloudSheet')
  const towers = cloudField?.snapshot.filter(({ layer }) => layer?.lattice === 'tower') ?? []
  let sum = 0
  for (const p of face) {
    const light = sheets.reduce((left, sheet) => left * (1 - sheetAlphaAt(sheet, p.x, p.y)), 1)
    sum += light && cloudField && towers.length
      ? light * rayThrough(cloudField.field, towers, geom.azimuthAt(p.x), geom.domeAltitudeAt(p.y)) : light
  }
  return sum / face.length
}
