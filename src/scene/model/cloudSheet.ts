import { hashId } from '../../data/landmarks/hash'
import { RANGES } from '../../world/field/cells'
import { groundRangeAt, R_EFF_KM } from '../../world/field/project'
import { genusOf, smoothstep, unit } from '../../world/field/genus'
import { meanRadius } from '../../world/field/lattice'
import type { FieldLayer, Lattice } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import { gridFor, sheetFootprint, solarTexel } from './cloudSheetGrid'
import { layerKey } from './keys'
import { scaleLight } from './tone'
import type { SkyGeom } from './sky'
import type { LayerOf, RGB } from './types'
import { sheetDetail, sheetTexture, textureCorrection } from './cloudSheetTexture'

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
type Colours = { body: RGB; shade: RGB; lit: RGB; light: number; closed?: number }

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

const sheetOpacity = (tau: number, slant: number) => -Math.expm1(-tau * slant)
const sheetCache = new WeakMap<Snapshot, { world: WorldState; key: string; sheet: LayerOf<'cloudSheet'> }>()

// CIE standard overcast source: (1 + 2 sin altitude) / 3.
export const OVERCAST_HORIZON = 1 / 3

function shadeAmount(body: RGB, shade: RGB, limb: number) {
  const channel = body.indexOf(Math.max(...body))
  const bright = body[channel], dark = shade[channel]
  if (bright <= dark) return limb
  const target = scaleLight(body, 1 - (1 - OVERCAST_HORIZON) * limb)[channel]
  // The painter interpolates sRGB endpoints. Encode the linear-light ramp
  // in the interpolation amount using the brightest channel.
  return unit((bright - target) / (bright - dark))
}

export function cloudSheetOf(world: WorldState, geom: SkyGeom, snapshot: Snapshot, colours: Colours): LayerOf<'cloudSheet'> | null {
  const { layer, heightKm, densityGrid } = snapshot
  if (!layer || heightKm <= 0 || geom.horizon <= 0 || geom.width <= 0) return null
  const mix = sheetBlend(layer)
  if (!mix) return null
  const genus = genusOf(layer.lattice, layer.form, 0.5)
  const key = JSON.stringify([geom.width, geom.horizon, geom.azimuthRange.period, geom.azimuthAt(0),
    geom.azimuthAt(geom.width), geom.domeAltitudeAt(geom.horizon / 2), colours])
  const cached = sheetCache.get(snapshot)
  if (cached?.world === world && cached.key === key) return cached.sheet
  const cellular = genus === 'sc' || genus === 'ac'
  const veil = genus === 'cs'
  const grid = gridFor(world.place.id, layer, geom, heightKm, genus)
  const { xs, ys, altitudes, ranges, east, north, alpha, tone, tau, texture: raw, weights, path, slant, detail, expected, fade, facing } = grid
  const seed = hashId(`${world.place.id}:sheet:${layer.lattice}`)
  const texture = sheetTexture(genus, layer, seed)
  const deckEnd = Math.min(groundRangeAt(heightKm, 0), RANGES[layer.lattice][1])
  const angularStep = 360 * RAD * (xs[1] - xs[0]) / geom.azimuthRange.period
  const { expectedTauAt, rayRange, queryRadius } = densityGrid
  const depthAt = cellular ? densityGrid.resolvedTauAt : densityGrid.tauAt
  const resolvedEnd = Math.min(rayRange, queryRadius)
  const radius = meanRadius(layer.lattice, layer.g)
  // One centred tap has zero sweep, within both the texel footprint and
  // N3h's quarter-radius budget, and samples the instantaneous field.
  weights.length = ys.length
  for (let row = 0; row < ys.length; row++) {
    const range = ranges[row]
    const alt = altitudes[row]
    const previous = ranges[row - 1] ?? range, next = ranges[row + 1] ?? range
    const footprint = sheetFootprint(ranges, row, angularStep)
    // Feather the cellular source over the outer half of the resolved radius.
    // The footprint limit can start that transition earlier.
    const handoff = cellular ? smoothstep(resolvedEnd / 2, resolvedEnd, range)
      : smoothstep(queryRadius - 2 * radius, queryRadius - radius, range)
    const f = fade[row] = veil ? 1 : Math.max(handoff, smoothstep(radius, 2 * radius, footprint))
    const level = f === 1 ? 0 : sheetDetail(genus, footprint)
    const sample = level ? texture(footprint) : null
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
        expected[index] = expected[first]
        tau[index] = tau[first]
        detail[index] = detail[first]
        raw[index] = raw[first]
        continue
      }
      const depth = tau[index] = f < 1 ? depthAt(x, y) : 0
      expected[index] = f ? expectedTauAt(meanRange * east[col], meanRange * north[col]) : 0
      detail[index] = depth > layer.floorTau || (!cellular && f > 0) ? level : 0
      raw[index] = sample && detail[index] ? sample(x, y) : 1
    }
  }
  const corrected = textureCorrection(raw, tau, weights, xs.length, detail)
  const solar = solarTexel(world, geom, snapshot, grid, angularStep)
  const closed = colours.closed ?? 0
  let fingerprint = 2166136261
  for (let row = 0; row < ys.length; row++) {
    const f = fade[row], visibility = path[row], multiplier = slant[row]
    const limb = 1 - Math.sin(altitudes[row] * RAD)
    const ramp = closed ? shadeAmount(colours.body, colours.shade, limb) : limb
    const ambientSlant = cellular ? 1 : veil ? Math.min(1.5, multiplier) : multiplier
    const farSource = 1 - 1 / (1 + DIFFUSE_EXTINCTION * layer.kappa * layer.meanVKm * multiplier)
    // The far source includes sky fill as the ray traverses extra air.
    const aerial = cellular ? 0.25 * (world.air?.fade(Math.max(0, Math.min(ranges[row], deckEnd) - resolvedEnd)) ?? 0) : 0
    const farTone = farSource + aerial * (0.5 - farSource)
    if (!visibility) continue
    for (let col = 0; col < xs.length; col++) {
      const index = row * xs.length + col
      const local = tau[index]
      const depth = cellular ? local : local + f * (expected[index] - local)
      const texel = corrected(index)
      // The far density is already the log of the ensemble transmission for
      // unresolved footprints. Slanting it again turns the gaps into a solid band.
      const ambient = expected[index]
      const resolved = (1 - f) * sheetOpacity(local, multiplier)
      const unresolved = f * sheetOpacity(ambient, ambientSlant)
      const opacity = resolved + unresolved
      alpha[index] = visibility * (solar?.index === index ? opacity + solar.weight * (solar.opacity - opacity) : opacity)
      // Divide by the incident diffuse light of this same column. The upper
      // layers multiply both the numerator and its clear-column reference.
      const slantDepth = (veil ? Math.min(1, depth * multiplier) : depth * multiplier) * texel
      const diffuse = 1 / (1 + DIFFUSE_EXTINCTION * slantDepth)
      const forward = colours.light * facing[col] * Math.exp(-slantDepth)
      const thinTone = (1 - diffuse) * (1 - diffuse * forward)
      // At vertical depth 10 the column is opaque. Preserve the closed
      // deck's source ramp and leave texture in the open-deck tone only.
      let localTone = thinTone
      if (genus === 'ns') {
        // The rain-darkened body is the slab's diffuse source. Keep a
        // tenth of the thin-column variation on its brighter side.
        localTone = 0.4 + 0.1 * thinTone
      } else if (!cellular && !veil) {
        const thick = smoothstep(0, 10, depth)
        const openTone = unit(limb + (thinTone - 0.5) * diffuse)
        const baseTone = 0.5 + 0.5 * (openTone + closed * (ramp - openTone))
        localTone += thick * (baseTone - thinTone)
      }
      tone[index] = unit(cellular && opacity ? (resolved * localTone + unresolved * farTone) / opacity : localTone)
      fingerprint = Math.imul(fingerprint ^ Math.round(alpha[index] * 255) ^ (Math.round(tone[index] * 255) << 8), 16777619)
    }
  }
  const { body, shade, lit } = colours
  const sheet: LayerOf<'cloudSheet'> = {
    kind: 'cloudSheet', id: `cloudSheet.${layer.lattice}`, lattice: layer.lattice, genus,
    surface: 'sky', z: sheetZ[layer.lattice], soft: true, bounds: { x: 0, y: 0, w: geom.width, h: geom.horizon },
    xs: xs.slice(), ys: ys.slice(), alpha: alpha.slice(), tone: tone.slice(), body, shade, lit,
    key: layerKey('cloudSheet', fingerprint, xs.length, ys, geom.width, body, shade, lit),
  }
  sheetCache.set(snapshot, { world, key, sheet })
  return sheet
}
