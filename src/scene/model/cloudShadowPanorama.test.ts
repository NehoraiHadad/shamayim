import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { RAY_DISTANCES, RAYS } from '../../data/terrain/panorama'
import { azimuthAt, xOf } from '../../domain/camera'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { facesOf } from '../../world/face'
import { terrainY } from '../../world/terrain'
import { makeWorldBuilder } from '../../world/world'
import { cloudShadowLayers } from './cloudShadows'
import { sceneModel } from './index'
import type { SceneBox } from './types'

const ids = ['jerusalem', 'haifa', 'tiberias']
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const at = '2026-11-17T13:00'
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
  const frames = Array.from({ length: 24 }, (_, minute) => build({ ...input, selected: addMinutes(at, minute),
    forced: { cloudCover: 70, thickCloud: 70, temperature: 24, humidity: 70, weatherCode: 80 },
    forcedLayers: { low: 0.7, mid: 0.5, high: 0 } }))
  const first = frames[0]
  const { terrain, camera } = first
  const groundAt = terrain.groundAt!
  const facesBefore = facesOf({ ...terrain, groundAt: (x, km) => {
    const relativeM = groundAt(x, km)
    return relativeM === null ? null : relativeM + terrain.eyeM!
  } }, angle => terrainY(terrain.horizonY, angle))
  const counts = (faces: typeof facesBefore) =>
    [faces.near, faces.far].map(face => face.columns.reduce((total, column) => total + column.points.length, 0))

  const shadows = frames.map(world => timed(() => cloudShadowLayers(world, box)))
  const measure = (work: (world: typeof first, minute: number) => unknown) =>
    median(frames.map((world, minute) => timed(() => work(world, minute)).ms).slice(8))
  const shadowMs = median(shadows.slice(8).map(sample => sample.ms))
  const modelMs = measure(world => sceneModel(world, box))
  const baselineMs = measure(world => sceneModel({ ...world, cloudField: undefined }, box))
  // N2b used at least 1,000 slow panorama queries per minute on recorded terrain.
  const referenceMs = measure((_, minute) => {
    let sum = 0
    for (let i = 0; i < 1000; i++) sum += groundAt((i + minute / 24) * 0.375, 1 + i % 59) ?? 0
    expect(Number.isFinite(sum)).toBe(true)
  })
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
  const blobs = shadows[0].value
  console.info({ id, shadowMs, modelMs, baselineMs, referenceMs, sampledGridErrorM, blobs: blobs.length,
    before: counts(facesBefore), after: counts(terrain.faces) })
  expect(shadowMs).toBeLessThan(referenceMs * 0.5)
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
