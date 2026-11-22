//# allFunctionsCalledOnLoad
import { apparentAngle } from '../../data/terrain/panorama'
import { terrainY } from '../../world/terrain'
import { xOf } from '../../domain/camera'
import type { FieldCell } from '../../world/field/types'
import { cloudLight } from '../../world/lightCloud'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { layerKey } from './keys'
import type { LayerOf, Pt, SceneBox } from './types'

const RAD = Math.PI / 180
const SHADE: RGB = [0.04, 0.06, 0.12]
const RANGE = 60
// Eight support directions miss the level-ground circular footprint by at most r × (1 − cos(π/8)).
const rim = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)])
const ASPECT_STEP = 1.125
const LOG_ASPECT_STEP = Math.log(ASPECT_STEP)

type ShadowSprite = Pick<LayerOf<'cloudShadow'>, 'blobs' | 'rgb' | 'bounds' | 'period' | 'band' | 'key'>
const sprites = new Map<number, ShadowSprite>()
let spriteDpr: number

function shadowSprite(bucket: number, dpr: number): ShadowSprite {
  if (spriteDpr !== dpr) {
    spriteDpr = dpr
    sprites.clear()
  }
  const hit = sprites.get(bucket)
  if (hit) return hit
  const rx = 32 * ASPECT_STEP ** -Math.max(0, bucket)
  const ry = 32 * ASPECT_STEP ** Math.min(0, bucket)
  const w = 2 * (rx + 1), h = Math.ceil(2 * (ry + 1))
  const sprite = {
    blobs: [{ x: 0, y: 0, rx, ry, alpha: 1 }], rgb: SHADE,
    bounds: { x: -w / 2, y: -h / 2, w, h }, period: w * 4,
    band: { top: -h / 2, bottom: h / 2, fadeIn: null, fadeOut: null },
    key: layerKey('cloudShadow', bucket, dpr),
  }
  sprites.set(bucket, sprite)
  return sprite
}

type ShadowWorld = Pick<WorldState, 'cloudField' | 'camera' | 'flightTerrain'> & {
  light: Pick<WorldState['light'], 'azimuth' | 'altitude' | 'direct'>
  terrain: Pick<WorldState['terrain'], 'horizonY'>
}

type Projection = { x: number; km: number; eastKm: number; northKm: number; seaLevelM: number }

export function cloudShadowLayers(world: ShadowWorld, box: Pick<SceneBox, 'width' | 'dpr'>) {
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
  const blobs: (LayerOf<'cloudShadow'> & { rim: Pt[]; centre: Pt })[] = []

  const { eyeM, heightAt, blockedKm } = grid
  const screenX = (eastKm: number, northKm: number) =>
    xOf(Math.atan2(eastKm, northKm) / RAD, camera) * SCENE_W / camera.width
  const visible = (point: Projection) =>
    blockedKm(point.eastKm, point.northKm, point.seaLevelM - eyeM) === null

  function onGround(cellEastKm: number, cellNorthKm: number, cloudAboveEyeKm: number, groundAboveEyeKm = 0): Projection | undefined {
    let previousAboveEyeKm = groundAboveEyeKm, previousResidualKm = 0
    // Accept only solutions with a horizontal projection-equation residual of at most 10 m.
    for (let i = 0; i < 12; i++) {
      const eastKm = cellEastKm - (cloudAboveEyeKm - groundAboveEyeKm) * eastPerUp
      const northKm = cellNorthKm - (cloudAboveEyeKm - groundAboveEyeKm) * northPerUp
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

  const candidates: { cell: FieldCell; centre: Projection; alpha: number }[] = []
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

      const centre = onGround(x, y, baseAboveEyeKm + depth / 2)
      if (centre && visible(centre)) candidates.push({ cell, centre, alpha: alphaScale * (1 - Math.exp(-slant * invSin / 2) / open) })
    }
  }
  candidates.sort((a, b) => a.centre.km - b.centre.km)
  for (const { cell: { id, x, y, r, baseKm: baseAboveEyeKm, vKm: depth }, alpha, centre } of candidates) {
    if (blobs.length === 64) break
    const polygon: Pt[] = []
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    for (let i = 0; i < rim.length; i++) {
      const [u, v] = rim[i]
      const rx = x + r * (u * sin + v * cos)
      const ry = y + r * (u * cos - v * sin)
      const p = onGround(rx, ry, u < 0 ? baseAboveEyeKm + depth : baseAboveEyeKm, (centre.seaLevelM - eyeM) / 1000)
      if (!p || !visible(p)) continue
      const sx = p.x * scale
      const sy = terrainY(terrain.horizonY, apparentAngle(p.seaLevelM, p.km, eyeM))
      polygon.push([sx, sy])
      left = Math.min(left, sx)
      right = Math.max(right, sx)
      top = Math.min(top, sy)
      bottom = Math.max(bottom, sy)
    }
    if (polygon.length < 3) continue
    const rx = Math.max(0.1, (right - left) / 2), ry = Math.max(0.1, (bottom - top) / 2)
    // Cache fixed unit ellipses. Quantizing the aspect in 1.125× steps moves
    // the vertical bounds by at most sqrt(1.125) - 1 = 6.1% of the radius.
    const bucket = Math.round(Math.log(ry / rx) / LOG_ASPECT_STEP)
    const sprite = shadowSprite(bucket, box.dpr)
    blobs.push({
      kind: 'cloudShadow', id: `cloudShadow.${id}`, surface: 'land', z: 40.3, soft: true, blend: 'source-atop',
      rim: polygon, centre: [centre.eastKm, centre.northKm],
      placed: { x: (left + right) / 2, y: (top + bottom) / 2, scale: rx / sprite.blobs[0].rx, alpha },
      ...sprite,
    })
  }
  return blobs
}
