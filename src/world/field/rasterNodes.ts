import type { FieldCell } from './types'

/** Uniform raster of footprint references. A bin contains every cell whose bounding box intersects it. */
export function rasterNodes(left: number, bottom: number, width: number, height: number, step: number,
  a: number, b: number, c: number) {
  const bins: (Footprint | Footprint[] | undefined)[] = new Array(width * height)
  const inverseStep = 1 / step
  const indexX = (x: number) => Math.floor((x - left) * inverseStep)
  const indexY = (y: number) => Math.floor((y - bottom) * inverseStep)
  const determinant = a * c - b * b
  const eastScale = Math.sqrt(c / determinant)
  const northScale = Math.sqrt(a / determinant)
  const cross = 2 * b, round = a === 1 && !b && c === 1

  function depth(footprint: Footprint, x: number, y: number) {
    const dx = x - footprint.x
    const dy = y - footprint.y
    const rr = (round ? dx * dx + dy * dy : (a * dx + cross * dy) * dx + c * dy * dy) * footprint.inverseR2
    return kernel(footprint.tau0, rr, footprint.cumulus)
  }

  function rayDepth(footprint: Footprint, x: number, y: number, low: number, high: number, ds: number,
    patches: Map<FieldCell, number>) {
    const { cell } = footprint
    const column = depth(footprint, x, y)
    if (!column) return 0
    const overlap = Math.min(high, cell.baseKm + cell.vKm * column / cell.tau0) - Math.max(low, cell.baseKm)
    if (overlap <= 0) return 0
    // The overlap is the whole intercepted column, with extinction κ = τ₀/v.
    const slant = cell.tau0 / cell.vKm * ds * overlap / (high - low)
    if (cell.genus !== 'ac' && cell.genus !== 'ci') return slant
    patches.set(cell, (patches.get(cell) ?? 0) + slant)
    return 0
  }

  return {
    rayDepthAt(x: number, y: number, low: number, high: number, ds: number,
      patches: Map<FieldCell, number>) {
      const bin = bins[indexY(y) * width + indexX(x)]
      if (!bin) return 0
      if (!Array.isArray(bin)) return rayDepth(bin, x, y, low, high, ds, patches)
      let tau = 0
      for (const footprint of bin) tau += rayDepth(footprint, x, y, low, high, ds, patches)
      return tau
    },
    collect(x0: number, y0: number, x1: number, y1: number, cells: Set<FieldCell>) {
      const first = Math.max(0, indexX(Math.min(x0, x1)))
      const last = Math.min(width - 1, indexX(Math.max(x0, x1)))
      const top = Math.min(height - 1, indexY(Math.max(y0, y1)))
      for (let row = Math.max(0, indexY(Math.min(y0, y1))); row <= top; row++) {
        for (let col = first; col <= last; col++) {
          const bin = bins[row * width + col]
          if (Array.isArray(bin)) for (const { cell } of bin) cells.add(cell)
          else if (bin) cells.add(bin.cell)
        }
      }
    },
    add(cell: FieldCell, cumulus: boolean) {
      const { x, y, r } = cell
      const east = eastScale * r, north = northScale * r
      const first = Math.max(0, indexX(x - east)), last = Math.min(width - 1, indexX(x + east))
      const top = Math.min(height - 1, indexY(y + north))
      const footprint = { cell, x, y, tau0: cell.tau0, cumulus, inverseR2: 1 / (r * r) }
      for (let row = Math.max(0, indexY(y - north)); row <= top; row++) {
        for (let col = first; col <= last; col++) {
          const index = row * width + col
          const bin = bins[index]
          if (Array.isArray(bin)) bin.push(footprint)
          else bins[index] = bin ? [bin, footprint] : footprint
        }
      }
    },
    at(x: number, y: number) {
      const bin = bins[indexY(y) * width + indexX(x)]
      if (!bin) return 0
      if (!Array.isArray(bin)) return depth(bin, x, y)
      let tau = 0
      for (let i = 0; i < bin.length; i++) tau += depth(bin[i], x, y)
      return tau
    },
    cellAt(x: number, y: number) {
      const col = indexX(x), row = indexY(y)
      if (col < 0 || col >= width || row < 0 || row >= height) return undefined
      const bin = bins[row * width + col]
      if (bin && !Array.isArray(bin)) return depth(bin, x, y) > 0 ? bin.cell : undefined
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
  x: number
  y: number
  tau0: number
  cumulus: boolean
  inverseR2: number
}

export function kernel(tau: number, rr: number, cumulus: boolean) {
  return tau * Math.max(0, 1 - (cumulus ? rr : rr * rr))
}
