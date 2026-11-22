// Birds on the shots (`birds.motion.mjs`): what moved between two shots, gathered into clusters, and the clusters
// followed from shot to shot.

/**
 * The clusters of what moved between two PNG shots (device px): a pixel is a mark when its luminance changed by more than
 * 0.06 (a bird's wings and body, wherever it is drawn: over the sky or the land); marks within 28 px of each other are one
 * cluster. A cluster over 120 px across (a cloud's edge, the land's light) is dropped.
 */
export function findMarks(page, before, after) {
  return page.evaluate(async ([b64a, b64b]) => {
    const lumOf = async (b64) => {
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
      return { lum, width, height }
    }
    const a = await lumOf(b64a), b = await lumOf(b64b), { width, height } = b
    const pts = []
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (Math.abs(b.lum[y * width + x] - a.lum[y * width + x]) > 0.06) pts.push([x, y])
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
      if (w > 120 || h > 120 || members.length < 4) continue
      out.push({ x: xs.reduce((s, v) => s + v, 0) / xs.length, y: ys.reduce((s, v) => s + v, 0) / ys.length, n: members.length })
    }
    return out
  }, [before.toString('base64'), after.toString('base64')])
}

/**
 * Each cluster of the first shot followed to the nearest cluster within 40 px on each later shot (CSS px).
 */
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
