import type { FlightPoint, HighPlane, TrailPuff } from '../../world/life'
import { AHEAD_STEP_S } from '../../world/lifeAhead'
import { skyDirection } from '../../world/lifeSchedule'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState } from '../../world/types'
import { contrailFrame, rotateScale } from './contrailFrame'
import { layerKey, skyBoxKey } from './keys'
import { cruiseFar, openTrack, poseTrack, RAD } from './lifeTracks'
import { skyAt, type SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { LayerOf, LifeClock, Pt, RGB, SceneBox } from './types'

const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const delta = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]

export function contrailLayer(world: WorldState, box: SceneBox, geom: SkyGeom, plane: HighPlane, life: LifeClock,
  lightAt: RGB, shown: number): LayerOf<'contrail'> | null {
  if (!plane.persists) return null
  const frame = contrailFrame(world, geom, plane)
  const first = frame.at(plane.plane ?? plane.crossing.end)
  const runs: { puff: TrailPuff; point: Pt }[][] = [[]]
  for (const puff of [...plane.trail, ...(plane.futureTrail ?? [])]) {
    const point = frame.point(puff)
    const [x, y] = point ? plus(first.origin, rotateScale(point, first.turn, first.scale)) : [Infinity, Infinity]
    if (point && x > -60 && x < geom.width + 60 && y < geom.horizon && y > -40) runs.at(-1)!.push({ puff, point })
    else if (runs.at(-1)!.length) runs.push([])
  }
  const run = runs.reduce((a, b) => b.length > a.length ? b : a)
  if (run.length < 2) return null
  const points = run.map(({ point }) => point)
  const start = run[0].puff, end = run.at(-1)!.puff
  const mid = { e: (start.e + end.e) / 2, n: (start.n + end.n) / 2, up: start.up }
  const dirs = run.map(({ puff }) => skyDirection(puff.e, puff.n, puff.up))
  const age = (s: number) => Math.min(1, s / plane.lifeS)
  const widths = run.map(({ puff }, i) => Math.max(0.6, Math.min(10,
    ((40 + (plane.spreadM - 40) * age(puff.ageS)) / (dirs[i].km * 1000)) / RAD * frame.k * 1.4)))
  const alphas = run.map(({ puff }, i) => {
    const a = age(puff.ageS), d = dirs[i]
    return (0.62 - 0.3 * a) * (1 - smoothstep(0.55, 1, a)) * shown * (1 - 0.6 * world.air.fade(d.km * 0.35)) *
      smoothstep(0.5, 4, d.altitude) * cruiseFar(Math.hypot(puff.e, puff.n))
  })
  if (!alphas.some((a) => a > 0.01)) return null
  const sky = skyAt(world, box)
  const behind = sky(skyDirection(mid.e, mid.n, mid.up).altitude)
  const rgb = mixRgb(lightAt, behind, 0.15), shade = mixRgb(behind, [0.55, 0.58, 0.66], 0.3)
  const lumps = run.map(({ puff }) => 0.9 + 0.2 * ((puff.seed >>> 0) % 1000) / 1000)
  const bounds = trailBounds(points, widths)
  const motion = trailMotion(plane, frame, mid, points, life)
  const id = `contrail.${plane.id}`
  return { kind: 'contrail', id, surface: 'sky', z: 6.1, soft: true, points, widths, alphas, lumps, rgb, shade, seed: plane.seed,
    bounds, ...motion, key: layerKey(id, skyBoxKey(box, true), points.map((p) => p.map((v) => Math.round(v / 0.2))),
      widths.map((w) => Math.round(w / 0.2)), alphas.map((a) => Math.round(a * 24)),
      rgb.map((c) => Math.round(c * 24)), shade.map((c) => Math.round(c * 24)), lumps) }
}

function trailBounds(points: Pt[], widths: number[]) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  points.forEach(([x, y], i) => {
    const reach = 1.55 * widths[i] + 2
    x0 = Math.min(x0, x - reach); x1 = Math.max(x1, x + reach)
    y0 = Math.min(y0, y - reach); y1 = Math.max(y1, y + reach)
  })
  const x = Math.floor(x0), y = Math.floor(y0)
  return { x, y, w: Math.ceil(x1) - x, h: Math.ceil(y1) - y }
}

function trailMotion(plane: HighPlane, frame: ReturnType<typeof contrailFrame>, mid: FlightPoint, points: Pt[],
  life: LifeClock) {
  const midpoint = frame.point(mid)!
  const poses = (plane.samples ?? [plane.plane]).map((head, i) => {
    const t = i * AHEAD_STEP_S
    const fit = frame.at(head ?? plane.crossing.end)
    // Use the visible span's midpoint for one projected wind translation. Differential perspective elsewhere in the
    // ribbon leaves up to 1.061 CSS px of residual drift at the fixture's 60 s rebuild.
    const wind = frame.point({ e: mid.e + plane.driftE * t, n: mid.n + plane.driftN * t, up: mid.up })
    const shift = wind ? rotateScale(delta(wind, midpoint), fit.turn, fit.scale) : [0, 0] as Pt
    const [x, y] = plus(fit.origin, shift)
    return { x, y, scale: fit.scale, turn: fit.turn, alpha: 1, head: [fit.x - x, fit.y - y] as Pt }
  })
  const flight = poseTrack(poses, life)
  const [dx, dy] = delta(points.at(-1)!, points[0])
  const grow = plane.plane ? {
    track: { ...openTrack(poses.map((pose) => pose.head), life), turn: flight.turn },
    angle: Math.atan2(dy, dx) + poses[0].turn,
  } : undefined
  return { placed: poses[0], animated: { mode: 'settle' as const, flight, grow } }
}
