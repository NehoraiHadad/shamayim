//# allFunctionsCalledOnLoad
import { xOf } from '../../domain/camera'
import { RANGES, visitCells } from '../../world/field/cells'
import { cloudLight } from '../../world/lightCloud'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { layerKey } from './keys'
import type { LayerOf, Pt, SceneBox } from './types'

const RAD = Math.PI / 180
const SHADE: RGB = [0.04, 0.06, 0.12]
const RANGE = 60
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
  terrain: Pick<WorldState['terrain'], 'seenAt' | 'groundAt'>
}

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
  const scale = box.width / SCENE_W
  const blobs: (LayerOf<'cloudShadow'> & { rim: Pt[]; centre: Pt })[] = []

  function onGround(x: number, y: number, height: number) {
    // Fixed-point projection onto the DEM. Stop once the two sides of the
    // projection equation agree within 10 m, and discard unresolved intersections.
    let ground = 0
    for (let i = 0; i < 12; i++) {
      const px = x - (height - ground) * east
      const py = y - (height - ground) * north
      const km = Math.sqrt(px * px + py * py)
      if (km > RANGE) return
      const screenX = xOf(Math.atan2(px, py) / RAD, camera)
      if (screenX < 0 || screenX > SCENE_W) return
      const sample = terrain.groundAt!(screenX, km)
      if (sample == null) return
      const next = sample / 1000
      if (Math.abs(next - ground) * cot <= 0.01) return { x: screenX, km, px, py }
      ground = next
    }
  }

  for (const layer of field.layers) {
    const { lattice, baseKm, meanVKm } = layer
    if (lattice === 'high' || !layer.cover || blobs.length >= 64) continue
    const h = baseKm + meanVKm / 2
    const heightSlack = lattice === 'low' ? 3 : lattice === 'mid' ? 5 : 12
    const search = RANGE + heightSlack * cot
    const individualLimit = RANGES[lattice][1]
    // Outside the field's published far ranges cloud is represented by ensemble
    // transmission, so only its deck attenuation is represented there. The
    // per-cell alpha omitted at that distance is bounded by 0.65 × direct.
    const useFieldRange = search >= individualLimit
    visitCells(field, lattice, useFieldRange ? 0 : h * east, useFieldRange ? 0 : h * north,
      Math.min(search, individualLimit), 0,
      (i, j, x, y, r, base, depth, tau, _share, _seed, genus) => {
        if (blobs.length >= 64) return false
        if (!tau || x * x + y * y > individualLimit * individualLimit) return
        const centre = onGround(x, y, base + depth / 2)
        if (!centre) return
        // Integrate the central chord of the swept column. The profile integral
        // of 1 - u² or 1 - u⁴ over [-extent, extent] is analytic.
        const spread = depth * cot / (2 * r)
        const extent = Math.min(1, spread)
        const power = lattice === 'tower' || genus === 'cu' ? 2 : 4
        const meanProfile = spread > 0 ? extent / spread * (1 - extent ** power / (power + 1)) : 1
        const transmission = Math.exp(-tau * meanProfile * invSin / 2)
        const alpha = 0.65 * Math.max(0, 1 - transmission / open) * light.direct
        if (alpha <= 0) return
        const polygon: Pt[] = []
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
        for (const [u, v] of rim) {
          const rx = x + r * (u * sin + v * cos)
          const ry = y + r * (u * cos - v * sin)
          const p = onGround(rx, ry, u < 0 ? base + depth : base)
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
        if (polygon.length < 3) return
        const rx = Math.max(0.1, (right - left) / 2), ry = Math.max(0.1, (bottom - top) / 2)
        // Cache fixed unit ellipses. Quantizing the aspect in 1.125× steps moves
        // the vertical bounds by at most sqrt(1.125) - 1 = 6.1% of the radius.
        const bucket = Math.round(Math.log(ry / rx) / LOG_ASPECT_STEP)
        const sprite = shadowSprite(bucket, box.dpr)
        blobs.push({
          kind: 'cloudShadow', id: `cloudShadow.${lattice}.${i}.${j}`, surface: 'land', z: 40.3, soft: true, blend: 'source-atop',
          rim: polygon, centre: [centre.px, centre.py],
          placed: { x: (left + right) / 2, y: (top + bottom) / 2, scale: rx / sprite.blobs[0].rx, alpha },
          ...sprite,
        })
      })
  }
  return blobs
}
