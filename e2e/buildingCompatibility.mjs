// Compare projections of the same frame on the same browser backend.
export async function buildingCompatibility() {
  const { sceneModel, layersOn } = await import('/src/scene/model/index.ts')
  const { Surface } = await import('/src/scene/compose/surface.ts')
  const { isField } = await import('/src/world/glyphSpecs.ts')
  const { painterOf } = await import('/src/scene/paint/styles.ts')
  const { PAINT_PASS } = await import('/src/scene/paint/shared/base/paintPass.ts')
  const box = { width: innerWidth, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
  const layers = layersOn(sceneModel(window.__world, box), 'land')
  const nature = g => isField(g.kind) || g.kind === 'palms'
  const background = l => ['outside', 'marks'].includes(l.kind)
  const mixed = l => background(l) || l.kind === 'farCities'
  const land = layers.filter(l => background(l) || ['plane', 'canopy', 'water'].includes(l.kind))
  const canvas = () => Object.assign(document.createElement('canvas'), { width: box.width, height: box.landHeight })

  // Actual paths, transforms, alpha and gradient stops are replayed. A fill is
  // emissive only where the painter explicitly marks it as a window or lamp.
  function only(ctx, pass) {
    let active = false
    const tagged = new Proxy(ctx, {
      get(target, key) {
        if (key === PAINT_PASS) return (group, draw) => {
          if (group === pass || active) {
            const previous = active
            active = true
            draw()
            active = previous
          }
          return true
        }
        if (['fill', 'fillRect', 'stroke', 'strokeRect', 'drawImage'].includes(key)) {
          return (...args) => { if (active) target[key](...args) }
        }
        const value = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
      set(target, key, value) { return Reflect.set(target, key, value, target) },
    })
    return tagged
  }

  function render(descs, pass) {
    const surface = new Surface(canvas(), {
      painters(desc) {
        const p = painterOf(desc)
        if (!pass || !mixed(desc)) return p
        return { ...p, light(ctx, desc, env) { p.light(only(ctx, pass), desc, env) } }
      },
    })
    surface.resize(box.width, box.landHeight, 1)
    surface.render(descs, 0, true)
    return surface.canvas.getContext('2d').getImageData(0, 0, box.width, box.landHeight).data
  }

  const removed = land.map(l => {
    if (l.kind === 'outside') return { ...l, items: l.items.filter(i => i.kind === 'tree' || (i.kind === 'mark' && nature(i.glyph))) }
    if (l.kind === 'marks') return { ...l, glyphs: l.glyphs.filter(nature) }
    return l
  })
  const swap = tone => Array.isArray(tone)
    ? (typeof tone[0] === 'number' && tone.length === 3 ? [0.03, .82, .34] : tone.map(swap))
    : tone && typeof tone === 'object' ? Object.fromEntries(Object.entries(tone).map(([k, v]) => [k, swap(v)])) : tone
  const glyph = g => nature(g) ? g : { ...g,
    tones: { ...swap(g.tones), win: g.tones.win }, surfaces: swap(g.surfaces), gilding: swap(g.gilding) }
  const architecture = layers.filter(mixed)
  const swapped = architecture.map(l => {
    if (l.kind === 'outside') return { ...l, receivers: swap(l.receivers), accessories: swap(l.accessories),
      items: l.items.map(i => i.kind === 'mark' ? { ...i, glyph: glyph(i.glyph) } : i) }
    if (l.kind === 'marks') return { ...l, glyphs: l.glyphs.map(glyph) }
    return { ...l, tiers: swap(l.tiers) }
  })
  const same = (a, b) => a.every((v, i) => v === b[i])
  const lamps = render(architecture, 'emission')
  return {
    background: same(render(land, 'background'), render(removed)),
    lampPass: same(lamps, render(swapped, 'emission')),
    lampPixels: lamps.filter((v, i) => i % 4 === 3 && v > 0).length,
    changedArchitecture: !same(render(architecture), render(swapped)),
    hasCanopy: land.some(l => l.kind === 'canopy'),
    hasWater: land.some(l => l.kind === 'water' || l.sea),
  }
}
