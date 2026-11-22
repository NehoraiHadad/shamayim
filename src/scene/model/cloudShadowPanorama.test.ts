import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { RAY_DISTANCES, RAYS } from '../../data/terrain/panorama'
import { azimuthAt, xOf } from '../../domain/camera'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { facesOf } from '../../world/face'
import { referenceLoop } from '../../world/field/referenceLoop.test-helper'
import { terrainY } from '../../world/terrain'
import { makeWorldBuilder } from '../../world/world'
import { cloudShadowLayers } from './cloudShadows'
import { sceneModel } from './index'
import type { SceneBox } from './types'

const ids = ['jerusalem', 'haifa', 'tiberias']
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const at = '2026-11-17T13:00'
// A 1 ms allowance against the reference's roughly 5 ms Round 1 calibration.
const SHADOW_RATIO_LIMIT = 0.2
let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(({ id }) => ids.includes(id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

function median(samples: number[]) {
  return samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)]
}

function timed<T>(work: () => T) {
  const start = performance.now()
  const value = work()
  return { value, ms: performance.now() - start }
}

it.each(ids)('projects new-minute shadows on the recorded %s panorama', id => {
  const input = worldInput(places.get(id)!, at, at)
  const build = makeWorldBuilder()
  // Broken showers exercise both ordinary cloud cells and the convective lattice.
  const forced = { cloudCover: 70, thickCloud: 70, temperature: 24, humidity: 70, weatherCode: 80 }
  const forcedLayers = { low: 0.7, mid: 0.5, high: 0 }
  const frames = Array.from({ length: 24 }, (_, minute) =>
    build({ ...input, selected: addMinutes(at, minute), forced, forcedLayers }))
  const first = frames[0]
  const { terrain, camera } = first
  const groundAt = terrain.groundAt!
  const facesBefore = facesOf({ ...terrain, groundAt: (x, km) => {
    const relativeM = groundAt(x, km)
    return relativeM === null ? null : relativeM + terrain.eyeM!
  } }, angle => terrainY(terrain.horizonY, angle))
  const counts = (faces: typeof facesBefore) =>
    [faces.near, faces.far].map(face => face.columns.reduce((total, column) => total + column.points.length, 0))

  const samples = frames.map((world, minute) => {
    const before = timed(referenceLoop)
    const shadow = timed(() => cloudShadowLayers(world, box))
    const after = timed(referenceLoop)
    const reference = (before.ms + after.ms) / 2
    // Keep the field's optical layers for the sky. Only remove the shadow candidates.
    const noShadows = { ...world, cloudField: world.cloudField && { ...world.cloudField, snapshot: [] } }
    const withField = () => sceneModel(world, box)
    const withoutShadows = () => sceneModel(noShadows, box)
    // Call both variants once before timing either warm call. Alternate the starting variant.
    const fieldFirst = minute % 2 === 0
    const [firstModel, secondModel] = fieldFirst ? [withField, withoutShadows] : [withoutShadows, withField]
    const cold = timed(firstModel).ms + timed(secondModel).ms
    const secondWarm = timed(secondModel).ms, firstWarm = timed(firstModel).ms
    const model = fieldFirst ? firstWarm : secondWarm
    const baseline = fieldFirst ? secondWarm : firstWarm
    return { shadow, reference, model, baseline, coldOverhead: (cold - model - baseline) / 2 }
  })
  const measured = samples.slice(8)
  const shadowMs = median(measured.map(({ shadow }) => shadow.ms))
  const referenceMs = median(measured.map(({ reference }) => reference))
  const shadowRatio = median(measured.map(({ shadow, reference }) => shadow.ms / reference))
  const modelMs = median(measured.map(({ model }) => model))
  const baselineMs = median(measured.map(({ baseline }) => baseline))
  const incrementMs = median(measured.map(({ model, baseline }) => model - baseline))
  const coldOverheadMs = median(measured.map(sample => sample.coldOverhead))
  // Compare the grid with the recorded profile at sampled angular and radial cell midpoints.
  let sampledGridErrorM = 0
  for (let ray = 0; ray < RAYS - 1; ray += 4) {
    const fraction = (ray + 0.5) / (RAYS - 1)
    const bearing = azimuthAt(fraction, camera) * Math.PI / 180
    for (let i = 0; i < RAY_DISTANCES.length - 1; i += 5) {
      const km = (RAY_DISTANCES[i] + RAY_DISTANCES[i + 1]) / 2
      const relativeM = groundAt(fraction * 375, km)
      const seaLevelM = first.flightTerrain!.heightAt(km * Math.sin(bearing), km * Math.cos(bearing))
      if (relativeM !== null && seaLevelM !== null) {
        sampledGridErrorM = Math.max(sampledGridErrorM, Math.abs(seaLevelM - first.flightTerrain!.eyeM - relativeM))
      }
    }
  }
  let heights = 0, blocked = 0
  const grid = first.flightTerrain!
  const profile = cloudShadowLayers({ ...first, flightTerrain: { ...grid,
    heightAt: (e, n) => { heights++; return grid.heightAt(e, n) },
    blockedKm: (e, n, h) => { blocked++; return grid.blockedKm(e, n, h) },
  } }, box)
  console.info({ id, heights, blocked, rimPoints: 0, accepted: profile.flatMap(layer => layer.blobs).length })
  const blobs = samples[0].shadow.value.flatMap(layer => layer.blobs)
  console.info({ id, shadowMs, modelMs, baselineMs, incrementMs, coldOverheadMs, referenceMs, shadowRatio, sampledGridErrorM, blobs: blobs.length,
    before: counts(facesBefore), after: counts(terrain.faces) })
  expect(shadowRatio).toBeLessThanOrEqual(SHADOW_RATIO_LIMIT)
  expect(incrementMs).toBeLessThanOrEqual(2)
  if (process.env.FIELD_PERF === '1') {
    expect(shadowMs).toBeLessThanOrEqual(1)
    expect(modelMs).toBeLessThanOrEqual(10)
  }
  if (id !== 'jerusalem') return
  for (const face of Object.values(terrain.faces)) {
    expect(face.columns.some(column => column.points.length > 0)).toBe(true)
    expect(face.contours.length).toBeGreaterThan(0)
    for (const contour of face.contours) {
      const seaLevelM = contour.h + terrain.eyeM!
      expect(seaLevelM).toBeGreaterThan(350)
      expect(seaLevelM).toBeLessThan(950)
    }
  }
  expect(blobs.length).toBeGreaterThanOrEqual(10)
  expect(blobs.some(({ centre: [eastKm, northKm] }) => {
    const x = xOf(Math.atan2(eastKm, northKm) * 180 / Math.PI, camera) * 375 / camera.width
    return Math.hypot(eastKm, northKm) < terrain.sightAt!(x).nearKm
  })).toBe(true)
}, 30_000)
