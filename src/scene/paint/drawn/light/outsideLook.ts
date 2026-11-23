import { drawnLightOf } from '../../../../world/drawnLight'
import { partKey } from '../../../../world/keys'
import { isFamousNonOwn } from '../../../../world/neighbourIdentity'
import { drawnTonesAt, type DrawnTones } from '../../../model/drawnTones'
import { landmarkContrast, refreshLandmarkItems } from '../../../model/landmarkAtmosphere'
import { shineOf } from '../../../model/marks'
import type { OutsideFacts, OutsideLook } from '../../../model/styleLight'
import { mixRgb } from '../../../model/tone'
import type { LayerOf } from '../../../model/types'
import { drawnGroundToneAt } from './groundTone'
import { skyFormOf, type SkyForm } from './skyForm'

/** What this hand's light adds to the outside layer. */
interface OwnOutside { form: SkyForm }

/** The sky's form over the town, where this hand's light made the layer. */
export const skyFormIn = (desc: LayerOf<'outside'>) => (desc as LayerOf<'outside'> & Partial<OwnOutside>).form

/** The town in the illustrated palette, with the sky's form over it. */
export function drawnOutsideLook({ world, box, shape, sx }: OutsideFacts): OutsideLook {
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
  const own: OwnOutside = { form }
  return { tiers, items, shine, key: partKey([form, shine], 8), own }
}
