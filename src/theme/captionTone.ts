import { mix, ratio } from './contrast'
import type { SkyLight } from './skyLight'

export interface CaptionTone { ink: string; halo: string }

/** Text must stand out from its halo by this much (WCAG AA for small text, with a little to spare). */
const NEEDED = 4.6

/** A halo toward `to` until the ink reads on it. */
function haloFor(ink: string, from: string, to: string) {
  let halo = from
  for (let share = .05; ratio(ink, halo) < NEEDED && share <= 1; share += .05) halo = mix(from, to, share)
  return halo
}

/**
 * The lettering's ink and its halo, for what lies behind it: the light ink in the land's dark over land; over the sky
 * whichever of the two stands out more from it, in the sky's own tone.
 */
export function captionTone(palette: SkyLight, on: 'sky' | 'land'): CaptionTone {
  const { ink, ridgeNear } = palette
  if (on === 'land') return { ink, halo: ridgeNear }
  const sky = mix(palette.mid, palette.horizon, .8)
  return ratio(ridgeNear, sky) >= ratio(ink, sky)
    ? { ink: ridgeNear, halo: haloFor(ridgeNear, sky, '#FFFFFF') }
    : { ink, halo: haloFor(ink, sky, '#000000') }
}
