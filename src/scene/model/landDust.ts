//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { coverOfWorldCover } from '../../data/land/grid'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { ease } from './anim'
import { faceAtY, localFootY } from './faceProjection'
import { landBoxKey, layerKey } from './keys'
import { hazeOf } from './landVeil'
import { mixRgb } from './tone'
import type { LayerOf, Pt, SceneBox } from './types'
import { mPerPxAt } from './vegRules'
import { sampleVegAtKm, type VegSample } from './vegSample'

const BARE = coverOfWorldCover(60)
// Beaufort 4 (5.5 m/s+) can raise loose dust. Reserve a visible sustained wash
// for B5 (8 m/s+) and reach full strength at the upper edge of B7 (17.1 m/s).
// https://www.weather.gov/tbw/beaufort
const LIFT_MS = 8
const FULL_MS = 17.1
// At a source index of 0.1 the strongest near pigment contributes ~1% opacity.
// Cull weaker ribbons, where outlining and translating the tile would be subvisible.
const MIN_VISIBLE_DUST = 0.10

export function dustPotential(ms: number, sample: Pick<VegSample, 'cover' | 'ndvi' | 'dryness'>): number {
  if (ms <= LIFT_MS || sample.cover !== BARE) return 0
  // Use Stage 4's dry-land break (0.72) on the living-land dryness index,
  // and taper over the USGS gap between barren NDVI (<=0.1) and sparse (~0.2).
  // https://www.usgs.gov/special-topics/remote-sensing-phenology/science/ndvi-foundation-remote-sensing-phenology
  return ease((ms - LIFT_MS) / (FULL_MS - LIFT_MS)) *
    ease((sample.dryness - 0.72) / 0.28) * ease((0.16 - sample.ndvi) / 0.06)
}

interface Source { x: number; y: number; km: number; strength: number; shown: boolean }

/** Sample the lower visible face, with sixteen patches across the width to bound the pattern clips. */
function dustSources(world: WorldState, box: SceneBox, name: 'near' | 'far'): Source[] {
  const plane = world.terrain[name]
  if (plane.points.length < 2) return []
  const count = 16
  return Array.from({ length: count }, (_, i): Source => {
    const frac = (i + 0.5) / count, x = frac * SCENE_W
    const crest = groundAt(plane.points, x)
    const foot = localFootY(world, name, x, crest, box.landHeight)
    const y = crest + 0.78 * (foot - crest)
    const km = faceAtY(world, name, plane, x, crest, foot, y).km
    const onFace = name === 'near' || (world.terrain.sightAt?.(x).farShows ?? true)
    const sample = sampleVegAtKm(world.land, frac * (world.land.rays.length - 1), km)
    return { x: frac * box.width, y, km, shown: onFace, strength: onFace ? dustPotential(world.wind.ms, sample) : 0 }
  })
}

/** Join adjacent emissive patches into tapering ribbons so the dust holds together as it travels. */
function dustRibbons(sources: Source[], carried: number, width: number, height: number) {
  const radius = width / (2 * sources.length)
  const areas: Pt[][] = []
  const coverage: number[] = []
  let run: Source[] = []
  let distanceSum = 0, weight = 0
  const finish = () => {
    if (!run.length) return
    const first = run[0], last = run.at(-1)!
    areas.push([[first.x - radius, first.y - height * 0.35],
      ...run.map(({ x, y, strength }): Pt => [x, y - height * (0.65 + 0.35 * strength)]),
      [last.x + radius, last.y - height * 0.35],
      ...run.map(({ x, y }): Pt => [x, y + 2]).reverse()])
    coverage.push(run.reduce((sum, patch) => sum + patch.strength, 0) / run.length)
    run = []
  }
  for (const patch of sources) {
    const strength = patch.shown ? Math.max(patch.strength, carried) : 0
    if (strength < MIN_VISIBLE_DUST) { finish(); continue }
    run.push({ ...patch, strength })
    distanceSum += patch.km * strength
    weight += strength
  }
  finish()
  return { areas, coverage, km: weight ? distanceSum / weight : 0 }
}

function dustBand(world: WorldState, box: SceneBox, sources: Source[], far: boolean, carried: number): LayerOf<'landDust'> | null {
  const id = far ? 'landDust.far' : 'landDust.near'
  const sx = box.width / SCENE_W
  // Illustration dimensions: a tile of broad, broken scuds over low ribbons
  // at the foot of the slopes. Far layers use a shallower, lower-contrast wash.
  const w = Math.max(1, Math.round(178 * sx * box.dpr)) / box.dpr
  const h = Math.round(32 * box.dpr) / box.dpr
  const { areas, coverage, km } = dustRibbons(sources, carried, box.width, far ? 8 : 16)
  if (!areas.length) return null
  const alphas = coverage.map((a) => a * (far ? 0.26 : 0.75) * (1 - 0.8 * world.night.dark))
  // Match the ground's angular scale, using Stage 3's 350 m near distance floor.
  const vx = world.wind.ms * world.wind.across * sx / mPerPxAt(Math.max(350, km * 1000), world.camera)
  const seed = hashId(`${world.place.lat}:${world.place.lon}:${id}`)
  const r = seeded(seed)
  const puffs = Array.from({ length: 12 }, () => ({
    x: r() * w, y: r() * h, rx: (22 + 32 * r()) * sx, ry: 1.2 + 3.8 * r(), alpha: 0.08 + 0.10 * r(),
  }))
  const rgb = mixRgb(hazeOf(world), [0.81, 0.66, 0.47], far ? 0.24 : 0.52)
  return {
    kind: 'landDust', id, surface: 'land', z: far ? 19 : 43, bounds: { x: 0, y: 0, w, h }, puffs, rgb,
    key: layerKey(id, seed, landBoxKey(box), w, h, rgb),
    animated: { mode: 'fall', fall: { vx, vy: 0, areas, alphas } },
  }
}

/** Local dust is airborne soil. Existing observed airborne dust can still arrive from elsewhere. */
export function landDustLayers(world: WorldState, box: SceneBox): LayerOf<'landDust'>[] {
  // The existing scene wetness index includes rain from the preceding three hours.
  if (world.wind.ms <= LIFT_MS || world.rain || world.snowfall || world.ground.wet > 0.5) return []
  const near = dustSources(world, box, 'near')
  const carried = near.reduce((sum, patch) => sum + patch.strength, 0) / Math.max(1, near.length)
  return [dustBand(world, box, dustSources(world, box, 'far'), true, carried), dustBand(world, box, near, false, 0)]
    .filter((band) => band !== null)
}
