import type { SceneModel } from '../scene/model/types'

/**
 * Dev only (the scene harness's `hide=` param): the model without the layers whose id starts with one of `ids`
 * (comma-separated), to show which layer draws what in a still. `sky.band` drops the haze band from the sky layer.
 */
export function hideLayers(model: SceneModel, ids: string | null): SceneModel {
  const hidden = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!hidden.length) return model
  const noBand = hidden.includes('sky.band')
  const layers = model.layers
    .filter((l) => !hidden.some((h) => h !== 'sky.band' && l.id.startsWith(h)))
    .map((l) => (noBand && l.kind === 'sky' ? { ...l, band: null } : l))
  return { ...model, layers }
}
