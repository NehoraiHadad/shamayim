import type { Cluster } from './clusterTypes'

/** Max km from the gazetteer point to a cluster matched by its OSM place name (gazetteer points can sit ~1 km off). */
const OWN_NAME_KM = 2
/** Max km from the place point to an unmatched nearby cluster (the existing proximity rule for a home cluster). */
const HOME_NEAR_KM = .45

function largest(clusters: readonly Cluster[], matches: (cluster: Cluster) => boolean): Cluster | null {
  let home: Cluster | null = null
  for (const cluster of clusters) {
    if (!matches(cluster)) continue
    if (!home || cluster.shareSum > home.shareSum ||
      (cluster.shareSum === home.shareSum && cluster.id < home.id)) home = cluster
  }
  return home
}

export function homeByName(clusters: readonly Cluster[], name?: string): Cluster | null {
  const ownName = name?.trim()
  return ownName ? largest(clusters, (cluster) =>
    cluster.nearest <= OWN_NAME_KM && cluster.place?.name.trim() === ownName) : null
}

export function homeCluster(clusters: readonly Cluster[], name?: string): Cluster | null {
  return homeByName(clusters, name) ?? largest(clusters, (cluster) => cluster.nearest <= HOME_NEAR_KM)
}

/** The distance in km to the farthest corner of the built extent, from the viewer or the mapped point. */
export function clusterReach(cluster: Cluster, at = { dx: 0, dy: 0 }): number {
  return Math.max(...cluster.dx.flatMap(dx => cluster.dy.map(dy => Math.hypot(dx - at.dx, dy - at.dy))))
}

export function homeTier(home: Cluster | null): 'A' | 'B' | 'C' {
  if (!home || home.nearest > HOME_NEAR_KM || home.urban) return 'C'
  if (home.measured >= 5 && home.measured * 2 >= home.squares && home.dx[1] - home.dx[0] >= .35) return 'A'
  return home.squares >= 12 ? 'B' : 'C'
}
