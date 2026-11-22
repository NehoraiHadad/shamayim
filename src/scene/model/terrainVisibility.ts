import { LOCAL_STEP_KM } from '../../data/terrain/panorama'
import { curveDrop } from '../../world/flightTerrain'
import type { LightDir } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import type { PlaneGeomGrid } from './planeGeometry'

const RAD = Math.PI / 180
const AZ_BINS_PER_DEG = 2
const AZ_BINS = 360 * AZ_BINS_PER_DEG
const SOLAR_RADIUS = 0.265
const STEPS = (() => {
  const ray: { d: number; drop: number; invMetres: number }[] = []
  // Keep the geometric spacing of the DEM march, starting outside the local 250 m cell.
  for (let d = 0.12; d < 60; d = d * 1.34 + 0.04) {
    if (d >= LOCAL_STEP_KM) ray.push({ d, drop: 2 + curveDrop(d), invMetres: 1 / (d * 1000) })
  }
  return ray
})()

type Terrain = NonNullable<WorldState['flightTerrain']>
interface Receiver { east: number; north: number; height: number | null }
interface HorizonGrid { positions: Receiver[]; bins: Map<number, Float32Array> }
const offsets = new Map<number, { east: number; north: number; drop: number; invMetres: number }[]>()

function rayFor(bin: number) {
  let ray = offsets.get(bin)
  if (!ray) {
    const az = bin / AZ_BINS_PER_DEG * RAD
    const sin = Math.sin(az), cos = Math.cos(az)
    ray = STEPS.map(({ d, drop, invMetres }) => ({ east: sin * d, north: cos * d, drop, invMetres }))
    offsets.set(bin, ray)
  }
  return ray
}
const horizons = new WeakMap<PlaneGeomGrid, WeakMap<Terrain, HorizonGrid>>()

function gridFor(terrain: Terrain, geom: PlaneGeomGrid): HorizonGrid {
  let byTerrain = horizons.get(geom)
  if (!byTerrain) horizons.set(geom, byTerrain = new WeakMap())
  let grid = byTerrain.get(terrain)
  if (!grid) {
    const positions = Array.from(geom.km, (km, i) => {
      const bearing = geom.bearing[i % geom.cols] * RAD
      const east = Math.sin(bearing) * km, north = Math.cos(bearing) * km
      return { east, north, height: terrain.heightAt(east, north) }
    })
    byTerrain.set(terrain, grid = { positions, bins: new Map() })
  }
  return grid
}

function binFor(grid: HorizonGrid, azBin: number) {
  let bin = grid.bins.get(azBin)
  if (!bin) grid.bins.set(azBin, bin = new Float32Array(grid.positions.length).fill(NaN))
  return bin
}

function march(terrain: Terrain, grid: HorizonGrid, bin: Float32Array, azBin: number, i: number) {
  const cached = bin[i]
  if (!Number.isNaN(cached)) return cached
  const { east, north, height } = grid.positions[i]
  if (height === null) return bin[i] = -90
  let slope = -Infinity
  const ray = rayFor(azBin), heightAt = terrain.heightAt
  for (const step of ray) {
    const h = heightAt(east + step.east, north + step.north)
    if (h !== null) slope = Math.max(slope, (h - height - step.drop) * step.invMetres)
  }
  return bin[i] = Math.atan(slope) / RAD
}

/** The DEM horizon in neighbouring half-degree azimuth bins. Solar/lunar altitude only enters the disc edge. */
export function terrainVisibility(terrain: WorldState['flightTerrain'], geom: PlaneGeomGrid, azimuth: number, altitude: number, dir: LightDir) {
  if (!terrain || ('known' in terrain && terrain.known === false) || dir.up >= 0.999) return () => 1
  const grid = gridFor(terrain, geom)
  const a = ((azimuth * AZ_BINS_PER_DEG) % AZ_BINS + AZ_BINS) % AZ_BINS
  const lo = Math.floor(a), hi = (lo + 1) % AZ_BINS, mix = a - lo
  const low = binFor(grid, lo), high = mix ? binFor(grid, hi) : low
  return (i: number) => {
    const h0 = march(terrain, grid, low, lo, i)
    const h1 = mix ? march(terrain, grid, high, hi, i) : h0
    // At the coverage edge use the measured ray if its neighbour has no DEM hits.
    const angle = h0 === -90 ? h1 : h1 === -90 ? h0 : h0 + (h1 - h0) * mix
    return smoothstep(-SOLAR_RADIUS, SOLAR_RADIUS, altitude - angle)
  }
}
