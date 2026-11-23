//# allFunctionsCalledOnLoad
import type { RGB } from '../../world/types'
import type { PlaneVegetation } from './types'
import type { VegBuffers } from './vegBuilders'

export const vegBuffers = (): VegBuffers => ({
  trees: [], treeMeta: [], fields: [], fieldMeta: [], rows: [], rowMeta: [], tufts: [], tuftMeta: [], strata: [], strataMeta: [],
})

/** Pack the trees in back-to-front order so overlapping crowns are drawn consistently. */
export function packVegetation(buf: VegBuffers, seed: number, tones: RGB[]): PlaneVegetation {
  const order = Array.from({ length: buf.trees.length / 6 }, (_, i) => i)
    .sort((a, b) => buf.trees[a * 6 + 1] - buf.trees[b * 6 + 1])
  const trees = new Float32Array(buf.trees.length), treeMeta = new Uint8Array(buf.treeMeta.length)
  for (let i = 0; i < order.length; i++) {
    const s = order[i]
    for (let k = 0; k < 6; k++) trees[i * 6 + k] = buf.trees[s * 6 + k]
    for (let k = 0; k < 3; k++) treeMeta[i * 3 + k] = buf.treeMeta[s * 3 + k]
  }
  return {
    seed, trees, treeMeta, tones,
    fields: new Float32Array(buf.fields), fieldMeta: new Uint8Array(buf.fieldMeta),
    rows: new Float32Array(buf.rows), rowMeta: new Uint8Array(buf.rowMeta),
    tufts: new Float32Array(buf.tufts), tuftMeta: new Uint8Array(buf.tuftMeta),
    strata: new Float32Array(buf.strata), strataMeta: new Uint8Array(buf.strataMeta),
  }
}

export const EMPTY_VEGETATION = packVegetation(vegBuffers(), 0, [])
