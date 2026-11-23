import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { launch, loadScene, openPage, sceneUrl } from './harness.mjs'
import { serveTree } from './identityShoot.mjs'

// Run in CI with a checkout of bea595f8 as the first argument.
const baseline = process.argv[2]
assert.ok(baseline, 'pass the baseline checkout directory')
const lowRise = ['shadmot-mehola', 'beit-shean', 'rosh-pina', 'zikhron-yaakov', 'tiberias']
const cities = new Map([['haifa', 10], ['jerusalem', 9], ['tel-aviv', 26]])

async function measureTown() {
  const { sceneModel, layersOn } = await import('/src/scene/model/index.ts')
  const { buildingRasterMasks } = await import('/e2e/buildingRasterMasks.mjs')
  const { HOUSE_TOP_M } = await import('/src/data/city/outsideView.ts')
  const world = window.__world
  const width = innerWidth, landHeight = 128
  const layers = layersOn(sceneModel(world, { width, landHeight, landTop: 300, skyHeight: 428, dpr: 1 }), 'land')
  const outside = layers.find(layer => layer.kind === 'outside')
  const { m } = await buildingRasterMasks(layers, outside, width, landHeight)
  const rgba = m.getImageData(0, 0, width, landHeight).data
  let pixelArea = 0
  for (let i = 3; i < rgba.length; i += 4) pixelArea += rgba[i] / 255
  const { frame, skyline } = world.place3
  const ratios = skyline.boxes.filter(b => b.seed !== undefined && b.heightM >= HOUSE_TOP_M && b.heightM < 60)
    .map(b => (b.foot - b.top) / b.w).sort((a, b) => a - b)
  return {
    // Visible own-town fabric, including cap and tile, integrated by coverage per east–west frame km.
    areaPerKm: pixelArea / (frame.e - frame.w),
    boxes: skyline.boxes.length,
    medianAspect: ratios[Math.floor(ratios.length / 2)] ?? null,
    aboveThree: ratios.filter(ratio => ratio > 3).length,
    towerSeeds: skyline.towers.map(tower => tower.seed).sort((a, b) => a - b),
  }
}

const cache = await mkdtemp(path.join(tmpdir(), 'town-coverage-'))
const trees = []
let browser
const failures = []
try {
  trees.push(await serveTree('base', baseline, cache))
  trees.push(await serveTree('current', process.cwd(), cache))
  browser = await launch()
  for (const place of [...lowRise, ...cities.keys()]) {
    try {
      const values = []
      for (const tree of trees) {
        const { context, page } = await openPage(browser, tree.url, 1, { treeRoot: tree.root })
        try {
          await loadScene(page, sceneUrl(tree.url, { place, at: '2026-11-17T12:00' }))
          values.push(await page.evaluate(measureTown))
        } finally {
          await context.close()
        }
      }
      const [base, current] = values
      console.log(place, JSON.stringify({ base, current }))
      if (cities.has(place)) {
        assert.equal(base.towerSeeds.length, cities.get(place), 'baseline tower count')
        assert.deepEqual(current.towerSeeds, base.towerSeeds, 'baseline tower seed list')
        assert.ok(current.medianAspect !== null && current.medianAspect <= 1.6, 'ordinary block median aspect')
      } else {
        const ratio = current.areaPerKm / base.areaPerKm
        assert.ok(ratio >= .85 && ratio <= 1.15, `painted area ratio ${ratio.toFixed(3)} outside [.85, 1.15]`)
      }
    } catch (error) {
      failures.push(`${place}: ${error.message}`)
    }
  }
} finally {
  await browser?.close()
  for (const tree of trees) await tree.close()
  await rm(cache, { recursive: true, force: true })
}
assert.deepEqual(failures, [])
