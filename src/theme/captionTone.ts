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

/** Land under which light letters no longer carry (their contrast with it): in fog the ground is as pale as the air. */
const PALE = 2.4

/** Dark letters on a pale ground of their own. */
const darkOn = (ink: string, behind: string): CaptionTone => ({ ink, halo: haloFor(ink, mix(behind, '#FFFFFF', .2), '#FFFFFF') })

/**
 * The lettering's ink and its halo, for what lies behind it. Over land: the light ink in the land's dark, or dark letters
 * where the air has made the land pale. Over the sky: whichever of the two stands out more, in the sky's own tone (dark
 * letters in the pale of its horizon, which a bluer ground would smudge).
 */
export function captionTone(palette: SkyLight, on: 'sky' | 'land', land = palette.ridgeNear): CaptionTone {
  const { ink, ridgeNear } = palette
  if (on === 'land') return ratio(ink, land) < PALE && ratio(ridgeNear, land) > PALE ? darkOn(ridgeNear, land) : { ink, halo: ridgeNear }
  const sky = mix(palette.mid, palette.horizon, .8)
  return ratio(ridgeNear, sky) >= ratio(ink, sky)
    ? darkOn(ridgeNear, palette.horizon)
    : { ink, halo: haloFor(ink, sky, '#000000') }
}
