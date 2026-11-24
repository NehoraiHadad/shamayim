import { expect, it } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { LocalTime } from '../../domain/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
it('diag', async () => {
  stubPublicFetch()
  const loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(({ id }) => ['haifa', 'neve-zohar', 'tel-aviv', 'jerusalem', 'tiberias', 'ramon-crater'].includes(id)))
  const lines: [number, string][] = []
  for (const [id, place] of loaded) for (const day of ['2026-11-17', '2026-03-15']) for (let h = 8; h < 17; h += 2) for (const sel of [false, true]) {
    const at = `${day}T${String(h).padStart(2, '0')}:30` as LocalTime
    const g = globalThis as { diag?: (string | number)[][] }
    g.diag = []
    try {
      cloudLayersOf(makeWorldBuilder()(sel ? worldInput(place, `${day}T12:00` as LocalTime, at) : worldInput(place, at)), box)
    } catch { continue }
    for (const lattice of ['low', 'mid']) {
      const rows = g.diag.filter((n) => n[0] === lattice && Number(n[8]) >= 0.98 && Number(n[11]) < 0.01 && n[12])
      if (!rows.length) continue
      const least = rows.reduce((a, b) => Number(a[10]) < Number(b[10]) ? a : b)
      const leastNew = Math.min(...rows.map((n) => Number(n[9])))
      lines.push([Number(least[10]), `DIAG2 ${id} ${at} ${sel} ${rows.length} minNew ${leastNew} | ${least.join(' ')}`])
    }
  }
  lines.sort((a, b) => a[0] - b[0])
  console.log(lines.slice(0, 14).map(([, l]) => l).join('\n'))
  expect(lines.length).toBeGreaterThan(0)
}, 300_000)
