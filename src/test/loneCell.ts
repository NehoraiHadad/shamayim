import { layerSnapshot } from '../world/field/density'
import { cellTauAt } from '../world/field/footprint'
import type { FieldCell, FieldLayer } from '../world/field/types'

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
