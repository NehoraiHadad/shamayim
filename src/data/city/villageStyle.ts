import type { SettlementStyle } from '../landmarks/settlement'
import type { Cluster } from './clusterTypes'

/**
 * What the cluster's roofs are known to be, from evidence about the roofs themselves only (never from who lives
 * there): enough mapped roof shapes (5+), the majority deciding. Undefined where nothing is known.
 */
export function clusterRoofs(cluster: Cluster): 'flat' | 'tile' | undefined {
  const { form } = cluster
  // Old caches lack a unique roof-tag count. The larger fraction is a safe lower bound.
  const tagged = form.tagged ?? Math.round(Math.max(form.flat, form.pitched) * cluster.measured)
  if (tagged >= 5) return form.flat > form.pitched ? 'flat' : 'tile'
}

export function clusterStyle(cluster: Cluster, desert: boolean): SettlementStyle {
  const { form, levels, place } = cluster
  if (place?.kind === 0 || (levels >= 3.5 && form.evidence >= .3) ||
    (place?.kind === 1 && form.size >= 5 && form.big >= .5)) return 'blocks'
  if (desert) return 'flat-desert'
  // Unknown roofs draw as red tiles here; the caller asks `clusterRoofs` whether to draw them mixed instead.
  return clusterRoofs(cluster) === 'flat' ? 'flat-hill' : 'tile'
}
