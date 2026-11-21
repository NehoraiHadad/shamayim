import { layerCovers, lowBaseM } from '../clouds'
import { hashId, seeded } from '../../data/landmarks/hash'
import { anchorDate, steeringTimeline, steeringWind, wallMinutes } from './advect'
import { formOf, GENERA, smoothstep } from './genus'
import { occupancyOf, splitLowCover } from './occupancy'
import type { CloudField, FieldInput, FieldLayer, Genus, Lattice, LayerForm } from './types'

const lattices: readonly Lattice[] = ['low', 'tower', 'mid', 'high']
const mean = ([a, b]: readonly [number, number]) => (a + b) / 2
const mix = (a: number, b: number, f: number) => a + (b - a) * f

/** Physical base, thickness and extinction for a genus and its site aspect. */
export function dimensions(genus: Genus, lowBaseKm: number, form: LayerForm, aspect: number, widthKm?: number) {
  const { base, thickness, kappa } = GENERA[genus]
  const lcl = genus === 'cu' || genus === 'cg' || genus === 'cb' || genus === 'sc' || genus === 'st'
  const baseKm = lcl ? Math.max(base[0], Math.min(base[1], lowBaseKm)) : mean(base)
  let vKm = mix(thickness[0], thickness[1], aspect)
  if (genus === 'cb') vKm -= baseKm
  if (genus === 'cu') {
    const blend = smoothstep(0.1, 0.4, form.conv)
    const cuAspect = mix(0.4, 0.8, blend)
    const lo = mix(0.15, 0.5, blend)
    const hi = mix(0.5, 1.5, blend)
    vKm = Math.max(lo, Math.min(hi, (widthKm ?? mix(0.6, 1.25, blend)) * cuAspect))
  } else if (genus === 'cg' && widthKm !== undefined) {
    vKm = Math.max(2, Math.min(5, widthKm * mix(1.2, 1.5, aspect)))
  }
  return { baseKm, vKm, kappa }
}

function blendedDimensions(a: Genus, b: Genus, f: number, lowBaseKm: number, form: LayerForm) {
  const da = dimensions(a, lowBaseKm, form, 0.5)
  const db = dimensions(b, lowBaseKm, form, 0.5)
  return {
    baseKm: mix(da.baseKm, db.baseKm, f),
    vKm: mix(da.vKm, db.vKm, f),
    kappa: mix(da.kappa, db.kappa, f),
  }
}

function layerDimensions(lattice: Lattice, lowBaseKm: number, form: LayerForm) {
  switch (lattice) {
    case 'low': return blendedDimensions('cu', form.stratus ? 'st' : 'sc', form.strat, lowBaseKm, form)
    case 'tower': return blendedDimensions('cg', 'cb', smoothstep(0.6, 1, form.conv), lowBaseKm, form)
    case 'mid': return blendedDimensions('ac', form.nimbostratus ? 'ns' : 'as',
      form.nimbostratus ? 1 : form.sheet, lowBaseKm, form)
    case 'high': return blendedDimensions('ci', 'cs', form.veil, lowBaseKm, form)
  }
}

function fallbackMotion(input: FieldInput, zAslKm: number, t: number, offset: [number, number]) {
  const { speedKmh, fromDeg } = input.wind10
  const vel = steeringWind({ time: input.at, windSpeed: speedKmh, windDirection: fromDeg }, zAslKm, input.elevationKm)
  const elapsedMin = t // fixed Unix epoch
  const d: [number, number] = [offset[0] + vel[0] * elapsedMin, offset[1] + vel[1] * elapsedMin]
  return { d, vel }
}

/** Build four layer snapshots without materializing any sites. */
export function buildField(input: FieldInput): CloudField {
  const forms = formOf(input, input.covers)
  const cover = { ...input.covers, ...splitLowCover(input.covers.low, forms.low.conv) }
  const date = anchorDate(input.hours)
  const t = wallMinutes(input.at)
  const steering = steeringOf(input)
  const layers = lattices.map((lattice): FieldLayer => {
    const form = forms[lattice]
    const { baseKm, vKm: meanVKm, kappa } = layerDimensions(lattice, input.lowBaseKm, form)
    const { Q, g, floorTau } = occupancyOf(lattice, cover[lattice])
    const angle = 2 * Math.PI * seeded(hashId(`${input.placeId}:${date}:${lattice}`))()
    const offset: [number, number] = [500 * Math.sin(angle), 500 * Math.cos(angle)]
    const zAslKm = fallbackHeights[lattice] + input.elevationKm
    const motionAt = (minute: number) => input.hours.length
      ? steering.timelines[lattice]!(minute, offset)
      : fallbackMotion(input, zAslKm, minute, offset)
    return { lattice, baseKm, meanVKm, cover: cover[lattice], Q, g, lowBaseKm: input.lowBaseKm,
      floorTau: floorTau * kappa * meanVKm, kappa, form, derived: steering.derived, motionAt, ...motionAt(t) }
  })
  return { placeId: input.placeId, t, layers }
}

const fallbackHeights = { low: 1.3, tower: 3.5, mid: 4.5, high: 10.5 }
const steeringCache = new WeakMap<FieldInput['hours'], Map<number, ReturnType<typeof computeSteering>>>()

function computeSteering(hours: FieldInput['hours'], elevationKm: number) {
  const samples = new Map<FieldInput['hours'][number], Record<Lattice, number>>()
  let derived = !hours.length
  for (const hour of hours) {
    derived ||= !Number.isFinite(hour.windDirection) || !hour.windAloft?.low
      || !hour.windAloft?.mid || !hour.windAloft?.high
    const lowBaseKm = lowBaseM(hour.temperature, hour.humidity) / 1000
    const { covers } = layerCovers({ hour, cloudCover: hour.cloudCover, thickCloud: hour.thickCloud })
    // Use daytime form to avoid introducing a solar clock into the forecast wind timeline.
    // The low Cu/Sc mean thickness differs by at most 0.53 km across these form weights.
    const forms = formOf({
      weatherCode: hour.weatherCode, lowBaseKm, wind10: { speedKmh: hour.windSpeed }, sunAltitude: 10,
    }, covers)
    const heights = { ...fallbackHeights }
    for (const lattice of lattices) {
      const { baseKm, vKm } = layerDimensions(lattice, lowBaseKm, forms[lattice])
      heights[lattice] = elevationKm + baseKm + vKm / 2
    }
    samples.set(hour, heights)
  }
  const timelines: Partial<Record<Lattice, ReturnType<typeof steeringTimeline>>> = {}
  if (hours.length) {
    for (const lattice of lattices) timelines[lattice] = steeringTimeline(hours, hour => samples.get(hour)![lattice], elevationKm)
  }
  return { timelines, derived }
}

function steeringOf(input: FieldInput) {
  let byElevation = steeringCache.get(input.hours)
  if (!byElevation) steeringCache.set(input.hours, byElevation = new Map())
  let steering = byElevation.get(input.elevationKm)
  if (!steering) {
    steering = computeSteering(input.hours, input.elevationKm)
    byElevation.set(input.elevationKm, steering)
  }
  return steering
}
