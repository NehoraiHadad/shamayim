//# allFunctionsCalledOnLoad
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

type ShadowWorld = Pick<WorldState, 'cloudField' | 'camera'> & {
  light: Pick<WorldState['light'], 'azimuth' | 'altitude' | 'direct'>
  terrain: Pick<WorldState['terrain'], 'seenAt' | 'groundAt' | 'eyeM'>
}

type GroundPoint = { x: number; km: number; px: number; py: number }
type Projection = GroundPoint & { ground: number }
type CellProjection = { x: number; y: number; r: number; base: number; depth: number; points: (Projection | undefined)[] }
type ProjectedCells = Map<FieldCell['id'], CellProjection>
const projections = new WeakMap<NonNullable<ShadowWorld['terrain']['groundAt']>, Map<string, ProjectedCells>>()

export function cloudShadowLayers(world: ShadowWorld, box: Pick<SceneBox, 'width' | 'dpr'>) {
  const { light, terrain, cloudField, camera } = world
  // Below one 8-bit alpha step the largest possible shadow is subpixel in opacity.
  if (!cloudField || !terrain.seenAt || !terrain.groundAt || light.altitude <= 0 || 0.65 * light.direct < 1 / 255) return []
  const { field } = cloudField
  const { open } = cloudLight({ low: 0, mid: 0, high: 0 }, field)
  if (open <= 0) return []
  const altitude = light.altitude * RAD
  const cot = 1 / Math.tan(altitude)
  const sin = Math.sin(light.azimuth * RAD), cos = Math.cos(light.azimuth * RAD)
  const east = sin * cot, north = cos * cot
  const invSin = 1 / Math.sin(altitude)
  const alphaScale = 0.65 * light.direct
  const minDepth = -2 * Math.log(open * (1 - 1 / (255 * alphaScale))) / invSin
  const scale = box.width / SCENE_W
  const blobs: (LayerOf<'cloudShadow'> & { rim: Pt[]; centre: Pt })[] = []

  const groundAt = terrain.groundAt
  const eyeM = terrain.eyeM ?? 0
  const frame = [eyeM, east, north, camera.heading, camera.handed, camera.pxPerDeg, camera.width].join(':')
  let frames = projections.get(groundAt)
  if (!frames) projections.set(groundAt, (frames = new Map()))
  const previous = frames.get(frame)
  const current: ProjectedCells = new Map()
  frames.delete(frame)
  if (frames.size >= 4) frames.delete(frames.keys().next().value!)
  frames.set(frame, current)

  const screenX = (x: number, y: number) => xOf(Math.atan2(x, y) / RAD, camera) * SCENE_W / camera.width

  function onGround(x: number, y: number, height: number, ground = 0): Projection | undefined {
    // Bound the projection-equation residual to 10 m in the horizontal plane.
    for (let i = 0; i < 12; i++) {
      const px = x - (height - ground) * east, py = y - (height - ground) * north
      const km = Math.sqrt(px * px + py * py)
      if (km > RANGE) return
      const sx = screenX(px, py)
      if (sx < 0 || sx > SCENE_W) return
      const sample = groundAt(sx, km)
      if (sample == null) return
      const next = (sample - eyeM) / 1000
      if (Math.abs(next - ground) * cot <= 0.01) return { x: sx, km, px, py, ground: next }
      ground = next
    }
  }

  const candidates: { cell: FieldCell; distance: number; alpha: number }[] = []
  for (const { cells, layer } of cloudField.snapshot) {
    if (!layer || layer.lattice === 'high') continue
    for (const cell of cells) {
      const { x, y, r, baseKm: base, vKm: depth, tau0: tau, genus, lattice } = cell
      if (tau < minDepth) continue
      const h = base + depth / 2
      // Eye-level pre-culling can displace the centre by |ground above eye| × cot(alt).
      const px = x - h * east, py = y - h * north
      const distance = px * px + py * py
      if (distance > RANGE ** 2) continue
      const sx = screenX(px, py)
      if (sx < 0 || sx > SCENE_W) continue
      // Integrate the horizontal taper on the central chord. Both this
      // layer-smoothed and the volume chord span at most min(V, 2r/cot(alt))
      // in height, bounding their T difference by 1 - exp(-tau × extent / (2 × spread × sin(alt))).
      const spread = depth * cot / (2 * r), extent = Math.min(1, spread)
      const power = lattice === 'tower' || genus === 'cu' || genus === 'cg' || genus === 'cb' ? 2 : 4
      const profile = spread > 0 ? extent / spread * (1 - extent ** power / (power + 1)) : 1
      const slant = tau * profile
      if (slant < minDepth) continue
      const alpha = alphaScale * (1 - Math.exp(-slant * invSin / 2) / open)
      candidates.push({ cell, distance, alpha })
    }
  }
  candidates.sort((a, b) => a.distance - b.distance)
  for (const { cell: { id, x, y, r, baseKm: base, vKm: depth }, alpha } of candidates.slice(0, 64)) {
    const cached = previous?.get(id)
    const hit = cached && cached.x === x && cached.y === y && cached.r === r && cached.base === base && cached.depth === depth
    const points = hit ? cached.points : [onGround(x, y, base + depth / 2)]
    current.set(id, { x, y, r, base, depth, points })
    const centre = points[0]
    if (!centre) continue
    const polygon: Pt[] = []
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
    for (let i = 0; i < rim.length; i++) {
      const [u, v] = rim[i]
      const rx = x + r * (u * sin + v * cos)
      const ry = y + r * (u * cos - v * sin)
      const p = hit ? points[i + 1] : onGround(rx, ry, u < 0 ? base + depth : base, centre.ground)
      if (!hit) points.push(p)
      if (!p) continue
      const seen = terrain.seenAt!(p.x, p.km)
      if (!seen) continue
      const sx = p.x * scale, sy = seen.groundY
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
      rim: polygon, centre: [centre.px, centre.py],
      placed: { x: (left + right) / 2, y: (top + bottom) / 2, scale: rx / sprite.blobs[0].rx, alpha },
      ...sprite,
    })
  }
  return blobs
}
