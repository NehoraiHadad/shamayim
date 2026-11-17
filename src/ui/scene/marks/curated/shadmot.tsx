import type { BuildingProps } from '../generic/buildingSpecs'
import { Synagogue } from '../generic/buildings'
import { seeded } from '../generic/geometry'
import { TileHouse } from '../generic/parts'

/**
 * Shadmot Mehola's homes: a religious moshav of red-tile houses on the valley floor around its synagogue hall.
 * The palms (Mehola grove), solar field and orchard reuse the generic Palms and field patches.
 */
export function ShadmotHomes({ night, seed = 1, litShare = 1 }: BuildingProps) {
  const random = seeded(seed)
  const houses: [number, number, number][] = [[-11, 7, 6], [-4.5, 9, 7], [7, 7, 6], [13, 7, 6]]
  return <>
    {houses.map(([x, w, h]) => <TileHouse key={x} x={x} w={w} h={h} night={night} lit={random() < litShare} />)}
    <g transform="translate(1.5 0)"><Synagogue h={9} night={night} /></g>
  </>
}
