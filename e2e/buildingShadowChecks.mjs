// The fixture harness uses the same broken-deck preset and panorama as the CI still.
export async function buildingShadowChecks() {
  const { projectCloudShadows } = await import('/src/scene/model/cloudShadowProject.ts')
  const { edgeCoverage } = await import('/src/scene/model/cloudShadowEdge.ts')
  const { shadowedPlane, shadowRadii } = await import('/src/scene/model/planeCloudShadow.ts')
  const { sceneModel } = await import('/src/scene/model/index.ts')
  const { Surface } = await import('/src/scene/compose/surface.ts')
  const { prepareShadowStamp } = await import('/src/scene/compose/cloudShadowStamp.ts')
  const world = window.__world
  const box = { width: innerWidth, landHeight: 128, landTop: 300, skyHeight: 428, dpr: 1 }
  const { terrain, camera, cloudField, flightTerrain: grid, bodies: { sun } } = world
  const projected = projectCloudShadows({ cloudField, grid, terrain, camera, box,
    azimuth: sun.azimuth, altitude: sun.altitude, minDepth: 0 })
  const plane = sceneModel(world, box).layers.find(l => l.kind === 'plane' && l.plane === 'near')
  const { open } = plane.cloudShadow
  const interest = projected.filter(p => p.plane === 'near' && p.blob.ry >= 7).map(p => p.blob)
  const rho = Array.from({ length: 256 }, (_, v) => v < 11 ? v / 3294.6 : ((v / 255 + .055) / 1.055) ** 2.4)
  const rgb = (data, i) => [rho[data[i]], rho[data[i + 1]], rho[data[i + 2]]]
  const y = ([r, g, b]) => .2126 * r + .7152 * g + .0722 * b
  const median = values => values.sort((a, b) => a - b)[values.length >> 1]

  function integrate(blob) {
    const peak = -Math.expm1(-blob.opticalDepth)
    let oldArea = 0, newArea = 0
    // Integrate in squared radius so each sample represents the same area.
    for (let i = 0; i < 400; i++) {
      const r2 = (i + .5) / 400
      oldArea -= Math.expm1(-blob.opticalDepth * (1 - r2) ** 2)
      const r = Math.sqrt(4 * r2)
      for (let a = 0; a < 72; a++) {
        const theta = a * 2 * Math.PI / 72
        newArea += peak * edgeCoverage(blob.edge, r * Math.cos(theta), r * Math.sin(theta))
      }
    }
    return { ratio: newArea * 4 / (72 * oldArea), oldArea: oldArea * Math.PI * blob.rx * blob.ry / 400 }
  }

  const blobs = projected.map(({ blob }) => {
    const { lobes } = blob.edge, area = integrate(blob)
    return { id: blob.cellId, lobes: Math.max(...lobes) - Math.min(...lobes), areaRatio: area.ratio,
      diffuseView: blob.diffuseView }
  })

  const receive = (blobs, bounds = plane.bounds) => shadowedPlane({ ...plane, bounds, cloudShadow: undefined },
    { plane: 'near', open, blobs }, 0, false)
  const render = layer => {
    const surface = new Surface(document.createElement('canvas'))
    surface.resize(box.width, box.landHeight, 1)
    surface.render([layer], 0, true)
    return surface.canvas.getContext('2d').getImageData(0, 0, box.width, box.landHeight).data
  }
  const lit = render({ ...plane, cloudShadow: undefined })
  const broad = interest.map(blob => {
    const shadow = receive([blob]), shade = render(shadow)
    const ratios = [], cool = []
    for (let py = 0; py < box.landHeight; py++) for (let px = 0; px < box.width; px++) {
      const i = (py * box.width + px) * 4
      if (lit[i + 3] !== 255 || shade[i + 3] !== 255 || edgeCoverage(blob.edge, (px + .5 - blob.x) / blob.rx,
        (py + .5 - blob.y) / blob.ry) < .99) continue
      const sun = rgb(lit, i), dark = rgb(shade, i)
      if (y(sun) < .095) continue
      ratios.push(y(dark) / y(sun))
      cool.push((dark[2] / dark[0]) / (sun[2] / sun[0]))
    }
    let t10, t90
    for (let p = 0; p <= 2 * blob.ry; p += .02) {
      const removed = edgeCoverage(blob.edge, 0, p / blob.ry)
      if (t10 === undefined && removed < .9) t10 = p
      if (removed < .1) { t90 = p; break }
    }
    // Integrate the compositor's own stencil on a finer, unclipped grid.
    const area = integrate(blob), texel = .25
    const stamp = prepareShadowStamp({ ...blob, y: 64, speed: 0 }, { x: -375, y: 0, w: 1125, h: 128 }, 1, texel)
    const stampArea = stamp.data.reduce((sum, tau) => sum - Math.expm1(-tau), 0) * texel ** 2
    return { id: blob.cellId, x: blob.x, y: blob.y, rx: blob.rx, ry: blob.ry, edgePx: t90 - t10,
      discPx: [blob.edge.penumbraX, blob.edge.penumbraY], area: area.oldArea, stampArea, diffuseView: blob.diffuseView,
      samples: ratios.length, shadowY: median(ratios), cool: median(cool) }
  })

  const [stationary, moving] = interest
  const leave = shadowRadii(moving)[0]
  const at = offset => ({ ...moving, x: plane.bounds.x - leave + offset, y: stationary.y, speed: 0 })
  const inside = receive([stationary, at(.0001)]), outside = receive([stationary, at(-.0001)])
  const endpointStep = Math.abs(inside.light.litField.cloudDiffuse[0] - outside.light.litField.cloudDiffuse[0])
  const singleStep = receive([at(.0001)]).light.litField.cloudDiffuse[0]
  return { blobs, broad, endpointStep, singleStep }
}
