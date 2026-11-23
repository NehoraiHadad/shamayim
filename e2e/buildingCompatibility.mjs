// This probe runs against both revisions. Hash native canvas bytes before architecture is composited,
// and rasterize the emissive fills of the fully dark architecture onto a separate transparent surface.
export async function buildingCompatibility() {
  const { sceneModel, layersOn } = await import('/src/scene/model/index.ts')
  const { Surface } = await import('/src/scene/compose/surface.ts')
  const { painterOf, HAND } = await import('/src/scene/paint/index.ts')
  const box = { width: innerWidth, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
  const layers = layersOn(sceneModel(window.__world, box), 'land')
  const canvas = () => Object.assign(document.createElement('canvas'), { width: box.width, height: box.landHeight })
  const digest = async (c) => {
    const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height)
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('')
  }
  const green = g => ['palms', 'orchard', 'vineyard', 'solar'].includes(g.kind)
  const withoutArchitecture = layers.filter(l => l.kind !== 'farCities').map(l => {
    if (l.kind === 'outside') return { ...l, items: l.items.filter(i => i.kind === 'tree' || (i.kind === 'mark' && green(i.glyph))) }
    if (l.kind === 'marks') return { ...l, glyphs: l.glyphs.filter(green) }
    return l
  })
  const land = new Surface(canvas())
  land.resize(box.width, box.landHeight, 1)
  land.render(withoutArchitecture, 0, true)
  const result = { land: await digest(land.canvas) }
  if (window.__world.night.dark !== 1) return result

  // At night the architectural materials are dark. Emissive shapes use warm white, red or green.
  // Match by paint colour and replay the actual paths, transformations, opacity and gradient stops.
  const lights = canvas(), ctx = lights.getContext('2d')
  let style, radial = new WeakSet()
  const luminous = colour => {
    if (radial.has(colour)) return true
    const [r, g, b] = (typeof colour === 'string' ? colour.match(/\d+/g) ?? [] : []).map(Number)
    return (r >= 122 && r >= 1.22 * b) || (g >= 165 && g > 1.24 * r)
  }
  const lightOnly = new Proxy(ctx, {
    get(target, key) {
      if (key === 'createRadialGradient') return (...args) => {
        const g = target.createRadialGradient(...args)
        radial.add(g)
        return g
      }
      if (key === 'fill' || key === 'fillRect') return (...args) => {
        if (luminous(style)) target[key](...args)
      }
      if (key === 'createPattern') return () => 'transparent'
      if (key === 'stroke' || key === 'strokeRect') return () => {}
      const value = target[key]
      return typeof value === 'function' ? value.bind(target) : value
    },
    set(target, key, value) {
      if (key === 'fillStyle') style = value
      target[key] = value
      return true
    },
  })
  for (const layer of layers) {
    const art = layer.kind === 'outside' ? { ...layer, land: null, sea: null, items: layer.items.filter(i => i.kind !== 'tree') }
      : layer.kind === 'marks' ? { ...layer, glyphs: layer.glyphs.filter(g => !green(g)) }
        : layer.kind === 'farCities' ? layer : null
    if (!art) continue
    painterOf(art).light(lightOnly, art, { hand: HAND, phase: 0, scale: 1, canvas: (w, h) => {
      const c = new OffscreenCanvas(w, h)
      return { canvas: c, ctx: c.getContext('2d') }
    } })
  }
  result.lamps = await digest(lights)
  result.lampPixels = ctx.getImageData(0, 0, lights.width, lights.height).data.filter((value, i) => i % 4 === 3 && value > 0).length
  const full = new Surface(canvas())
  full.resize(box.width, box.landHeight, 1)
  full.render(layers, 0, true)
  // The metal cap can still reflect the night sky. Exclude its own footprint from the wall comparison.
  const fullCtx = full.canvas.getContext('2d')
  const glyphs = layers.flatMap(l => l.kind === 'outside' ? l.items.flatMap(i => i.kind === 'mark' ? [i.glyph] : [])
    : l.kind === 'marks' ? l.glyphs : [])
  for (const g of glyphs.filter(g => g.kind === 'babShrine')) {
    const bottom = Math.ceil(g.base - 9.4 * g.scale)
    const left = Math.floor(g.x - 3.2 * g.scale), top = Math.floor(g.base - (g.h + .1) * g.scale)
    fullCtx.clearRect(left, top, Math.ceil(g.x + 3.2 * g.scale) - left, bottom - top)
  }
  result.nightWalls = await digest(full.canvas)
  return result
}
