import { plainContrast } from '../../data/city/plainHaze'
import type { WorldState } from '../../world/types'
import type { SceneStyle } from '../sceneStyle'
import { isFamousNonOwn } from '../../world/neighbourIdentity'
import { tonesAt } from './marks'
import { glyphSurfaces, glyphSurfaceKey } from './glyphSurfaces'
import { colourCode } from './keys'
import { toneAt } from './landVeil'
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
export function refreshLandmarkGlyph(world: WorldState, glyph: GlyphDesc, km: number, style: SceneStyle = 'real'): GlyphDesc {
  const far = isFamousNonOwn(glyph), distance = far ? glyph.trueDistanceKm! : km
  const contrast = far ? landmarkContrast(world, distance) : 1
  const t = far ? landmarkTonesAt(world, distance, contrast) : tonesAt(world, distance)
  const land = far ? toneAt(world, distance) : null
  const use = glyphSurfaces(world, glyph, distance, t, c => land ? mixRgb(land, c, contrast) : c, style)
  return { ...glyph, ...use, windowWall: t.wall, shadowTones: { deep: t.deep, shade: t.shade }, ...(far ? { contrast } : {}) }
}

/** Preserve cached outside geometry while refreshing the descriptors' hour-dependent colours. */
export function refreshLandmarkItems(world: WorldState, items: readonly OutsideItem[],
  marks: readonly { at: number; km: number }[], refresh = refreshLandmarkGlyph): OutsideItem[] {
  const out = [...items]
  for (const { at, km } of marks) {
    const item = out[at] as Extract<OutsideItem, { kind: 'mark' }>
    out[at] = { kind: 'mark', glyph: refresh(world, item.glyph, km) }
  }
  return out
}

/** The palette and Allard lamp transmission at the compositor's colour/alpha-byte precision. */
export const glyphAtmosphereKey = (glyphs: readonly GlyphDesc[]) => glyphs.map(g => [
  (Object.keys(g.tones) as (keyof Tones)[]).map(k => colourCode(g.tones[k])),
  g.windowWall && colourCode(g.windowWall), glyphSurfaceKey(g.surfaces), g.gilding?.flat().map(c => colourCode(c, 2)),
  g.floodlitDome && [Math.round(g.floodlitDome.strength * 255), ...Object.values(g.floodlitDome.tones).map(c => colourCode(c))],
  isFamousNonOwn(g) ? Math.round(Math.cbrt(g.contrast!) * 255) : null,
])
