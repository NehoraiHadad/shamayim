import { expect, it } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { LocalTime } from '../../domain/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { skyStops } from './sky'
import { hexOf, labOf } from './tone'
import type { RGB } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const show = (rgb: RGB) => { const { l, a, b } = labOf(rgb); return `${hexOf(rgb)} L${l.toFixed(2)} C${Math.hypot(a, b).toFixed(3)} h${((Math.atan2(b, a) * 57.3 + 360) % 360).toFixed(0)}` }
it('diag', async () => {
  stubPublicFetch()
  const loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(({ id }) => ['haifa', 'neve-zohar', 'ramon-crater', 'tel-aviv', 'jerusalem'].includes(id)))
  const lines: string[] = []
  const forced = { pm10: 400, dust: 400, visibilityKm: 3 }
  for (const [id, at, f] of [['haifa', '2026-11-17T15:30'], ['haifa', '2026-11-17T16:00'], ['haifa', '2026-11-17T16:10'], ['haifa', '2026-11-17T16:20'], ['haifa', '2026-11-17T16:30'],
    ['neve-zohar', '2026-11-17T16:00'], ['tel-aviv', '2026-11-17T12:00'], ['jerusalem', '2026-11-17T12:00'], ['jerusalem', '2026-11-17T14:00'], ['haifa', '2026-03-15T07:00'], ['haifa', '2026-03-15T12:00'], ['jerusalem', '2026-11-17T06:20'],
    ['ramon-crater', '2026-11-17T15:00', forced], ['jerusalem', '2026-11-17T15:00', forced]] as [string, LocalTime, typeof forced?][]) {
    const world = makeWorldBuilder()({ ...worldInput(loaded.get(id)!, at), ...(f && { forced: f }) })
    const g = globalThis as { diag?: (string | number)[][] }
    if (id === 'haifa' && at.endsWith('16:30')) g.diag = []
    const layers = cloudLayersOf(world, box)
    lines.push(`DIAG ${id} ${at} alt ${world.bodies.sun.altitude.toFixed(2)} vis ${world.air.visibilityKm.toFixed(1)} dust ${world.air.dustAirlight ?? '-'} fade3 ${(0.85 * world.air.fade(3)).toFixed(2)} sky ${skyStops(world, box).map(([, c]) => hexOf(c)).join(' ')}`)
    for (const l of layers) {
      if (l.kind === 'cloudSheet') lines.push(`DIAG   ${l.lattice} ${l.genus} lit ${show(l.lit)} | body ${show(l.body)} | shade ${show(l.shade)} thr ${l.through?.filter((_, i) => i % 12 === 0).map((t) => t.toFixed(2)).join(',') ?? ''}`)
      else for (const { sprite: s } of l.cells.slice(0, 3)) lines.push(`DIAG   tower lit ${show(s.lit)} | body ${show(s.body)} | shade ${show(s.shade)}`)
    }
    for (const n of g.diag ?? []) if (n[0] === 'low' && Number(n[3]) > 35 && Number(n[3]) < 195 && Number(n[4]) > 100 && Number(n[4]) < 250 && Number(n[2]) % 5 === 0) lines.push('DIAG n ' + n.join(' '))
    g.diag = undefined
  }
  console.log(lines.join('\n'))
  expect(lines.length).toBeGreaterThan(3)
}, 120_000)
