import path from 'node:path'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { bundledWorldLoader } from '../../test/bundledWorld'
import { stubCachedPublicFetch } from '../../test/bundledFetch'
import { settlementCaseGroups } from '../../test/settlementCases'
import { assertDrawnSeats, assertFarScale, assertTownScale } from '../../test/worshipAssertions'
import { SCENE_H } from '../../world/sceneBox'
import { sceneModel } from '.'

const root = path.resolve(__dirname, '../../..')
const groups = settlementCaseGroups(root)
let load: Awaited<ReturnType<typeof bundledWorldLoader>>
beforeAll(async () => { stubCachedPublicFetch(); load = await bundledWorldLoader(root) })
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

// Offline fixtures, flat 100 m when unrecorded. Round 5: 46.32 s including startup, largest group 5.38 s.
// The 90 s group timeout gives over 16x measured headroom, above the requested 3x.
// One world per place covers both widths; the old single test had taken 80.81 s against its 60 s timeout.
it.each(groups)('checks $name at both widths', { timeout: 90_000 }, async ({ name, entries }) => {
  const started = Date.now()
  let seated = 0, unseated = 0, raster = 0
  for (const entry of entries) {
    const { world, terrain, landmarkById } = await load(entry)
    if (world.place3.kind !== 'outside') throw new Error(entry.place.id)
    assertFarScale(world)
    for (const block of world.place3.beyondTowns ?? []) assertTownScale(block, world, terrain)
    for (const width of [375, 1280]) {
      const box = { width, skyHeight: 0, landTop: 0, landHeight: SCENE_H, dpr: 2 }
      const checked = assertDrawnSeats(world, box, sceneModel(world, box), landmarkById, terrain)
      seated += checked.seated; unseated += checked.unseated; raster += checked.raster
    }
  }
  expect(entries.length).toBeGreaterThan(0)
  process.stdout.write((`${name}: ${entries.length} places, ${seated} seated, ${unseated} unseated, ` +
    `${raster} raster, ${((Date.now() - started) / 1000).toFixed(2)} s\n`))
})
