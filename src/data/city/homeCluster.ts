import type { Cluster } from './clusterTypes'

export function homeCluster(clusters: Cluster[]): Cluster | null {
  let home: Cluster | null = null
  for (const cluster of clusters) {
    if (cluster.nearest > .45) continue
    if (!home || cluster.shareSum > home.shareSum ||
      (cluster.shareSum === home.shareSum && cluster.id < home.id)) home = cluster
  }
  return home
}

export function homeTier(home: Cluster | null): 'A' | 'B' | 'C' {
  if (!home || home.nearest > .45 || home.urban) return 'C'
  if (home.measured >= 5 && home.measured * 2 >= home.squares && home.dx[1] - home.dx[0] >= .35) return 'A'
  return home.squares >= 12 ? 'B' : 'C'
}
