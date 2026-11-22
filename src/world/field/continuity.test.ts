import { airInput } from '../../atmo/airInput'
import { rainingLayer, rainOf } from '../rain'
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
import type { Forecast } from '../../domain/types'
import type { FieldInput } from './types'

const forecast = mapForecast(fixture)
const site = { lat: fixture.latitude, lon: fixture.longitude, timezone: fixture.timezone }
// The checked-in forecast has no convective codes. Overlay a deterministic shower and thunderstorm
// on its second day while retaining all of its actual cover, temperature, humidity and wind hours.
const hours = forecast.hours.map(hour => {
  if (hour.time < '2026-11-18T07:00' || hour.time >= '2026-11-18T22:00') return hour
  return { ...hour, weatherCode: hour.time < '2026-11-18T13:00' ? 80 : 95 }
})
const convectiveForecast: Forecast = {
  ...forecast, hours, placeId: 'shadmot-mehola',
  air: null, normals: null, fetchedAt: 0, source: 'fixture', models: [],
}
const input: FieldInput = {
  placeId: convectiveForecast.placeId, hours, at: '2026-11-17T00:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: forecast.elevation / 1000,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
}
const start = wallMinutes(input.at)
const timestamp = (minute: number) => new Date((start + minute) * 60_000).toISOString().slice(0, 16)

function fixtureField(minute: number) {
  const at = timestamp(minute)
  const shown = airInput(convectiveForecast, at, site, at)
  const hour = hourBetween(hours, at)
  const { covers } = layerCovers({ hour, cloudCover: shown.cloudCover, thickCloud: shown.thickCloud })
  return buildField({ ...input, at, covers: rainingLayer(covers, rainOf(shown)).covers, weatherCode: shown.weatherCode,
    sunAltitude: shown.sunElevation, lowBaseKm: lowBaseM(shown.temperature, shown.humidity) / 1000, wind10: {
      speedKmh: shown.windSpeed, fromDeg: shown.windDirection ?? 270,
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
  const codeEdges = [7, 13, 22].map(hour => 1440 + hour * 60 - 1)
  for (const edge of codeEdges) {
    for (let minute = edge - 29; minute <= edge + 30; minute++) minutes.add(minute)
  }
  let occupiedTowerPairs = 0
  let matchedTowerCells = 0
  const jumps: number[] = []
  let codeEdgeShare = 0
  const worst = fixtureField(0).layers.map(({ lattice }) => ({
    lattice, moveKm: 0, share: 0, steadyShare: 0, newShare: 0, steadyNewShare: 0, lostShare: 0, excess: -Infinity,
  }))
  for (const minute of minutes) {
    const before = fixtureField(minute)
    const after = fixtureField(minute + 1)
    for (const [i, layer] of after.layers.entries()) {
      const oldLayer = before.layers[i]
      const stats = worst[i]
      const deltaQ = Math.abs(layer.Q - oldLayer.Q)
      const { amplitude, period } = LATTICES[layer.lattice]
      const deltaStrat = Math.abs(layer.form.strat - oldLayer.form.strat)
      // At fixed time the two clocks differ by at most 2 and the clump by at most amplitude / 2.
      const weatherRank = deltaStrat * (0.15 + (1 - 0.2 / 0.35) * amplitude / 2)
      const bound = (1.5 / (layer.lattice === 'tower' ? 0.4 : 0.25)) * (deltaQ + weatherRank + 0.15 * Math.sin(Math.PI / period[0]))
      if (layer.lattice === 'tower' && codeEdges.includes(minute)) jumps.push(layer.cover - oldLayer.cover)
      const radius = [3, 12, 12, 25][i]
      const old = new Map(cellsAround(before, layer.lattice, 0, 0, radius + 250 / 60).map(cell => [cell.id, cell]))
      const speed = Math.max(Math.hypot(...oldLayer.vel), Math.hypot(...layer.vel))
      const dx = (oldLayer.vel[0] + layer.vel[0]) / 2
      const dy = (oldLayer.vel[1] + layer.vel[1]) / 2
      const current = cellsAround(after, layer.lattice, 0, 0, radius)
      if (layer.lattice === 'tower' && current.length && old.size) occupiedTowerPairs++
      const codeEdge = layer.lattice === 'tower' && codeEdges.some(edge => minute >= edge - 29 && minute <= edge + 30)
      const currentIds = codeEdge ? new Set(current.map(cell => cell.id)) : undefined
      if (currentIds) {
        for (const cell of old.values()) {
          if (currentIds.has(cell.id) || Math.hypot(cell.x + dx, cell.y + dy) > radius - 0.001) continue
          codeEdgeShare = Math.max(codeEdgeShare, cell.share)
          stats.lostShare = Math.max(stats.lostShare, cell.share)
          stats.excess = Math.max(stats.excess, cell.share - bound)
        }
      }
      for (const cell of current) {
        const prev = old.get(cell.id)
        if (prev) {
          if (layer.lattice === 'tower') matchedTowerCells++
          const x = cell.x - prev.x
          const y = cell.y - prev.y
          stats.moveKm = Math.max(stats.moveKm, Math.hypot(x - dx, y - dy), Math.hypot(x, y) - speed)
          const deltaShare = Math.abs(cell.share - prev.share)
          if (codeEdge) codeEdgeShare = Math.max(codeEdgeShare, deltaShare)
          stats.share = Math.max(stats.share, deltaShare)
          stats.excess = Math.max(stats.excess, deltaShare - bound)
          if (deltaQ + weatherRank < 0.0015) stats.steadyShare = Math.max(stats.steadyShare, deltaShare)
        } else {
          if (codeEdge) codeEdgeShare = Math.max(codeEdgeShare, cell.share)
          stats.newShare = Math.max(stats.newShare, cell.share)
          stats.excess = Math.max(stats.excess, cell.share - bound)
          // New cells obey the same weather-dependent bound from a previous share of zero.
          if (deltaQ + weatherRank < 0.0015) stats.steadyNewShare = Math.max(stats.steadyNewShare, cell.share)
        }
      }
    }
  }
  expect(occupiedTowerPairs).toBeGreaterThan(0)
  expect(matchedTowerCells).toBeGreaterThan(0)
  expect(jumps).toHaveLength(codeEdges.length)
  expect(codeEdgeShare).toBeLessThanOrEqual(0.15)
  console.info('tower continuity', { occupiedTowerPairs, matchedTowerCells, jumps, codeEdgeShare })
  console.info('continuity worst cases', JSON.stringify(worst))
  for (const stats of worst) {
    expect(stats.moveKm, stats.lattice).toBeLessThanOrEqual(0.001)
    expect(stats.excess, stats.lattice).toBeLessThanOrEqual(0)
    expect(stats.steadyShare, stats.lattice).toBeLessThanOrEqual(0.15)
    expect(stats.steadyNewShare, stats.lattice).toBeLessThanOrEqual(0.15)
  }
})
