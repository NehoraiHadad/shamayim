import fs from 'node:fs'
import path from 'node:path'
import { splitByPlace } from '../data/city/clusters'
import type { BuiltSquare } from '../data/city/clusterTypes'
import { COLS, decodeRuns, ROWS, squareCentre, squareOf, strideFor } from '../data/city/grid'
import type { CityCell, CityIndex, PlaceRow } from '../data/city/types'

interface SquareClusterInfo {
  clusterId: number
  clusterName: string | null
  squares: number
}

/** Named home clusters and each built square's owner, reconstructed from the offline city raster. */
export function buildGlobalCityClusters(root: string) {
  const cityIndex = JSON.parse(fs.readFileSync(path.join(root, 'public/data/city/il/index.json'), 'utf8')) as CityIndex
  const allPlaces: PlaceRow[] = []
  const grids = new Map<string, Uint8Array>()
  for (const cell of cityIndex.cells) {
    const data = JSON.parse(fs.readFileSync(path.join(root, `public/data/city/il/${cell}.json`), 'utf8')) as CityCell
    grids.set(cell, decodeRuns(data.r, data.v === 2 ? 3 : 2))
    if (data.v === 2) allPlaces.push(...data.p)
  }

  const key = (x: number, y: number) => `${x}_${y}`
  const remaining = new Map<string, BuiltSquare & { sqId: string }>()
  for (const [cell, bytes] of grids) {
    const [south, west] = cell.split('_').map(Number)
    const stride = strideFor(bytes)
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const i = (row * COLS + col) * stride, meta = bytes[i]
      if (!(meta >> 4)) continue
      const x = west * COLS + col, y = south * ROWS + row
      remaining.set(key(x, y), {
        x, y, ...squareCentre({ cell, row, col }), meta,
        upper: bytes[i + 1], form: stride === 3 ? bytes[i + 2] : 0,
        sqId: `${cell}:${col}:${row}`,
      })
    }
  }

  const nodes = [...allPlaces].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] ||
    a[4] - b[4] || (a[5] < b[5] ? -1 : Number(a[5] > b[5])))

  const nodesBySquare = new Map<string, PlaceRow[]>()
  const nodeRank = new Map(nodes.map((node, i) => [node, i]))
  for (const node of nodes) {
    const { cell, col, row } = squareOf(node[0], node[1])
    const [south, west] = cell.split('_').map(Number)
    const k = key(west * COLS + col, south * ROWS + row)
    nodesBySquare.set(k, [...nodesBySquare.get(k) ?? [], node])
  }
  const squareToCluster = new Map<string, SquareClusterInfo>()
  const namedClusters: { node: PlaceRow; squares: number }[] = []
  let nextId = 1

  for (const [start, first] of remaining) {
    remaining.delete(start)
    const component = [first]
    for (const { x, y } of component) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const k = key(x + dx, y + dy), next = remaining.get(k)
        if (!next) continue
        remaining.delete(k)
        component.push(next)
      }
    }
    if (component.length < 4) {
      for (const sq of component) {
        squareToCluster.set((sq as BuiltSquare & { sqId: string }).sqId, {
          clusterId: -1, clusterName: null, squares: component.length,
        })
      }
      continue
    }
    const componentNodes = component.flatMap(({ x, y }) => nodesBySquare.get(key(x, y)) ?? [])
      .sort((a, b) => nodeRank.get(a)! - nodeRank.get(b)!)
    for (const { squares, node } of splitByPlace(component, componentNodes)) {
      if (squares.length < 4) {
        for (const sq of squares) {
          squareToCluster.set((sq as BuiltSquare & { sqId: string }).sqId, {
            clusterId: -1, clusterName: null, squares: squares.length,
          })
        }
        continue
      }
      const cid = nextId++
      const cname = node?.[5]?.trim() || null
      for (const sq of squares) {
        squareToCluster.set((sq as BuiltSquare & { sqId: string }).sqId, {
          clusterId: cid, clusterName: cname, squares: squares.length,
        })
      }
      if (node && cname) {
        namedClusters.push({ node, squares: squares.length })
      }
    }
  }
  return { squareToCluster, namedClusters }
}
