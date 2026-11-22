import { layerKey } from '../model/keys'
import type { LayerDesc } from '../model/types'
import { EMPTY_VEGETATION } from '../model/vegDescriptor'
import type { PaintJob } from './paintJob'

export function shadeKeyOf(desc: LayerDesc) {
  if (desc.kind === 'plane' && desc.cloudShadow) return desc.light.key
  if (desc.kind === 'canopy' && desc.cloudShadow && desc.shadedTones) return layerKey(desc.key, desc.shadedTones.key)
}

/** Sends only the buffers the light painter consumes. */
function lightJobDesc(desc: LayerDesc): LayerDesc {
  if (desc.kind === 'canopy') return { ...desc, cloudShadow: undefined }
  if (desc.kind !== 'plane') return desc
  return {
    ...desc,
    cloudShadow: undefined,
    vegetation: {
      ...desc.vegetation,
      trees: EMPTY_VEGETATION.trees, treeMeta: EMPTY_VEGETATION.treeMeta,
      tufts: EMPTY_VEGETATION.tufts, tuftMeta: EMPTY_VEGETATION.tuftMeta,
    },
  }
}

export function receiverJob(desc: LayerDesc, part: PaintJob['part'], formless: boolean, sameForm: boolean,
  shown: boolean): Pick<PaintJob, 'desc' | 'shade' | 'progressive' | 'scrubReceiver' | 'coldPreview'> {
  const shade = part === 'light' && shadeKeyOf(desc) ? true : undefined
  const progressive = desc.kind === 'canopy' && formless
  const scrubReceiver = formless && sameForm && desc.kind === 'plane' ? true : undefined
  const coldPreview = shade && progressive && !shown ? true : undefined
  return { desc: part === 'light' ? lightJobDesc(desc) : desc, shade, progressive, scrubReceiver, coldPreview }
}
