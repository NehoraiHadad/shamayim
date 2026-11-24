import { quietInk } from '../../theme/quietInk'
import type { WorldState } from '../../world/types'
import { hazeOf, toneAt } from './landVeil'
import { hexOf, mixRgb, rgbOf } from './tone'
import type { LayerDesc, RGB, SeaDesc } from './types'

type Surface = Pick<SeaDesc, 'points' | 'top' | 'bottom' | 'stops'>

/** How much of the ground a full fog covers (its drifting bank, `mist.ts`). */
const FOG_COVER = .6

/** The ink of a note on the place's own ground, as it is seen through the air. */
export function landInk(world: WorldState): RGB {
  const { place3, air } = world
  const haze = hazeOf(world)
  const land = toneAt(world, place3.kind === 'outside' ? place3.baseKm : 0, haze)
  return rgbOf(quietInk(hexOf(mixRgb(land, haze, FOG_COVER * (air.mist?.fog ?? 0)))))
}

function toneOf(stops: readonly [number, RGB][], at: number): RGB {
  const i = stops.findIndex(([t]) => t >= at)
  if (i <= 0) return stops[i < 0 ? stops.length - 1 : 0][1]
  const [t0, a] = stops[i - 1], [t1, b] = stops[i]
  return mixRgb(a, b, (at - t0) / (t1 - t0 || 1))
}

/** The ink of a water's name: of the water drawn where its letters stand (its own surface, else the coast's sea). */
export function waterInk(layers: readonly LayerDesc[], x: number, y: number): string | null {
  const surfaces = layers.flatMap((layer): Surface[] => {
    if (layer.kind === 'water') return layer.bands
    return layer.kind === 'outside' && layer.sea ? [layer.sea] : []
  })
  const under = surfaces.find(({ points, top, bottom }) => y >= top && y <= bottom
    && points.some(([px]) => px <= x) && points.some(([px]) => px >= x))
  return under ? quietInk(hexOf(toneOf(under.stops, (y - under.top) / Math.max(1, under.bottom - under.top)))) : null
}
