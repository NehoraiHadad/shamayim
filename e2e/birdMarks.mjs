// Birds on a shot (`birds.motion.mjs`): the sky's small dark marks, gathered into clusters, and the clusters followed
// from shot to shot.

/**
 * The clusters of small dark marks on a PNG shot (CSS px): a pixel is a mark when it is clearly darker than the sky
 * round it (the median of its 31 px row span); marks within 28 px of each other are one cluster. Large dark areas (the
 * land, a cloud's base) are not marks: a cluster wider or taller than 120 px is dropped.
 */
export function findMarks(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const { data, width, height } = g.getImageData(0, 0, c.width, c.height)
    const lum = new Float32Array(width * height)
    for (let i = 0; i < lum.length; i++) lum[i] = (0.2126 * data[4 * i] + 0.7152 * data[4 * i + 1] + 0.0722 * data[4 * i + 2]) / 255
    const pts = []
    for (let y = 0; y < height; y++) {
      for (let x = 15; x < width - 15; x += 1) {
        const row = []
        for (let k = -15; k <= 15; k += 3) row.push(lum[y * width + x + k])
        row.sort((p, q) => p - q)
        const bg = row[row.length >> 1]
        if (bg > 0.25 && lum[y * width + x] < bg * 0.72) pts.push([x, y])
      }
    }
    // Gather the marks into clusters (single link at 28 px, on a 14 px grid).
    const cell = new Map()
    for (const [x, y] of pts) {
      const key = `${Math.floor(x / 14)},${Math.floor(y / 14)}`
      cell.set(key, (cell.get(key) ?? []).concat([[x, y]]))
    }
    const seen = new Set(), out = []
    for (const key of cell.keys()) {
      if (seen.has(key)) continue
      const stack = [key], members = []
      seen.add(key)
      while (stack.length) {
        const k = stack.pop(), [cx, cy] = k.split(',').map(Number)
        members.push(...cell.get(k))
        for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
          const n = `${cx + dx},${cy + dy}`
          if (cell.has(n) && !seen.has(n)) { seen.add(n); stack.push(n) }
        }
      }
      const xs = members.map((m) => m[0]), ys = members.map((m) => m[1])
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
      if (w > 120 || h > 120 || members.length < 3) continue
      out.push({ x: xs.reduce((s, v) => s + v, 0) / xs.length, y: ys.reduce((s, v) => s + v, 0) / ys.length, n: members.length })
    }
    return out
  }, png.toString('base64'))
}

/** Each cluster of the first shot followed to the nearest cluster within 40 px on each later shot. */
export function follow(shots) {
  return shots[0].marks.map((m) => {
    const tr = [{ ...m, t: shots[0].t }]
    for (const s of shots.slice(1)) {
      const last = tr[tr.length - 1]
      let best = null, bd = 40
      for (const c of s.marks) { const d = Math.hypot(c.x - last.x, c.y - last.y); if (d < bd) { bd = d; best = c } }
      if (!best) break
      tr.push({ ...best, t: s.t })
    }
    return tr
  }).filter((tr) => tr.length > 2)
}
