import { landmarkTonesAt } from './landmarkAtmosphere'
import type { WorldMark } from '../../world/markGeometry'
import { needsTown } from '../../world/markContext'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { evaluateNeighbour } from './evaluateNeighbour'
import { farTownSupports } from './farTownSupport'
import { markDescriptor } from './markDescriptor'
import type { DrawnMass } from './markOcclusion'
import { nearestMarks } from './nearestMarks'
import { tonesAt } from './marks'
import type { HomeRoofline } from './neighbourPlacement'
import type { GlyphDesc, LayerOf, SceneBox, Box } from './types'

export function evaluateFarNeighbour(world: WorldState, mark: WorldMark, width: number,
  towns: LayerOf<'farCities'> | null, home: HomeRoofline | null, clear: readonly Box[], masses: DrawnMass[]) {
  const supports = needsTown(world, mark) ? farTownSupports(world, width, towns, mark) : [null]
  const evaluations = (supports.length ? supports : [undefined])
    .map(support => evaluateNeighbour(world, mark, width, support, home, clear, masses, 'far'))
  return evaluations.sort((a, b) => (a.placed ? Math.abs(a.placed.x - mark.x * width / SCENE_W) : Infinity)
    - (b.placed ? Math.abs(b.placed.x - mark.x * width / SCENE_W) : Infinity))[0]
}

/** Nearer retained glyphs are foreground too. Paint the final list far first. */
export function farNeighbourMarks(world: WorldState, box: SceneBox, towns: LayerOf<'farCities'> | null,
  home: HomeRoofline | null, clear: readonly Box[], foreground: readonly DrawnMass[]): GlyphDesc[] {
  const candidates = world.marks.filter(mark => mark.plane !== 'near')
  const { kept } = nearestMarks(candidates, foreground, (mark, mass) => {
    if (mark.sightKm === undefined) return { mark, x: mark.x * box.width / SCENE_W,
      hazeKm: mark.km, supportId: undefined as string | undefined, town: undefined as boolean | undefined }
    const result = evaluateFarNeighbour(world, mark, box.width, towns, home, clear, mass)
    return result.placed ? { ...result.placed, hazeKm: result.hazeKm,
      supportId: result.supportId, town: result.town } : null
  })
  return kept.reverse().map(({ mark, x, hazeKm, supportId, town }) => {
    const glyph = markDescriptor(world, mark, x, tonesAt(world, hazeKm), hazeKm, supportId, town)
    return glyph.contrast === undefined ? glyph
      : { ...glyph, tones: landmarkTonesAt(world, mark.km, glyph.contrast) }
  })
}
