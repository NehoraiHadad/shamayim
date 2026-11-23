// Native geometry masks use the same painter and omit lighting, windows and raised accessories.
export async function buildingMasks(png) {
  const { sceneModel, layersOn } = await import('/src/scene/model/index.ts')
  const { Surface } = await import('/src/scene/compose/surface.ts')
  const { buildingRasterMasks } = await import('/e2e/buildingRasterMasks.mjs')
  const w = innerWidth, h = 128
  const layers = layersOn(sceneModel(window.__world, { width: w, landHeight: h, landTop: 300, skyHeight: 428, dpr: 1 }), 'land')
  const outside = layers.find(l => l.kind === 'outside')
  const canvas = () => Object.assign(document.createElement('canvas'), { width: w, height: h })
  const { m, caps, industrial, owner, ownerColors, domeCtx, builtObjects, scale, superWidth } =
    await buildingRasterMasks(layers, outside, w, h)
  const ground = new Surface(canvas()), water = new Surface(canvas())
  for (const surface of [ground, water]) surface.resize(w, h, 1)
  ground.render([...layers.filter(l => l.kind === 'plane'), { ...outside, items: [], sea: null }], 0, true)
  water.render([...layers.filter(l => l.kind === 'water'), { ...outside, items: [], land: null }], 0, true)
  const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0))
  const actual = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const scene = canvas().getContext('2d')
  scene.drawImage(actual, 0, -300)
  const pixels = c => c.getImageData(0, 0, w, h).data
  const cap = pixels(caps), industry = pixels(industrial), objects = pixels(builtObjects)
  const full = Object.assign(document.createElement('canvas'), { width: w, height: 428 }).getContext('2d')
  full.drawImage(actual, 0, 0)
  const sky = full.getImageData(0, 290, w, 10).data
  const colors = pixels(scene), dry = pixels(ground.canvas.getContext('2d')), wet = pixels(water.canvas.getContext('2d'))
  const facet = pixels(m), raw = owner.getImageData(0, 0, superWidth, scale * h).data, dome = pixels(domeCtx)
  const owners = new Int32Array(superWidth * scale * h)
  for (let j = 0; j < owners.length; j++) {
    const i = j * 4
    if (raw[i + 3] === 255) owners[j] = ownerColors.get(raw[i] | (raw[i + 1] << 8) | (raw[i + 2] << 16)) ?? 0
  }
  const lin = Array.from({ length: 256 }, (_, b) => b / 255 <= .04045 ? b / 3294.6 : ((b / 255 + .055) / 1.055) ** 2.4)
  const samples = { front: [], sun: [], side: [], roof: [], tile: [], bare: [], dome: [], chroma: [], chimney: [], cooling: [], built: [] }
  const blocks = new Map(), contacts = new Set()
  const ownerId = pixel => {
    const offset = scale * (Math.floor(pixel / w) * superWidth + pixel % w)
    const claimed = new Map()
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
      const id = owners[offset + y * superWidth + x]
      if (id) claimed.set(id, 1 + (claimed.get(id) ?? 0))
    }
    for (const [id, coverage] of claimed) if (coverage >= 10) return id
    return 0
  }
  const q = values => values.length ? values.sort((a, b) => a - b)[Math.floor(values.length * .5)] : null
  const yAt = (rgba, i) => .2126 * lin[rgba[i]] + .7152 * lin[rgba[i + 1]] + .0722 * lin[rgba[i + 2]]
  const horizon = q(Array.from({ length: sky.length / 4 }, (_, j) => yAt(sky, j * 4)))
  const horizonRed = q(Array.from({ length: sky.length / 4 }, (_, j) => sky[j * 4]))
  let highpass = 0, count = 0, tileRed = 0, peak = 0, peakAt = null
  for (let i = 0; i < colors.length; i += 4) {
    const y = yAt(colors, i), p = i / 4
    if ((objects[i + 3] >= 225 || facet[i + 3] >= 135 || dome[i + 3] >= 160) && y > peak) {
      peak = y
      peakAt = [p % w, Math.floor(p / w) + 300]
    }
    const [r, g, b] = facet.subarray(i, i + 3)
    if (facet[i + 3] >= 135) {
      samples.built.push(y)
      if (p % w > 0 && p % w < w - 1 && p >= w && p < w * (h - 1)) {
        highpass += (y - (yAt(colors, i - 4) + yAt(colors, i + 4) + yAt(colors, i - 4 * w) + yAt(colors, i + 4 * w)) / 4) ** 2
        count++
      }
      const part = r > 175 && b > 150 ? 'tile' : cap[i + 3] > 65 ? 'roof'
        : g > 50 && b < 30 ? 'sun' : b > 50 && g < 30 ? 'side' : r > 175 ? 'front' : null
      if (part === 'tile') tileRed = Math.max(tileRed, colors[i])
      if (part) samples[part].push(y)
    }
    if (dry[i + 3] > 248 && wet[i + 3] < 12 && facet[i + 3] < 8) {
      for (const delta of [-12 * w, -8 * w, -4 * w, 12 * w, 24, -24]) {
        if (facet[i + 4 * delta + 3] > 220) { samples.bare.push(y); break }
      }
    }
    if (dome[i] >= 175 && dome[i + 1] >= 175 && dome[i + 3] >= 160) {
      samples.dome.push(y)
      samples.chroma.push(lin[colors[i]] - lin[colors[i + 2]])
    }
    if (industry[i + 3] >= 110) samples[industry[i] > industry[i + 2] ? 'chimney' : 'cooling'].push(y)
    const id = ownerId(p)
    if (id) {
      if (!blocks.has(id)) blocks.set(id, [])
      blocks.get(id).push(y)
    }
  }
  for (let j = 0; j < owners.length; j++) {
    const a = owners[j]
    if (!a) continue
    for (const step of [1, scale, superWidth, superWidth * scale]) {
      if (step < superWidth && j % superWidth + step >= superWidth) continue
      const b = owners[j + step]
      if (b && a !== b) contacts.add(Math.max(a, b) * 65536 + Math.min(a, b))
    }
  }
  const spreads = []
  for (const pair of contacts) {
    const a = blocks.get(pair & 65535), b = blocks.get(pair >>> 16)
    if (a?.length >= 2 && b?.length >= 2) {
      const left = q(a), right = q(b)
      spreads.push(2 * Math.abs(left - right) / (left + right))
    }
  }
  const groundY = q(samples.bare)
  return { ground: groundY, horizon, peak: peak / horizon, peakAt, frontHorizon: q(samples.front) / horizon,
    tileRed: tileRed / horizonRed, highpass: Math.sqrt(highpass / count),
    chimney: q(samples.chimney) / horizon, cooling: q(samples.cooling) / horizon,
    pairs: spreads.length, spread: q(spreads),
    n: Object.fromEntries(Object.entries(samples).map(([k, a]) => [k, a.length])),
    ...Object.fromEntries(['built', 'front', 'sun', 'side', 'roof', 'tile', 'dome'].map(k => [k, q(samples[k]) / groundY])),
    chroma: q(samples.chroma) }
}
