import { isField } from '../../world/glyphSpecs'
import { NORMALS, type Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { buildingLight, roofNormal } from './buildingLight'
import { GLASS, SOOT, STONE, TILE, WALL_ALBEDOS, materialBin } from './buildingMaterial'
import { domeSectors, silverLight } from './metalLight'
import { colourKey } from './keys'
import type { GlyphDesc, Tones } from './types'

type Returns = readonly [RGB, RGB]
export interface GlyphSurfaces {
  wall: Returns; stone: Returns; tile: Returns; glass: Returns
  round: RGB[]; roundGlass?: RGB[]
  silver?: RGB
  eave: RGB
}

const SECTORS = [-.98, -.75, -.4, 0, .4, .75, .98]

export function glyphSurfaces(world: WorldState, glyph: GlyphDesc, km: number, t: Tones, convert: (c: RGB) => RGB) {
  const gilding = glyph.kind === 'babShrine' ? domeSectors(world, km)
    .map(row => (glyph.hand === 1 ? row : row.reverse()).map(convert)) : undefined
  if (world.night.dark >= 1 || isField(glyph.kind) || glyph.kind === 'palms') return { tones: t, gilding }
  const shades = buildingLight(world, km)
  const receive = (rho: RGB, n: Normal, open?: number, beam?: number) => convert(shades(rho, n, open, beam))
  const hand = glyph.hand
  const front = NORMALS.front
  const left: Normal = [-hand, 0, 0], right: Normal = [hand, 0, 0]
  const wall = WALL_ALBEDOS[materialBin(glyph.seed, glyph.kind === 'westernWall' || glyph.kind === 'castle')]
  const returns = (rho: RGB): Returns => [receive(rho, left), receive(rho, right)]
  const curve = (rho: RGB) => SECTORS.map(x => receive(rho, [hand * x, -Math.sqrt(1 - x * x), 0]))
  const surfaces: GlyphSurfaces = {
    wall: returns(wall), stone: returns(STONE), tile: [receive(TILE, roofNormal(left)), receive(TILE, roofNormal(right))],
    glass: returns(GLASS), round: curve(wall), eave: receive(wall, front, .65),
  }
  if (glyph.kind === 'azrieli') surfaces.roundGlass = curve(GLASS)
  if (glyph.kind === 'chordsBridge' || glyph.kind === 'turbine' || glyph.kind === 'mast') {
    surfaces.silver = convert(silverLight(world, km)([0, -.8, .6]))
  }
  const tones = { ...t,
    wall: receive(wall, front), stone: receive(STONE, front),
    rim: receive(wall, NORMALS.top), lit: convert(shades.unresolved(wall)),
    stoneLit: convert(shades.unresolved(STONE)),
    shade: receive(wall, front, .58), deep: receive(wall, front, .25, 0),
    roof: receive(TILE, roofNormal(front)), glass: receive(GLASS, front),
    soot: receive(SOOT, front, .45, 0),
  }
  return { tones, surfaces, gilding }
}

/** The lightweight colour signature covers surfaces whose normals don't appear in the base palette. */
export const glyphSurfaceKey = (s: GlyphSurfaces | undefined) => s && [
  s.wall, s.stone, s.tile, s.glass, [s.eave], s.round, s.roundGlass ?? [], s.silver ? [s.silver] : [],
].flat().map(c => colourKey(c).map(v => v >> 2))
