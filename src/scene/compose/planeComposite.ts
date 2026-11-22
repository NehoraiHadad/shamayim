import type { LayerDesc, LayerOf } from '../model/types'
import type { LayerCache } from './layerCache'
import { stripKey } from './paintJob'
import type { RemoteCache } from './remoteCache'

/** A canopy can arrive before either the receiver or the matching light generation. */
export function canopyMatchesPlane(
  canopy: LayerOf<'canopy'>, receiver: LayerOf<'canopy'>['receiver'], layers: readonly LayerDesc[],
  cache: Pick<LayerCache | RemoteCache, 'peek'>,
) {
  const id = canopy.id.replace(/^canopy\./, 'plane.')
  if (!layers.some((layer) => layer.id === id)) return false
  const plane = cache.peek(id)
  return Boolean(plane?.light && receiver && plane.desc.kind === 'plane'
    && plane.desc.key === receiver.form
    && plane.lightKey === (receiver.light + stripKey(plane.desc)))
}
