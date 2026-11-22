import type { WorldState } from '../../world/types'
import { sheetZ } from './cloudSheet'
import { edgeMark } from './edgeMark'
import { fallingOf } from './falling'
import { layerKey, skyBoxKey } from './keys'
import { skyAt, skyGeom, type SkyGeom } from './sky'
import { column, inView, NEAR_ALT, precipOf, shaftOf, tileMarks, type PrecipState } from './shafts'
import { mixRgb } from './tone'
import type { LayerDesc, SceneBox } from './types'
import { q, tone, whole, WHITE } from './weatherShared'

/**
 * Rain or snow from the world's falling banks (sky): the far banks' curtains and the streaks falling in them, the near
 * rain under the banks overhead (sky and land), or the edge mark when no falling bank is in view.
 */
export function precipLayers(world: WorldState, box: SceneBox, geom: SkyGeom = skyGeom(world, box)):
  LayerDesc[] {
  return (['rain', 'snow'] as const).flatMap((phase) => {
    const p = precipOf(world, phase)
    return p ? precipLayersFor(world, box, geom, p) : []
  })
}

function precipLayersFor(world: WorldState, box: SceneBox, geom: SkyGeom, p: PrecipState):
  LayerDesc[] {
  const id = (base: string) => p.precip === 'snow' ? base + '.snow' : base
  const found = fallingOf(world, box, geom, p.precip)
  if (!found) return []
  const { cells: banks, z, speed } = found
  const out: LayerDesc[] = []
  const sky = skyAt(world, box)
  const horizonSky = sky(2)
  const dark = world.night.dark
  const drift = Math.abs(speed) > 0.01 ? { speed, period: geom.period } : {}
  const tilt = Math.tan(p.slant)
  const slantKey = q(p.slant, 0.01)

  const seen = banks.filter((f) => inView(geom, box, f))
  if (!seen.length) {
    const edge = edgeMark(world, box, geom, banks, p, horizonSky)
    return edge ? [{ ...edge, id: id(edge.id) }] : []
  }

  // Far curtains, under the banks low on the dome, on the band (they drift with their layer).
  const far = banks.filter((f) => f.altitude < NEAR_ALT)
  if (far.length) {
    const shafts = far.map((f) => shaftOf(world, geom, f, p, horizonSky))
    const top = Math.max(0, Math.floor(Math.min(...shafts.map((s) => s.top)) - 2))
    const bottom = Math.min(box.skyHeight, Math.ceil(geom.horizon + 4))
    // A curtain falls from under its base, in front of the farther part of that base and of the towers behind it.
    const curtainZ = Math.max(z - 0.5, sheetZ.tower + 0.01)
    out.push({ kind: 'shafts', id: id('shafts'), surface: 'sky', z: curtainZ, soft: true, precip: p.precip, shafts, period: geom.period,
      bounds: { x: 0, y: top, w: geom.period, h: Math.max(1, bottom - top) },
      animated: 'speed' in drift ? { mode: 'drift', ...drift } : undefined,
      key: layerKey('shafts', p.precip, skyBoxKey(box, true), geom.period, slantKey,
        shafts.map((s) => [s.id, q(s.x, 0.5), q(s.top, 0.5), q(s.w, 0.5), q(s.lean, 0.5), tone(s.rgb), q(s.alpha, 0.02)])) })
    // The streaks falling inside them: a small tile moved as a pattern over each curtain's core.
    const tw = whole(40, box.dpr), th = whole(56, box.dpr)
    const rgb = p.precip === 'rain' ? mixRgb(horizonSky, WHITE, 0.25 * (1 - dark)) : mixRgb(horizonSky, WHITE, 0.6 * (1 - 0.6 * dark))
    const fallV = p.precip === 'rain' ? 80 + 60 * p.strength : 10 + 6 * p.strength
    out.push({ kind: 'fall', id: id('fall.far'), surface: 'sky', z: curtainZ + 0.01, precip: p.precip, slant: tilt, rgb,
      marks: tileMarks(`${world.place.id}:fall.far:${p.precip}`, p, tw, th, false), bounds: { x: 0, y: 0, w: tw, h: th },
      animated: { mode: 'fall', ...drift, fall: { vx: fallV * tilt, vy: fallV,
        areas: shafts.flatMap((s) => [column(s.x, s.top + 4, s.bottom, s.w * 0.8, s.lean), column(s.x, s.top + 10, s.bottom, s.w * 0.45, s.lean)]),
        alphas: shafts.flatMap((s) => [Math.min(1, 1.2 * s.alpha), Math.min(1, 1.2 * s.alpha)]),
        ...(p.precip === 'snow' ? { sway: 1.5, swayPeriod: 4 } : {}) } },
      key: layerKey('fall.far', p.precip, skyBoxKey(box), tw, th, slantKey, q(p.strength, 0.05), tone(rgb)) })
  }

  // Near rain: under the banks overhead, in front of everything, from the bank's base down past the land.
  const near = seen.filter((f) => f.altitude >= NEAR_ALT)
  if (near.length) {
    const tw = whole(64, box.dpr), th = whole(96, box.dpr)
    const rgb = p.precip === 'rain' ? mixRgb(sky(20), WHITE, 0.45 * (1 - dark)) : mixRgb(sky(20), WHITE, 0.85 * (1 - 0.7 * dark))
    const fallV = p.precip === 'rain' ? 420 + 260 * p.strength : 30 + 16 * p.strength
    const marks = tileMarks(`${world.place.id}:fall.near:${p.precip}`, p, tw, th, true)
    const alphaOf = (s: number) => (p.precip === 'rain' ? 0.16 + 0.34 * p.strength : 0.4 + 0.45 * p.strength) * s * p.opacity
    const bottom = box.skyHeight + box.landHeight
    // Nested columns, each with its own marks (the compositor offsets the pattern per area): the rain thickens toward the
    // bank's middle and thins out to its edges and its top, with no line where it stops.
    const columns = near.flatMap((f) => {
      const top = f.y - f.h * 0.2
      const lean = tilt * (bottom - top) * 0.35
      return [[1.3, 0, 0.5], [1, 10, 0.55], [0.7, 22, 0.6], [0.42, 36, 0.6]].map(([k, dy, a]) =>
        ({ x: f.x, top: top + dy, w: f.w * k, lean, a: a * f.share }))
    })
    const fall = (surface: 'sky' | 'land') => {
      const dy = surface === 'land' ? box.landTop : 0
      const dx = surface === 'land' ? geom.left : 0
      return { vx: fallV * tilt, vy: fallV, areas: columns.map((c) => column(c.x - dx, c.top - dy, bottom - dy, c.w, c.lean)),
        alphas: columns.map((c) => alphaOf(c.a)), ...(p.precip === 'snow' ? { sway: 3, swayPeriod: 3.2 } : {}) }
    }
    const common = { kind: 'fall' as const, precip: p.precip, slant: tilt, rgb, marks, bounds: { x: 0, y: 0, w: tw, h: th } }
    const key = (id: string) => layerKey(id, p.precip, tw, th, slantKey, q(p.strength, 0.05), tone(rgb), box.dpr)
    out.push({ ...common, id: id('fall.near'), surface: 'sky', z: 11, animated: { mode: 'fall', ...drift, fall: fall('sky') }, key: key('fall.near') })
    out.push({ ...common, id: id('fall.land'), surface: 'land', z: 60, animated: { mode: 'fall', ...drift, fall: fall('land') }, key: key('fall.land') })
  }
  return out
}
