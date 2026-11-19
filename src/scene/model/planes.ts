import type { Plane, WorldState } from '../../world/types'
import { SCENE_W } from '../../world/sceneBox'
import { colourKey, landBoxKey, layerKey } from './keys'
import { mixHex, rgbOf } from './tone'
import type { LayerOf, Pt, RGB, SceneBox } from './types'

type PlaneName = 'back' | 'far' | 'near'

/** Draw order on the land surface (water, cities and the portrait come between from C3 on). */
const Z: Record<PlaneName, number> = { back: 5, far: 10, near: 30 }
/** The ground's own tone before any light (the form canvas): only its shape counts until C2 adds texture. */
const ALBEDO: Record<PlaneName, RGB> = { back: [0.5, 0.48, 0.44], far: [0.46, 0.43, 0.38], near: [0.42, 0.38, 0.32] }

/**
 * The tone of a plane after light and haze. C1 carries the SVG scene's rule over unchanged (a ridge tone of the light's
 * palette, paled toward the air by the plane's fade); C2 replaces it with the light and the aerial perspective by
 * distance (`air.fade`).
 */
function planeTone(world: WorldState, name: PlaneName): RGB {
  const { palette } = world.light
  const air = mixHex(palette.mid, palette.horizon, 0.45)
  const fade = name === 'near' ? world.air.nearFade : world.air.farFade
  return rgbOf(mixHex(name === 'near' ? palette.ridgeNear : palette.ridgeFar, air, fade * 0.9))
}

/**
 * One plane of land as a flat fill (stage C1): its ridge line across the box and down to the box's foot. The form (its
 * shape) is keyed by the terrain and the box alone, so scrubbing the hour never repaints it; the tone is its light part.
 */
export function planeLayer(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane): LayerOf<'plane'> | null {
  if (plane.points.length < 2 || box.width <= 0 || box.landHeight <= 0) return null
  const sx = box.width / SCENE_W
  const ridge = plane.points.map(([x, y]): Pt => [x * sx, y])
  const outline: Pt[] = [...ridge, [ridge.at(-1)![0], box.landHeight], [ridge[0][0], box.landHeight]]
  const top = Math.max(0, Math.floor(Math.min(...ridge.map(([, y]) => y))) - 1)
  const tint = planeTone(world, name)
  return {
    kind: 'plane', plane: name, id: `plane.${name}`, surface: 'land', z: Z[name],
    bounds: { x: 0, y: top, w: box.width, h: Math.max(1, box.landHeight - top) },
    key: layerKey('plane', name, world.keys.terrain, landBoxKey(box)),
    outline, fill: ALBEDO[name], faces: [], gullies: [], terraces: [], scrub: [], grain: { amount: 0, seed: world.seed },
    light: { key: layerKey('plane.light', colourKey(tint)), blend: 'source-over', tint, faces: [] },
  }
}

export function planeLayers(world: WorldState, box: SceneBox): LayerOf<'plane'>[] {
  const { terrain } = world
  const planes: [PlaneName, Plane | undefined][] = [['back', terrain.back], ['far', terrain.far], ['near', terrain.near]]
  return planes.flatMap(([name, plane]) => {
    const layer = plane && planeLayer(world, box, name, plane)
    return layer ? [layer] : []
  })
}
