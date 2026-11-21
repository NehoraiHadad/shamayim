import type { FlightPoint, HighPlane, TrailPuff } from '../../world/life'
import { skyDirection } from '../../world/lifeSchedule'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { contrailFrame } from './contrailFrame'
import { layerKey, skyBoxKey } from './keys'
import { cruiseFar, openTrack, poseTrack, RAD } from './lifeTracks'
import { skyAt, type SkyGeom } from './sky'
import { tangentScale } from './tangent'
import { mixRgb } from './tone'
import { TRAIL_DRIFT_STEP_S, type TrailProjection } from './contrailMotion'
import type { LayerOf, LifeClock, Pt, RGB, SceneBox } from './types'

export function contrailLayer(world: WorldState, box: SceneBox, geom: SkyGeom, plane: HighPlane, life: LifeClock,
  lightAt: RGB, shown: number): LayerOf<'contrail'> | null {
  if (!plane.persists) return null
  const frame = contrailFrame(world, geom, plane)
  const optics = (p: FlightPoint) => {
    const d = skyDirection(p.e, p.n, p.up)
    return {
      // Small-angle width in sky px per metre, increased by 40% for legibility (see the 0.6–10 px clamp at lay time).
      widthPerM: tangentScale(world, geom, d.altitude) * 1.4 / (d.km * 1000 * RAD),
      // Light and haze follow the shown minute. Their opacity step for matching fixture puffs was at most 0.00063.
      visibility: shown * (1 - 0.6 * world.air.fade(d.km * 0.35)) * smoothstep(0.5, 4, d.altitude) * cruiseFar(Math.hypot(p.e, p.n)),
    }
  }
  const puffAt = (puff: TrailPuff, t: number): TrailProjection | null => {
    // The frame's origin stays at the crossing centre. Advect each puff in km before projection so differential
    // perspective is preserved, including at the far end where the centre's translation alone misses.
    const p = { e: puff.e + plane.driftE * t, n: puff.n + plane.driftN * t, up: puff.up }
    const point = frame.point(p)
    return point && { point, ...optics(p) }
  }
  const puffs = [...plane.trail, ...(plane.futureTrail ?? [])].flatMap((puff) => {
    if (puff.liveTip) return []
    const samples = [puffAt(puff, 0), puffAt(puff, TRAIL_DRIFT_STEP_S), puffAt(puff, 2 * TRAIL_DRIFT_STEP_S)]
    if (!samples.every((sample) => sample !== null)) return []
    return [{ samples, seed: puff.seed, ageS: puff.ageS - (puff.inS ?? 0) }]
  })
  if (!puffs.length) return null

  const heads = (plane.samples ?? [plane.plane]).map((p) => p ?? plane.crossing.end)
  const fits = heads.map(frame.at)
  const poses = fits.map((fit) => ({ x: fit.origin[0], y: fit.origin[1], scale: fit.scale, turn: fit.turn, alpha: 1 }))
  const flight = poseTrack(poses, life)
  const head = plane.plane ? openTrack(fits.map(({ x, y }): Pt => [x, y]), life) : null
  if (head) {
    const looks = heads.map(optics)
    head.scale = looks.map((look) => look.widthPerM)
    head.alpha = looks.map((look) => look.visibility)
  }

  const { e, n, up } = plane.crossing.centre
  const behind = skyAt(world, box)(skyDirection(e, n, up).altitude)
  const id = `contrail.${plane.id}`
  return { kind: 'contrail', id, surface: 'sky', z: 6.1, bounds: { x: 0, y: 0, w: geom.width, h: geom.horizon },
    rgb: mixRgb(lightAt, behind, 0.15), shade: mixRgb(behind, [0.55, 0.58, 0.66], 0.3),
    key: layerKey(id, skyBoxKey(box, true)), placed: poses[0], animated: { mode: 'settle', flight },
    trail: { puffs, head, lifeS: plane.lifeS, spreadM: plane.spreadM, endInS: plane.trailEndInS ?? Infinity } }
}
