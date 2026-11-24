import type { DrawnHouse } from './drawn'

/** Whether a spot (km from the place) is on water as it is drawn. */
export type WaterAt = (dx: number, dy: number) => boolean

/**
 * Whether a house as drawn stands on no water: its middle and both ends of its front, at the width it is drawn at
 * (`enlarge` times its own), as far as the eye sees them: across, east and west.
 */
export function standsDry({ dx, dy, frontM }: Pick<DrawnHouse, 'dx' | 'dy' | 'frontM'>, enlarge: number, waterAt: WaterAt): boolean {
  const half = frontM * enlarge / 2000
  return ![0, -half, half].some(side => waterAt(dx + side, dy))
}