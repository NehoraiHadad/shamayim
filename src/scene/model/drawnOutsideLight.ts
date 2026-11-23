import { drawnLightOf } from '../../world/drawnLight'
import { partKey } from '../../world/keys'
import { isFamousNonOwn } from '../../world/neighbourIdentity'
import type { WorldState } from '../../world/types'
import { drawnGroundToneAt } from './drawnHaze'
import { drawnTonesAt, type DrawnTones } from './drawnTones'
import { landmarkContrast, refreshLandmarkItems } from './landmarkAtmosphere'
import { shineOf } from './marks'
import { skyFormOf } from './ownSkyForm'
import { mixRgb } from './tone'
import type { outsideShape } from './outsideShape'
import type { SceneBox } from './types'

/** Only the drawn outside layer needs main's illustrated palette and sky form. */
export function drawnOutsideLight(world: WorldState, box: SceneBox, shape: ReturnType<typeof outsideShape>, sx: number) {
  const litWorld = { ...world, light: drawnLightOf(world.light) }
  const palettes = new Map<number, DrawnTones>()
  const at = (km: number): DrawnTones => {
    let tones = palettes.get(km)
    if (!tones) palettes.set(km, tones = drawnTonesAt(litWorld, km))
    return tones
  }
  const tiers = shape.kms.map(at)
  const items = refreshLandmarkItems(litWorld, shape.items, shape.marks, (_, glyph, km) => {
    if (!isFamousNonOwn(glyph)) return { ...glyph, tones: at(km) }
    const distance = glyph.trueDistanceKm!, contrast = landmarkContrast(litWorld, distance)
    const tones = { ...at(distance) }, land = drawnGroundToneAt(litWorld, distance)
    for (const key of Object.keys(tones) as (keyof DrawnTones)[]) {
      if (key !== 'mist') tones[key] = mixRgb(land, tones[key], key === 'win' ? Math.cbrt(contrast) : contrast)
    }
    return { ...glyph, tones, contrast }
  })
  const form = skyFormOf(litWorld, box, shape.kms, tiers, sx)
  const shine = shineOf(litWorld)
  return { tiers, items, form, shine, key: partKey([form, shine], 8) }
}
