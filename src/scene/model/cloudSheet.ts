import { hashId } from '../../data/landmarks/hash'
import { sheetRecoveryShare } from '../../domain/cloudDaylight'
import { RANGES } from '../../world/field/cells'
import { groundRangeAt } from '../../world/field/project'
import { genusOf, smoothstep, unit } from '../../world/field/genus'
import { meanRadius } from '../../world/field/lattice'
import type { Lattice } from '../../world/field/types'
import type { WorldState } from '../../world/types'
import { gridFor, sheetFootprint, solarTexel } from './cloudSheetGrid'
import { CITY_RGB, type CityOnBase } from './cityLight'
import { sheetCity } from './cloudSheetCity'
import { seenDepth } from './cloudSheetSeen'
import { sheetThrough } from './cloudDust'
import { layerKey } from './keys'
import type { SkyGeom } from './sky'
import type { LayerOf, RGB } from './types'
import { baseSource } from './cloudSheetBase'
import { sheetDetail, sheetTexture, textureCorrection } from './cloudSheetTexture'
import { DIFFUSE_EXTINCTION, rowSpeeds, shadeAmount, sheetOpacity, sheetPathFactor, RAD } from './cloudSheetMath'
export { DIFFUSE_EXTINCTION, OVERCAST_HORIZON, sheetPathFactor } from './cloudSheetMath'
export const sheetZ: Record<Lattice, number> = { high: 5.9, mid: 6.9, low: 7.9, tower: 7.95 }
type Snapshot = NonNullable<WorldState['cloudField']>['snapshot'][number]
type Colours = { body: RGB; shade: RGB; lit: RGB; light: number; closed?: number; daylit?: number }
const sheetCache = new WeakMap<Snapshot, { world: WorldState; key: string; sheet: LayerOf<'cloudSheet'> }>()
export function cloudSheetOf(world: WorldState, geom: SkyGeom, snapshot: Snapshot, colours: Colours,
  cityAt: CityOnBase | null = null): LayerOf<'cloudSheet'> | null {
  const { layer, heightKm, densityGrid } = snapshot
  if (!layer || heightKm <= 0 || geom.horizon <= 0 || geom.width <= 0) return null
  if (layer.lattice === 'tower' || !layer.cover) return null
  const genus = genusOf(layer.lattice, layer.form, 0.5)
  const cellular = genus === 'sc' || genus === 'ac'
  const recovery = cellular ? sheetRecoveryShare(world.bodies.sun.altitude) : 0
  const key = JSON.stringify([geom.width, geom.horizon, geom.azimuthRange.period, geom.azimuthAt(0),
    geom.azimuthAt(geom.width), geom.domeAltitudeAt(geom.horizon / 2), colours, recovery])
  const cached = sheetCache.get(snapshot)
  if (cached?.world === world && cached.key === key) return cached.sheet
  const veil = genus === 'cs'
  const grid = gridFor(world.place.id, layer, geom, heightKm, genus)
  const { xs, ys, altitudes, ranges, east, north, alpha, tone, tau, texture: raw, weights, path, slant, detail, expected, fade, facing } = grid
  const seed = hashId(`${world.place.id}:sheet:${layer.lattice}`)
  const texture = sheetTexture(genus, layer, seed)
  const deckEnd = Math.min(groundRangeAt(heightKm, 0), RANGES[layer.lattice][1])
  const angularStep = 360 * RAD * (xs[1] - xs[0]) / geom.azimuthRange.period
  const { expectedTauAt, rayRange, queryRadius } = densityGrid
  const seen = seenDepth(world.place.id, world.cloudField?.field.t ?? 0, snapshot, geom,
    cellular ? densityGrid.resolvedTauAt : densityGrid.tauAt)
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
    const depthAt = seen(range, alt)
    path[row] = 1
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
  const { daylit = 0, closed = 0 } = colours
  const city = cityAt && sheetCity(cityAt, grid, heightKm, deckEnd)
  let fingerprint = (city ?? []).reduce((sum, w) => Math.imul(sum ^ Math.round(w * 255), 16777619), 2166136261)
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
      const thinned = depth ? corrected(index) : 1
      const localOpacity = local && (f < 1 || recovery) ? sheetOpacity(local, multiplier) : 0
      // Raise mean texel depth above −3°, including decks lit by afterglow or city light during the −6° to −3° taper.
      const texel = recovery && thinned < 1
        ? thinned + 0.5 * recovery * localOpacity * (1 - thinned) ** 2 : thinned
      // The far density is already the log of the ensemble transmission for
      // unresolved footprints. Slanting it again turns the gaps into a solid band.
      const resolved = (1 - f) * localOpacity
      const unresolved = f ? f * sheetOpacity(expected[index], ambientSlant) : 0
      const opacity = resolved + unresolved
      alpha[index] = visibility * (solar?.index === index ? opacity + solar.weight * (solar.opacity - opacity) : opacity)
      // Upper layers cancel when dividing by the same column's incident diffuse light.
      const slantDepth = depth && (veil ? Math.min(1, depth * multiplier) : depth * multiplier) * texel
      const diffuse = 1 / (1 + DIFFUSE_EXTINCTION * slantDepth)
      const thinTone = slantDepth ? (1 - diffuse) * (1 - diffuse * (colours.light * facing[col] * Math.exp(-slantDepth))) : 0
      // Ns keeps a tenth of the thin-column variation above its rain-darkened body.
      let localTone = genus === 'ns' ? 0.4 + 0.1 * thinTone : thinTone
      if (genus !== 'ns' && !cellular && !veil) {
        // At vertical depth 10 preserve the opaque source ramp, with texture only in the open deck.
        const thick = smoothstep(0, 10, depth)
        const openTone = unit(limb + (thinTone - 0.5) * diffuse)
        const baseTone = 0.5 + 0.5 * (openTone + closed * (ramp - openTone))
        localTone += thick * (baseTone - thinTone)
      }
      tone[index] = unit(cellular && opacity ? (resolved * localTone + unresolved * farTone) / opacity : localTone)
      fingerprint = Math.imul(fingerprint ^ Math.round(alpha[index] * 255) ^ (Math.round(tone[index] * 255) << 8), 16777619)
    }
  }
  const source = genus === 'ns' ? baseSource(grid, layer, seed, angularStep, corrected) : null
  for (const value of source ?? []) fingerprint = Math.imul(fingerprint ^ Math.round(value * 255), 16777619)
  const through = sheetThrough(world.air, layer.baseKm, altitudes, world.bodies.sun.altitude)
  // A 1/64 step keeps the maximum change in drawn low-light weight below 2% and fits the key's hundredths.
  const paintDaylight = Math.round(daylit * 64) / 64
  const sheet: LayerOf<'cloudSheet'> = {
    kind: 'cloudSheet', id: `cloudSheet.${layer.lattice}`, lattice: layer.lattice, genus,
    surface: 'sky', z: sheetZ[layer.lattice], soft: true, bounds: { x: 0, y: 0, w: geom.width, h: geom.horizon },
    xs: xs.slice(), ys: ys.slice(), alpha: alpha.slice(), tone: tone.slice(), body: colours.body, shade: colours.shade, lit: colours.lit,
    ...(source && { source }), ...(through && { through }), ...(paintDaylight && { daylit: paintDaylight }),
    ...(city && { city: { rgb: CITY_RGB, weight: city } }),
    speeds: rowSpeeds(geom, layer.vel, east, north, ranges.map((range) => Math.hypot(range, heightKm))),
    key: layerKey('cloudSheet', fingerprint, xs.length, ys, geom.width, colours.body, colours.shade, colours.lit, ...(through ? [through] : []),
      ...(paintDaylight ? [paintDaylight] : [])),
  }
  sheetCache.set(snapshot, { world, key, sheet })
  return sheet
}
