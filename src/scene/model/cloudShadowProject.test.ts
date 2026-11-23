import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { layerSnapshot } from '../../world/field/density'
import { buildField } from '../../world/field/field'
import type { FieldInput } from '../../world/field/types'
import { edgeCoverage } from './cloudShadowEdge'
import { projectCloudShadows } from './cloudShadowProject'
import { shadowRimHandover } from './cloudShadowRim'

function fixture(at: FieldInput['at']) {
  const field = buildField({ placeId: 'jerusalem', at, hours: [], covers: { low: .6, mid: 0, high: 0 },
    lowBaseKm: 1.1, elevationKm: .72, weatherCode: 2, sunAltitude: 45, wind10: { speedKmh: 0, fromDeg: 270 } })
  return { field, snapshot: [layerSnapshot(field, 'low', 0, 0, 50)] }
}

function project(cloudField: ReturnType<typeof fixture>) {
  return projectCloudShadows({ cloudField, camera: SCENE_CAMERA,
    grid: { eyeM: 720, heightAt: () => 400, blockedKm: () => null },
    terrain: { horizonY: 500 }, box: { width: 375, landHeight: 128, dpr: 1 },
    azimuth: 90, altitude: 45, minDepth: .05 }).map(({ blob }) => blob)
}

it('preserves removed-beam area for lobed shadows projected from a cloud field', () => {
  const blobs = project(fixture('2026-11-17T12:00'))
  expect(blobs.length).toBeGreaterThan(3)
  for (const { edge, opticalDepth } of blobs) {
    const { lobes } = edge!
    expect(Math.max(...lobes) - Math.min(...lobes)).toBeGreaterThan(.08)
    let previous = 0, projected = 0
    const peak = -Math.expm1(-opticalDepth)
    // Equal-area bins, with the new profile integrated out to twice the original radius.
    for (let i = 0; i < 128; i++) {
      const r2 = (i + .5) / 128, radius = 2 * Math.sqrt(r2)
      previous -= Math.expm1(-opticalDepth * (1 - r2) ** 2)
      for (let a = 0; a < 48; a++) {
        const angle = a * 2 * Math.PI / 48
        projected += peak * edgeCoverage(edge!, radius * Math.cos(angle), radius * Math.sin(angle))
      }
    }
    expect(Math.abs(projected / (12 * previous) - 1)).toBeLessThan(.005)
  }
})

it('carries matched cloud outlines into the incoming day without the 00:30 seed jump', () => {
  // Use daylight projection to exercise the midnight field even when the sun is below the horizon.
  const before = fixture('2026-11-18T00:29'), after = fixture('2026-11-18T00:30')
  const handover = shadowRimHandover(before)!
  const incoming = new Map(after.snapshot[0].cells.map(({ id, seed }) => [seed, id]))
  const previous = new Map(before.snapshot[0].cells.map(({ id, seed }) => [id, seed]))
  const next = new Map(project(after).map(blob => [blob.cellId, blob.edge!]))
  const unsmoothed = new Map(project({ ...before, field: { ...before.field, t: after.field.t } })
    .map(blob => [blob.cellId, blob.edge!]))
  const distance = (a: readonly number[], b: readonly number[]) => Math.max(...a.map((lobe, i) => Math.abs(lobe - b[i])))
  const normalized = (edge: NonNullable<ReturnType<typeof project>[number]['edge']>) =>
    edge.lobes.map(lobe => lobe / (edge.centre + Math.max(...edge.lobes)))
  let exercised = 0, largestOldJump = 0
  for (const blob of project(before)) {
    const seed = handover.seeds.get(blob.cellId)
    if (seed === undefined || seed === previous.get(blob.cellId)) continue
    const nextId = incoming.get(seed), edge = nextId === undefined ? undefined : next.get(nextId)
    if (!edge) continue
    exercised++
    expect(distance(normalized(blob.edge!), normalized(edge))).toBeLessThan(.02)
    largestOldJump = Math.max(largestOldJump, distance(normalized(unsmoothed.get(blob.cellId)!), normalized(edge)))
  }
  expect(exercised).toBeGreaterThan(0)
  expect(largestOldJump).toBeGreaterThan(.08)
})
