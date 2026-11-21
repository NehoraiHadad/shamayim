/** Rasterize optical depth into a bounded air-frame grid in site visit order. */
export function rasterNodes(width: number, height: number, a: number, b: number, c: number) {
  const nodes = new Float32Array(width * height)
  const cross = 2 * b
  const circle = a === 1 && c === 1
  const inverseA = 1 / a
  const northScale = Math.sqrt(a / (a * c - b * b))
  return {
    add(i: number, j: number, radius: number, tau: number, cumulus: boolean) {
      const r2 = radius * radius
      const inverseR2 = 1 / r2
      const northRadius = radius * northScale
      const last = Math.min(height - 1, Math.floor(j + northRadius))
      for (let row = Math.max(0, Math.ceil(j - northRadius)); row <= last; row++) {
        const north = row - j
        const constant = c * north * north
        const centre = -b * north * inverseA
        const halfSquared = (r2 - constant) * inverseA + centre * centre
        if (halfSquared <= 0) continue
        const half = Math.sqrt(halfSquared)
        const first = Math.max(0, Math.ceil(i + centre - half))
        const end = Math.min(width - 1, Math.floor(i + centre + half))
        const offset = row * width
        if (circle) {
          for (let col = first; col <= end; col++) {
            const east = col - i
            nodes[offset + col] += kernel(tau, (east * east + constant) * inverseR2, cumulus)
          }
          continue
        }
        const linear = cross * north
        for (let col = first; col <= end; col++) {
          const east = col - i
          const rr = ((a * east + linear) * east + constant) * inverseR2
          nodes[offset + col] += kernel(tau, rr, cumulus)
        }
      }
    },
    at(u: number, v: number) {
      const i = Math.floor(u), j = Math.floor(v)
      const f = u - i, g = v - j
      const p = j * width + i
      return (1 - g) * ((1 - f) * nodes[p] + f * nodes[p + 1])
        + g * ((1 - f) * nodes[p + width] + f * nodes[p + width + 1])
    },
  }
}

export function kernel(tau: number, rr: number, cumulus: boolean) {
  return tau * Math.max(0, 1 - (cumulus ? rr : rr * rr))
}
