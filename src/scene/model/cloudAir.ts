import { genusOf } from '../../world/field/genus'
import { airFrames } from '../../world/field/handover'
import type { WorldState } from '../../world/types'
import { gridFor } from './cloudSheetGrid'
import { skyGeom } from './sky'
import type { CloudAir, LayerDesc, SceneBox } from './types'

/** A node's place in a sheet's own air (km east, north): the same cloud keeps it as the wind carries it over the ground. */
export function airAt({ ranges, east, north, frames }: CloudAir, row: number, col: number, frame = 0): [number, number] {
  const [dx, dy] = frames[frame].d
  return [ranges[row] * east[col] - dx, ranges[row] * north[col] - dy]
}

/** What of the air a sheet's own key does not hold: the carry, and the rays' bearing and reach. */
const airBits = ({ ranges, east, north, frames }: CloudAir) =>
  `:air:${[ranges[ranges.length - 1], east[0], north[0], ...frames.flatMap(({ d, weight }) => [...d, weight])].map((v) => v.toFixed(3))}`

/** The sheets with their air, where asked for: the rays and the carry the model draws them by (`cloudSheetOf`, `airFrames`). */
export function withCloudAir(layers: LayerDesc[], world: WorldState, box: SceneBox, asked?: boolean): LayerDesc[] {
  const { cloudField } = world
  if (!asked || !cloudField) return layers
  const geom = skyGeom(world, box)
  return layers.map((desc) => {
    if (desc.kind !== 'cloudSheet') return desc
    const snapshot = cloudField.snapshot.find(({ layer }) => layer?.lattice === desc.lattice)
    if (!snapshot?.layer) return desc
    const { layer, heightKm } = snapshot
    const { ranges, east, north } = gridFor(world.place.id, layer, geom, heightKm, genusOf(layer.lattice, layer.form, 0.5))
    const air = { ranges: ranges.slice(), east: east.slice(), north: north.slice(), frames: airFrames(layer, cloudField.field.t) }
    return { ...desc, air, key: desc.key + airBits(air) }
  })
}