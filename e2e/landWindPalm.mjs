/** The recorded Kalya date groves resolve as rows/blocks at 375 px. Add an explicitly
 * synthetic foreground row to exercise the individual palm painter against the same DEM and light.
 * This fixture is used only in the browser runners. The scene and its normal harness stay data-driven.
 */
export async function installNearPalmFixture(page, phase = 0) {
  await page.evaluate(async (phase) => {
    const [{ sceneModel, layersOn }, { canopyOf }, { plantWindOf }, { Surface }, { TONE }] = await Promise.all([
      import('/src/scene/model/index.ts'), import('/src/scene/model/canopy.ts'), import('/src/scene/model/landWind.ts'),
      import('/src/scene/compose/surface.ts'), import('/src/scene/model/vegSample.ts'),
    ])
    const world = window.__world
    const canvas = [...document.querySelectorAll('canvas')].at(-1)
    const { width, height: landHeight, top: landTop } = canvas.getBoundingClientRect()
    const box = { width, landHeight, landTop, skyHeight: landTop + landHeight, dpr: devicePixelRatio }
    const model = sceneModel(world, box)
    const plane = model.layers.find((layer) => layer.id === 'plane.near')
    const vegetation = plane.vegetation
    // Packed scene pixels and seeded angles as in Stage 4: x, base, radius, height, phase, shade.
    const palms = [
      [110, 118, 2.1, 6.6, 0.2, 0.4], [122, 118.5, 2.3, 7.5, 1.4, 0.5], [135, 119, 1.9, 6.1, 2.7, 0.6],
      [112, 125, 2.3, 7.2, 3.1, 0.5], [125, 125.2, 2.7, 8.3, 4.6, 0.4], [139, 125.8, 2.3, 7.1, 5.5, 0.6],
    ]
    const withPalms = {
      ...plane, key: `${plane.key}:near-palm-fixture`,
      vegetation: {
        ...vegetation,
        trees: new Float32Array([...vegetation.trees, ...palms.flat()]),
        treeMeta: new Uint8Array([...vegetation.treeMeta, ...palms.flatMap(() => [3, TONE.PALM, 248])]),
      },
    }
    const canopy = canopyOf(withPalms, plantWindOf(world.wind), model.clear)
    const land = layersOn(model, 'land').map((layer) => layer.id === canopy.id ? canopy : layer.id === plane.id ? withPalms : layer)
    const surface = new Surface(canvas)
    surface.resize(width, landHeight, box.dpr)
    surface.render(land, phase)
    const lay = window.__scene.lay
    window.__scene.lay = (t) => { lay(t); surface.lay(t) }
  }, phase)
}
