import type { LayerDesc } from '../model/types'
import type { LayerCache } from './layerCache'
import { formKeyOf } from './paintJob'
import type { RemoteCache } from './remoteCache'

/**
 * Verifies that a cached canopy bitmap belongs to the exact plane geometry currently shown (Stage 7 round 2, Finding 8).
 * During land-data refinement or resize, plane and canopy Worker results can arrive out of order: skip a mismatched
 * canopy until its matching plane geometry lands so canopies never float on an older or newer ridge silhouette.
 */
export function canopyMatchesPlane(
  canopy: Extract<LayerDesc, { kind: 'canopy' }>,
  byId: ReadonlyMap<string, LayerDesc>,
  cache: LayerCache | RemoteCache,
  dpr: number,
): boolean {
  if (!canopy.planeFormKey) return true
  const planeId = canopy.id.replace(/^canopy\./, 'plane.')
  const planeDesc = byId.get(planeId)
  if (!planeDesc || planeDesc.kind !== 'plane') return true
  const planeCached = cache.peek(planeId)
  if (!planeCached) return true
  const shownPlane = planeCached.desc === planeDesc || planeCached.formKey === formKeyOf(planeDesc, dpr).key
    ? planeDesc : planeCached.desc
  return shownPlane.key === canopy.planeFormKey
}
