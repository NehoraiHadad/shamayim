import type { FieldCell } from './types'

/** Uniform raster of footprint references. A bin contains every cell whose bounding box intersects it. */
export function rasterNodes(left: number, bottom: number, width: number, height: number, step: number,
  a: number, b: number, c: number) {
  const bins: (Footprint[] | undefined)[] = new Array(width * height)
  const inverseStep = 1 / step
  const indexX = (x: number) => Math.floor((x - left) * inverseStep)
  const indexY = (y: number) => Math.floor((y - bottom) * inverseStep)
  const determinant = a * c - b * b
  const eastScale = Math.sqrt(c / determinant)
  const northScale = Math.sqrt(a / determinant)
  const cross = 2 * b

  function depth(footprint: Footprint, x: number, y: number) {
    const dx = x - footprint.cell.x
    const dy = y - footprint.cell.y
    const rr = ((a * dx + cross * dy) * dx + c * dy * dy) * footprint.inverseR2
    return kernel(footprint.cell.tau0, rr, footprint.cumulus)
  }

  return {
    rayDepthAt(x: number, y: number, low: number, high: number, ds: number,
      patches: Map<FieldCell, number>) {
      const bin = bins[indexY(y) * width + indexX(x)]
      let tau = 0
      if (!bin) return tau
      for (const footprint of bin) {
        const { cell } = footprint
        const column = depth(footprint, x, y)
        if (!column) continue
        const overlap = Math.min(high, cell.baseKm + cell.vKm * column / cell.tau0) - Math.max(low, cell.baseKm)
        if (overlap <= 0) continue
        const slant = cell.tau0 / cell.vKm * ds * overlap / (high - low) / 2
        if (cell.genus === 'ac' || cell.genus === 'ci') patches.set(cell, (patches.get(cell) ?? 0) + slant)
        else tau += slant
      }
      return tau
    },
    add(cell: FieldCell, cumulus: boolean) {
      const { x, y, r } = cell
      const east = eastScale * r, north = northScale * r
      const first = Math.max(0, indexX(x - east)), last = Math.min(width - 1, indexX(x + east))
      const top = Math.min(height - 1, indexY(y + north))
      const footprint = { cell, cumulus, inverseR2: 1 / (r * r) }
      for (let row = Math.max(0, indexY(y - north)); row <= top; row++) {
        for (let col = first; col <= last; col++) {
          const index = row * width + col
          const bin = bins[index] ??= []
          bin.push(footprint)
        }
      }
    },
    at(x: number, y: number) {
      const bin = bins[indexY(y) * width + indexX(x)]
      let tau = 0
      if (bin) for (let i = 0; i < bin.length; i++) tau += depth(bin[i], x, y)
      return tau
    },
    cellAt(x: number, y: number) {
      const col = indexX(x), row = indexY(y)
      if (col < 0 || col >= width || row < 0 || row >= height) return undefined
      const bin = bins[row * width + col]
      let best: FieldCell | undefined, peak = 0
      if (bin) for (const footprint of bin) {
        const tau = depth(footprint, x, y)
        if (tau > peak) {
          best = footprint.cell
          peak = tau
        }
      }
      return best
    },
  }
}

interface Footprint {
  cell: FieldCell
  cumulus: boolean
  inverseR2: number
}

export function kernel(tau: number, rr: number, cumulus: boolean) {
  return tau * Math.max(0, 1 - (cumulus ? rr : rr * rr))
}
