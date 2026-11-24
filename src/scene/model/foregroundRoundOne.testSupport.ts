import { anglePx } from '../../data/terrain/angleScale'
import { apparentAngle, RAY_DISTANCES } from '../../data/terrain/panorama'
import { foregroundOf } from '../../world/landLiving'
import { linearRgbToSrgb } from '../../world/landRadiometry'
import type { WorldState } from '../../world/types'
import { foregroundShare, type ForegroundMaterial } from './foregroundMaterial'
import { srgbRgbToLinear } from './landRadiance'
import { planeGeomOf } from './planeGeometry'

/** Reconstruct the review's round-one material from the same native data. */
export function roundOneForeground(world: WorldState, landHeight: number): ForegroundMaterial {
  const f = foregroundOf(world.land)!
  const { cols, rows, km, xs, crestY, footY, bearing } = planeGeomOf(world, 'near', world.terrain.near, landHeight)
  const rgba = new Uint8Array(cols * rows * 4)
  const first = RAY_DISTANCES[0]
  const yAt = (h: number, d: number) => world.terrain.horizonY - anglePx(apparentAngle(h, d, 0))
  for (let c = 0; c < cols; c++) {
    const angle = bearing[c] * Math.PI / 180
    const e = Math.sin(angle), n = Math.cos(angle)
    const height = world.terrain.groundAt?.(xs[c], first)
    const profile = height == null ? [] : [{ km: first, y: yAt(height, first) }]
    const local = world.flightTerrain
    if (profile.length && local) for (const d of [first / 2, first / 4]) {
      const h = local.heightAt(d * e, d * n)
      if (h == null || !Number.isFinite(h)) continue
      const y = yAt(h - local.eyeM, d)
      if (y > profile.at(-1)!.y) profile.push({ km: d, y })
    }
    for (let r = 0; r < rows; r++) {
      const index = r * cols + c
      const share = foregroundShare(km[index])
      if (share < 0.5 / 255) continue
      const y = crestY[c] + Math.max(0, footY[c] - crestY[c]) * r / (rows - 1)
      const range = heldRange(profile, y, km[index])
      const xg = (range * 1000 * e - f.east0) / f.eastStep
      const yg = (range * 1000 * n - f.north0) / f.northStep
      const col = Math.floor(xg), row = Math.floor(yg)
      let dry = 0
      const linear: [number, number, number] = [0, 0, 0]
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        if (row + dy < 0 || col + dx < 0 || col + dx >= f.cols) continue
        f.read?.(row + dy, col + dx)
        const i = ((row + dy) * f.cols + col + dx) * 4
        if (!f.rgba[i + 3]) continue
        const w = (dx ? xg - col : 1 - (xg - col)) * (dy ? yg - row : 1 - (yg - row))
        const cell = srgbRgbToLinear([f.rgba[i] / 255, f.rgba[i + 1] / 255, f.rgba[i + 2] / 255])
        for (let k = 0; k < 3; k++) linear[k] += w * cell[k]
        dry += w
      }
      if (!dry) continue
      const rgb = linearRgbToSrgb([linear[0] / dry, linear[1] / dry, linear[2] / dry])
      for (let k = 0; k < 3; k++) rgba[index * 4 + k] = Math.round(rgb[k] * 255)
      rgba[index * 4 + 3] = Math.round(255 * dry * share)
    }
  }
  return { cols, rows, rgba, rangeKm: km }
}

function heldRange(profile: readonly { km: number; y: number }[], y: number, km: number) {
  if (!profile.length || y < profile[0].y) return km
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i]
    if (y <= b.y) {
      const t = (y - a.y) / (b.y - a.y)
      return 1 / ((1 - t) / a.km + t / b.km)
    }
  }
  return profile.at(-1)!.km
}
