import type { SettlementStyle } from '../landmarks/settlement'
import type { Cluster } from './clusterTypes'

export function clusterStyle(cluster: Cluster, desert: boolean, fallback?: SettlementStyle): SettlementStyle {
  const { form, levels, place } = cluster
  if (place?.kind === 0 || (levels >= 3.5 && form.evidence >= .3) ||
    (place?.kind === 1 && form.size >= 5 && form.big >= .5)) return 'blocks'
  if (desert) return 'flat-desert'
  // Old caches lack a unique roof-tag count. The larger fraction is a safe lower bound.
  const tagged = form.tagged ?? Math.round(Math.max(form.flat, form.pitched) * cluster.measured)
  const faith = place?.faith
  if ((tagged >= 5 && form.flat > form.pitched) || faith === 2 || faith === 3 || faith === 4 ||
    (!place && fallback === 'flat-hill')) return 'flat-hill'
  return 'tile'
}
