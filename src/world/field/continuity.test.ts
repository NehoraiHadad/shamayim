import { hourBetween } from '../livingLight'
import { expect, it } from 'vitest'
import { hashId, seeded } from '../../data/landmarks/hash'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import fixture from '../../test/fixtures/forecast-layers-2026-11-17.json'
import { layerCovers, lowBaseM } from '../clouds'
import { cellsAround } from './cells'
import { wallMinutes } from './advect'
import { LATTICES } from './lattice'
import { buildField } from './field'
import type { FieldInput } from './types'

const forecast = mapForecast(fixture)
const { hours } = forecast
const input: FieldInput = {
  placeId: 'shadmot-mehola', hours, at: '2026-11-17T00:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}
const start = wallMinutes(input.at)
const timestamp = (minute: number) => new Date((start + minute) * 60_000).toISOString().slice(0, 16)

const hoursByKey = new Map(hours.map(hour => [hour.time, hour]))

function fixtureField(minute: number) {
  const at = timestamp(minute)
  const hour = hourBetween(hours, at) ?? hours[0]
  const next = hoursByKey.get(timestamp(Math.floor(minute / 60) * 60 + 60)) ?? hour
  const f = Number(at.slice(14, 16)) / 60
  const lerp = (a: number, b: number) => a + (b - a) * f
  const cloudCover = lerp(hour.cloudCover, next.cloudCover)
  const thickCloud = hour.thickCloud == null || next.thickCloud == null ? hour.thickCloud
    : Math.min(cloudCover, lerp(hour.thickCloud, next.thickCloud))
  const { covers } = layerCovers({ hour, cloudCover, thickCloud })
  const humidity = hour.humidity == null || next.humidity == null ? hour.humidity : lerp(hour.humidity, next.humidity)
  return buildField({ ...input, at, covers, weatherCode: (f < 0.5 ? hour : next).weatherCode,
    lowBaseKm: lowBaseM(lerp(hour.temperature, next.temperature), humidity) / 1000, wind10: {
      speedKmh: lerp(hour.windSpeed, next.windSpeed), fromDeg: forecast.current.windDirection ?? 270,
    } })
}


it('advects and fades continuously through fixture hour boundaries and two midnights', () => {
  const rng = seeded(hashId('continuity-minutes'))
  const minutes = new Set(Array.from({ length: 100 }, () => Math.floor(rng() * 2880)))
  for (let h = 0; h <= 48; h++) {
    minutes.add(h * 60 - 1)
    minutes.add(h * 60)
  }
  for (const midnight of [1440, 2880]) {
    minutes.add(midnight - 1)
    minutes.add(midnight)
  }
  const worst = fixtureField(0).layers.map(({ lattice }) => ({
    lattice, moveKm: 0, share: 0, steadyShare: 0, newShare: 0, steadyNewShare: 0, excess: -Infinity,
  }))
  for (const minute of minutes) {
    const before = fixtureField(minute)
    const after = fixtureField(minute + 1)
    for (const [i, layer] of after.layers.entries()) {
      const oldLayer = before.layers[i]
      const stats = worst[i]
      const deltaQ = Math.abs(layer.Q - oldLayer.Q)
      const bound = 6 * (deltaQ + 0.075 * 2 * Math.sin(Math.PI / LATTICES[layer.lattice].period[0])) + 0.01
      const radius = [3, 12, 12, 25][i]
      const old = new Map(cellsAround(before, layer.lattice, 0, 0, radius + 250 / 60).map(cell => [cell.id, cell]))
      const speed = Math.max(Math.hypot(...oldLayer.vel), Math.hypot(...layer.vel))
      const dx = (oldLayer.vel[0] + layer.vel[0]) / 2
      const dy = (oldLayer.vel[1] + layer.vel[1]) / 2
      for (const cell of cellsAround(after, layer.lattice, 0, 0, radius)) {
        const prev = old.get(cell.id)
        if (prev) {
          const x = cell.x - prev.x
          const y = cell.y - prev.y
          stats.moveKm = Math.max(stats.moveKm, Math.hypot(x - dx, y - dy), Math.hypot(x, y) - speed)
          const deltaShare = Math.abs(cell.share - prev.share)
          stats.share = Math.max(stats.share, deltaShare)
          stats.excess = Math.max(stats.excess, deltaShare - bound)
          if (deltaQ < 0.005) stats.steadyShare = Math.max(stats.steadyShare, deltaShare)
        } else {
          stats.newShare = Math.max(stats.newShare, cell.share)
          stats.excess = Math.max(stats.excess, cell.share - bound)
          // New cells obey the same weather-dependent bound from a previous share of zero.
          if (deltaQ < 0.005) stats.steadyNewShare = Math.max(stats.steadyNewShare, cell.share)
        }
      }
    }
  }
  console.info('continuity worst cases', JSON.stringify(worst))
  for (const stats of worst) {
    expect(stats.moveKm, stats.lattice).toBeLessThanOrEqual(0.001)
    expect(stats.excess, stats.lattice).toBeLessThanOrEqual(0)
    expect(stats.steadyShare, stats.lattice).toBeLessThanOrEqual(0.15)
    expect(stats.steadyNewShare, stats.lattice).toBeLessThanOrEqual(0.15)
  }
})
