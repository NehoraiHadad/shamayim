//# allFunctionsCalledOnLoad
import { hashId } from '../../data/landmarks/hash'
import type { Plane, WorldState } from '../../world/types'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import { groundForm } from './ground'
import { groundClearKey } from './groundClear'
import { landBoxKey, layerKey } from './keys'
import { planeSurfaceOf } from './landColour'
import { planeVegetationOf } from './landVegetation'
import { planeGeomOf } from './planeGeometry'
import { planeLight } from './planeLight'
import { planeCrest } from './planeCrest'
import { cropEvidenceKey } from './vegCropEvidence'
import { EMPTY_VEGETATION } from './vegDescriptor'
import type { Box, LayerOf, Pt, SceneBox } from './types'

type PlaneName = 'back' | 'far' | 'near'

/** Draw order on the land surface (water, cities and the portrait come between from C3 on). */
const Z: Record<PlaneName, number> = { back: 5, far: 10, near: 30 }
/** Bumped when the form's drawing rules change, so cached forms are not reused across versions. */
const FORM = 10

const shapes = new WeakMap<Plane, Map<string, { outline: Pt[]; top: number }>>()

function shapeOf(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, geomKey: string) {
  let byBox = shapes.get(plane)
  if (!byBox) shapes.set(plane, byBox = new Map())
  const key = `${name}:${box.width}:${box.landHeight}:${geomKey}`
  let shape = byBox.get(key)
  if (!shape) {
    const sx = box.width / SCENE_W
    const ridge = planeCrest(plane, box.width)
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
 * One plane of land (stage C2 + Stage 7 round 2): raw BOA albedo form (`key` independent of hour) paired with
 * exact single-pass linear-light `planeLight` (`litField`, per-sample linear haze, snow reflectance and crest rims).
 */
export function planeLayer(world: WorldState, box: SceneBox, name: PlaneName, plane: Plane, clear: readonly Box[]): LayerOf<'plane'> | null {
  if (plane.points.length < 2 || box.width <= 0 || box.landHeight <= 0) return null
  const geom = planeGeomOf(world, name, plane, box.landHeight)
  const { outline, top } = shapeOf(world, box, name, plane, geom.geomKey)
  const hidden = name === 'near' ? undefined : Math.min(box.landHeight, Math.ceil(Math.max(...world.terrain.near.points.map(([, y]) => y))) + 2)
  const ground = name === 'back' ? { gullies: [], terraces: [] } : groundForm(world, box, name, clear)
  const surface = planeSurfaceOf(world, name, plane, box.landHeight)
  const vegetation = name === 'back' ? EMPTY_VEGETATION : planeVegetationOf(world, box, name, plane, surface.median, clear)
  const baseKey = layerKey('plane', name, FORM, world.keys.terrain, geom.geomKey, world.keys.place, world.keys.land, landBoxKey(box),
    name === 'back' ? '' : groundClearKey(clear), name === 'back' ? '' : cropEvidenceKey(world))
  const key = surface.foreground ? layerKey(baseKey, surface.foreground.key) : baseKey
  const light = planeLight(world, box, name, plane)
  const canopyId = vegetation.trees.length || vegetation.tufts.length ? `canopy.${name}` : undefined
  return {
    kind: 'plane', plane: name, id: `plane.${name}`, surface: 'land', z: Z[name],
    bounds: { x: 0, y: top, w: box.width, h: Math.max(1, (hidden ?? box.landHeight) - top) },
    key,
    outline, fill: surface.median, surfaceTone: surface.palette, ...ground, vegetation, canopyId,
    ...(surface.foreground ? { foreground: surface.foreground.field } : {}),
    grain: { amount: name === 'near' ? 1 : 0, seed: hashId(`${world.place.id}:${name}:grain`) },
    light: { ...light, key: layerKey(light.key, key) },
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
