import { plainContrast } from '../../data/city/plainHaze'
import type { WorldState } from '../../world/types'
import { isFamousNonOwn } from '../../world/neighbourIdentity'
import { tonesAt } from './marks'
import { colourKey } from './keys'
import { toneAt } from './planeLight'
import { mixRgb } from './tone'
import type { GlyphDesc, OutsideItem, Tones } from './types'

/** The far-city contrast law, evaluated at the true receiving-eye distance, never the icon's drawn size. */
export const landmarkContrast = (world: WorldState, km: number) => plainContrast(km, world.air?.visibilityKm)

/** Existing land/far-city aerialFor is already in tonesAt. Contract material/detail contrast toward the
 * land at that same distance as well, rather than adding only a haze tint. Lamps use far-city Allard transmission. */
export function landmarkTonesAt(world: WorldState, km: number, contrast = landmarkContrast(world, km)): Tones {
  const own = tonesAt(world, km), land = toneAt(world, km), tones = {} as Tones
  for (const key of Object.keys(own) as (keyof Tones)[]) {
    tones[key] = key === 'mist' ? own[key] : mixRgb(land, own[key], key === 'win' ? Math.cbrt(contrast) : contrast)
  }
  return tones
}

/** Refresh only light, including visibility-only changes on a cached outside shape. */
export function refreshLandmarkGlyph(world: WorldState, glyph: GlyphDesc, km: number): GlyphDesc {
  if (!isFamousNonOwn(glyph)) return { ...glyph, tones: tonesAt(world, km) }
  const distance = glyph.trueDistanceKm!, contrast = landmarkContrast(world, distance)
  return { ...glyph, contrast, tones: landmarkTonesAt(world, distance, contrast) }
}

/** Preserve cached outside geometry while refreshing the descriptors' hour-dependent colours. */
export function refreshLandmarkItems(world: WorldState, items: readonly OutsideItem[],
  marks: readonly { at: number; km: number }[]): OutsideItem[] {
  const out = [...items]
  for (const { at, km } of marks) {
    const item = out[at] as Extract<OutsideItem, { kind: 'mark' }>
    out[at] = { kind: 'mark', glyph: refreshLandmarkGlyph(world, item.glyph, km) }
  }
  return out
}

/** The palette and Allard lamp transmission at the compositor's colour/alpha-byte precision. */
export const glyphAtmosphereKey = (glyphs: readonly GlyphDesc[]) => glyphs.map(g => [
  (Object.keys(g.tones) as (keyof Tones)[]).map(k => colourKey(g.tones[k])),
  isFamousNonOwn(g) ? Math.round(Math.cbrt(g.contrast!) * 255) : null,
])
