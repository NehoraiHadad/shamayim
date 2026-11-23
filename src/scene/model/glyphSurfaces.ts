import { isField } from '../../world/glyphSpecs'
import { NORMALS, type Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { buildingLight, roofNormal } from './buildingLight'
import { SOOT, STACK_CONCRETE, STONE, TILE, WALL_ALBEDOS, materialBin } from './buildingMaterial'
import { domeSectors, silverLight } from './metalLight'
import { colourCode } from './keys'
import type { GlyphDesc, Tones } from './types'

type Returns = readonly [RGB, RGB]
export interface GlyphSurfaces {
  wall: Returns; stone: Returns; tile: Returns; glass?: Returns
  band?: RGB
  round: RGB[]; roundGlass?: RGB[]
  silver?: RGB
  eave: RGB
}

const SECTORS = [-.98, -.75, -.4, 0, .4, .75, .98]
const CURVES = ([-1, 1] as const).map(hand => SECTORS.map(x => [hand * x, -Math.sqrt(1 - x * x), 0] as Normal))
const LEFT: Normal = [-1, 0, 0], RIGHT: Normal = [1, 0, 0]
const CLAY_LEFT = roofNormal(LEFT), CLAY_RIGHT = roofNormal(RIGHT), CLAY_FRONT = roofNormal(NORMALS.front)

export function glyphSurfaces(world: WorldState, glyph: GlyphDesc, km: number, t: Tones, convert: (c: RGB) => RGB) {
  const gilding = glyph.kind === 'babShrine' ? domeSectors(world, km)
    .map(row => (glyph.hand === 1 ? row : row.reverse()).map(convert)) : undefined
  if (isField(glyph.kind) || glyph.kind === 'palms') return { tones: t, gilding }
  const shades = buildingLight(world, km)
  const receive = (rho: RGB, n: Normal, open?: number, beam?: number) => convert(shades(rho, n, open, beam))
  const hand = glyph.hand
  const front = NORMALS.front
  const left = hand === 1 ? LEFT : RIGHT, right = hand === 1 ? RIGHT : LEFT
  // Weathered concrete and soot distinguish industrial stacks from pale stone and sky.
  const wall = glyph.kind === 'chimney' || glyph.kind === 'cooling' ? STACK_CONCRETE : WALL_ALBEDOS[materialBin(glyph.seed)]
  const returns = (rho: RGB): Returns => [receive(rho, left), receive(rho, right)]
  const curved = CURVES[hand === 1 ? 1 : 0]
  const glazed = glyph.kind === 'azrieli' || glyph.kind === 'highrise'
  const glass = (n: Normal) => convert(shades.glass(n))
  const surfaces: GlyphSurfaces = {
    wall: returns(wall), stone: returns(STONE), tile: [receive(TILE, hand === 1 ? CLAY_LEFT : CLAY_RIGHT), receive(TILE, hand === 1 ? CLAY_RIGHT : CLAY_LEFT)],
    round: curved.map(n => receive(wall, n, .82, .85)), eave: receive(wall, front, .65, .6),
    ...(glazed ? { glass: [glass(left), glass(right)] as const, band: convert(shades.glass(front, true)) } : {}),
  }
  if (glyph.kind === 'azrieli') surfaces.roundGlass = curved.map(glass)
  if (glyph.kind === 'chordsBridge' || glyph.kind === 'turbine' || glyph.kind === 'mast') {
    surfaces.silver = convert(silverLight(world, km)([0, -.8, .6]))
  }
  const tones = { ...t,
    wall: receive(wall, front), stone: receive(STONE, front),
    rim: receive(wall, NORMALS.top), lit: convert(shades.unresolved(wall)),
    stoneLit: convert(shades.unresolved(STONE)),
    shade: receive(wall, front, .58), deep: receive(wall, front, .25, 0),
    roof: receive(TILE, CLAY_FRONT), glass: glazed ? glass(front) : t.glass,
    soot: receive(SOOT, front, .45, 0),
  }
  return { tones, surfaces, gilding }
}

/** The lightweight colour signature covers surfaces whose normals don't appear in the base palette. */
export const glyphSurfaceKey = (s: GlyphSurfaces | undefined) => s && [
  s.wall, s.stone, s.tile, s.glass ?? [], [s.eave], s.band ? [s.band] : [], s.round, s.roundGlass ?? [], s.silver ? [s.silver] : [],
].flat().map(c => colourCode(c, 2))
