import type { LayerDesc } from '../model/types'

interface CompositePass { desc: LayerDesc; part: 'both' | 'form' | 'light' }

/**
 * Composite order for planes and canopies:
 * - Self-contained lit planes (`litField`): `plane (both)` -> `canopy (both)` (both carry exact lit tones in one pass).
 * - Legacy planes without `litField`: `plane:form` -> `canopy:form` -> `plane:light` -> `canopy:light`.
 */
export function compositeOrder(layers: readonly LayerDesc[]): CompositePass[] {
  const sorted = [...layers].sort((a, b) => a.z - b.z)
  const canopyById = new Map(sorted.filter((layer) => layer.kind === 'canopy').map((layer) => [layer.id, layer]))
  const passes: CompositePass[] = []
  for (const desc of sorted) {
    if (desc.kind === 'canopy') continue
    const canopy = desc.kind === 'plane' && desc.canopyId ? canopyById.get(desc.canopyId) : undefined
    if (canopy) {
      if (desc.kind === 'plane' && desc.light.litField) {
        passes.push({ desc, part: 'both' }, { desc: canopy, part: 'both' })
      } else {
        passes.push({ desc, part: 'form' }, { desc: canopy, part: 'form' }, { desc, part: 'light' }, { desc: canopy, part: 'light' })
      }
    } else passes.push({ desc, part: 'both' })
  }
  return passes
}
