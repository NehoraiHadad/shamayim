import type { PlainPatch } from '../../../../data/city/plainData'
import { MIN_PLAIN_CONTRAST, plainContrast } from '../../../../data/city/plainHaze'
import { plainLights } from '../../../../data/city/plainLights'

export const px = (value: number) => Number(value.toFixed(3))

export function dotPath(x: number, y: number, size = 1) {
  const r = size / 2
  return `M${px(x - r)} ${px(y)}a${r} ${r} 0 1 0 ${size} 0a${r} ${r} 0 1 0 -${size} 0Z`
}

export interface PlainTick { x: number; y: number; km: number }

export function plainPaths(patches: PlainPatch[], ticks: PlainTick[], seed: number, night: boolean, visibilityKm?: number) {
  const bands = (night ? [.07, .24] : [.055, .14, .32]).map(center => ({ center, sum: 0, count: 0, d: '' }))
  const append = (d: string, alpha: number) => {
    const band = bands.reduce((best, next) =>
      Math.abs(next.center - alpha) < Math.abs(best.center - alpha) ? next : best)
    band.d += d
    band.sum += alpha
    band.count++
  }
  const contrast = (km: number) => plainContrast(km, visibilityKm)
  if (night) {
    const lights = plainLights(patches, seed)
    for (const { x, y, km, size, alpha } of [...lights, ...ticks.map(t => ({ ...t, alpha: .9, size: 1 }))]) {
      // A bright point source stays visible far past the daytime visibility (Allard's law: a city light is seen at
      // roughly three times the meteorological range), so its transmission is the contrast over a 3× longer range.
      const transmission = Math.cbrt(contrast(km))
      if (transmission >= MIN_PLAIN_CONTRAST) append(dotPath(x, y, size), alpha * transmission)
    }
  } else {
    for (const { left, right, top, bottom, km, built } of patches) {
      const c = contrast(km)
      if (c < MIN_PLAIN_CONTRAST) continue
      const w = px(right - left), h = px(bottom - top)
      if (w > 0 && h > 0) append(`M${px(left)} ${px(top)}h${w}v${h}h-${w}z`, c * Math.sqrt(built))
    }
    for (const { x, y, km } of ticks) {
      const c = contrast(km)
      if (c >= MIN_PLAIN_CONTRAST) append(dotPath(x, y), c)
    }
  }
  return bands.flatMap(({ center, d, sum, count }) => count ? [{ center, d, opacity: sum / count }] : [])
}
