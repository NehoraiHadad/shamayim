//# allFunctionsCalledOnLoad
import { apparentAngle } from '../../data/terrain/panorama'
import { FLIGHT_LOCAL_KM } from '../../world/flightTerrain'
import { terrainY } from '../../world/terrain'
import { spanDeg, xOf } from '../../domain/camera'
import type { FieldCell } from '../../world/field/types'
import { cloudLight } from '../../world/lightCloud'
import { SCENE_W } from '../../world/sceneBox'
import { acrossSpeed } from './advect'
import { shadowLayers, type ShadowBlob, type ShadowBox, type ShadowPlane } from './cloudShadowLayers'
import { supports, type Projection, type ShadowWorld } from './cloudShadowWorld'
import type { Pt } from './types'

const RAD = Math.PI / 180
const RANGE = 60
export function cloudShadowLayers(world: ShadowWorld, box: ShadowBox) {
  const { light, terrain, cloudField, camera, flightTerrain: grid } = world
  // Below one 8-bit alpha step the largest possible shadow is subpixel in opacity.
  if (!cloudField || !grid || light.altitude <= 0 || 0.65 * light.direct < 1 / 255) return []
  const { field } = cloudField
  const { open } = cloudLight({ low: 0, mid: 0, high: 0 }, field)
  if (open <= 0) return []
  const altitude = light.altitude * RAD
  const cot = 1 / Math.tan(altitude)
  const sin = Math.sin(light.azimuth * RAD), cos = Math.cos(light.azimuth * RAD)
  const eastPerUp = sin * cot, northPerUp = cos * cot
  const invSin = 1 / Math.sin(altitude)
  const alphaScale = 0.65 * light.direct
  const minDepth = -2 * Math.log(open * (1 - 1 / (255 * alphaScale))) / invSin
  const scale = box.width / SCENE_W
  const period = 360 * camera.pxPerDeg * box.width / camera.width

  const { eyeM, heightAt, blockedKm, panoramaHeightsM, shadowBlocked, occludedAt } = grid
  const halfView = spanDeg(camera) * RAD / 2
  const heading = camera.heading * RAD
  const leftEast = Math.cos(heading - halfView), leftNorth = -Math.sin(heading - halfView)
  const rightEast = -Math.cos(heading + halfView), rightNorth = Math.sin(heading + halfView)
  const groundMin = ((panoramaHeightsM?.[0] ?? 0) - eyeM) / 1000
  const groundMax = ((panoramaHeightsM?.[1] ?? 0) - eyeM) / 1000
  const furthestEyeProjection = RANGE + Math.max(Math.abs(groundMin), Math.abs(groundMax)) * cot + 0.010001
  const furthestEyeSquared = furthestEyeProjection ** 2
  const allowance = (alongSun: number) => Math.max(groundMin * alongSun, groundMax * alongSun) + 0.010001
  const leftAllowance = allowance(leftEast * eastPerUp + leftNorth * northPerUp)
  const rightAllowance = allowance(rightEast * eastPerUp + rightNorth * northPerUp)
  const screenX = (eastKm: number, northKm: number) =>
    xOf(Math.atan2(eastKm, northKm) / RAD, camera) * SCENE_W / camera.width
  // Land px per radian of azimuth at the view's centre, for each shadow's carry.
  const perRad = (screenX(Math.sin(heading + 1e-3), Math.cos(heading + 1e-3)) - screenX(Math.sin(heading), Math.cos(heading))) * 1e3 * scale
  function onGround(eastAtEyeKm: number, northAtEyeKm: number): Projection | undefined {
    let groundAboveEyeKm = 0, previousAboveEyeKm = 0, previousResidualKm = 0
    // Allow six samples and accept only a horizontal projection-equation residual of at most 10 m.
    for (let i = 0; i < 6; i++) {
      const eastKm = eastAtEyeKm + groundAboveEyeKm * eastPerUp
      const northKm = northAtEyeKm + groundAboveEyeKm * northPerUp
      const seaLevelM = heightAt(eastKm, northKm)
      if (seaLevelM === null) return
      const nextAboveEyeKm = (seaLevelM - eyeM) / 1000
      const residualKm = nextAboveEyeKm - groundAboveEyeKm
      if (Math.abs(residualKm) * cot <= 0.01) {
        const distanceSquared = eastKm * eastKm + northKm * northKm
        if (distanceSquared > RANGE * RANGE) return
        const upM = seaLevelM - eyeM
        if (occludedAt?.(eastKm, northKm, upM) ?? (blockedKm(eastKm, northKm, upM) !== null)) return
        const x = screenX(eastKm, northKm)
        if (x >= 0 && x <= SCENE_W) return { x, km: Math.sqrt(distanceSquared), eastKm, northKm, seaLevelM }
        return
      }
      // A secant step resolves locally linear slopes faster. Bound the step to
      // three times the fixed-point correction before trying a new grid sample.
      const secantKm = residualKm * (previousAboveEyeKm - groundAboveEyeKm) / (residualKm - previousResidualKm)
      previousAboveEyeKm = groundAboveEyeKm
      previousResidualKm = residualKm
      groundAboveEyeKm += Math.abs(secantKm) <= 3 * Math.abs(residualKm) && secantKm !== 0 ? secantKm : residualKm
    }
  }

  const candidates: { cell: FieldCell; east: number; north: number; eyeDistanceSquared: number; slant: number; vel: [number, number] }[] = []
  for (const { cells, layer } of cloudField.snapshot) {
    if (!layer || layer.lattice === 'high') continue
    for (const cell of cells) {
      const { x, y, r, baseKm: baseAboveEyeKm, vKm: depth, tau0: tau, genus, lattice } = cell
      if (tau < minDepth) continue
      const h = baseAboveEyeKm + depth / 2
      const east = x - h * eastPerUp, north = y - h * northPerUp
      const eyeDistanceSquared = east * east + north * north
      // The centre moves along the sun axis. Beyond local-grid reach,
      // project both terrain-height limits onto the camera edge normals.
      if (panoramaHeightsM && halfView < Math.PI && Math.abs(x * cos - y * sin) > FLIGHT_LOCAL_KM) {
        if (eyeDistanceSquared > furthestEyeSquared) continue
        // Keep the accepted centre residual (10 m) inside the bound.
        const outsideLeft = east * leftEast + north * leftNorth < -leftAllowance
        const outsideRight = east * rightEast + north * rightNorth < -rightAllowance
        if (halfView <= Math.PI / 2 ? outsideLeft || outsideRight : outsideLeft && outsideRight) continue
      }
      // Both chords span at most min(V, 2r/cot(alt)) in height, bounding the
      // transmission difference by 1 - exp(-tau × extent / (2 × spread × sin(alt))).
      const spread = depth * cot / (2 * r), extent = Math.min(1, spread)
      const extent2 = extent * extent
      const cumulus = lattice === 'tower' || genus === 'cu' || genus === 'cg' || genus === 'cb'
      const profile = spread > 0 ? extent / spread * (1 - (cumulus ? extent2 / 3 : extent2 * extent2 / 5)) : 1
      const slant = tau * profile
      if (slant < minDepth) continue
      candidates.push({ cell, east, north, eyeDistanceSquared, slant, vel: layer.vel })
    }
  }
  // Eye-level distance differs from true range by at most |groundM - eyeM| × cot(alt)/1000 + 0.01 km.
  candidates.sort((a, b) => a.eyeDistanceSquared - b.eyeDistanceSquared)
  const accepted: { km: number; plane: ShadowPlane; blob: ShadowBlob }[] = []
  for (const { cell: { id, r, vKm: depth }, east: eastAtEye, north: northAtEye, slant, vel } of candidates) {
    if (accepted.length === 64) break
    if (shadowBlocked?.(eastAtEye, northAtEye, eastPerUp, northPerUp)) continue
    const centre = onGround(eastAtEye, northAtEye)
    if (!centre) continue
    const sight = terrain.sightAt?.(centre.x)
    const plane = !sight || centre.km <= sight.nearKm ? 'near'
      : terrain.back && centre.km > sight.farKm ? 'back' : 'far'
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    // A support whose true ground is Δh metres from the centre height moves
    // by at most δ = |Δh| cot(alt)/1000 km along the sun axis. At range d > δ
    // its horizontal error at 375 px is at most pxPerDeg × asin(δ/d) in degrees
    // (scaled by 375/camera.width). Vertically, with k = curveDrop(1), the
    // slope error is at most |Δh|/(d-δ) + |height-eye|δ/[d(d-δ)] + kδ.
    // Divide by 1000, convert radians to degrees (atan is 1-Lipschitz),
    // then multiply by the relief's maximum derivative in px/degree.
    for (const [u, v] of supports) {
      const cap = -u * depth / 2
      const east = centre.eastKm + r * (u * sin + v * cos) - cap * eastPerUp
      const north = centre.northKm + r * (u * cos - v * sin) - cap * northPerUp
      const rawX = screenX(east, north) * scale
      const sx = rawX + Math.round((centre.x * scale - rawX) / period) * period
      const sy = terrainY(terrain.horizonY, apparentAngle(centre.seaLevelM, Math.sqrt(east * east + north * north), eyeM))
      left = Math.min(left, sx)
      right = Math.max(right, sx)
      top = Math.min(top, sy)
      bottom = Math.max(bottom, sy)
    }
    const alpha = alphaScale * (1 - Math.exp(-slant * invSin / 2) / open)
    const centreKm: Pt = [centre.eastKm, centre.northKm]
    const speed = acrossSpeed(vel, [centre.eastKm / centre.km, centre.northKm / centre.km], centre.km, perRad)
    accepted.push({ km: centre.km, plane, blob: { cellId: id, centre: centreKm, alpha, speed,
      x: (left + right) / 2, y: (top + bottom) / 2,
      rx: Math.max(0.1, (right - left) / 2), ry: Math.max(0.1, (bottom - top) / 2) } })
  }
  return shadowLayers(terrain, box, accepted)
}

