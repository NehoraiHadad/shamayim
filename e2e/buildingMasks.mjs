// Native geometry masks use the same painter and omit lighting, windows and raised accessories.
export async function buildingMasks(png) {
  const { sceneModel, layersOn } = await import('/src/scene/model/index.ts')
  const { Surface } = await import('/src/scene/compose/surface.ts')
  const { paintBoxGeometry } = await import('/src/scene/paint/outsideBox.ts')
  const { drawGlyph } = await import('/src/scene/paint/glyphs/index.ts')
  const w = innerWidth, h = 128
  const layers = layersOn(sceneModel(window.__world, { width: w, landHeight: h, landTop: 300, skyHeight: 428, dpr: 1 }), 'land')
  const outside = layers.find(l => l.kind === 'outside')
  const canvas = () => Object.assign(document.createElement('canvas'), { width: w, height: h })
  const m = canvas().getContext('2d', { willReadFrequently: true })
  const scale = 4, superWidth = scale * w
  const owner = Object.assign(document.createElement('canvas'), { width: superWidth, height: scale * h })
    .getContext('2d', { willReadFrequently: true })
  owner.scale(scale, scale)
  const ownerColors = new Map()
  const f = c => ({ wall: c, eave: c, foot: c })
  const black = [0, 0, 0], tile = [1, 0, 1], red = [1, 0, 0], green = [0, 1, 0], blue = [0, 0, 1], yellow = [1, 1, 0]
  const props = { panel: black, heater: black }
  const shine = { ...outside.shine, glint: 0, windows: 0 }
  let index = 0
  for (const b of outside.items) {
    if (b.kind !== 'box' || b.beyond) continue
    const p = outside.receivers[b.tier][b.receiver]
    const luminance = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
    const right = luminance(p.right.wall) >= luminance(p.left.wall)
    const facade = { ...p, front: f(red), left: f(right ? blue : green), right: f(right ? green : blue),
      top: yellow, tile: [tile, tile, tile], recess: black }
    const id = ++index
    const hash = Math.imul(id + 1000, 0x45d9f3b) >>> 0
    const key = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) & 0xffffff
    ownerColors.set(key, id)
    const value = [key & 255, (key >> 8) & 255, key >> 16].map(v => v / 255)
    const owned = { ...p, front: f(value), left: f(value), right: f(value),
      top: value, tile: [value, value, value], recess: value }
    paintBoxGeometry(m, { ...b, heater: false }, outside.tiers[b.tier], shine, facade, props, 1)
    paintBoxGeometry(owner, { ...b, heater: false }, outside.tiers[b.tier], shine, owned, props, 1)
  }

  const domeCtx = canvas().getContext('2d')
  for (const i of outside.items) {
    if (i.kind !== 'mark' || i.glyph.kind !== 'babShrine') continue
    const { tones, surfaces } = i.glyph
    const dark = Object.fromEntries(Object.keys(tones).map(key => [key, black]))
    const pairs = [black, black], shell = Array(4).fill(Array(7).fill(yellow))
    drawGlyph(domeCtx, { ...i.glyph, tones: dark, gilding: shell, surfaces: { ...surfaces, wall: pairs, stone: pairs,
      round: [black, black] } }, shine)
  }

  const ground = new Surface(canvas()), water = new Surface(canvas())
  for (const surface of [ground, water]) surface.resize(w, h, 1)
  ground.render([...layers.filter(l => l.kind === 'plane'), { ...outside, items: [], sea: null }], 0, true)
  water.render([...layers.filter(l => l.kind === 'water'), { ...outside, items: [], land: null }], 0, true)
  const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0))
  const actual = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const scene = canvas().getContext('2d')
  scene.drawImage(actual, 0, -300)
  const pixels = c => c.getImageData(0, 0, w, h).data
  const colors = pixels(scene), dry = pixels(ground.canvas.getContext('2d')), wet = pixels(water.canvas.getContext('2d'))
  const facet = pixels(m), raw = owner.getImageData(0, 0, superWidth, scale * h).data, dome = pixels(domeCtx)
  const owners = new Int32Array(superWidth * scale * h)
  for (let j = 0; j < owners.length; j++) {
    const i = j * 4
    if (raw[i + 3] === 255) owners[j] = ownerColors.get(raw[i] | (raw[i + 1] << 8) | (raw[i + 2] << 16)) ?? 0
  }
  const lin = Array.from({ length: 256 }, (_, b) => b / 255 <= .04045 ? b / 3294.6 : ((b / 255 + .055) / 1.055) ** 2.4)
  const samples = { front: [], sun: [], side: [], roof: [], tile: [], bare: [], dome: [], chroma: [] }
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
  for (let i = 0; i < colors.length; i += 4) {
    const y = .2126 * lin[colors[i]] + .7152 * lin[colors[i + 1]] + .0722 * lin[colors[i + 2]]
    const [r, g, b] = facet.subarray(i, i + 3)
    if (facet[i + 3] >= 135) {
      const part = r > 220 && g > 160 ? 'roof' : r > 220 && b > 160 ? 'tile'
        : r > 180 && g < 55 && b < 55 ? 'front' : g > 115 && r < 128 ? 'sun' : b > 115 && r < 128 ? 'side' : null
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
    const id = ownerId(i / 4)
    if (id) {
      if (!blocks.has(id)) blocks.set(id, [])
      blocks.get(id).push(y)
    }
  }
  for (let j = 0; j < owners.length; j++) for (const step of [1, 4]) {
    if (j % superWidth + step >= superWidth) continue
    const a = owners[j], b = owners[j + step]
    if (a && b && a !== b) contacts.add(Math.max(a, b) * 65536 + Math.min(a, b))
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
  return { ground: groundY, pairs: spreads.length, spread: q(spreads),
    n: Object.fromEntries(Object.entries(samples).map(([k, a]) => [k, a.length])),
    ...Object.fromEntries(['front', 'sun', 'side', 'roof', 'tile', 'dome'].map(k => [k, q(samples[k]) / groundY])),
    chroma: q(samples.chroma) }
}
