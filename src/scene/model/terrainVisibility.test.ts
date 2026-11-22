import { expect, it, vi } from 'vitest'
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

it('ignores own-cell relief and a distant blocker below the illuminated disc', () => {
  const terrain = {
    eyeM: 0, blockedKm: () => null,
    heightAt: (east: number) => east > 0.01 && east < 0.25 ? 500 : east > 0.3 ? 15 : 0,
  }
  expect(terrainVisibility(terrain, grid, 90, 6, ray)(0)).toBe(1)
})

it('lowers the distant horizon by earth curvature with refraction', () => {
  const terrain = {
    eyeM: 0, blockedKm: () => null,
    heightAt: (east: number) => !east ? 0 : east >= 40 && east < 59 ? 600 : null,
  }
  // A 600 m obstacle at ~48 km subtends ~0.7° flat and ~0.5° with curvature.
  expect(terrainVisibility(terrain, grid, 90, 0.5, ray)(0)).toBeLessThan(0.65)
  expect(terrainVisibility(terrain, grid, 90, 0.5, ray)(0)).toBeGreaterThan(0.15)
})

it('interpolates the horizon bins and reuses them as the disc rises through a soft edge', () => {
  const heightAt = vi.fn((east: number, north: number) => {
    if (east < 0.01) return 0
    if (east >= 0.31) return null
    const degrees = north < 0.999 ? 6.4 : 6
    return 2 + east * 1000 * Math.tan(degrees * Math.PI / 180)
  })
  const terrain = { eyeM: 0, blockedKm: () => null, heightAt }
  const visible = (a: number, h: number) => terrainVisibility(terrain, grid, a, h, ray)(0)
  expect(visible(90.25, 6.2)).toBeCloseTo(0.5, 2)
  const lookups = heightAt.mock.calls.length
  expect(visible(90.25, 5.9)).toBe(0)
  expect(visible(90.25, 6.5)).toBe(1)
  expect(visible(90, 6.2)).toBeGreaterThan(0.9)
  expect(visible(90.5, 6.2)).toBeLessThan(0.1)
  expect(heightAt).toHaveBeenCalledTimes(lookups)
})

it('resumes a conservatively clear ray when the light moves down to the horizon', () => {
  const heightAt = vi.fn((east: number) => east > 0.3 && east < 0.35 ? 120 : 0)
  const terrain = { eyeM: 0, blockedKm: () => null, heightAt, heightCeilingM: 120 }
  const visible = (altitude: number) => terrainVisibility(terrain, grid, 90, altitude, ray)(0)
  expect(visible(45)).toBe(1)
  expect(heightAt).toHaveBeenCalledTimes(2) // Only the two receiver heights.
  expect(visible(5)).toBe(0)
  const lookups = heightAt.mock.calls.length
  expect(lookups).toBeGreaterThan(2)
  expect(visible(6)).toBe(0)
  expect(heightAt).toHaveBeenCalledTimes(lookups)
})
