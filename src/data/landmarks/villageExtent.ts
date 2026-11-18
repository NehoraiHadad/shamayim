import type { Cluster, Extent } from '../city/clusterTypes'
import { seeded } from './hash'
import type { SettlementInput, SettlementStyle } from './settlement'
import { PITCH, ROW_STEP, type RowPlan } from './settlementPlan'
import { shedCount, villageDims } from './villageForms'

const PX_PER_KM = 15.625
/** Half a shed's 11-14 px length. */
const SHED_HALF = 6.5
const CREST_SHED_CLEAR = 24

export function villageWidth(km: number, width = 375) {
  return Math.max(PX_PER_KM * km, Math.min(83, Math.max(30, 36 * Math.sqrt(km)))) * width / 375
}

/** The crest row's centre gap beside the dot: the template's 6 px plus half a 9 px house. */
const CREST_GAP = 10.5
/**
 * Mapped houses really do run down the slope (Karmei Tzur's west face), so they may stand twice the template's
 * reach from the dot; the floor, top and keep-out guards still hold.
 */
const FOOTPRINT_REACH = 2

/**
 * The home's north-south bands stack as the three drawn rows by rank (north = crest, south = lowest terrace), drawn
 * like the template: the crest row beside the dot, the others stepping down the face in front of it. The scene's
 * 0.75 km depth split would put a 2 km village into one or two rows and leave the others empty, while the
 * template it replaces always stood in three.
 */
function rowOf(dy: number, bands: Cluster['bands']) {
  const order = [...bands].sort((a, b) => b.dy - a.dy).findIndex(band => band.dy === dy)
  return bands.length < 2 ? 0 : Math.round(order * 2 / (bands.length - 1))
}

function mergeRuns(runs: Extent[]) {
  const merged: Extent[] = []
  for (const [left, right] of runs.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1)
    if (last && left <= last[1]) last[1] = Math.max(last[1], right)
    else merged.push([left, right])
  }
  return merged
}

/**
 * `minWidth` (px at 375): the home is never drawn narrower than the template it replaces for its size. Below that a
 * 1-2 km village held 3-7 houses once the dot, its label and the place's own hall took their room, and stopped reading
 * as a village. The data still sets the shape: which side of the dot it lies, its rows and its style.
 */
export function villageRows(home: Cluster, style: SettlementStyle, { width, centerX }: Pick<SettlementInput, 'width' | 'centerX'>,
  minWidth = 0): RowPlan[] {
  const km = home.dx[1] - home.dx[0]
  if (km <= 0) return []
  const scale = width / 375
  const lens = Math.max(villageWidth(km, width), minWidth * scale) / (km * PX_PER_KM * scale)
  // The map origin is the scene midpoint. A shifted terrain dot remains the lens pivot.
  const step = PX_PER_KM * scale
  const project = (dx: number) => centerX + lens * (187.5 * scale + dx * step - centerX)
  /**
   * Seen edge-on, a village 1-2 km deep shows its roofs overlapping, not one house per gap: mapped rows pack at 70% of
   * the template's pitch (tile 6.3 px for 7-9 px houses).
   */
  const pitch = PITCH[style] * .7
  const random = seeded(home.id)
  const dims = villageDims(home, style)
  // The longest big-roof runs, at their real side of the village, become the sheds.
  const sheds = home.bands.flatMap(band => band.big.map(([a, b]) => ({ row: rowOf(band.dy, home.bands),
    left: Math.max(a, home.dx[0]), right: Math.min(b, home.dx[1]) })))
    .filter(run => run.right > run.left).sort((p, q) => (q.right - q.left) - (p.right - p.left)).slice(0, shedCount(home))
  return [0, 1, 2].flatMap(row => {
    // Farm yards lie behind the houses on the village's outer edge: each shed stands at its run's far end from the
    // centre (Nahalal's ring, a kibbutz yard at the fence), a shed's half-length inside it.
    const shedCenters = sheds.filter(run => run.row === row).map(run => {
      const left = project(run.left), right = project(run.right)
      const inset = Math.min(SHED_HALF, (right - left) / 2)
      const outerEast = Math.abs(run.right - home.centre.dx) > Math.abs(run.left - home.centre.dx)
      return outerEast ? right - inset : left + inset
      // Beside the dot the crest row's houses carry the village; a low shed there would read as an empty lot.
    }).filter(x => row > 0 || Math.abs(x - centerX) >= CREST_SHED_CLEAR)
    const shedPlan: RowPlan[] = shedCenters.length ? [{ row, sink: row * ROW_STEP[style], reach: FOOTPRINT_REACH,
      kind: 'shed', centers: () => shedCenters }] : []
    // V2 bands represent depth by their midpoint. Union overlapping runs at the same draw depth.
    const runs = mergeRuns(home.bands.filter(band => rowOf(band.dy, home.bands) === row).flatMap(band => band.runs))
    const centers = runs.flatMap(([a, b]) => {
      // Use the trimmed width for both extent and lens so isolated tails don't stretch the home.
      const left = project(Math.max(a, home.dx[0])), right = project(Math.min(b, home.dx[1]))
      if (right <= left) return []
      // Only the crest row stands level with the dot; the terraces below pass under it, as in the template.
      const intervals = row > 0 ? [[left, right]] : [
        [left, Math.min(right, centerX - CREST_GAP)],
        [Math.max(left, centerX + CREST_GAP), right],
      ]
      return intervals.flatMap(([start, end]) => {
        if (end <= start) return []
        // Evenly packed at about the style's pitch, so a run's ends are built, not lost to rounding.
        const count = Math.max(1, Math.round((end - start) / pitch))
        const step = (end - start) / count
        return Array.from({ length: count }, (_, i) => start + (i + .5) * step + (random() - .5) * Math.min(2, step / 4))
      })
    })
    return [...shedPlan, ...(centers.length ? [{ row, sink: row * ROW_STEP[style], reach: FOOTPRINT_REACH, dims,
      centers: () => centers }] : [])]
  })
}
