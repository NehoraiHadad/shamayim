import assert from 'node:assert/strict'

export async function receiverReadback(page) {
  const results = await page.evaluate(async () => {
    const { ReceiverComposite } = await import('/src/scene/compose/receiverComposite.ts')
    const ctx = canvas => canvas.getContext('2d', { willReadFrequently: true })
    const canvas = (w, h) => new OffscreenCanvas(w, h)
    let seed = 67
    const randomByte = () => (seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 24
    const source = phase => {
      const c = canvas(13, 18), g = ctx(c), p = g.createImageData(c.width, c.height)
      for (let i = 0; i < p.data.length; i++) {
        // Include equal, opaque and zero coverage alongside the independently seeded alphas.
        const alphaPhase = i % 32 < 8 ? i % 16 : (i + phase * 4) % 16
        p.data[i] = alphaPhase === 3 ? 255 : alphaPhase === 7 ? 0 : randomByte()
      }
      g.putImageData(p, 0, 0)
      return c.transferToImageBitmap()
    }
    const beam = source(0), shade = source(1), other = source(2)
    let reads = 0, draws = 0, puts = 0
    const composite = new ReceiverComposite((w, h) => {
      const c = canvas(w, h), g = ctx(c), original = g.getImageData.bind(g)
      const originalDraw = g.drawImage.bind(g)
      const originalPut = g.putImageData.bind(g)
      g.getImageData = (...args) => { reads++; return original(...args) }
      g.drawImage = (...args) => { draws++; return originalDraw(...args) }
      g.putImageData = (...args) => { puts++; return originalPut(...args) }
      return c
    })
    const rect = { x: 4, y: 6, w: 13, h: 9 }
    const domain = { x: 5, y: 7, w: 11, h: 7 }
    const mask = { rect: domain, ratio: .5, cols: domain.w, rows: domain.h,
      alpha: new Uint8Array(domain.w * domain.h), revision: 0 }
    // Drive the real composite and blend with controlled mask bytes and box transitions.
    composite.masks.maskAt = () => mask
    const plane = { desc: { id: 'plane.near' }, rect: domain, ratio: .5, shade,
      lightDesc: { kind: 'plane', cloudShadow: { speed: 0 } } }
    function draw(shadow, sy, bounds) {
      let actual
      composite.draw({ id: 'layer', cached: { light: beam, shade: shadow, lightKey: 'light', rect: bounds, ratio: .5 },
        plane, phase: 0, still: true, exact: true, sy, draw: image => { actual = image } })
      return actual
    }
    const boxes = [{ x: 5, y: 8, w: 6, h: 6 }, { x: 9, y: 7, w: 7, h: 5 }, domain]
    let mismatches = 0
    let previous
    function check(shadow, sy, box, bounds = rect) {
      mask.alpha = mask.alpha.map(randomByte)
      mask.revision++
      mask.box = box
      const actual = draw(shadow, sy, bounds)
      const { w, h } = box, x = box.x - bounds.x, y = box.y - bounds.y
      const sameFrame = previous?.shadow === shadow && previous.sy === sy && previous.bounds === bounds
      const output = sameFrame ? previous.output : ctx(canvas(bounds.w, bounds.h))
      const scratch = ctx(canvas(w, h))
      scratch.globalCompositeOperation = 'copy'
      output.globalCompositeOperation = sameFrame ? 'source-over' : 'copy'
      const rx = sameFrame ? Math.min(x, previous.x) : 0, ry = sameFrame ? Math.min(y, previous.y) : 0
      const rw = sameFrame ? Math.max(x + w, previous.x + previous.w) - rx : bounds.w
      const rh = sameFrame ? Math.max(y + h, previous.y + previous.h) - ry : bounds.h
      if (sameFrame) output.clearRect(rx, ry, rw, rh)
      output.drawImage(beam, rx, sy + ry, rw, rh, rx, ry, rw, rh)
      scratch.drawImage(shadow, x, sy + y, w, h, 0, 0, w, h)
      const pixels = output.getImageData(x, y, w, h)
      const a = pixels.data, b = scratch.getImageData(0, 0, w, h).data
      // One device pixel per mask texel here, so the old bilinear sample is exactly its centre.
      for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) {
        const i = (j * w + k) * 4, weight = mask.alpha[(j + box.y - domain.y) * domain.w + k + box.x - domain.x]
        if (!weight || !(a[i + 3] || b[i + 3])) continue
        const dark = b[i + 3] * weight, sum = a[i + 3] * (255 - weight) + dark
        if (sum) {
          const t = a[i + 3] === b[i + 3] ? weight / 255 : dark / sum
          for (let c = 0; c < 3; c++) a[i + c] += (b[i + c] - a[i + c]) * t
        }
        a[i + 3] = sum / 255
      }
      output.putImageData(pixels, x, y)
      const read = OffscreenCanvasRenderingContext2D.prototype.getImageData
      const got = read.call(ctx(actual), 0, 0, bounds.w, bounds.h).data
      const want = output.getImageData(0, 0, bounds.w, bounds.h).data
      mismatches += got.reduce((n, byte, i) => n + Number(byte !== want[i]), 0)
      previous = { shadow, sy, bounds, output, x, y, w, h }
      return actual
    }
    for (let i = 0; i < 12; i++) check(shade, 0, boxes[i % boxes.length])
    const steady = reads
    const steadyDraws = draws
    check(other, 0, boxes[0])
    const changed = reads - steady
    const nextPose = reads
    for (let cycle = 0; cycle < 3; cycle++) {
      check(other, 9, boxes[1])
      check(other, 0, boxes[0])
    }
    const poseReads = reads - nextPose
    const poseDraws = draws - steadyDraws - changed
    check(other, 0, boxes[0])
    const repeated = check(other, 0, boxes[0])
    const beforeRepeat = reads + draws
    const beforePut = puts
    const unchanged = draw(other, 0, rect) === repeated && reads + draws === beforeRepeat && puts === beforePut
    mask.box = undefined
    const absent = draw(other, 0, rect) === beam && reads + draws === beforeRepeat && puts === beforePut
    composite.skip('layer', { light: beam, shade: other })
    previous = undefined
    check(other, 0, boxes[0])
    const resumed = reads + draws === beforeRepeat
    check(other, 9, boxes[0], { ...rect, w: 12 })
    composite.invalidate('layer')
    previous = undefined
    const invalidated = composite.bytes()
    const before = reads
    check(other, 9, boxes[1])
    const reacquired = reads - before
    composite.prune(new Set())
    for (const bitmap of [beam, shade, other]) bitmap.close()
    return { steady, steadyDraws, changed, poseReads, poseDraws, unchanged, absent, resumed,
      invalidated, reacquired, pruned: composite.bytes(), mismatches }
  })
  assert.deepEqual(results, { steady: 2, steadyDraws: 2, changed: 1, poseReads: 2, poseDraws: 2,
    unchanged: true, absent: true, resumed: true, invalidated: 0, reacquired: 2, pruned: 0, mismatches: 0 })
}
