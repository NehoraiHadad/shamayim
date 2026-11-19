import { hashId } from '../../data/landmarks/hash'
import type { Plane, WorldState } from '../../world/types'
import { SCENE_W } from '../../world/sceneBox'
import { LAND_MODEL } from '../../world/land'
import { groundAt as lineAt } from '../../world/sceneLight'
import { groundForm } from './ground'
import { landBoxKey, layerKey } from './keys'
import { planeLight } from './planeLight'
import type { Box, LayerOf, Pt, RGB, SceneBox } from './types'

type PlaneName = 'back' | 'far' | 'near'

/** Draw order on the land surface (water, cities and the portrait come between from C3 on). */
const Z: Record<PlaneName, number> = { back: 5, far: 10, near: 30 }
/** The form's neutral value: the light canvas laid over it with `overlay` shows its own colours exactly here. */
const NEUTRAL: RGB = [0.5, 0.5, 0.5]
/**
 * How much of the modelling a plane carries: the near ridge all of it, a far one less (its marks are smaller and the
 * haze takes their contrast). A fixed share by the plane, so the form never depends on the hour's air.
 */
const MODEL: Record<PlaneName, number> = { back: 0.3, ...LAND_MODEL }
/** Bumped when the form's drawing rules change, so cached forms are not reused across versions. */
const FORM = 2

const shapes = new WeakMap<Plane, Map<string, { outline: Pt[]; top: number }>>()

/**
 * A plane's outline in the box: its ridge line and down to the box's foot; a plane behind the near ridge only down to a
 * little under it (the rest is hidden: less to paint). Memoised per plane and box (scrubbing keeps both).
 */
function shapeOf(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane) {
  let byBox = shapes.get(plane)
  if (!byBox) shapes.set(plane, byBox = new Map())
  const key = `${name}:${box.width}:${box.landHeight}`
  let shape = byBox.get(key)
  if (!shape) {
    const sx = box.width / SCENE_W
    const ridge = plane.points.map(([x, y]): Pt => [x * sx, y])
    const front = world.terrain.near.points
    const outline: Pt[] = name === 'near' || front.length < 2
      ? [...ridge, [ridge.at(-1)![0], box.landHeight], [ridge[0][0], box.landHeight]]
      : [...ridge, ...ridge.map(([x, y]): Pt => [x, Math.min(box.landHeight, Math.max(y, lineAt(front, x / sx) + 3))]).reverse()]
    const top = Math.max(0, Math.floor(Math.min(...ridge.map(([, y]) => y))) - 1)
    if (byBox.size > 8) byBox.clear()
    byBox.set(key, shape = { outline, top })
  }
  return shape
}

/**
 * One plane of land (stage C2): its ridge line across the box and down to the box's foot, in the enriched hand. The form
 * (texture, gullies, terraces, scrub; `world/land.ts`, `ground.ts`) is keyed by the terrain, the place's text zones and the box, so
 * scrubbing the hour never repaints it; the colours after light, haze and wet ground, the lit and shaded faces, the
 * floor shadow, the rim and the snow are its light part (`planeLight.ts`).
 */
export function planeLayer(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, clear: readonly Box[]): LayerOf<'plane'> | null {
  if (plane.points.length < 2 || box.width <= 0 || box.landHeight <= 0) return null
  const { outline, top } = shapeOf(world, box, name, plane)
  const k = MODEL[name]
  // The ground's texture on the near ridge only: haze takes it from the planes behind (and they are mostly hidden).
  const hidden = name === 'near' ? undefined : Math.min(box.landHeight, Math.ceil(Math.max(...world.terrain.near.points.map(([, y]) => y))) + 2)
  const ground = name === 'back' ? { gullies: [], terraces: [], scrub: [] } : groundForm(world, box, name, clear)
  return {
    kind: 'plane', plane: name, id: `plane.${name}`, surface: 'land', z: Z[name],
    // A plane behind the near ridge is hidden under its lowest crest: its canvases stop there.
    bounds: { x: 0, y: top, w: box.width, h: Math.max(1, (hidden ?? box.landHeight) - top) },
    key: layerKey('plane', name, FORM, world.keys.terrain, world.keys.place, landBoxKey(box)),
    outline, fill: NEUTRAL, ...ground, grain: { amount: name === 'near' ? 1 : 0, seed: hashId(`${world.place.id}:${name}:grain`) },
    light: planeLight(world, box, name, plane, k),
  }
}

export function planeLayers(world: WorldState, box: SceneBox, clear: readonly Box[] = []): LayerOf<'plane'>[] {
  const { terrain } = world
  const planes: [PlaneName, Plane | undefined][] = [['back', terrain.back], ['far', terrain.far], ['near', terrain.near]]
  return planes.flatMap(([name, plane]) => {
    const layer = plane && planeLayer(world, box, name, plane, clear)
    return layer ? [layer] : []
  })
}
