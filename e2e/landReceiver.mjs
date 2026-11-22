import assert from 'node:assert/strict'

/** Browser pixels across a moving footprint, then controlled arrivals through a real paint Worker. */
export async function receiverPixels(page, dpr = 1) {
  const result = await page.evaluate(async (dpr) => {
    const { Surface } = await import('/src/scene/compose/surface.ts')
    const { paintWorker } = await import('/src/scene/compose/worker.ts')
    const { shadowedPlane } = await import('/src/scene/model/planeCloudShadow.ts')
    const { canopyOf } = await import('/src/scene/model/canopy.ts')
    const { EMPTY_VEGETATION } = await import('/src/scene/model/vegDescriptor.ts')
    const bounds = { x: 0, y: 0, w: 96, h: 48 }
    const outline = [[0, 0], [96, 0], [96, 48], [0, 48]]
    const plane = {
      kind: 'plane', plane: 'near', bounds, outline, id: 'plane.near', canopyId: 'canopy.near',
      key: 'material', surface: 'land', z: 30, fill: [0.6, 0.25, 0.19], grain: { seed: 34, amount: 0 },
      surfaceTone: { cols: 2, rows: 1, cells: [0, 1], source: 'fixture', palette: [[0.6, 0.25, 0.19], [0.22, 0.46, 0.25]] },
      vegetation: { ...EMPTY_VEGETATION, tones: [[0.15, 0.65, 0.12]], tufts: new Float32Array([24, 19, 3, 1]),
        tuftMeta: new Uint8Array([0, 0]) },
      gullies: [], terraces: [],
      light: { key: 'sun', blend: 'source-over', litField: {
        cols: 1, rows: 1, grid: new Uint8Array([220, 0, 255, 18]),
        eSun: [1.7, 1.2, 0.8], eMoon: [0, 0, 0], eSky: [0.15, 0.22, 0.35],
        hazeLin: [0.2, 0.25, 0.3], yHorizon: 0.48,
        snow: { edge: [[0, -10], [48, -10], [52, 64], [96, 64]], cover: 0.95 },
      } },
    }
    const shadow = { plane: 'near', open: 1, blobs: [
      { cellId: 'fixture', centre: [0, 0], x: 24, y: 25, rx: 14, ry: 19, opticalDepth: 5, speed: 48 / 75 },
    ] }
    const withShadow = shadowedPlane(plane, shadow, 10)
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true })
    const local = new Surface(canvas)
    local.resize(96, 48, dpr)
    const sample = (x, y) => Array.from(ctx.getImageData(x * dpr, y * dpr, 1, 1).data)
    const material = (phase) => [sample(24, 25), sample(72, 25), sample(47, 25), phase]
    local.render([plane], 10)
    const unshadowed = material(10)
    local.render([withShadow], 10)
    const first = material(10)
    local.lay(21)
    const intermediate = material(21)
    local.lay(28.74)
    const beforeOldJump = sample(45, 25)
    local.lay(28.76)
    const afterOldJump = sample(45, 25)
    local.lay(69.999)
    const beforeMinute = sample(60, 25)
    const nextMinute = { ...shadow, blobs: shadow.blobs.map((blob) => ({ ...blob, x: blob.x + blob.speed * 60 })) }
    local.render([shadowedPlane(plane, nextMinute, 70)], 70.001)
    local.lay(70.001)
    const afterMinute = sample(60, 25)
    local.render([withShadow], 85)
    local.lay(85)
    const moved = material(85)
    const fixedShadow = shadowedPlane(plane, shadow, 10, false)
    local.render([fixedShadow], 85, true)
    const still = material(10)
    const gustCanopy = canopyOf(fixedShadow, { lean: 0.6, gust: 0.55 }, [])
    const gustPixels = () => Array.from(ctx.getImageData(19 * dpr, 14 * dpr, 10 * dpr, 11 * dpr).data)
    local.render([fixedShadow, gustCanopy], 10, false)
    local.lay(10)
    const gustStart = gustPixels()
    local.lay(10.8)
    const gustBent = gustPixels()
    local.lay(12)
    const gustRepeat = gustPixels()

    const remoteCanvas = document.createElement('canvas')
    const remoteCtx = remoteCanvas.getContext('2d', { willReadFrequently: true })
    const remoteWorker = paintWorker()
    if (!remoteWorker) throw Error('The receiver test needs the production canvas Worker')
    const changes = []
    let checkChange = false, coldCanopy = false
    const remote = new Surface(remoteCanvas, { worker: () => remoteWorker, onArrive: () => {
      const canopy = remote.peek('canopy.near')
      if (canopy?.light && !canopy.shade) coldCanopy = true
      if (checkChange) capture()
    } })
    remote.resize(96, 48, dpr)
    const canopy = canopyOf(withShadow, { lean: 0, gust: 0 }, [])
    const pixels = () => Array.from(remoteCtx.getImageData(19 * dpr, 14 * dpr, 10 * dpr, 11 * dpr).data)
    const capture = () => {
      const held = remote.peek('plane.near')
      changes.push({ key: held.lightDesc.light.key, pair: Boolean(held.shade && remote.peek('canopy.near')?.shade),
        ground: Array.from(remoteCtx.getImageData(24 * dpr, 25 * dpr, 1, 1).data), canopy: pixels() })
    }
    remote.paint(canopy)
    remote.flush()
    await remote.settled()
    remote.composite([withShadow, canopy], 10)
    const missing = pixels()
    remote.paint(withShadow)
    remote.flush()
    await remote.settled()
    remote.composite([withShadow, canopy], 10)
    const paired = pixels()

    const next = { ...withShadow, light: { ...withShadow.light, key: 'next-light',
      litField: { ...withShadow.light.litField, eSun: [0.8, 0.6, 0.4] } } }
    const nextCanopy = canopyOf(next, { lean: 0, gust: 0 }, [])
    checkChange = true
    remote.render([next, nextCanopy], 10)
    capture()
    await remote.settled()
    checkChange = false
    const groundOnly = {}
    for (const desc of [withShadow, next]) {
      local.render([desc], 10)
      groundOnly[desc.light.key] = { canopy: gustPixels(), shadow: sample(24, 25) }
      local.render([{ ...desc, cloudShadow: undefined }], 10)
      groundOnly[desc.light.key].beam = sample(24, 25)
    }
    remoteWorker.terminate()
    return { unshadowed, first, intermediate, beforeOldJump, afterOldJump, beforeMinute, afterMinute, moved, still,
      gustStart, gustBent, gustRepeat, coldCanopy, missing, paired, changes, groundOnly }
  }, dpr)
  const { unshadowed, first, intermediate, beforeOldJump, afterOldJump, beforeMinute, afterMinute, moved, still,
    gustStart, gustBent, gustRepeat, coldCanopy, missing, paired, changes, groundOnly } = result
  assert.deepEqual(still, first)
  assert.deepEqual(gustStart, gustRepeat, 'canopy gust must repeat every two seconds')
  assert.notDeepEqual(gustStart, gustBent, 'canopy gust must keep moving under a stationary cloud shadow')
  assert.deepEqual(first[1], unshadowed[1])
  assert.ok(intermediate[0][0] > first[0][0] && intermediate[0][0] < unshadowed[0][0], 'the shadow must advance between old poses')
  assert.ok(beforeOldJump.every((channel, i) => Math.abs(channel - afterOldJump[i]) <= 2), 'the former pose boundary must stay continuous')
  assert.ok(beforeMinute.every((channel, i) => Math.abs(channel - afterMinute[i]) <= 2), 'moving shadow must stay continuous as the minute origin changes')
  assert.deepEqual(moved[0], unshadowed[0])
  assert.deepEqual(first[2], moved[2])
  assert.ok(first[0][0] < unshadowed[0][0] - 20 && first[0][0] > first[0][1], 'shadow must retain the red soil')
  assert.ok(moved[1][0] < unshadowed[1][0] - 20 && moved[1][2] > moved[1][0], 'shadow must shade the stationary snow')
  assert.ok(coldCanopy, 'first canopy must publish its full beam before its shade')
  assert.ok(missing.every((channel) => channel === 0), 'an early canopy must leave a transparent canvas')
  assert.notDeepEqual(paired, groundOnly.sun.canopy, 'the paired canopy must be visible')
  assert.ok(changes.length >= 3, 'observe the held frame and the separate plane and canopy arrivals')
  assert.equal(changes[0].key, 'sun')
  assert.equal(changes.at(-1).key, 'next-light')
  for (const frame of changes) {
    const ground = groundOnly[frame.key]
    assert.ok(frame.pair, 'keep both shade bitmaps during the light change')
    assert.ok(frame.ground.every((channel, i) => Math.abs(channel - ground.shadow[i]) <= 2), 'ground remains shadowed')
    assert.ok(frame.ground[0] < ground.beam[0] - 10, 'ground never reverts to full beam')
    assert.ok(frame.canopy.some((channel, i) => i % 4 !== 3 && Math.abs(channel - ground.canopy[i]) > 6), 'canopy never disappears')
  }
  console.log(`Rendered shadow boundary and delayed Worker receiver checks passed at ${dpr}×`)
}
