import { mix, ratio } from './contrast'

/** How far a quiet text stands out from what lies under it: legible when looked for (WCAG's 3:1, with room for a painted surface). */
export const QUIET = 3.2

/** A step darker or lighter than what lies under the letters, whichever way has more room, and no further than legible. */
export function quietInk(under: string): string {
  const to = ratio('#000000', under) > ratio('#FFFFFF', under) ? '#000000' : '#FFFFFF'
  let ink = under
  for (let share = .02; ratio(ink, under) < QUIET && share < 1; share += .02) ink = mix(under, to, share)
  return ink
}
