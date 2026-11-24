import { mix, ratio } from './contrast'
import type { SkyLight } from './skyLight'

export interface LabelTone { ink: string; halo: string }

/** The least the letters stand out from their halo by, where a tone of it can: WCAG AA for small text, with room for soft edges. */
const NEEDED = 6
/** Land on which light letters no longer carry (their contrast with it): in fog the ground is as pale as the air. */
const PALE = 2.4

/** A halo in the tone of what lies behind, taken toward `to` until the ink reads on it. */
function haloFor(ink: string, from: string, to: string) {
  let halo = from
  for (let share = .05; ratio(ink, halo) < NEEDED && share <= 1; share += .05) halo = mix(from, to, share)
  return halo
}

const darkOn = (ink: string, behind: string): LabelTone => ({ ink, halo: haloFor(ink, behind, '#FFFFFF') })
const lightOn = (ink: string, behind: string): LabelTone => ({ ink, halo: haloFor(ink, behind, '#000000') })

/**
 * The lettering's ink and halo, for what lies behind it. Over land: the light ink in the land's dark, or dark letters where
 * the air has made the land (`land`, its tone as seen) pale. Over the sky: whichever of the two stands out more from it.
 */
export function labelTone({ ink, ridgeNear, mid, horizon }: SkyLight, on: 'sky' | 'land', land: string): LabelTone {
  if (on === 'land') return ratio(ink, land) < PALE && ratio(ridgeNear, land) > PALE ? darkOn(ridgeNear, land) : lightOn(ink, ridgeNear)
  const sky = mix(mid, horizon, .8)
  return ratio(ridgeNear, sky) >= ratio(ink, sky) ? darkOn(ridgeNear, sky) : lightOn(ink, sky)
}
