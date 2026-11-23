// Exact comparison in the browser (`pngPage.mjs`): decoded RGBA byte for byte, no threshold. A shot is one PNG or more of
// the same load (its backdrops); a pixel differs when it does in any of them.
import { installPng } from './pngPage.mjs'

/**
 * Compares the shots (`{ name: Buffer[] }`) in the pairs given (`[[name, name], …]`): for each `"a/b"` the number of
 * differing pixels, the largest channel difference, the bounding box (device px) and the first differing backdrop; and
 * which shots show nothing but their backdrops (`backdrops`: grey levels).
 */
export async function compareExactly(page, shots, pairs, backdrops) {
  await installPng(page)
  const sent = Object.fromEntries(Object.entries(shots).map(([name, pngs]) => [name, pngs.map((png) => png.toString('base64'))]))
  return page.evaluate(async ({ sent, pairs, backdrops }) => {
    const images = {}
    for (const [name, pngs] of Object.entries(sent)) images[name] = await Promise.all(pngs.map((png) => window.__png.decode(png)))
    const measure = (first, second) => {
      const { width, height } = first[0]
      if (first.length !== second.length || first.some((x, i) => x.width !== second[i].width || x.height !== second[i].height)) {
        return { pixels: width * height, maxDelta: 255, box: null, backdrop: 0, size: `${width}×${height} vs ${second[0].width}×${second[0].height}` }
      }
      const result = { pixels: 0, maxDelta: 0, box: null, backdrop: null }
      let x0 = width, y0 = height, x1 = -1, y1 = -1
      for (let i = 0; i < width * height; i++) {
        let delta = 0
        for (let k = 0; k < first.length; k++) {
          const p = first[k].data, q = second[k].data
          for (let c = i * 4; c < i * 4 + 4; c++) {
            const off = Math.abs(p[c] - q[c])
            if (off > delta) delta = off
            if (off && (result.backdrop === null || k < result.backdrop)) result.backdrop = k
          }
        }
        if (!delta) continue
        const x = i % width, y = (i - x) / width
        result.pixels++
        if (delta > result.maxDelta) result.maxDelta = delta
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
      if (result.pixels) result.box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
      return result
    }
    // Opaque by construction (a screenshot), so the backdrop's bytes are (grey, grey, grey, 255).
    const bare = (list) => list.length === backdrops.length
      && list.every(({ data }, k) => data.every((v, i) => v === (i % 4 === 3 ? 255 : backdrops[k])))
    return { pairs: Object.fromEntries(pairs.map(([a, b]) => [`${a}/${b}`, measure(images[a], images[b])])),
      empty: Object.fromEntries(Object.entries(images).map(([name, list]) => [name, bare(list)])) }
  }, { sent, pairs, backdrops })
}

/** A PNG of `first` with every pixel that differs from `second` in red. */
export async function exactDiff(page, first, second) {
  await installPng(page)
  const diff = await page.evaluate(async ({ a, b }) => {
    const [x, y] = await Promise.all([window.__png.decode(a), window.__png.decode(b)])
    const mask = new Uint8Array(x.width * x.height)
    const sameSize = x.width === y.width && x.height === y.height
    for (let i = 0; i < x.data.length; i++) if (!sameSize || x.data[i] !== y.data[i]) mask[i >> 2] = 1
    return window.__png.marked(x, mask)
  }, { a: first.toString('base64'), b: second.toString('base64') })
  return Buffer.from(diff, 'base64')
}
