import type { FarData } from '../data/city/farData'
import type { CloudLevel } from './types'
import { eachBuiltCell } from './builtCells'
import { evenAir, SECTOR, sectorAt, SECTORS, townAirOf, type TownAir } from './townAir'

/*
 * Where the towns' light comes from at night, from the far raster's built shares (the same cells the far towns are drawn
 * from): what lights a cloud base over any point round the place, and the lit air over each bearing (`townAir.ts`).
 * Static per place, worked when a night first asks: the hour, the lit windows, the cloud and the air weigh it
 * (`scene/model/cityLight.ts`).
 */

export interface TownLights {
  /** The built share of the ground (0–1) as the base of a cloud of `level` over (`e`, `n`) km sees it under itself. */
  under: (level: CloudLevel, e: number, n: number) => number
  air: () => TownAir
}

type Place = { lat: number; lon: number }
interface Source { e: number; n: number; area: number }

/** A low deck's horizon: no base further off is seen over eye level. */
const REACH_KM = 110
/**
 * The height (km) a level's base is lit from: its own (~1, 3, 8 km) and a km more for the light scattered on its way up,
 * so a town stands on the base as a wide soft patch. Sources are gathered into blocks as wide, under that softness.
 */
const LIT_FROM: Record<CloudLevel, number> = { low: 2, mid: 4, high: 9 }
/** The ranges (km) the light on a base is worked at, denser near. */
const RINGS = [0, 1, 2, 3.5, 5, 7.5, 10, 14, 20, 28, 40, 56, 80, REACH_KM]
/** Without the raster: an `env.glow` of 40 is a wholly built plain (a metropolis's ~10 is a quarter built). */
const GLOW_OF_BUILT = 40
const RAD = Math.PI / 180

function blocksOf(place: Place, far: FarData, width: number): Source[] {
  const blocks = new Map<string, Source>()
  eachBuiltCell(place, far, REACH_KM + 10, (e, n, _km, area) => {
    const key = `${Math.floor(e / width)},${Math.floor(n / width)}`
    const b = blocks.get(key)
    if (b) { b.e += e * area; b.n += n * area; b.area += area } else blocks.set(key, { e: e * area, n: n * area, area })
  })
  return [...blocks.values()].map((b) => ({ e: b.e / b.area, n: b.n / b.area, area: b.area }))
}

/**
 * The light on a base `h` up, on the polar grid: each source a Lambertian patch under a level base, h² / (π (ρ² + h²)²) of
 * its area (1 over a wholly built plain), so a base is lit by the ground within about its own height.
 */
function baseGrid(sources: readonly Source[], h: number): Float32Array {
  const out = new Float32Array(RINGS.length * SECTORS)
  RINGS.forEach((km, ring) => {
    for (let k = 0; k < SECTORS; k++) {
      const e = km * Math.sin(k * SECTOR * RAD), n = km * Math.cos(k * SECTOR * RAD)
      let sum = 0
      for (const s of sources) {
        const de = s.e - e, dn = s.n - n, d = de * de + dn * dn + h * h
        sum += s.area * h * h / (Math.PI * d * d)
      }
      out[ring * SECTORS + k] = Math.min(1, sum)
    }
  })
  return out
}

export function townLightsOf(place: Place, far: FarData | null | undefined, glow: number): TownLights {
  if (!far) {
    const air = evenAir(glow)
    return { under: () => Math.min(1, glow / GLOW_OF_BUILT), air: () => air }
  }
  let air: TownAir | undefined
  const grids: Partial<Record<CloudLevel, Float32Array>> = {}
  return {
    under(level, e, n) {
      const grid = grids[level] ??= baseGrid(blocksOf(place, far, LIT_FROM[level]), LIT_FROM[level])
      const km = Math.hypot(e, n), azimuth = Math.atan2(e, n) / RAD
      let ring = 0
      while (ring + 2 < RINGS.length && RINGS[ring + 1] < km) ring++
      const t = Math.min(1, (km - RINGS[ring]) / (RINGS[ring + 1] - RINGS[ring]))
      return sectorAt(grid, azimuth, ring * SECTORS) * (1 - t) + sectorAt(grid, azimuth, (ring + 1) * SECTORS) * t
    },
    air: () => air ??= townAirOf(place, far),
  }
}
