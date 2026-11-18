import { seeded } from '../landmarks/hash'
import type { PlainPatch } from './plainData'

export function plainLights(patches: PlainPatch[], seed: number) {
  const random = seeded(seed)
  const dots: { x: number; y: number; alpha: number; km: number; size: number }[] = []
  let light = random()
  for (const { left, right, top, bottom, km, area, built } of patches) {
    if (bottom - top < 1 - 1e-8) continue
    light += built * area * 10
    while (light >= 1) {
      light -= 1
      const size = built >= .65 && bottom - top >= 1.5 && random() < .2 ? 1.5 : 1
      dots.push({
        x: (left + right) / 2 + (random() - .5) * Math.max(0, right - left - size),
        y: (top + bottom) / 2 + (random() - .5) * (bottom - top - size),
        alpha: Math.max(.45, Math.min(.9, (size === 1.5 ? 28 : 20) / km)),
        km, size,
      })
    }
  }
  return dots
}
