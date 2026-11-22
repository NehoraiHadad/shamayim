import { beforeAll, describe, expect, it } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { makeWorldBuilder } from '../../world/world'
import type { RGB, WorldState } from '../../world/types'
import { sceneModel } from './index'
import { cloudShadowLayers } from './cloudShadows'
import { shineOf, tonesAt } from './marks'
import { outsideLayer } from './outside'
import { wearLight } from './wear'
import type { LayerOf, SceneBox } from './types'

/*
 * The owner's report of 2026-11-20: "the change of light and shade is sharp instead of alive; it stands out on the houses
 * and on the clothes". The rule: every light parameter is a continuous function of the one world state, so a scrub minute
 * by minute through sunrise, noon and sunset turns each by a small step: the direct share, its colour as it lights a face,
 * the houses' tones and their faces as the painter lays them, the cloth's light, the cloud, the lit windows. Only a real
 * event (the disc passing behind the land's edge, over a few minutes) moves them faster, and then still by a bounded step.
 */

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const CLEAR = { forced: { cloudCover: 0, thickCloud: 0 }, forcedLayers: { low: 0, mid: 0, high: 0 } }
const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => ['jerusalem', 'haifa', 'tiberias'].includes(p.id)))
}, 120_000)

/**
 * What the light makes of a minute, as the eye meets it: the direct share; its colour where it lights (colour × the share);
 * the houses' tones at 2 km; each face of a box as the painter lays it (its base by the sky, toward the lit tone by its
 * share); the cloth's side light, front light and glow (each with the shine in it); the cloud; the lit windows.
 */
function seen(w: WorldState): Record<string, number> {
  const t = tonesAt(w, 2)
  const s = shineOf(w)
  const f = s.faces!
  const on = Math.min(1, Math.max(0, (s.direct - 0.04) / 0.41))
  const face = (k: number) => {
    const a = (0.3 + 0.35 * on) * (1 - k)
    return (lum(t.wall) * (1 - a) + lum(t.shade) * a) * (1 - k) + lum(t.lit) * k
  }
  const cloth = wearLight(w)
  return {
    direct: w.light.direct,
    warmth: (w.light.colour[0] - w.light.colour[2]) * w.light.direct,
    wall: lum(t.wall), lit: lum(t.lit), shade: lum(t.shade), rim: lum(t.rim), roofLit: lum(t.roofLit),
    left: face(f.left), right: face(f.right), front: lum(t.wall) + (lum(t.lit) - lum(t.wall)) * 0.85 * f.front,
    top: f.top * lum(t.lit), backRim: f.rim * lum(t.rim),
    cast: s.cast.alpha * Math.min(1, Math.abs(s.cast.dx) * 1.6) * Math.sign(s.cast.dx),
    castBeam: 1 - w.light.shadow.softness,
    clothSide: cloth.across * cloth.shine, clothFront: cloth.front * cloth.shine, clothBack: cloth.back * cloth.shine,
    low: w.clouds[0].cover, mid: w.clouds[1].cover, high: w.clouds[2].cover,
    windows: s.windows, sky: (outsideLayer(w, BOX)?.form.side ?? 0) * (outsideLayer(w, BOX)?.form.strength ?? 0),
  }
}

/** The largest change a minute makes to each, over a scrub, and where. */
function scrub(id: string, from: LocalTime, minutes: number, clear: boolean) {
  const build = makeWorldBuilder()
  const input = { ...worldInput(places.get(id)!, from, from), ...(clear ? CLEAR : {}) }
  const worst: Record<string, { step: number; at: string }> = {}
  let prev: Record<string, number> | null = null
  const all: Record<string, number>[] = []
  for (let m = 0; m <= minutes; m++) {
    const at = addMinutes(from, m)
    const now = seen(build({ ...input, selected: at }))
    all.push(now)
    if (prev) for (const k of Object.keys(now)) {
      // A cloud crossing the five-ray disc can change the cast strength within
      // one minute. Its contribution to glyph cast alpha is bounded by 0.55 Δbeam.
      const beam = k === 'cast' && !clear ? 0.55 * Math.abs(now.castBeam - prev.castBeam) : 0
      const step = Math.max(0, Math.abs(now[k] - prev[k]) - beam)
      if (!worst[k] || step > worst[k].step) worst[k] = { step, at: `${id}${clear ? ' clear' : ''} ${at}` }
    }
    prev = now
  }
  return { worst, all }
}

/**
 * The bound per minute: 0.035 of a tone's lightness; 0.05 for a face as the painter lays it, 0.07 for the cloth's side light
 * (its strength times the shine): they move fastest as the disc passes behind the land's edge, a real event now spread
 * over five to eight minutes; a little more for the shares.
 */
const BOUND: Record<string, number> = {
  // The share and its colour move fastest as the disc passes the land's edge (a real event, now over minutes).
  direct: 0.06, warmth: 0.1, wall: 0.035, lit: 0.035, shade: 0.035, rim: 0.035, roofLit: 0.035,
  left: 0.05, right: 0.05, front: 0.05, top: 0.05, backRim: 0.05, cast: 0.05, clothSide: 0.07, clothFront: 0.05, clothBack: 0.05,
  low: 0.02, mid: 0.02, high: 0.02, windows: 0.035, sky: 0.08,
}

const RUNS: [string, LocalTime, number, boolean][] = [
  // Sunrise, the noon crossing and sunset, clear (the sharpest light) and under the fixture's own changing cloud.
  ['jerusalem', '2026-11-17T05:50', 70, true], ['jerusalem', '2026-11-17T10:50', 70, true], ['jerusalem', '2026-11-17T15:50', 80, true],
  ['haifa', '2026-11-17T05:55', 70, true], ['haifa', '2026-11-17T15:50', 80, true],
  ['tiberias', '2026-11-17T05:50', 70, true], ['tiberias', '2026-11-17T15:30', 90, true],
  ['jerusalem', '2026-11-17T06:30', 420, false], ['haifa', '2026-11-17T06:30', 420, false], ['tiberias', '2026-11-17T12:30', 300, false],
]

describe('the living light: every light parameter is continuous in time', () => {
  it.each(RUNS)('%s from %s for %i min (clear: %s): each parameter turns by a small step a minute', (id, from, minutes, clear) => {
    const { worst } = scrub(id, from, minutes, clear)
    for (const [k, bound] of Object.entries(BOUND)) {
      expect(worst[k]?.step ?? 0, `${k} at ${worst[k]?.at}`).toBeLessThan(bound)
    }
  }, 240_000)

  it('turns the lit side through the noon crossing without a flip (Jerusalem, clear)', () => {
    const { all } = scrub('jerusalem', '2026-11-17T10:30', 120, true)
    // The cloth's side light passes from one side to the other through nothing, never jumping across.
    for (let i = 1; i < all.length; i++) {
      if (Math.sign(all[i].clothSide) !== Math.sign(all[i - 1].clothSide)) {
        expect(Math.abs(all[i].clothSide) + Math.abs(all[i - 1].clothSide)).toBeLessThan(0.08)
      }
    }
    // Morning: the left faces lit over the right; after noon the reverse; at the crossing the two meet.
    expect(all[0].left).toBeGreaterThan(all[0].right)
    expect(all[120].right).toBeGreaterThan(all[120].left)
    const gap = all.map((v) => v.left - v.right)
    const crossing = gap.findIndex((g, i) => i > 0 && Math.sign(g) !== Math.sign(gap[i - 1]))
    expect(crossing).toBeGreaterThan(0)
    expect(Math.abs(gap[crossing])).toBeLessThan(0.03)
  }, 240_000)

  it('fades the sun out over minutes as its disc sinks behind the drawn land, warming and dimming as it goes', () => {
    for (const id of ['jerusalem', 'haifa', 'tiberias']) {
      const { all } = scrub(id, '2026-11-17T15:30', 90, true)
      const lit = all.map((v) => v.direct)
      const first = lit.findIndex((d) => d < 0.002)
      expect(first, id).toBeGreaterThan(0)
      // At least four minutes from a fifth of the light to none (it was one).
      const fifth = lit.findIndex((d) => d < 0.2)
      expect(first - fifth, id).toBeGreaterThanOrEqual(4)
    }
  }, 240_000)
})

describe('the living light: cloud shadows', () => {
  it('lays moving cloud shadows on the land under a broken sky, none under a clear one or a closed deck', () => {
    const p = places.get('jerusalem')!
    const build = makeWorldBuilder()
    const broken = { forced: { cloudCover: 50, thickCloud: 50 }, forcedLayers: { low: 0.45, mid: 0.3, high: 0 } }
    const at = (m: number) => addMinutes('2026-11-17T13:00', m)
    const layers = (w: WorldState) => sceneModel(w, BOX).layers.filter((l): l is LayerOf<'cloudShadow'> => l.kind === 'cloudShadow')
    const input = worldInput(p, at(0), at(0))
    const first = build({ ...input, ...broken })
    const second = build({ ...input, ...broken, selected: at(1) })
    const a = layers(first)
    const b = cloudShadowLayers(second, BOX)
    expect(a.length).toBeGreaterThan(0)
    expect(a.length).toBeLessThanOrEqual(64)
    expect(a.every(l => l.surface === 'land' && l.blend === 'source-atop' && l.placed && l.placed.alpha > 0)).toBe(true)
    const byId = new Map(b.map(layer => [layer.id, layer]))
    const matched = a.filter(layer => byId.has(layer.id))
    expect(matched.length).toBeGreaterThan(0)
    expect(matched.some(layer => {
      const next = byId.get(layer.id)!
      return next.placed!.x !== layer.placed!.x
    })).toBe(true)
    expect(layers(build({ ...input, ...CLEAR }))).toEqual([])
    expect(layers(build({ ...input, forced: { cloudCover: 100, thickCloud: 100 }, forcedLayers: { low: 1, mid: 1, high: 0 } }))).toEqual([])
  }, 240_000)
})
