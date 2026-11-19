// Pixel comparison in the browser (no image library needed): both PNGs decoded by Chromium without colour conversion,
// per-pixel YIQ difference as pixelmatch measures it (threshold 0.1), failing above 0.3 % differing pixels or any
// 16 × 16 tile above 5 % (docs/design/CANVAS-SCENE-PLAN.md §3). Returns the counts and a diff PNG.
export const LIMITS = { threshold: 0.1, maxRatio: 0.003, tile: 16, maxTileRatio: 0.05 }

export async function comparePngs(page, actual, expected, limits = LIMITS) {
  return page.evaluate(async ({ a, b, limits }) => {
    const decode = async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }),
        { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })
      ctx.drawImage(bitmap, 0, 0)
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    }
    const [x, y] = await Promise.all([decode(a), decode(b)])
    if (x.width !== y.width || x.height !== y.height) {
      return { sizeMismatch: `${x.width}×${x.height} vs ${y.width}×${y.height}`, ratio: 1, worstTile: 1, diff: null }
    }
    const { width, height } = x
    // pixelmatch's YIQ delta, both pixels blended over white by their alpha.
    const blend = (c, alpha) => 255 + (c - 255) * alpha
    const yiq = (r, g, bl) => [r * 0.29889531 + g * 0.58662247 + bl * 0.11448223,
      r * 0.59597799 - g * 0.2741761 - bl * 0.32180189, r * 0.21147017 - g * 0.52261711 + bl * 0.31114694]
    const maxDelta = 35215 * limits.threshold * limits.threshold
    const out = new ImageData(width, height)
    const tiles = new Map()
    let count = 0
    for (let i = 0; i < x.data.length; i += 4) {
      const p = x.data, q = y.data
      const pa = p[i + 3] / 255, qa = q[i + 3] / 255
      const [y1, i1, q1] = yiq(blend(p[i], pa), blend(p[i + 1], pa), blend(p[i + 2], pa))
      const [y2, i2, q2] = yiq(blend(q[i], qa), blend(q[i + 1], qa), blend(q[i + 2], qa))
      const delta = 0.5053 * (y1 - y2) ** 2 + 0.299 * (i1 - i2) ** 2 + 0.1957 * (q1 - q2) ** 2
      const px = (i / 4) % width, py = Math.floor(i / 4 / width)
      if (delta > maxDelta) {
        count++
        const tile = `${Math.floor(px / limits.tile)},${Math.floor(py / limits.tile)}`
        tiles.set(tile, (tiles.get(tile) ?? 0) + 1)
        out.data.set([255, 0, 0, 255], i)
      } else {
        const grey = 255 - (255 - y1) * 0.1
        out.data.set([grey, grey, grey, 255], i)
      }
    }
    const worstTile = Math.max(0, ...tiles.values()) / (limits.tile * limits.tile)
    const canvas = new OffscreenCanvas(width, height)
    canvas.getContext('2d').putImageData(out, 0, 0)
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const diff = btoa(Array.from(new Uint8Array(await blob.arrayBuffer()), (c) => String.fromCharCode(c)).join(''))
    return { ratio: count / (width * height), count, worstTile, diff }
  }, { a: actual.toString('base64'), b: expected.toString('base64'), limits })
}
