import { curveDrop } from '../../world/flightTerrain'
import type { LightDir } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import type { PlaneGeomGrid } from './planeGeometry'

const RAD = Math.PI / 180
const MIN_STEP_KM = 0.12
const SOLAR_RADIUS = 0.265

interface Receiver { east: number; north: number; height: number | null }
const receivers = new WeakMap<PlaneGeomGrid, Receiver[]>()

/** Cast from measured receiver positions in the same east/north metre frame as the DEM. */
export function terrainVisibility(
  terrain: WorldState['flightTerrain'], geom: PlaneGeomGrid, azimuth: number, altitude: number, dir: LightDir,
) {
  if (!terrain) return () => 1
  let positions = receivers.get(geom)
  if (!positions) {
    positions = Array.from(geom.km, (km, i) => {
      const bearing = geom.bearing[i % geom.cols] * RAD
      const east = Math.sin(bearing) * km, north = Math.cos(bearing) * km
      return { east, north, height: terrain.heightAt(east, north) }
    })
    receivers.set(geom, positions)
  }
  const ground = positions
  const sin = Math.sin(azimuth * RAD), cos = Math.cos(azimuth * RAD)
  const lower = Math.tan((altitude - SOLAR_RADIUS) * RAD)
  const upper = Math.tan((altitude + SOLAR_RADIUS) * RAD)
  const top = terrain.panoramaHeightsM?.[1] ?? Infinity
  const ray: { d: number; east: number; north: number; curvature: number; invMetres: number }[] = []
  // Geometric spacing resolves nearby relief and bounds the march across distant DEM rays.
  for (let d = MIN_STEP_KM; d < 60; d = d * 1.34 + 0.04) {
    ray.push({ d, east: sin * d, north: cos * d, curvature: curveDrop(d), invMetres: 1 / (d * 1000) })
  }
  return (i: number) => {
    const { east, north, height } = ground[i]
    // Keep the assumed local normal for an unmeasured receiver, with no invented cast blocker.
    if (height === null || dir.up >= 0.999) return 1
    let horizon = -Infinity
    const reach = lower > 0 ? (top + 2 - height) / (lower * 1000) : Infinity
    for (const step of ray) {
      if (step.d > reach) break
      const h = terrain.heightAt(east + step.east, north + step.north)
      if (h === null) continue
      horizon = Math.max(horizon, (h - height - 2 - step.curvature) * step.invMetres)
      if (horizon >= upper) return 0
    }
    return smoothstep(-upper, -lower, -horizon)
  }
}
