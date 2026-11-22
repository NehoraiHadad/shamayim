import { expect, it } from 'vitest'
import { terrainVisibility } from './terrainVisibility'
import type { PlaneGeomGrid } from './planeGeometry'

const grid = { cols: 2, km: new Float32Array([1, 1]), bearing: new Float32Array([0, 180]) } as PlaneGeomGrid
const ray = { across: 0, ahead: 0.99, up: 0.1 }

it('casts terrain visibility from each receiver in world coordinates', () => {
  const terrain = {
    eyeM: 0, blockedKm: () => null,
    heightAt: (east: number, north: number) => east > 0.15 && north > 0.5 ? 100 : 0,
  }
  const visibility = terrainVisibility(terrain, grid, 90, 6, ray)
  expect(visibility(0)).toBe(0)
  expect(visibility(1)).toBe(1)
  expect(terrainVisibility({ ...terrain, heightAt: () => null }, grid, 90, 6, ray)(0)).toBe(1)
})
