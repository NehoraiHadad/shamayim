import type { Extent } from './clusterTypes'

export function mergeRuns(runs: Extent[]) {
  const merged: Extent[] = []
  for (const [left, right] of runs.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1)
    if (last && left <= last[1]) last[1] = Math.max(last[1], right)
    else if (right > left) merged.push([left, right])
  }
  return merged
}
