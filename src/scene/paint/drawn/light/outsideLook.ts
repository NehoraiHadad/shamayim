import { halfDepthLightOf } from '../../../../world/halfDepthLight'
import { partKey } from '../../../../world/keys'
import { isFamousNonOwn } from '../../../../world/neighbourIdentity'
import { illustratedTonesAt, type IllustratedTones } from '../../../model/illustratedTones'
import { landmarkContrast, refreshLandmarkItems } from '../../../model/landmarkAtmosphere'
import { shineOf } from '../../../model/marks'
import type { OutsideFacts, OutsideLook } from '../../../model/styleLight'
import { mixRgb } from '../../../model/tone'
import type { OwnOutside } from '../outsideOwn'
import { drawnGroundToneAt } from './groundTone'
import { skyFormOf } from './skyForm'

/** The town in the illustrated palette, with the sky's form over it. */
export function drawnOutsideLook({ world, box, shape, sx }: OutsideFacts): OutsideLook {
  const litWorld = { ...world, light: halfDepthLightOf(world.light) }
  const palettes = new Map<number, IllustratedTones>()
  const at = (km: number): IllustratedTones => {
    let tones = palettes.get(km)
    if (!tones) palettes.set(km, tones = illustratedTonesAt(litWorld, km))
    return tones
  }
  const tiers = shape.kms.map(at)
  const items = refreshLandmarkItems(litWorld, shape.items, shape.marks, (_, glyph, km) => {
    if (!isFamousNonOwn(glyph)) return { ...glyph, tones: at(km) }
    const distance = glyph.trueDistanceKm!, contrast = landmarkContrast(litWorld, distance)
    const tones = { ...at(distance) }, land = drawnGroundToneAt(litWorld, distance)
    for (const key of Object.keys(tones) as (keyof IllustratedTones)[]) {
      if (key !== 'mist') tones[key] = mixRgb(land, tones[key], key === 'win' ? Math.cbrt(contrast) : contrast)
    }
    return { ...glyph, tones, contrast }
  })
  const form = skyFormOf(litWorld, box, shape.kms, tiers, sx)
  const shine = shineOf(litWorld)
  const own: OwnOutside = { form }
  return { tiers, items, shine, key: partKey([form, shine], 8), own }
}
