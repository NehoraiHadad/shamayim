//# allFunctionsCalledOnLoad
import { unit } from '../../world/field/genus'
import type { CityOnBase } from './cityLight'
import type { gridFor } from './cloudSheetGrid'
import { DIFFUSE_EXTINCTION } from './cloudSheetMath'

const DEG = 180 / Math.PI

/** The share of the towns' light each texel of a sheet's base gives back, from its resolved depth into the far one's. */
export function sheetCity(cityAt: CityOnBase, grid: ReturnType<typeof gridFor>, heightKm: number, deckEnd: number): number[] {
  const { altitudes, ranges, east, north, tau, expected, fade } = grid
  const toward = east.map((e, col) => cityAt(Math.atan2(e, north[col]) * DEG))
  return altitudes.flatMap((altitude, row) => {
    const range = Math.min(ranges[row], deckEnd), km = Math.hypot(range, heightKm)
    return toward.map((light, col) => {
      const index = row * toward.length + col, local = tau[index]
      const depth = local + fade[row] * (expected[index] - local)
      // A thick column gives more of the light from below back (two streams) than a thin one.
      const back = 0.6 + 0.8 * (1 - 1 / (1 + DIFFUSE_EXTINCTION * depth))
      return unit(back * light(range * east[col], range * north[col], altitude, km))
    })
  })
}
