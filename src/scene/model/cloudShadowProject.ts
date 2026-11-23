//# allFunctionsCalledOnLoad
import { apparentAngle } from '../../data/terrain/panorama'
import { spanDeg, xOf } from '../../domain/camera'
import type { FieldCell, FieldLayer } from '../../world/field/types'
import { FLIGHT_LOCAL_KM } from '../../world/flightTerrain'
import { SCENE_W } from '../../world/sceneBox'
import { terrainY } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { acrossSpeed } from './advect'
import { shadowEdge, shadowLobes, SOLAR_DIAMETER_RAD } from './cloudShadowEdge'
import { shadowRimHandover } from './cloudShadowRim'
import { supports, type Projection } from './cloudShadowWorld'
import type { TowerHeadShape } from './towerHeads'
import type { ShadowBlob, ShadowBox, ShadowPlane, ShadowTerrain } from './planeCloudShadow'
import type { Pt } from './types'

/** Geometric projection of the solar cloud shadow onto ground planes. */
const RAD = Math.PI / 180
const RANGE = 60

interface ProjectedShadow { plane: ShadowPlane; blob: ShadowBlob }

interface ProjectInput {
  cloudField: NonNullable<WorldState['cloudField']>
  grid: NonNullable<WorldState['flightTerrain']>
  terrain: ShadowTerrain
  camera: WorldState['camera']
  box: ShadowBox
  azimuth: number
  altitude: number
  minDepth: number
  towerShapes?: ReadonlyMap<number, TowerHeadShape>
}

export function projectCloudShadows(input: ProjectInput): ProjectedShadow[] {
  const { cloudField, grid, terrain, camera, box, azimuth, altitude: altDeg, minDepth, towerShapes } = input
  const altitude = altDeg * RAD, cot = 1 / Math.tan(altitude), invSin = 1 / Math.sin(altitude)
  const sin = Math.sin(azimuth * RAD), cos = Math.cos(azimuth * RAD)
  const eastPerUp = sin * cot, northPerUp = cos * cot
  const scale = box.width / SCENE_W
  const period = 360 * camera.pxPerDeg * box.width / camera.width

  const { eyeM, heightAt, blockedKm, panoramaHeightsM, shadowBlocked, occludedAt } = grid
  const halfView = spanDeg(camera) * RAD / 2, heading = camera.heading * RAD
  const leftEast = Math.cos(heading - halfView), leftNorth = -Math.sin(heading - halfView)
  const rightEast = -Math.cos(heading + halfView), rightNorth = Math.sin(heading + halfView)
  const groundMin = ((panoramaHeightsM?.[0] ?? 0) - eyeM) / 1000
  const groundMax = ((panoramaHeightsM?.[1] ?? 0) - eyeM) / 1000
  const furthestEyeSq = (RANGE + Math.max(Math.abs(groundMin), Math.abs(groundMax)) * cot + 0.010001) ** 2
  const allowance = (along: number) => Math.max(groundMin * along, groundMax * along) + 0.010001
  const leftAllow = allowance(leftEast * eastPerUp + leftNorth * northPerUp)
  const rightAllow = allowance(rightEast * eastPerUp + rightNorth * northPerUp)
  const screenX = (e: number, n: number) => xOf(Math.atan2(e, n) / RAD, camera) * SCENE_W / camera.width
  const perRad = (screenX(Math.sin(heading + 1e-3), Math.cos(heading + 1e-3)) - screenX(Math.sin(heading), Math.cos(heading))) * 1e3 * scale

  function onGround(eastAtEyeKm: number, northAtEyeKm: number): Projection | undefined {
    let groundAboveEyeKm = 0, prevAbove = 0, prevRes = 0
    for (let i = 0; i < 6; i++) {
      const eastKm = eastAtEyeKm + groundAboveEyeKm * eastPerUp
      const northKm = northAtEyeKm + groundAboveEyeKm * northPerUp
      const seaLevelM = heightAt(eastKm, northKm)
      if (seaLevelM === null) return
      const res = (seaLevelM - eyeM) / 1000 - groundAboveEyeKm
      if (Math.abs(res) * cot <= 0.01) {
        const d2 = eastKm * eastKm + northKm * northKm
        if (d2 > RANGE * RANGE) return
        const upM = seaLevelM - eyeM
        if (occludedAt?.(eastKm, northKm, upM) ?? (blockedKm(eastKm, northKm, upM) !== null)) return
        const x = screenX(eastKm, northKm)
        if (x >= 0 && x <= SCENE_W) return { x, km: Math.sqrt(d2), eastKm, northKm, seaLevelM }
        return
      }
      const secant = res * (prevAbove - groundAboveEyeKm) / (res - prevRes)
      prevAbove = groundAboveEyeKm; prevRes = res
      groundAboveEyeKm += Math.abs(secant) <= 3 * Math.abs(res) && secant !== 0 ? secant : res
    }
  }

  const candidates: { cell: FieldCell; east: number; north: number; d2: number; slant: number; layer: FieldLayer }[] = []
  for (const { cells, layer } of cloudField.snapshot) {
    if (!layer || layer.lattice === 'high') continue
    for (const cell of cells) {
      const { x, y, r, baseKm, vKm: depth, tau0: tau, genus, lattice } = cell
      if (tau < minDepth) continue
      const h = baseKm + depth / 2, east = x - h * eastPerUp, north = y - h * northPerUp, d2 = east * east + north * north
      if (panoramaHeightsM && halfView < Math.PI && Math.abs(x * cos - y * sin) > FLIGHT_LOCAL_KM) {
        if (d2 > furthestEyeSq) continue
        const outL = east * leftEast + north * leftNorth < -leftAllow
        const outR = east * rightEast + north * rightNorth < -rightAllow
        if (halfView <= Math.PI / 2 ? outL || outR : outL && outR) continue
      }
      const spread = depth * cot / (2 * r), extent = Math.min(1, spread), e2 = extent * extent
      const cum = lattice === 'tower' || genus === 'cu' || genus === 'cg' || genus === 'cb'
      const slant = tau * (spread > 0 ? (extent / spread) * (1 - (cum ? e2 / 3 : e2 * e2 / 5)) : 1)
      if (slant < minDepth) continue
      candidates.push({ cell, east, north, d2, slant, layer })
    }
  }

  candidates.sort((a, b) => a.d2 - b.d2)
  const handover = candidates.length ? shadowRimHandover(cloudField) : undefined
  const accepted: ProjectedShadow[] = []
  for (const { cell, east: eastAtEye, north: northAtEye, slant, layer } of candidates) {
    const { id, r, vKm: depth, baseKm } = cell
    if (accepted.length === 64) break
    if (shadowBlocked?.(eastAtEye, northAtEye, eastPerUp, northPerUp)) continue
    const centre = onGround(eastAtEye, northAtEye)
    if (!centre) continue
    const sight = terrain.sightAt?.(centre.x)
    const plane: ShadowPlane = !sight || centre.km <= sight.nearKm ? 'near'
      : terrain.back && centre.km > sight.farKm ? 'back' : 'far'
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    for (const [u, v] of supports) {
      const cap = -u * depth / 2
      const e = centre.eastKm + r * (u * sin + v * cos) - cap * eastPerUp
      const n = centre.northKm + r * (u * cos - v * sin) - cap * northPerUp
      const rawX = screenX(e, n) * scale
      const sx = rawX + Math.round((centre.x * scale - rawX) / period) * period
      const sy = terrainY(terrain.horizonY, apparentAngle(centre.seaLevelM, Math.sqrt(e * e + n * n), eyeM))
      left = Math.min(left, sx); right = Math.max(right, sx); top = Math.min(top, sy); bottom = Math.max(bottom, sy)
    }
    const opticalDepth = slant * invSin
    const centreKm: Pt = [centre.eastKm, centre.northKm]
    const km = Math.max(.01, centre.km)
    const speed = acrossSpeed(layer.vel, [centre.eastKm / km, centre.northKm / km], km, perRad)
    const path = Math.max(0, baseKm - (centre.seaLevelM - eyeM) / 1000) * invSin
    const discKm = SOLAR_DIAMETER_RAD * path
    // Only the diffuse flux in the cloud's apparent disc and sunlit sides
    // reaches the footprint. The rest spreads out over the surrounding land.
    const diffuseView = Math.min(1, r * (r + depth / 2) / (r * r + path * path))
    const along = (centre.eastKm * sin + centre.northKm * cos) / km
    const across = (centre.eastKm * cos - centre.northKm * sin) / km
    const penumbraX = Math.abs(perRad) * discKm / km * Math.hypot(along, across * invSin)
    const dh = discKm * Math.hypot(across, along * invSin)
    const edgeY = (range: number) => terrainY(terrain.horizonY, apparentAngle(centre.seaLevelM, range, eyeM))
    const penumbraY = Math.abs(edgeY(km + dh / 2) - edgeY(Math.max(.01, km - dh / 2)))
    const bearing = Math.atan2(centre.eastKm, centre.northKm)
    const slope = Math.sign(edgeY(km + .01) - edgeY(km))
    const lobes = shadowLobes(cell, bearing, camera.handed, azimuth * RAD - heading, cot, slope || -1,
      cell.lattice === 'tower' ? towerShapes?.get(cell.seed) : undefined, handover?.seeds.get(id), handover?.weight)
    const rx = Math.max(.1, (right - left) / 2), ry = Math.max(.1, (bottom - top) / 2)
    accepted.push({ plane, blob: { cellId: id, centre: centreKm, opticalDepth, speed,
      x: (left + right) / 2, y: (top + bottom) / 2, rx, ry,
      edge: shadowEdge(lobes, opticalDepth, rx, ry, penumbraX, penumbraY), diffuseView } })
  }
  return accepted
}
