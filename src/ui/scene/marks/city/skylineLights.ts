import type { PlainPatch } from '../../../../data/city/plainData'
import { plainContrast } from '../../../../data/city/plainHaze'
import { plainLights } from '../../../../data/city/plainLights'
import type { SkylineColumn } from '../../../../data/city/skylineData'
import { dotPath } from './plainPaths'

const LIGHT_CAP = 220
const FACE_PER_LIGHT = [9, 7, 6]
type Strip = PlainPatch & { pitch: number; roof: number }

function snapY({ pitch, roof, top, bottom }: Strip, y: number, size: number) {
  const origin = roof + pitch / 2
  const first = Math.ceil((top + size / 2 - origin) / pitch)
  const last = Math.floor((bottom - size / 2 - origin) / pitch)
  if (first > last) return (top + bottom) / 2
  return origin + Math.max(first, Math.min(last, Math.round((y - origin) / pitch))) * pitch
}

export function skylineLights(columns: readonly SkylineColumn[], litShare: number, seed: number, visibilityKm?: number) {
  if (litShare <= 0) return []
  const strips: Strip[] = []
  let expected = 0
  for (const { left, right, faces } of columns) {
    if (right - left < 1.5) continue
    let nearerTop = Infinity
    faces.forEach((face, band) => {
      if (!face) return
      const { top, km, cover } = face
      const bottom = Math.min(face.foot, nearerTop)
      nearerTop = Math.min(nearerTop, top)
      if (bottom - top < 1) return
      const area = litShare * (right - left) * (bottom - top) / (10 * FACE_PER_LIGHT[band])
      strips.push({ left, right, top, bottom, km, area, built: cover, pitch: Math.max(1, face.pitch), roof: top })
      expected += cover * area * 10
    })
  }
  if (expected > LIGHT_CAP) {
    for (const strip of strips) strip.area *= LIGHT_CAP / expected
  }
  const paths = [{ d: '', sum: 0, count: 0 }, { d: '', sum: 0, count: 0 }]
  for (const { x, y, km, size, alpha } of plainLights(strips, seed, snapY).slice(0, LIGHT_CAP)) {
    const transmission = Math.cbrt(plainContrast(km, visibilityKm))
    const path = paths[transmission < .8 ? 0 : 1]
    path.d += dotPath(x, y, size)
    path.sum += alpha * transmission
    path.count++
  }
  return paths.flatMap(({ d, sum, count }) => count ? [{ d, opacity: sum / count }] : [])
}
