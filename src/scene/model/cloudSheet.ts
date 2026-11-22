import { hashId } from '../../data/landmarks/hash'
import { RANGES } from '../../world/field/cells'
import { altitudeOf, groundRangeAt, R_EFF_KM } from '../../world/field/project'
import { genusOf, smoothstep, unit } from '../../world/field/genus'
import { meanRadius } from '../../world/field/lattice'
import type { FieldLayer, Lattice } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import { gridFor, sheetFootprint } from './cloudSheetGrid'
import { layerKey } from './keys'
import type { SkyGeom } from './sky'
import type { LayerOf, RGB } from './types'
import { sheetDetail, sheetTexture, textureCorrection } from './cloudSheetTexture'

export const sheetWeight = ({ form, cover }: FieldLayer) =>
  Math.max(form.strat, form.sheet, form.veil, smoothstep(0.35, 0.55, cover))

export const sheetBlend = (layer: FieldLayer) => smoothstep(0.05, 0.5, sheetWeight(layer))

const Z: Record<Lattice, number> = { high: 5.9, mid: 6.9, low: 7.9, tower: 7.95 }
const RAD = Math.PI / 180
type Snapshot = NonNullable<WorldState['cloudField']>['snapshot'][number]
type Colours = { body: RGB; shade: RGB; lit: RGB; light: number }

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

export function cloudSheetOf(world: WorldState, geom: SkyGeom, snapshot: Snapshot, colours: Colours): LayerOf<'cloudSheet'> | null {
  const { layer, heightKm, densityGrid } = snapshot
  if (!layer || heightKm <= 0 || geom.horizon <= 0 || geom.width <= 0) return null
  const mix = sheetBlend(layer)
  if (!mix) return null
  const { xs, ys, ranges, east, north, alpha, tone, tau, texture: raw, weights, path, slant, detail, expected, point, fade, facing } =
    gridFor(world.place.id, layer, geom, heightKm)
  const genus = genusOf(layer.lattice, layer.form, 0.5)
  const seed = hashId(`${world.place.id}:sheet:${layer.lattice}`)
  const texture = sheetTexture(genus, layer, seed)
  const sun = world.bodies.sun.azimuth * RAD
  const sunEast = Math.sin(sun), sunNorth = Math.cos(sun)
  for (let col = 0; col < xs.length; col++) facing[col] = unit(0.5 + 0.5 * (sunEast * east[col] + sunNorth * north[col])) ** 6
  const deckEnd = Math.min(groundRangeAt(heightKm, 0), RANGES[layer.lattice][1])
  const exit = Math.max(0, altitudeOf(layer.baseKm, deckEnd))
  const fullPath = Math.max(exit + 0.01, altitudeOf(layer.baseKm + layer.meanVKm, deckEnd))
  const angularStep = 360 * RAD * (xs[1] - xs[0]) / geom.azimuthRange.period
  const { tauAt, expectedTauAt, queryRadius } = densityGrid
  const radius = meanRadius(layer.lattice, layer.g)
  weights.length = ys.length
  for (let row = 0; row < ys.length; row++) {
    const range = ranges[row]
    const previous = ranges[row - 1] ?? range, next = ranges[row + 1] ?? range
    const footprint = sheetFootprint(ranges, row, angularStep)
    const f = fade[row] = range > queryRadius ? 1 : smoothstep(0.5 * radius, 2 * radius, footprint)
    const level = sheetDetail(genus, footprint)
    const sample = level ? texture(footprint) : null
    const alt = geom.domeAltitudeAt(ys[row])
    path[row] = mix * smoothstep(exit, fullPath, alt)
    slant[row] = sheetPathFactor(layer.baseKm, layer.meanVKm, alt, deckEnd)
    const inner = Math.min(deckEnd, (previous + range) / 2)
    const outer = Math.min(deckEnd, (next + range) / 2)
    weights[row] = outer * outer - inner * inner
    for (let col = 0; col < xs.length; col++) {
      const x = range * east[col], y = range * north[col]
      const index = row * xs.length + col
      const local = point[index] = f < 1 ? tauAt(x, y) : 0
      const mean = expected[index] = f ? expectedTauAt(x, y) : 0
      const depth = tau[index] = local + f * (mean - local)
      detail[index] = depth > layer.floorTau || f > 0 ? level : 0
      raw[index] = sample && detail[index] ? sample(x, y) : 1
    }
  }
  const corrected = textureCorrection(raw, tau, weights, xs.length, detail)
  let fingerprint = 2166136261
  for (let row = 0; row < ys.length; row++) {
    const f = fade[row], visibility = path[row], multiplier = slant[row]
    const blendTransmission = f > 0 && f < 1
    for (let col = 0; col < xs.length; col++) {
      const index = row * xs.length + col
      const depth = tau[index]
      const m = visibility ? multiplier * corrected(index) : 0
      // expectedTauAt is the Boolean model's vertical log-transmission.
      // Scaling it by m approximates the ensemble at slant incidence.
      const opacity = blendTransmission
        ? (1 - f) * sheetOpacity(point[index], m, 1) + f * sheetOpacity(expected[index], m, 1)
        : sheetOpacity(depth, m, 1)
      alpha[index] = visibility * opacity
      tone[index] = unit(0.52 + (0.48 * depth - colours.light * facing[col]) / (1 + depth))
      fingerprint = Math.imul(fingerprint ^ Math.round(alpha[index] * 255) ^ (Math.round(tone[index] * 255) << 8), 16777619)
    }
  }
  const { body, shade, lit } = colours
  return {
    kind: 'cloudSheet', id: `cloudSheet.${layer.lattice}`, lattice: layer.lattice, genus,
    surface: 'sky', z: Z[layer.lattice], soft: true, bounds: { x: 0, y: 0, w: geom.width, h: geom.horizon },
    xs: xs.slice(), ys: ys.slice(), alpha: alpha.slice(), tone: tone.slice(), body, shade, lit,
    key: layerKey('cloudSheet', fingerprint, xs.length, ys, geom.width, body, shade, lit),
  }
}
