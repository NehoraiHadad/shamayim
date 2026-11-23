export async function buildingColorChecks() {
  const { sceneModel } = await import('/src/scene/model/index.ts')
  const { outsideShape } = await import('/src/scene/model/outsideShape.ts')
  const { buildingFaces } = await import('/src/scene/model/buildingLight.ts')
  const { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } = await import('/src/scene/paint/planeTexel.ts')
  const { srgbRgbToLinear, linearLuminance } = await import('/src/scene/model/landRadiance.ts')
  const { TEXEL } = await import('/src/scene/model/planeBands.ts')
  const world = window.__world, box = { width: innerWidth, landHeight: 128, landTop: 300, skyHeight: 428, dpr: 1 }
  const model = sceneModel(world, box)
  const outside = model.layers.find(l => l.kind === 'outside'), near = model.layers.find(l => l.kind === 'plane' && l.plane === 'near')
  const y = color => linearLuminance(srgbRgbToLinear(color))
  const br = color => { const [r, , b] = srgbRgbToLinear(color); return b / r }
  const median = values => values.length ? values.sort((a, b) => a - b)[values.length >> 1] : null
  const t = preparePlaneTexels(near.outline, near.bounds, near.surfaceTone, near.light.litField, near.grain.seed, 0)
  const sky = []
  for (let j = 0; j < t.hPx; j += 2) for (let i = 0; i < t.wPx; i += 2) {
    const x = t.bounds.x + (i + .5) * TEXEL, y = t.bounds.y + (j + .5) * TEXEL
    if (y < t.crestY[i] + 2 || y > t.footY[i] - 1) continue
    const sample = samplePlaneTexel(t, i, x, y)
    sky.push(br(shadeTexelSrgb(t, sample, 0)))
  }
  const shape = outsideShape(world, box, model.clear)
  const walls = outside.items.filter(i => i.kind === 'box' && !i.beyond)
    .map(i => br(outside.receivers[i.tier][i.receiver].front.wall))
  const glass = outside.items.filter(i => i.kind === 'tower' && i.receiver >= 0 && i.receiver % 2).map(i => {
    const pane = outside.receivers[i.tier][i.receiver].front.wall
    const sameStone = buildingFaces(world, shape.kms[i.tier], i.receiver ^ 1)
    const faces = ['front', 'left', 'right'].map(face => y(sameStone[face].wall))
    const shaded = Math.min(...faces), bright = Math.max(...faces)
    return { x: i.x, width: i.w, paneY: y(pane), wallY: shaded, ratio: y(pane) / shaded,
      frontRatio: y(pane) / faces[0], brightRatio: y(pane) / bright, redMinusBlue: pane[0] - pane[2] }
  })
  return { wallBR: median(walls), groundBR: median(sky), glass }
}
