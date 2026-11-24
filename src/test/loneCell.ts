import { SCENE_CAMERA } from '../domain/camera'
import { skyGeom } from '../scene/model/sky'
import type { SceneBox } from '../scene/model/types'
import { layerSnapshot } from '../world/field/density'
import { cellTauAt } from '../world/field/footprint'
import { groundRangeAt } from '../world/field/project'
import type { FieldCell, FieldLayer } from '../world/field/types'
import { terrainY } from '../world/terrain'
import type { WorldState } from '../world/types'

export const RAD = Math.PI / 180
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
export const worldOf = (id: string) => ({
  place: { id }, camera: SCENE_CAMERA, bodies: { sun: { azimuth: 0 } },
  relief: { y: (altitude: number) => terrainY(box.landHeight, altitude) },
}) as WorldState
export const geom = skyGeom(worldOf('shape'), box)

/** Cells a sheet draws, as [genus, height, radius, thickness] (km), and the altitudes (deg) and sizes they are judged at. */
export const CELLS = [['ac', 5, 1.5, 0.4], ['cu', 1.4, 0.35, 0.36]] as const
export const ELEVATIONS = [35, 40, 45, 50, 55, 60]

/** One cell of a layer, alone in the sky: its sheet is drawn at its base. */
export function loneCell(genus: 'ac' | 'cu', x: number, y: number, r: number, vKm: number, heightKm: number) {
  const lattice = genus === 'ac' ? 'mid' as const : 'low' as const
  const layer: FieldLayer = {
    lattice, baseKm: heightKm, meanVKm: vKm, kappa: 15, cover: 0.25, Q: 1, g: 1, floorTau: 0,
    form: { conv: 0, strat: lattice === 'low' ? 0.55 : 0, sheet: 0, veil: 0 }, d: [0, 0], vel: [0, 0],
  }
  const cell: FieldCell = {
    genus, lattice, id: 47, seed: 47, x, y, r, baseKm: layer.baseKm, vKm, tau0: 15, rainWeight: 0, share: 1, rank: 0,
  }
  const physical = layerSnapshot({ placeId: 'shape', t: 960, layers: [layer] }, lattice, 0, 0, 100)
  const depth = (east: number, north: number) => cellTauAt(cell, east, north)
  return { ...physical, cells: [cell], densityGrid: {
    ...physical.densityGrid, tauAt: depth, resolvedTauAt: depth, expectedTauAt: () => 0,
  } }
}

/** One cell alone, its middle seen at an elevation and an azimuth. */
export function cellAt(genus: 'ac' | 'cu', heightKm: number, r: number, vKm: number, elevation: number, azimuth: number) {
  const range = groundRangeAt(heightKm, elevation)
  return loneCell(genus, range * Math.sin(azimuth * RAD), range * Math.cos(azimuth * RAD), r, vKm, heightKm)
}

/** A shape's height over its widest row, its width near its foot, and how far it widens again under a waist (a vase). */
export function silhouette(rows: readonly number[], rowPx: number) {
  const widest = Math.max(...rows), low = rows.slice(rows.indexOf(widest))
  return {
    aspect: rows.length * rowPx / widest, foot: rows[Math.floor(0.85 * rows.length)] / widest,
    flare: Math.max(0, ...low.map((wide, i) => Math.max(...low.slice(i)) - wide)) / widest,
  }
}
