import { edgeNoise } from '../../world/field/edges'
import type { FieldSnapshot } from '../../world/field/transmit'
import { pxPerRadAt } from './advect'
import { change, openness, shapeOf, type Shape } from './cloudSheetShape'
import type { SkyGeom } from './sky'

/*
 * A layer of the field as the eye sees it: its near cells in the eye's proportions (`cloudSheetShape`), each whole, and
 * above the dome's join their outlines moved by the air (`world/field/edges`). Farther out the field is read exactly, as the
 * land's light reads it.
 */

/** Sectors of the compass the shapes are kept by, for speed alone: a power of two, a third of a mean cell at the join. */
const SECTORS = 64
/** Rounding left where a cell's own depth is taken from the field's sum. */
const ROUNDING = 1e-9

/** The sector of a bearing given by a vector of any length: a measure that grows with it, with no trigonometry. */
function sectorOf(east: number, north: number): number {
  const turn = north / (Math.abs(east) + Math.abs(north) || 1)
  return (east >= 0 ? 1 - turn : 3 + turn) * SECTORS / 4 & SECTORS - 1
}

/** The shapes by the sectors they are drawn in (a half turn each at most). */
function bySector(shapes: Shape[]): Shape[][] {
  const sectors: Shape[][] = Array.from({ length: SECTORS }, () => [])
  for (const shape of shapes) {
    const { east, north, cos } = shape, sin = Math.sqrt(1 - cos * cos)
    const last = sectorOf(east * cos + north * sin, north * cos - east * sin)
    let sector = sectorOf(east * cos - north * sin, north * cos + east * sin)
    for (; sector !== last; sector = sector + 1 & SECTORS - 1) sectors[sector].push(shape)
    sectors[last].push(shape)
  }
  return sectors
}

export type DepthAt = (x: number, y: number) => number

/** The layer's depth at a place (km) as a row of the sheet at that range and altitude shows it. */
export function seenDepth(placeId: string, minute: number, snapshot: FieldSnapshot[number], geom: SkyGeom, depthAt: DepthAt) {
  const { layer, cells, heightKm } = snapshot
  if (!layer || (layer.lattice !== 'low' && layer.lattice !== 'mid')) return () => depthAt
  const noise = edgeNoise(placeId, layer, minute)
  const perRad = Math.abs(pxPerRadAt(geom.azimuthAt, geom.width / 2))
  const shapes: Shape[] = []
  let outer = 0
  for (const cell of cells) {
    const shape = shapeOf(cell, heightKm, geom, perRad, () => openness(cell, cells))
    if (!shape) continue
    shapes.push(shape)
    outer = Math.max(outer, shape.to)
  }
  const sectors = bySector(shapes)
  return (range: number, altitude: number): DepthAt => {
    const along = noise.along(range, altitude)
    if (!along && range >= outer) return depthAt
    return (east, north) => {
      const scale = along ? 1 + along * noise.at(east, north) : 1
      const depth = depthAt(east * scale, north * scale)
      const here = sectors[sectorOf(east, north)]
      if (!here.length) return depth
      // A cell takes some of the place's displacement: none, all, or between.
      const low = Math.min(range, range * scale), high = Math.max(range, range * scale)
      let moved = 0
      for (let i = 0; i < here.length; i++) if (high > here[i].from && low < here[i].to) moved += change(here[i], east, north, range, scale)
      const seen = depth + moved
      return seen < layer.floorTau + ROUNDING ? layer.floorTau : seen
    }
  }
}
