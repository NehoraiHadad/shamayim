import { plainContrast } from '../../../../data/city/plainHaze'
import { SKYLINE_BANDS, type SkylineColumn } from '../../../../data/city/skylineData'
import { type SkylineBand } from '../../../../data/city/skylineRay'
import type { SkylineTower } from '../../../../data/city/skylineTowers'
import { px } from './plainPaths'

type Step = { left: number; right: number; top: number; foot: number }
const DEPTH_OPACITY = [1, .78, .55] as const
const halfPx = (value: number) => Math.round(value * 2) / 2

export function skylineColumns(columns: readonly SkylineColumn[], centerX: number, homeHalf: number): SkylineColumn[] {
  return columns.map(({ left, right, faces }) => {
    const fraction = Math.min(1, Math.abs((left + right) / 2 - centerX) / (homeHalf + 6))
    const taper = fraction * fraction * (3 - 2 * fraction)
    const quantize = (band: SkylineBand) => {
      const face = faces[band]
      if (!face) return null
      const foot = halfPx(face.foot)
      const top = halfPx(face.foot - (face.foot - face.top) * (band === 0 ? taper : 1))
      return top < foot ? { ...face, top, foot } : null
    }
    return { left: px(left), right: px(right), faces: [quantize(0), quantize(1), quantize(2)] }
  })
}

function outline(steps: Step[]) {
  const first = steps[0], last = steps[steps.length - 1]
  let result = `M${first.left} ${first.top}H${first.right}`
  for (let i = 1; i < steps.length; i++) {
    const { top, right } = steps[i]
    if (top !== steps[i - 1].top) result += `V${top}`
    result += `H${right}`
  }
  result += `V${last.foot}H${last.left}`
  for (let i = steps.length - 2; i >= 0; i--) {
    const { foot, left } = steps[i]
    if (foot !== steps[i + 1].foot) result += `V${foot}`
    result += `H${left}`
  }
  return result + 'Z'
}

export function skylinePaths(columns: readonly SkylineColumn[], slabs: readonly SkylineTower[], visibilityKm?: number) {
  const width = columns.at(-1)?.right ?? 0
  return SKYLINE_BANDS.map(band => {
    let d = '', contrast = 0, weight = 0
    const weigh = (km: number, w: number) => {
      weight += w
      contrast += w * plainContrast(km - .8, visibilityKm)
    }
    let steps: Step[] = []
    for (const { left, right, faces } of columns) {
      const face = faces[band]
      if (!face || right <= left) continue
      const last = steps.at(-1)
      if (last && left !== last.right) {
        d += outline(steps)
        steps = []
      }
      if (last?.right === left && last.top === face.top && last.foot === face.foot) last.right = right
      else steps.push({ left, right, top: face.top, foot: face.foot })
      weigh(face.km, right - left)
    }
    if (steps.length) d += outline(steps)
    for (const tower of slabs) {
      if (tower.row !== band) continue
      const left = px(Math.max(0, tower.x - 1)), right = px(Math.min(width, tower.x + 1))
      const foot = halfPx(tower.baseY), top = Math.min(foot - .5, halfPx(tower.baseY - tower.h))
      if (right <= left) continue
      d += outline([{ left, right, top, foot }])
      weigh(tower.km, right - left)
    }
    return { band, d, opacity: weight ? Math.min(1, DEPTH_OPACITY[band] * contrast / weight) : 0 }
  })
}
