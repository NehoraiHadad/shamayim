import { hashId } from '../../data/landmarks/hash'
import { RANGES } from '../../world/field/cells'
import { groundRangeAt, R_EFF_KM } from '../../world/field/project'
import { genusOf, smoothstep, unit } from '../../world/field/genus'
import { meanRadius } from '../../world/field/lattice'
import type { FieldLayer, Lattice } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import { gridFor, sheetFootprint, solarTexel, textureFootprint } from './cloudSheetGrid'
import { layerKey } from './keys'
import type { SkyGeom } from './sky'
import type { LayerOf, RGB } from './types'
import { edgeTexture, sheetDetail, sheetTexture, textureCorrection } from './cloudSheetTexture'

export const sheetWeight = ({ lattice, form, cover }: FieldLayer) => {
  if (lattice === 'tower' || !cover) return 0
  if (lattice === 'low') return form.strat
  // Broken Ac and Ci can still be rendered as fields before they merge to As or Cs.
  return Math.max(form.sheet, form.veil, form.nimbostratus ?? 0, smoothstep(0.35, 0.55, cover))
}

export const sheetBlend = (layer: FieldLayer) => smoothstep(0.05, 0.5, sheetWeight(layer))

export const sheetZ: Record<Lattice, number> = { high: 5.9, mid: 6.9, low: 7.9, tower: 7.95 }
const RAD = Math.PI / 180
type Snapshot = NonNullable<WorldState['cloudField']>['snapshot'][number]
type Colours = { body: RGB; shade: RGB; lit: RGB; light: number }

// Two-stream diffuse transmission uses 3/4 of the transport depth.
// Water-cloud droplets have scattering asymmetry g ≈ 0.85.
export const DIFFUSE_EXTINCTION = 0.75 * (1 - 0.85)

export function sheetPathFactor(base: number, thickness: number, altitude: number, edge: number) {
  if (altitude >= 90) return 1
  const angle = altitude * RAD
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const curvature = 2 * cos * cos / R_EFF_KM
  const entry = groundRangeAt(base, altitude)
  const full = 2 / (Math.sqrt(sin * sin + curvature * base) + Math.sqrt(sin * sin + curvature * (base + thickness)))
  return Math.min(full, Math.max(0, edge - entry) / (cos * thickness))
}

export const sheetOpacity = (tau: number, slant: number, texture: number) =>
  -Math.expm1(-tau * slant * texture)

// One-minute taps span ten minutes of advection. Frozen-advection turnover
// replaces one eleventh of the box per minute, leaving room for cell evolution.
export const SWEEP_TAPS = 11

export function cloudSheetOf(world: WorldState, geom: SkyGeom, snapshot: Snapshot, colours: Colours): LayerOf<'cloudSheet'> | null {
  const { layer, heightKm, densityGrid } = snapshot
  if (!layer || heightKm <= 0 || geom.horizon <= 0 || geom.width <= 0) return null
  const mix = sheetBlend(layer)
  if (!mix) return null
  const genus = genusOf(layer.lattice, layer.form, 0.5)
  const grid = gridFor(world.place.id, layer, geom, heightKm, genus)
  const { xs, ys, altitudes, ranges, east, north, alpha, tone, tau, texture: raw, weights, path, slant, detail, expected, point, swept, fade, facing } = grid
  const seed = hashId(`${world.place.id}:sheet:${layer.lattice}`)
  const texture = sheetTexture(genus, layer, seed)
  const deckEnd = Math.min(groundRangeAt(heightKm, 0), RANGES[layer.lattice][1])
  const angularStep = 360 * RAD * (xs[1] - xs[0]) / geom.azimuthRange.period
  const { tauAt, expectedTauAt, queryRadius } = densityGrid
  const radius = meanRadius(layer.lattice, layer.g)
  const [ve, vn] = layer.vel
  // Resolved water-cloud edges can cross a point even when the wind moves
  // less than a footprint radius. Broad ice layers need no sweep.
  const sweep = layer.lattice !== 'high' && (ve !== 0 || vn !== 0)
  const halfSweep = (SWEEP_TAPS - 1) / 2
  swept.length = sweep ? alpha.length * SWEEP_TAPS : 0
  weights.length = ys.length
  for (let row = 0; row < ys.length; row++) {
    const range = ranges[row]
    const alt = altitudes[row]
    const previous = ranges[row - 1] ?? range, next = ranges[row + 1] ?? range
    const footprint = sheetFootprint(ranges, row, angularStep)
    // Enter the lowest 10° on the ensemble path. Spread the hand-off
    // over two 3° intervals so the final resolved row cannot create a seam.
    const f = fade[row] = Math.max(smoothstep(queryRadius - 2 * radius, queryRadius - radius, range),
      smoothstep(radius, 3 * radius, footprint), 1 - smoothstep(10, 16, alt))
    const cross = genus === 'sc' || genus === 'ac' ? textureFootprint(range, angularStep) : footprint
    const level = sheetDetail(genus, cross)
    const sample = level ? texture(cross) : null
    path[row] = mix
    slant[row] = sheetPathFactor(layer.baseKm, layer.meanVKm, alt, Infinity)
    const inner = Math.min(deckEnd, (previous + range) / 2)
    const outer = Math.min(deckEnd, (next + range) / 2)
    const meanRange = Math.min(range, deckEnd)
    weights[row] = path[row] ? outer * outer - inner * inner : 0
    for (let col = 0; col < xs.length; col++) {
      const x = range * east[col], y = range * north[col]
      const index = row * xs.length + col
      if (range === 0 && col) {
        const first = index - col
        point[index] = point[first]
        expected[index] = expected[first]
        tau[index] = tau[first]
        detail[index] = detail[first]
        raw[index] = raw[first]
        continue
      }
      const local = point[index] = f < 1 ? tauAt(x, y) : 0
      if (sweep && f < 1) {
        // Integrate transmission along the air parcel trajectory. Average after
        // Beer–Lambert so an opaque tap cannot black out adjacent clear taps.
        for (let tap = 0; tap < SWEEP_TAPS; tap++) {
          const dt = tap - halfSweep
          swept[index * SWEEP_TAPS + tap] = dt ? tauAt(x + dt * ve, y + dt * vn) : local
        }
      }
      const mean = expected[index] = f ? expectedTauAt(meanRange * east[col], meanRange * north[col]) : 0
      const depth = tau[index] = local + f * (mean - local)
      detail[index] = depth > layer.floorTau || f > 0 ? level : 0
      raw[index] = sample ? sample(x, y) : 1
    }
  }
  const corrected = textureCorrection(raw, tau, weights, xs.length, detail)
  const solar = solarTexel(world, geom, snapshot, grid, angularStep)
  let fingerprint = 2166136261
  for (let row = 0; row < ys.length; row++) {
    const f = fade[row], visibility = path[row], multiplier = slant[row]
    const limb = 1 - Math.sin(altitudes[row] * RAD)
    const cross = textureFootprint(ranges[row], angularStep)
    if (!visibility) continue
    for (let col = 0; col < xs.length; col++) {
      const index = row * xs.length + col
      const depth = tau[index]
      const texel = corrected(index)
      const m = multiplier * edgeTexture(genus, cross, raw[index], SWEEP_TAPS)
      // expectedTauAt is the Boolean model's vertical log-transmission.
      // Scaling it by m approximates the ensemble at slant incidence.
      let local = 0
      if (f < 1) {
        if (sweep) {
          const start = (ranges[row] === 0 ? index - col : index) * SWEEP_TAPS
          for (let tap = 0; tap < SWEEP_TAPS; tap++) local += sheetOpacity(swept[start + tap], m, 1)
          local /= SWEEP_TAPS
        } else {
          local = sheetOpacity(point[index], m, 1)
        }
      }
      const opacity = (1 - f) * local + (f ? f * sheetOpacity(expected[index], m, 1) : 0)
      alpha[index] = visibility * (solar?.index === index ? opacity + solar.weight * (solar.opacity - opacity) : opacity)
      // Divide by the incident diffuse light of this same column. The upper
      // layers multiply both the numerator and its clear-column reference.
      const slantDepth = depth * multiplier * texel
      const diffuse = 1 / (1 + DIFFUSE_EXTINCTION * slantDepth)
      const forward = colours.light * facing[col] * Math.exp(-slantDepth)
      const thinTone = (1 - diffuse) * (1 - diffuse * forward)
      // The body/shade endpoints encode a two-stream source proportional
      // to μ + 2/3. Modulate that ramp by the residual diffuse transmission.
      const thick = smoothstep(0, 10, depth)
      const baseTone = 0.5 + 0.5 * unit(limb + (thinTone - 0.5) * diffuse)
      tone[index] = unit(thinTone + thick * (baseTone - thinTone))
      fingerprint = Math.imul(fingerprint ^ Math.round(alpha[index] * 255) ^ (Math.round(tone[index] * 255) << 8), 16777619)
    }
  }
  const { body, shade, lit } = colours
  return {
    kind: 'cloudSheet', id: `cloudSheet.${layer.lattice}`, lattice: layer.lattice, genus,
    surface: 'sky', z: sheetZ[layer.lattice], soft: true, bounds: { x: 0, y: 0, w: geom.width, h: geom.horizon },
    xs: xs.slice(), ys: ys.slice(), alpha: alpha.slice(), tone: tone.slice(), body, shade, lit,
    key: layerKey('cloudSheet', fingerprint, xs.length, ys, geom.width, body, shade, lit),
  }
}
