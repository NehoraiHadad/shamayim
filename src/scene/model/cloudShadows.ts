//# allFunctionsCalledOnLoad
import { apparentAngle } from '../../data/terrain/panorama'
import { FLIGHT_LOCAL_KM } from '../../world/flightTerrain'
import { terrainY } from '../../world/terrain'
import { spanDeg, xOf } from '../../domain/camera'
import type { FieldCell } from '../../world/field/types'
import { cloudLight } from '../../world/lightCloud'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { layerKey } from './keys'
import type { LayerOf, Pt, SceneBox } from './types'

const RAD = Math.PI / 180
const SHADE: RGB = [0.04, 0.06, 0.12]
const RANGE = 60
// Sample the footprint on its two principal axes; emit an ellipse for the painter.
const supports = [[1, 0], [-1, 0], [0, 1], [0, -1]]
type ShadowWorld = Pick<WorldState, 'cloudField' | 'camera'> & {
  flightTerrain?: Pick<NonNullable<WorldState['flightTerrain']>, 'eyeM' | 'heightAt' | 'blockedKm' | 'panoramaHeightsM'>
  light: Pick<WorldState['light'], 'azimuth' | 'altitude' | 'direct'>
  terrain: Pick<WorldState['terrain'], 'horizonY' | 'sightAt' | 'back'>
}

type Projection = { x: number; km: number; eastKm: number; northKm: number; seaLevelM: number }
type ShadowBlob = LayerOf<'cloudShadow'>['blobs'][number]
type ShadowPlane = LayerOf<'cloudShadow'>['plane']

export function cloudShadowLayers(world: ShadowWorld, box: Pick<SceneBox, 'width' | 'dpr' | 'landHeight'>) {
  const { light, terrain, cloudField, camera, flightTerrain: grid } = world
  // Below one 8-bit alpha step the largest possible shadow is subpixel in opacity.
  if (!cloudField || !grid || light.altitude <= 0 || 0.65 * light.direct < 1 / 255) return []
  const { field } = cloudField
  const { open } = cloudLight({ low: 0, mid: 0, high: 0 }, field)
  if (open <= 0) return []
  const altitude = light.altitude * RAD
  const cot = 1 / Math.tan(altitude)
  const sin = Math.sin(light.azimuth * RAD), cos = Math.cos(light.azimuth * RAD)
  // Azimuth is clockwise from north. Subtract this sunward displacement to cast the shadow.
  const eastPerUp = sin * cot, northPerUp = cos * cot
  const invSin = 1 / Math.sin(altitude)
  const alphaScale = 0.65 * light.direct
  const minDepth = -2 * Math.log(open * (1 - 1 / (255 * alphaScale))) / invSin
  const scale = box.width / SCENE_W
  const period = 360 * camera.pxPerDeg * box.width / camera.width

  const { eyeM, heightAt, blockedKm, panoramaHeightsM } = grid
  const halfView = spanDeg(camera) * RAD / 2
  const heading = camera.heading * RAD
  const leftEast = Math.cos(heading - halfView), leftNorth = -Math.sin(heading - halfView)
  const rightEast = -Math.cos(heading + halfView), rightNorth = Math.sin(heading + halfView)
  const groundMin = ((panoramaHeightsM?.[0] ?? 0) - eyeM) / 1000
  const groundMax = ((panoramaHeightsM?.[1] ?? 0) - eyeM) / 1000
  const furthestEyeProjection = RANGE + Math.max(Math.abs(groundMin), Math.abs(groundMax)) * cot + 0.010001
  const leftSun = leftEast * eastPerUp + leftNorth * northPerUp
  const rightSun = rightEast * eastPerUp + rightNorth * northPerUp
  const screenX = (eastKm: number, northKm: number) =>
    xOf(Math.atan2(eastKm, northKm) / RAD, camera) * SCENE_W / camera.width
  const visible = (point: Projection) =>
    blockedKm(point.eastKm, point.northKm, point.seaLevelM - eyeM) === null

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
        const km = Math.sqrt(eastKm * eastKm + northKm * northKm), x = screenX(eastKm, northKm)
        if (km <= RANGE && x >= 0 && x <= SCENE_W) return { x, km, eastKm, northKm, seaLevelM }
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

  const candidates: { cell: FieldCell; east: number; north: number; eyeDistanceSquared: number; slant: number }[] = []
  for (const { cells, layer } of cloudField.snapshot) {
    if (!layer || layer.lattice === 'high') continue
    for (const cell of cells) {
      const { x, y, r, baseKm: baseAboveEyeKm, vKm: depth, tau0: tau, genus, lattice } = cell
      if (tau < minDepth) continue
      // Integrate the horizontal taper on the central chord. Both this
      // layer-smoothed and the volume chord span at most min(V, 2r/cot(alt))
      // in height, bounding their T difference by 1 - exp(-tau × extent / (2 × spread × sin(alt))).
      const spread = depth * cot / (2 * r), extent = Math.min(1, spread)
      const power = lattice === 'tower' || genus === 'cu' || genus === 'cg' || genus === 'cb' ? 2 : 4
      const profile = spread > 0 ? extent / spread * (1 - extent ** power / (power + 1)) : 1
      const slant = tau * profile
      if (slant < minDepth) continue

      const h = baseAboveEyeKm + depth / 2
      const east = x - h * eastPerUp, north = y - h * northPerUp
      const eyeDistanceSquared = east * east + north * north
      // The centre moves along the sun axis. Beyond local-grid reach,
      // project both terrain-height limits onto the camera edge normals.
      if (panoramaHeightsM && halfView < Math.PI && Math.abs(x * cos - y * sin) > FLIGHT_LOCAL_KM) {
        if (eyeDistanceSquared > furthestEyeProjection ** 2) continue
        const leftmost = east * leftEast + north * leftNorth + Math.max(groundMin * leftSun, groundMax * leftSun)
        const rightmost = east * rightEast + north * rightNorth + Math.max(groundMin * rightSun, groundMax * rightSun)
        // Keep the accepted centre residual (10 m) inside the bound.
        const outsideLeft = leftmost < -0.010001, outsideRight = rightmost < -0.010001
        if (halfView <= Math.PI / 2 ? outsideLeft || outsideRight : outsideLeft && outsideRight) continue
      }
      candidates.push({ cell, east, north, eyeDistanceSquared, slant })
    }
  }
  // By the reverse triangle inequality, the eye-level distance differs from
  // the accepted centre distance by at most |groundM - eyeM| × cot(alt) / 1000 + 0.01 km.
  // Two centres can swap rank only if their proxy gap is within the sum of those bounds.
  candidates.sort((a, b) => a.eyeDistanceSquared - b.eyeDistanceSquared)
  const accepted: { km: number; plane: ShadowPlane; blob: ShadowBlob }[] = []
  for (const { cell: { id, r, vKm: depth }, east: eastAtEye, north: northAtEye, slant } of candidates) {
    if (accepted.length === 64) break
    const centre = onGround(eastAtEye, northAtEye)
    if (!centre || !visible(centre)) continue
    const sight = terrain.sightAt?.(centre.x)
    const plane = !sight || centre.km <= sight.nearKm ? 'near'
      : terrain.back && centre.km > sight.farKm ? 'back' : 'far'
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    // Project the footprint at the centre's sampled elevation for the receiving plane.
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
    accepted.push({ km: centre.km, plane, blob: { cellId: id, centre: centreKm, alpha,
      x: (left + right) / 2, y: (top + bottom) / 2,
      rx: Math.max(0.1, (right - left) / 2), ry: Math.max(0.1, (bottom - top) / 2) } })
  }
  const byPlane = new Map<ShadowPlane, ShadowBlob[]>()
  for (const { plane, blob } of accepted.sort((a, b) => a.km - b.km)) {
    const blobs = byPlane.get(plane)
    if (blobs) blobs.push(blob)
    else byPlane.set(plane, [blob])
  }
  return Array.from(byPlane, ([plane, blobs]): LayerOf<'cloudShadow'> => ({
    kind: 'cloudShadow', plane, id: `cloudShadow.${plane}`, surface: 'land', z: 40.3, soft: true, blend: 'source-atop',
    blobs, rgb: SHADE, bounds: { x: 0, y: 0, w: box.width, h: box.landHeight },
    key: layerKey('cloudShadow', plane, box.width, box.landHeight, box.dpr, JSON.stringify(blobs.map(({ x, y, rx, ry, alpha }) =>
      [x * 100, y * 100, rx * 100, ry * 100, alpha * 25500].map(Math.round)))),
  }))
}
