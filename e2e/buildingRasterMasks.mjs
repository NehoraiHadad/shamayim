// Geometry masks use the scene painter and visible draw order.
export async function buildingRasterMasks(layers, outside, w, h) {
  const { paintBoxGeometry } = await import('/src/scene/paint/outsideBox.ts')
  const { capDepth, topPlane } = await import('/src/scene/paint/buildingFaces.ts')
  const { paintTower } = await import('/src/scene/paint/outsideTower.ts')
  const { paintFarCities } = await import('/src/scene/paint/farCities.ts')
  const { isField } = await import('/src/world/glyphSpecs.ts')
  const { drawGlyph } = await import('/src/scene/paint/glyphs/index.ts')
  const canvas = () => Object.assign(document.createElement('canvas'), { width: w, height: h })
  const m = canvas().getContext('2d', { willReadFrequently: true })
  const caps = canvas().getContext('2d', { willReadFrequently: true })
  const builtObjects = canvas().getContext('2d', { willReadFrequently: true })
  const industrial = canvas().getContext('2d', { willReadFrequently: true })
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
    if (b.kind === 'tower') {
      paintTower(builtObjects, b, outside.tiers[b.tier], shine, [], outside.receivers[b.tier][b.receiver], 1)
      if (b.industrial) {
        industrial.fillStyle = 'red'
        industrial.fillRect(b.x - .75, b.base - .85 * b.h, 1.5, .32 * b.h)
      }
    }
    if (b.kind !== 'box' || b.beyond) continue
    const p = outside.receivers[b.tier][b.receiver]
    const luminance = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
    const right = luminance(p.right.wall) >= luminance(p.left.wall)
    const facade = { ...p, front: f(red), left: f(right ? blue : green), right: f(right ? green : blue),
      top: yellow, tile: [tile, tile, tile], tileBase: tile, recess: black, unresolved: red }
    const id = ++index
    const hash = Math.imul(id + 1000, 0x45d9f3b) >>> 0
    const key = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) & 0xffffff
    ownerColors.set(key, id)
    const value = [key & 255, (key >> 8) & 255, key >> 16].map(v => v / 255)
    const owned = { ...p, front: f(value), left: f(value), right: f(value),
      top: value, tile: [value, value, value], tileBase: value, recess: value, unresolved: value }
    paintBoxGeometry(m, { ...b, heater: false }, outside.tiers[b.tier], shine, facade, props)
    paintBoxGeometry(owner, { ...b, heater: false }, outside.tiers[b.tier], shine, owned, props)
    if (b.roof !== 'tile') topPlane(caps, b.x - b.w / 2, b.top, b.w, capDepth(b.w, b.foot - b.top), yellow)
  }

  const domeCtx = canvas().getContext('2d')
  const marks = layers.flatMap(l => l.kind === 'marks' ? l.glyphs : l.kind === 'outside'
    ? l.items.flatMap(i => i.kind === 'mark' ? [i.glyph] : []) : [])
  for (const layer of layers.filter(l => l.kind === 'farCities')) paintFarCities(builtObjects, { ...layer, lights: [] }, { scale: 1 })
  for (const glyph of marks) {
    if (!isField(glyph.kind) && glyph.kind !== 'palms') drawGlyph(builtObjects, glyph, shine)
    if (glyph.kind === 'chimney' || glyph.kind === 'cooling') {
      industrial.fillStyle = glyph.kind === 'chimney' ? 'red' : 'blue'
      const x = glyph.x + (glyph.kind === 'chimney' ? 2.2 * glyph.hand * glyph.scale : 0)
      industrial.fillRect(x - .5, glyph.base - .90 * glyph.h * glyph.scale, 1, .28 * glyph.h * glyph.scale)
    }
    if (glyph.kind !== 'babShrine') continue
    const { tones, surfaces } = glyph
    const dark = Object.fromEntries(Object.keys(tones).map(key => [key, black]))
    const pairs = [black, black], shell = Array(4).fill(Array(7).fill(yellow))
    drawGlyph(domeCtx, { ...glyph, tones: dark, gilding: shell, surfaces: { ...surfaces, wall: pairs, stone: pairs,
      round: [black, black] } }, shine)
  }

  return { m, caps, industrial, owner, ownerColors, domeCtx, builtObjects, scale, superWidth }
}
