// PNGs read and written by Chromium, for the comparers (no image library needed): `window.__png` in a page.

/** In the page: a PNG's pixels (RGBA) without colour conversion. */
async function decode(base64) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }),
    { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
}

/** In the page: the image in pale grey with the pixels of `mask` (one byte a pixel) in red, as a base64 PNG. */
async function marked({ width, height, data }, mask) {
  const out = new ImageData(width, height)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255
    const over = (c) => 255 + (c - 255) * alpha
    const luma = over(data[i]) * 0.29889531 + over(data[i + 1]) * 0.58662247 + over(data[i + 2]) * 0.11448223
    const grey = 255 - (255 - luma) * 0.1
    out.data.set(mask[i / 4] ? [255, 0, 0, 255] : [grey, grey, grey, 255], i)
  }
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d').putImageData(out, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return btoa(Array.from(new Uint8Array(await blob.arrayBuffer()), (c) => String.fromCharCode(c)).join(''))
}

/** Puts `window.__png` ({ decode, marked }) in the page (again after a navigation; once is enough otherwise). */
export const installPng = (page) => page.evaluate(`void (window.__png ??= { decode: ${decode}, marked: ${marked} })`)
