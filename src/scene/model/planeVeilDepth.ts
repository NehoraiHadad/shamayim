import { LOCAL_STEP_KM } from '../../data/terrain/panorama'
import { beyondKm, rowKm } from '../../world/beyondSeat'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { PlaneName } from './faceProjection'

/** Build the extinction path for one column of a portrait's surface. */
export function planeVeilDepth(world: WorldState, name: PlaneName, x: number, bearing: number) {
  const view = world.place3
  if (view.kind !== 'outside') return
  const { frame, baseKm, nearLine } = view
  const azimuth = bearing * Math.PI / 180
  const east = Math.sin(azimuth), north = Math.cos(azimuth)
  const panorama = (km: number) => beyondKm(frame, baseKm, km * east, km * north)
  const baseY = nearLine?.baseY
  if (name !== 'near' || !nearLine || !baseY) return panorama

  // nearLine is sampled uniformly across the reference width.
  const col = x / SCENE_W * (nearLine.own.length - 1)
  const left = Math.floor(col), right = Math.min(left + 1, nearLine.own.length - 1)
  const own = nearLine.own[left] + (nearLine.own[right] - nearLine.own[left]) * (col - left)
  if (!(own > 0)) return panorama

  // Invert the portrait projection along the column ray at each local DEM row.
  const ray = (frame.centerX - x) / frame.f
  const position = (dy: number) => baseY(ray * (frame.eyeN - dy), dy)
  const rows: { y: number; dy: number }[] = []
  // Quarter-kilometre rows match the local DEM grid used to assemble the crest.
  const count = Math.max(1, Math.ceil((frame.n - frame.s) / LOCAL_STEP_KM))
  for (let i = 0; i <= count; i++) {
    const dy = frame.n + (frame.s - frame.n) * i / count
    const y = position(dy)
    if (Number.isFinite(y) && y < (rows.at(-1)?.y ?? Infinity)) rows.push({ y, dy })
  }
  if (!rows.length) return panorama
  return (km: number, y: number) => {
    let dy = rows.at(-1)!.dy
    for (let i = 0; i < rows.length; i++) {
      const near = rows[i]
      if (y > near.y) { dy = near.dy; break }
      const far = rows[i + 1]
      if (far && y >= far.y) {
        dy = far.dy + (near.dy - far.dy) * (y - far.y) / (near.y - far.y)
        break
      }
    }
    const outside = panorama(km)
    return outside + (rowKm(frame, baseKm, dy) - outside) * own
  }
}
