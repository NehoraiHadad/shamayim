import type { LayerDesc } from '../model/types'

/** Upright plants follow their receiver ahead of any intervening land layers. */
export function compositeOrder(layers: readonly LayerDesc[]): LayerDesc[] {
  const sorted = [...layers].sort((a, b) => a.z - b.z)
  const canopyById = new Map(sorted.filter((layer) => layer.kind === 'canopy').map((layer) => [layer.id, layer]))
  const ordered: LayerDesc[] = []
  for (const desc of sorted) {
    if (desc.kind === 'canopy') continue
    ordered.push(desc)
    const canopy = desc.kind === 'plane' && desc.canopyId ? canopyById.get(desc.canopyId) : undefined
    if (canopy) ordered.push(canopy)
  }
  return ordered
}
