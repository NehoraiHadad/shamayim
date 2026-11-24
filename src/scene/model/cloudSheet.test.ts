import { expect, it } from 'vitest'
import { hashId } from '../../data/landmarks/hash'
import { fieldAt, frame, neutral } from '../../test/cloudSheetFrame'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { genusOf } from '../../world/field/genus'
import { cloudSheetOf } from './cloudSheet'
import { sheetTexture, textureCorrection } from './cloudSheetTexture'

it('maintains cover in equal-area world samples across six days, four hours and three places', () => {
  const sum = new Map<string, { covered: number; target: number; samples: number; texture: number; tau: number; texturedTau: number }>()
  for (const place of ['jerusalem', 'haifa', 'tiberias']) {
    for (let day = 17; day < 23; day++) {
      for (const hour of ['00', '06', '12', '18']) {
        const field = fieldAt(place, `2026-11-${day}T${hour}:00`)
        for (const layer of field.layers) {
          if (layer.lattice === 'tower') continue
          const span = RANGES[layer.lattice][0]
          const { densityGrid } = layerSnapshot(field, layer.lattice, 0, 0, span)
          const sample = sheetTexture(genusOf(layer.lattice, layer.form, 0.5), layer, hashId(`${place}:sheet:${layer.lattice}`))(0)
          const depths: number[] = [], raw: number[] = []
          let result = sum.get(layer.lattice)
          if (!result) sum.set(layer.lattice, result = { covered: 0, target: 0, samples: 0, texture: 0, tau: 0, texturedTau: 0 })
          for (let row = 0; row < 24; row++) for (let col = 0; col < 24; col++) {
            const x = span * ((col + 0.5) / 24 - 0.5)
            const y = span * ((row + 0.5) / 24 - 0.5)
            const tau = densityGrid.tauAt(x, y)
            raw.push(tau > layer.floorTau ? sample(x, y) : 1)
            depths.push(tau)
          }
          const corrected = textureCorrection(raw, depths, Array<number>(24).fill(1), 24,
            depths.map(tau => Number(tau > layer.floorTau)))
          for (const [index, tau] of depths.entries()) {
            const texture = corrected(index)
            expect(texture).toBeGreaterThanOrEqual(0)
            result.covered += Number(tau > layer.floorTau + 0.05)
            result.texture += texture
            result.tau += tau
            result.texturedTau += tau * texture
            result.target += layer.cover
            result.samples++
          }
        }
      }
    }
  }
  for (const [lattice, { covered, target, samples, texture, tau, texturedTau }] of sum) {
    console.info(lattice, { target: target / samples, measured: covered / samples, texture: texture / samples, tauRatio: texturedTau / tau })
    expect.soft(Math.abs(covered - target) / samples, lattice).toBeLessThanOrEqual(0.05)
    expect.soft(Math.abs(texture / samples - 1), lattice).toBeLessThanOrEqual(0.01)
    expect.soft(Math.abs(texturedTau / tau - 1), lattice).toBeLessThanOrEqual(0.01)
  }
})

it('keeps a low-cover floor transparent and lights gaps more than cores', () => {
  const at = frame('haifa', '2026-11-17T12:00')
  const snapshot = layerSnapshot(at.field, 'low', 0, 0, RANGES.low[1])
  const layer = { ...snapshot.layer!, cover: 0.3 }
  let gapTone = 0
  for (const tau of [layer.floorTau, 3]) {
    const sheet = cloudSheetOf(at.world, { ...at.geom, azimuthAt: () => at.world.bodies.sun.azimuth }, {
      ...snapshot, layer, densityGrid: { ...snapshot.densityGrid, tauAt: () => tau, resolvedTauAt: () => tau, expectedTauAt: () => tau },
    }, neutral)!
    if (tau === layer.floorTau) {
      expect.soft(sheet.alpha[0]).toBeLessThan(0.15)
      gapTone = sheet.tone[0]
    } else {
      expect(sheet.tone[0]).toBeGreaterThan(gapTone)
    }
  }
})
