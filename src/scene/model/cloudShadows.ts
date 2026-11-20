//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { SCENE_W } from '../../world/sceneBox'
import type { RGB, WorldState } from '../../world/types'
import { colourKey, landBoxKey, layerKey } from './keys'
import { hazeOf } from './planeLight'
import { mixRgb } from './tone'
import type { LayerOf, SceneBox } from './types'

/*
 * The cloud's shadows on the land (the living light, 2026-11-20): under a broken sky, soft patches of shade pass over the
 * land and the town, carried by the low cloud's wind. Three bands of the land by distance (far near the horizon, the near
 * ground at the foot), each a seamless tile of soft patches as large as clouds are at that distance, flattened by the
 * ground's foreshortening, laid at composite time: the tile is moved by how far the wind has carried the cloud since
 * midnight (`world.shadows.driftKm`, so a scrub moves them without a repaint), drifts a little in the ambient loop, and
 * is laid `source-atop` the land, so it darkens only what is drawn. Its alpha is the shadows' strength at the minute.
 * Pure: the patches are seeded by the place; nothing reads a clock.
 */

/** Over the town and its marks (40), under the sky's life laid in front of the land (40.5). */
const Z = 40.3
/** Scene px per degree across (the camera's), and km of cloud the patches are made from (a low cloud's size). */
const PX_PER_DEG = 1.5
const CLOUD_KM: [number, number] = [2, 6]
const DEG = 180 / Math.PI
/** The shade a passing cloud leaves: the sky-lit dark, a little blue. */
const SHADE: RGB = [0.04, 0.06, 0.12]
/** The ambient loop runs this many times faster than the wind (a slow time-lapse, as the sky's clouds drift). */
const LOOP_RATE = 12

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

interface Band { id: string; top: number; bottom: number; km: number; fadeIn: [number, number] | null; fadeOut: [number, number] | null }

/** The land's depth bands (land px): the far ground under the horizon, the middle, the near ground at the foot. */
function bandsOf(world: WorldState, box: SceneBox): Band[] {
  const { terrain } = world
  const median = (v: readonly number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 10
  const farKm = Math.max(4, median(terrain.far?.distanceKm ?? [12]))
  const nearKm = Math.max(0.8, Math.min(farKm / 2, median(terrain.near.distanceKm)))
  const crest = Math.min(...terrain.far.points.map(([, y]) => y), ...terrain.near.points.map(([, y]) => y))
  // The town's own roofs stand over the ridge line: they take the far ground's shadows too.
  const view = world.place3.kind === 'outside' ? world.place3 : null
  const roofs = view ? Math.min(...view.skyline.boxes.map((b) => b.top), ...view.skyline.towers.map((t) => t.baseY - t.h)) : Infinity
  const top = Math.max(0, Math.floor(Math.min(crest, roofs)) - 2), bottom = box.landHeight
  const h = bottom - top
  // Three hats that sum to one down the land: each band fades into the next over the stretch between their middles.
  const c0 = top + h * 0.25, c1 = top + h * 0.5, c2 = top + h * 0.75
  return [
    { id: 'far', top, bottom: c1, km: farKm, fadeIn: null, fadeOut: [c0, c1] },
    { id: 'mid', top: c0, bottom: c2, km: Math.sqrt(farKm * nearKm), fadeIn: [c0, c1], fadeOut: [c1, c2] },
    { id: 'near', top: c1, bottom, km: nearKm, fadeIn: [c1, c2], fadeOut: null },
  ]
}

/** Scene px per km across at a distance (the camera's angular scale). */
const pxPerKm = (km: number, sx: number) => (DEG / km) * PX_PER_DEG * sx

/** The cloud shadows' layers on the land (none without a broken sky and a sun to cast them). */
export function cloudShadowLayers(world: WorldState, box: SceneBox): LayerOf<'cloudShadow'>[] {
  const { shadows } = world
  if (!shadows || shadows.strength < 0.01 || box.landHeight <= 0 || world.terrain.status !== 'ready') return []
  const sx = box.width / SCENE_W
  const period = Math.ceil(box.width * 1.5)
  // The cover in steps (a scrub through an hour repaints the tile only when a patch more forms).
  const cover = Math.round(clamp01(shadows.cover) * 16) / 16
  return bandsOf(world, box).map((band, i) => {
    const r = seeded(hashId(`${world.place.id}:cloud-shadow:${band.id}`))
    // Farther, the air between lightens the shade toward its own tone.
    const rgb = mixRgb(SHADE, hazeOf(world), 0.3 * (1 - i / 2))
    const scale = pxPerKm(band.km, sx)
    const h = band.bottom - band.top
    // As many patches as the cover makes of the band, each a cloud's size at its distance, flattened by the ground's
    // foreshortening (far ground nearly edge-on).
    const flat = 0.22 + 0.25 * (i / 2)
    const count = Math.round(cover * Math.max(4, (period / (scale * 4)) * 2.4))
    // A cloud's shadow is lumpy: a body and two lobes, each a soft ellipse.
    const blobs = Array.from({ length: count }, () => {
      const rx = (CLOUD_KM[0] + (CLOUD_KM[1] - CLOUD_KM[0]) * r()) * scale / 2
      const x = r() * period, y = band.top + h * r()
      const ry = Math.max(1.5, rx * flat * (0.7 + 0.6 * r()))
      const alpha = 0.55 + 0.45 * r()
      return [{ x, y, rx, ry, alpha }, ...[0, 1].map(() => ({ x: x + (r() - 0.5) * 1.4 * rx, y: y + (r() - 0.5) * ry, rx: rx * (0.45 + 0.3 * r()),
        ry: ry * (0.5 + 0.3 * r()), alpha: alpha * 0.8 }))]
    }).flat()
    // Where the wind has carried them at this minute (whole device px are the compositor's), and their loop's slow drift.
    const offset = ((shadows.driftKm * scale) % period + period) % period
    const speed = (shadows.kmh / 3600) * scale * LOOP_RATE
    const alpha = Math.round(clamp01(shadows.strength * 0.7) * 64) / 64
    return {
      kind: 'cloudShadow', id: `cloudShadow.${band.id}`, surface: 'land', z: Z + i * 0.01, soft: true, blend: 'source-atop',
      bounds: { x: 0, y: Math.floor(band.top), w: period, h: Math.ceil(band.bottom) - Math.floor(band.top) },
      blobs, rgb, period, band: { top: band.top, bottom: band.bottom, fadeIn: band.fadeIn, fadeOut: band.fadeOut },
      animated: { mode: 'drift', speed, period, offset, alpha },
      key: layerKey('cloudShadow', band.id, world.place.id, cover, Math.round(band.top * 2), Math.round(band.bottom * 2), Math.round(scale * 8),
        colourKey(rgb), landBoxKey(box, true)),
    } satisfies LayerOf<'cloudShadow'>
  })
}
