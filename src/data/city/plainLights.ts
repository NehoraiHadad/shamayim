import { seeded } from '../landmarks/hash'
import type { PlainPatch } from './plainData'

export function plainLights<Patch extends PlainPatch>(patches: Patch[], seed: number,
  snapY?: (patch: Patch, y: number, size: number) => number) {
  const random = seeded(seed)
  const dots: { x: number; y: number; alpha: number; km: number; size: number }[] = []
  let light = random()
  for (const patch of patches) {
    const { left, right, top, bottom, km, area, built } = patch
    if (bottom - top < 1 - 1e-8) continue
    light += built * area * 10
    while (light >= 1) {
      light -= 1
      const size = built >= .65 && bottom - top >= 1.5 && random() < .2 ? 1.5 : 1
      const x = (left + right) / 2 + (random() - .5) * Math.max(0, right - left - size)
      const y = (top + bottom) / 2 + (random() - .5) * (bottom - top - size)
      dots.push({
        x, y: snapY ? snapY(patch, y, size) : y,
        alpha: Math.max(.45, Math.min(.9, (size === 1.5 ? 28 : 20) / km)),
        km, size,
      })
    }
  }
  return dots
}
