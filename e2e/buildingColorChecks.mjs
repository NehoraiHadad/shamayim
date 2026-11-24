export async function buildingColorChecks() {
  const { sceneModel } = await import('/src/scene/model/index.ts')
  const { outsideShape } = await import('/src/scene/model/outsideShape.ts')
  const { wallAir } = await import('/src/scene/model/wallDistance.ts')
  const { buildingFaces } = await import('/src/scene/model/buildingLight.ts')
  const { preparePlaneTexels, samplePlaneTexel, shadeTexelSrgb } = await import('/src/scene/paint/shared/land/planeTexel.ts')
  const { albedoLinear, srgbRgbToLinear, linearLuminance } = await import('/src/scene/model/landRadiance.ts')
  const { landIrradiance } = await import('/src/scene/model/landIrradiance.ts')
  const { sunlitGround } = await import('/src/scene/model/buildingGround.ts')
  const { receiverMaterial } = await import('/src/scene/model/buildingMaterial.ts')
  const { hazeAt, hazeOf } = await import('/src/scene/model/landVeil.ts')
  const { nearGroundAlbedo } = await import('/src/scene/model/landColour.ts')
  const { outsideGroundAlbedo } = await import('/src/scene/model/outsideGround.ts')
  const { lambert } = await import('/src/world/livingLight.ts')
  const { TEXEL } = await import('/src/scene/model/planeBands.ts')
  const world = window.__world, box = { width: innerWidth, landHeight: 128, landTop: 300, skyHeight: 428, dpr: 1 }
  const model = sceneModel(world, box)
  const outside = model.layers.find(l => l.kind === 'outside'), near = model.layers.find(l => l.kind === 'plane' && l.plane === 'near')
  const y = color => linearLuminance(srgbRgbToLinear(color))
  const span = values => values.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity])
  const t = preparePlaneTexels(near.outline, near.bounds, near.surfaceTone, near.light.litField, near.grain.seed, 0)
  // A colour's light: its radiance before the air of its path, over its own reflectance. The exposure scales all three alike.
  const lightOf = (color, rho, haze, airLin) => srgbRgbToLinear(color).map((v, k) => (v - airLin[k] * haze) / (1 - haze) / rho[k])
  const hue = ([r, , b]) => b / r
  const shaded = []
  for (let j = 0; j < t.hPx; j += 2) for (let i = 0; i < t.wPx; i += 2) {
    const x = t.bounds.x + (i + .5) * TEXEL, y = t.bounds.y + (j + .5) * TEXEL
    if (y < t.crestY[i] + 2 || y > t.footY[i] - 1) continue
    const sample = samplePlaneTexel(t, i, x, y)
    shaded.push(hue(lightOf(shadeTexelSrgb(t, sample, 0), sample.rho, sample.haze, t.litField.hazeLin)))
  }
  const shape = outsideShape(world, box, model.clear), air = wallAir(world, shape.groundKm)
  const airLin = srgbRgbToLinear(hazeOf(world)), irr = landIrradiance(world)
  const walls = outside.items.filter(i => i.kind === 'box' && !i.beyond).flatMap(i => {
    const { stone, glass, facing } = receiverMaterial(i.receiver)
    if (glass || lambert(facing.normals[0], irr.sunDir) > 0) return []
    return hue(lightOf(outside.receivers[i.tier][i.receiver].front.wall, stone, hazeAt(world, air(shape.wallKms[i.tier])), airLin))
  })
  // A wall turned from the sun sees half the sky's dome and half the place's own ground: streets, part of them in the beam.
  const view = world.place3, sunlit = sunlitGround(irr.sunDir) * Math.max(0, irr.sunDir.up)
  const rho = albedoLinear(view.land ? outsideGroundAlbedo(world, view.land, view.frame) : nearGroundAlbedo(world))
  const expected = hue(rho.map((c, k) => irr.eSkyVec[k] + c * (irr.eSkyVec[k] + sunlit * irr.eSunVec[k]))) / hue(irr.eSkyVec)
  // Every wall against every sample of the ground: no median of either hides one that is lit otherwise.
  const wall = span(walls), ground = span(shaded)
  // `skyOnly`: what the gate must refuse, a wall the blue sky alone lights, as on no ground.
  const light = { wall, ground, expected, ratio: [wall[0] / ground[1] / expected, wall[1] / ground[0] / expected], skyOnly: 1 / expected, walls: walls.length }
  const glass = outside.items.filter(i => i.kind === 'tower' && i.receiver >= 0 && i.receiver % 2).map(i => {
    const pane = outside.receivers[i.tier][i.receiver].front.wall
    const sameStone = buildingFaces(world, air(shape.wallKms[i.tier]), i.receiver ^ 1)
    const faces = ['front', 'left', 'right'].map(face => y(sameStone[face].wall))
    const shaded = Math.min(...faces), bright = Math.max(...faces)
    return { x: i.x, width: i.w, paneY: y(pane), wallY: shaded, ratio: y(pane) / shaded,
      frontRatio: y(pane) / faces[0], brightRatio: y(pane) / bright, redMinusBlue: pane[0] - pane[2] }
  })
  return { light, glass }
}
