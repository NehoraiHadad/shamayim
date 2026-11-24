import { hashId, seeded } from '../../data/landmarks/hash'
import type { FallMark, LayerDesc, LayerOf } from './types'

/** A falling tile this many times as wide and high as the model's own. */
export interface FallTile { x: number; y: number }

/** A layer's marks over a larger tile: each with its own size and strength in every share of it, at a place of its own. */
function spread(layer: LayerOf<'fall'>, { x, y }: FallTile): FallMark[] {
  const { w, h } = layer.bounds
  return Array.from({ length: x * y }, (_, n) => {
    // A share's own chain: a mark more at its end moves no other.
    const r = seeded(hashId(`${layer.id}:${layer.marks[0]?.x}:tile${n}`))
    return layer.marks.map((m) => ({ ...m, x: (n % x + r()) * w, y: (Math.floor(n / x) + r()) * h }))
  }).flat()
}

/**
 * The near rain and snow on the larger tile a hand asks for, so the eye does not find the same drops side by side: as many
 * marks a px, the same lengths, slant, speed and areas. The far curtains' streaks keep theirs.
 */
export function withFallTile(layers: LayerDesc[], tile?: FallTile): LayerDesc[] {
  if (!tile) return layers
  return layers.map((layer) => layer.kind !== 'fall' || layer.id.startsWith('fall.far') ? layer
    : { ...layer, marks: spread(layer, tile), key: `${layer.key}:tile${tile.x},${tile.y}:${layer.marks.length}`,
      bounds: { ...layer.bounds, w: layer.bounds.w * tile.x, h: layer.bounds.h * tile.y } })
}
