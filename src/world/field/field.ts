import { hashId, seeded } from '../../data/landmarks/hash'
import { anchorDate, displacement, steeringWind, wallMinutes } from './advect'
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
  const vel = steeringWind({ time: input.at, windSpeed: speedKmh, windDirection: fromDeg }, zAslKm)
  const elapsedMin = t - Math.floor(t / 1440) * 1440
  const d: [number, number] = [offset[0] + vel[0] * elapsedMin, offset[1] + vel[1] * elapsedMin]
  return { d, vel }
}

/** Build four layer snapshots without materializing any sites. */
export function buildField(input: FieldInput): CloudField {
  const forms = formOf(input, input.covers)
  const cover = { ...input.covers, ...splitLowCover(input.covers.low, forms.low.conv) }
  const date = anchorDate(input.hours, input.at)
  const t = wallMinutes(input.at)
  const layers = lattices.map((lattice): FieldLayer => {
    const form = forms[lattice]
    const { baseKm, vKm: meanVKm, kappa } = layerDimensions(lattice, input.lowBaseKm, form)
    const { Q, g, floorTau } = occupancyOf(lattice, cover[lattice])
    const angle = 2 * Math.PI * seeded(hashId(`${input.placeId}:${date}:${lattice}`))()
    const offset: [number, number] = [500 * Math.sin(angle), 500 * Math.cos(angle)]
    const zAslKm = input.elevationKm + baseKm + meanVKm / 2
    const motion = input.hours.length
      ? displacement(input.hours, input.at, zAslKm, offset)
      : fallbackMotion(input, zAslKm, t, offset)
    return { lattice, baseKm, meanVKm, cover: cover[lattice], Q, g,
      floorTau: floorTau * kappa * meanVKm, kappa, form, ...motion }
  })
  return { placeId: input.placeId, t, layers }
}
