import type { Cluster } from './clusterTypes'
import { homeCluster } from './homeCluster'

const LIMIT = 24
const BUDGET = 6000
const finite = (values: unknown[]) => values.every(Number.isFinite)
const extent = (value: unknown) => Array.isArray(value) && value.length === 2 &&
  finite(value) && value[0] <= value[1]

function valid(cluster: Cluster | null) {
  if (!cluster || !extent(cluster.dx) || !extent(cluster.dy) || !cluster.centre || !cluster.form) return false
  const { centre, form, bands, place } = cluster
  return finite([cluster.id, centre.dx, centre.dy, cluster.squares, cluster.measured, cluster.shareSum,
    cluster.levels, cluster.upper, cluster.nearest, form.size, form.big, form.pitched, form.flat, form.evidence]) &&
    cluster.squares >= 4 && cluster.measured >= 0 && cluster.measured <= cluster.squares &&
    (form.tagged === undefined || Number.isInteger(form.tagged) && form.tagged >= 0 && form.tagged <= cluster.measured) &&
    cluster.nearest >= 0 && typeof cluster.urban === 'boolean' &&
    (!place || typeof place.name === 'string' && [0, 1, 2, 3].includes(place.kind) &&
      [0, 1, 2, 3, 4, 5].includes(place.faith) &&
      (place.at === undefined || Boolean(place.at && finite([place.at.dx, place.at.dy])))) &&
    Array.isArray(bands) && bands.length >= 1 && bands.length <= 3 &&
    bands.every(band => band && Number.isFinite(band.dy) && Array.isArray(band.runs) && band.runs.every(extent) &&
      Array.isArray(band.big) && band.big.every(extent))
}

const size = (clusters: Cluster[]) => new TextEncoder().encode(JSON.stringify(clusters)).length

export function validClusters(value: unknown): value is Cluster[] {
  return Array.isArray(value) && value.length <= LIMIT && value.every(valid) && size(value) <= BUDGET
}

// Reserve space for the home; cache only whole cluster records, while the loader retains all clusters.
export function clustersForCache(clusters: Cluster[], name?: string) {
  const home = homeCluster(clusters, name)
  if (home && size([home]) > BUDGET) return null
  const kept = home ? [home] : []
  for (const cluster of clusters) {
    if (kept.length >= LIMIT) break
    if (cluster !== home && size([...kept, cluster]) <= BUDGET) kept.push(cluster)
  }
  return kept.sort((a, b) => a.nearest - b.nearest || a.id - b.id)
}
