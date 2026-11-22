import { hashId } from '../../data/landmarks/hash'
import { smoothstep } from './genus'
import { dimensions } from './dimensions'
import type { FieldCell, FieldLayer, FieldRain } from './types'

/*
 * The shower the forecast puts at the place itself. An hour of convective rain at the point (WMO 80–82, 95–99 with
 * rain) means a raining core is over or beside it, not somewhere on a random lattice 15 km off where 25 km of
 * visibility hides its base. One mature cell stands just upwind (the one arriving), its near edge a kilometre off,
 * as present as the shower is heavy and convective. Pure.
 */

const DEG = Math.PI / 180
/** Ground distance of the core's centre upwind (km), and its radius (km): a mature Cb 6 km across. */
const UPWIND_KM = 4, RADIUS_KM = 3

export function hereCell(tower: FieldLayer | undefined, rain: FieldRain | undefined, convective: number,
  fromDeg: number, placeId: string): FieldCell[] {
  if (!tower || !rain || rain.level !== 'low') return []
  const share = smoothstep(0.2, 1.5, rain.rate) * Math.min(1, convective)
  if (share < 0.05) return []
  const { baseKm, vKm, kappa } = dimensions('cb', tower.lowBaseKm ?? tower.baseKm, tower.form, 0.7, 2 * RADIUS_KM)
  const id = `here:${placeId}`
  return [{ id, lattice: 'tower', x: UPWIND_KM * Math.sin(fromDeg * DEG), y: UPWIND_KM * Math.cos(fromDeg * DEG),
    r: RADIUS_KM, baseKm, vKm, tau0: kappa * vKm, rainWeight: share, share, seed: hashId(id), genus: 'cb', rank: 0 }]
}
