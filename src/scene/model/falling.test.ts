import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldInput } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '.'
import { wrap } from './cloudLight'
import { fallingOf } from './falling'
import { skyGeom } from './sky'
import type { LayerOf, SceneBox } from './types'
import { inView } from './weather'

/*
 * The clouds rain falls from (`falling.ts`), projected straight from the field's rain cells: each at its true azimuth on
 * the band, every shaft under one of them, and the rain carried the way the field carries the cloud it falls from.
 */
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const at = (hour: string) => `2026-11-17T${hour}` as LocalTime
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

const world = (id: string, forced: WorldInput['forced']) => buildWorld({ ...worldInput(loaded.get(id)!, at('12:00')), forced })
const RAIN = (windDirection: number) => ({ precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55,
  windDirection, humidity: 95 })
const median = (values: readonly number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

describe('falling: rain from the field cells', () => {
  it('stands each raining cell at its true azimuth and a shaft under each far one in view', { timeout: 30000 }, () => {
    for (const id of ['haifa', 'jerusalem']) {
      for (const dir of [270, 90]) {
        const w = world(id, RAIN(dir))
        const geom = skyGeom(w, BOX)
        const falling = fallingOf(w, BOX, geom, 'rain')!
        expect(falling.cells.length).toBe(w.rain!.cells.length)
        for (const [i, cell] of w.rain!.cells.entries()) {
          const cloud = falling.cells[i]
          expect(cloud.id).toBe(`${cell.level}:${cell.bank}`)
          expect(cloud.x).toBeCloseTo(wrap(geom.x((cell.fromAzimuth + cell.toAzimuth) / 2), geom.period), 6)
          expect(cloud.y).toBeCloseTo(geom.dome(cloud.altitude), 6)
          expect(cloud.w).toBeGreaterThan(0)
        }
        const shafts = sceneModel(w, BOX).layers.filter((l): l is LayerOf<'shafts'> => l.kind === 'shafts').flatMap((l) => l.shafts)
        const far = falling.cells.filter((c) => c.altitude < 30 && inView(geom, BOX, c))
        if (far.length) expect(shafts.length).toBeGreaterThan(0)
        for (const s of shafts) expect(falling.cells.find((c) => c.id === s.id)?.x).toBe(s.x)
      }
    }
  })

  it('carries the rain the way the field carries its cloud', { timeout: 30000 }, () => {
    let checked = 0
    for (const id of ['haifa', 'jerusalem', 'tel-aviv', 'tiberias']) {
      const w = world(id, RAIN(270))
      const falling = fallingOf(w, BOX, skyGeom(w, BOX), 'rain')!
      const lattice = (w.cloudField?.field.rain?.midWeight ?? 0) >= 0.5 ? 'mid' : 'low'
      const sheet = sceneModel(w, BOX).layers.find((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet' && l.lattice === lattice)
      const carry = sheet ? median(sheet.speeds) : 0
      if (Math.abs(carry) < 0.005 || Math.abs(falling.speed) < 0.005) continue
      expect(Math.sign(falling.speed), id).toBe(Math.sign(carry))
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })
})
