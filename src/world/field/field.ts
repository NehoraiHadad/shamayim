import { layerDimensions } from './dimensions'
import { dayStart } from './handover'
import { layerCovers, lowBaseM } from '../clouds'
import { hashId, seeded } from '../../data/landmarks/hash'
import { steeringTimeline, steeringWind, wallMinutes } from './advect'
import { convectiveAt, formOf } from './genus'
import { footprintExtinction } from './extinction'
import { occupancyOf, splitLowCover, towerCoverOf } from './occupancy'
import type { CloudField, FieldInput, FieldLayer, FieldMotion, Lattice } from './types'

const lattices: readonly Lattice[] = ['low', 'tower', 'mid', 'high']
const mix = (a: number, b: number, f: number) => a + (b - a) * f
const dailyOffsets = new WeakMap<ReturnType<typeof steeringTimeline>, Map<string, [number, number][]>>()

function offsetsOf(steering: ReturnType<typeof steeringTimeline>, placeId: string, midnight: number) {
  let byPlace = dailyOffsets.get(steering)
  if (!byPlace) dailyOffsets.set(steering, byPlace = new Map())
  const date = new Date(midnight * 60_000).toISOString().slice(0, 10)
  const key = `${placeId}:${date}`
  let offsets = byPlace.get(key)
  if (!offsets) {
    offsets = lattices.map(lattice => {
      const angle = 2 * Math.PI * seeded(hashId(`${key}:${lattice}`))()
      return [500 * Math.sin(angle), 500 * Math.cos(angle)]
    })
    if (byPlace.size === 8) byPlace.delete(byPlace.keys().next().value!)
    byPlace.set(key, offsets)
  }
  return offsets
}

function fallbackMotion(input: Pick<FieldInput, 'at' | 'elevationKm' | 'wind10'>, zAslKm: number, t: number, offset: [number, number], origin: number) {
  const { speedKmh, fromDeg } = input.wind10
  const vel = steeringWind({ time: input.at, windSpeed: speedKmh, windDirection: fromDeg }, zAslKm, input.elevationKm)
  const elapsedMin = t - origin
  const d: [number, number] = [offset[0] + vel[0] * elapsedMin, offset[1] + vel[1] * elapsedMin]
  return { d, vel }
}

/** Build four layer snapshots without materializing any sites. */
export function buildField(input: FieldInput): CloudField {
  const weather = input.weather
  const legacy = weather ? undefined : convectiveAt(input)
  const convection = weather ? 0.6 * weather.convectiveShower + weather.convectiveStorm
    : mix(legacy!.from, legacy!.to, legacy!.fraction)
  const forms = formOf(input, input.covers, convection, weather)
  const cover = { ...input.covers, ...splitLowCover(input.covers.low, forms.low.conv) }
  const t = wallMinutes(input.at)
  const steering = fieldSteering(input)
  const layers = lattices.map((lattice, index): FieldLayer => {
    const form = forms[lattice]
    const { baseKm, vKm: meanVKm, kappa } = layerDimensions(lattice, input.lowBaseKm, form)
    const occupancy = occupancyOf(lattice, cover[lattice])
    if (lattice === 'tower' && (weather || (legacy && legacy.from !== legacy.to))) {
      const limit = towerCoverOf(input.covers.low)
      // Blend saturation in rank space. At fixed low cover an hourly transition changes Q by at most 1/60
      // per minute. Preserve Q × g², the calibrated radius-squared intensity, as Q changes.
      const intensity = occupancy.Q * occupancy.g ** 2
      occupancy.Q = weather
        ? weather.convectiveShower * occupancyOf(lattice, 0.6 * limit).Q + weather.convectiveStorm * occupancyOf(lattice, limit).Q
        : mix(occupancyOf(lattice, legacy!.from * limit).Q, occupancyOf(lattice, legacy!.to * limit).Q, legacy!.fraction)
      if (occupancy.Q > 0) occupancy.g = Math.sqrt(intensity / occupancy.Q)
    }
    const { Q, g, floorTau } = occupancy
    const motionAt = (minute: number) => (input.motion ?? steering.at)(index, minute)
    const dayMotion = (minute: number, day: number) => {
      const target = steering.dayAt(index, minute, day)
      if (!input.motion) return target
      const own = steering.at(index, minute)
      const live = motionAt(minute)
      return { d: [live.d[0] + (target.d[0] - own.d[0]), live.d[1] + (target.d[1] - own.d[1])] as [number, number],
        vel: live.vel }
    }
    const tau = kappa * meanVKm
    const cumuliform = lattice === 'tower' ? 1 : lattice === 'low' ? 1 - form.strat : 0
    return { lattice, baseKm, meanVKm, cover: cover[lattice], Q, g, lowBaseKm: input.lowBaseKm,
      meanExtinction: footprintExtinction(tau, cumuliform),
      floorTau: floorTau * kappa * meanVKm, kappa, form, derived: steering.derived, motionAt, dayMotion, ...motionAt(t) }
  })
  return { placeId: input.placeId, t, layers, rain: input.rain }
}

const fallbackHeights = { low: 1.3, tower: 3.5, mid: 4.5, high: 10.5 }
export function fieldSteering(input: Pick<FieldInput, 'hours' | 'elevationKm' | 'at' | 'placeId' | 'wind10'>,
  fallbackOrigin = dayStart(wallMinutes(input.at))) {
  const steering = steeringOf(input)
  const midnight = dayStart(wallMinutes(input.at))
  const dayAt = (index: number, minute: number, day: number) => {
    const offset = offsetsOf(steering, input.placeId, day)[index]
    return input.hours.length ? steering.at(index, minute, offset, day)
      : fallbackMotion(input, fallbackHeights[lattices[index]] + input.elevationKm, minute, offset, day + (fallbackOrigin - midnight))
  }
  const at: FieldMotion = (index, minute) => dayAt(index, minute, midnight)
  return { derived: steering.derived, at, dayAt }
}

const steeringCache = new WeakMap<FieldInput['hours'], Map<number, ReturnType<typeof steeringTimeline>>>()

const hourHeights = new WeakMap<FieldInput['hours'][number], Record<Lattice, number>>()

function representativeHeights(hour: FieldInput['hours'][number]) {
  let heights = hourHeights.get(hour)
  if (heights) return heights
  const lowBaseKm = lowBaseM(hour.temperature, hour.humidity) / 1000
  const { covers } = layerCovers({ hour, cloudCover: hour.cloudCover, thickCloud: hour.thickCloud })
  // Use daytime form to avoid introducing a solar clock into the forecast wind timeline.
  // Representative low heights range from at least 0.25 + 0.3 / 2 to at most 2.5 + 1 / 2 km
  // with the St gate and forecast LCL clamp, bounding the daylight approximation by 2.6 km.
  const forms = formOf({
    weatherCode: hour.weatherCode, lowBaseKm, wind10: { speedKmh: hour.windSpeed }, sunAltitude: 10,
  }, covers)
  heights = { ...fallbackHeights }
  for (const lattice of lattices) {
    const { baseKm, vKm } = layerDimensions(lattice, lowBaseKm, forms[lattice])
    heights[lattice] = baseKm + vKm / 2
  }
  hourHeights.set(hour, heights)
  return heights
}

function steeringOf(input: Pick<FieldInput, 'hours' | 'elevationKm'>) {
  let byElevation = steeringCache.get(input.hours)
  if (!byElevation) steeringCache.set(input.hours, byElevation = new Map())
  let steering = byElevation.get(input.elevationKm)
  if (!steering) {
    const elevation = input.elevationKm
    steering = steeringTimeline(input.hours, lattices, hour => {
      const { low, tower, mid, high } = representativeHeights(hour)
      return { low: low + elevation, tower: tower + elevation, mid: mid + elevation, high: high + elevation }
    }, elevation)
    byElevation.set(input.elevationKm, steering)
  }
  return steering
}
