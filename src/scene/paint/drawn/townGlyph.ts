import type { GlyphDesc, Shine } from '../../model/types'
import { drawGlyphShape, glyphLight, placeGlyph } from '../glyphs'
import type { Ctx2D } from '../hand'
import { church, minaret, synagogue, waterTower } from './glyphBuildings'
import { azrieli, babShrine, chordsBridge } from './glyphIcons'
import { cooling, highrise, silo } from './glyphIndustry'
import { DrawnGlyphKit } from './glyphKit'
import { lighthouse, turbine } from './glyphStructures'

// Keep the original versions of glyphs whose shapes or accents changed with the real receivers.
const drawnShapes: Partial<Record<GlyphDesc['kind'], (kit: DrawnGlyphKit, height: number) => void>> = {
  azrieli, babShrine, chordsBridge, church, cooling, highrise, lighthouse, minaret, silo, synagogue, turbine, waterTower,
}

export function paintTownGlyph(ctx: Ctx2D, glyph: GlyphDesc, shine: Shine) {
  return placeGlyph(ctx, glyph, () => {
    const kit = new DrawnGlyphKit(ctx, glyph.tones, shine, glyph.seed, glyph.hand * glyphLight(shine))
    const shape = drawnShapes[glyph.kind]
    if (shape) shape(kit, glyph.h)
    else drawGlyphShape(kit, glyph)
    return kit.lamps
  })
}
