import { albedoLinear, linearRgbToSrgb, shadeLinearRgb } from '../../../model/landRadiance'
import { labOf, rgbOfLab } from '../../../model/tone'
import type { LayerOf, RGB } from '../../../model/types'
import { skied } from '../kit/palette'
import { dusted, LIVED_ON } from '../land/settlement'
import type { OwnOutside } from '../outsideOwn'
import { townSeats, type PlaneSeats } from '../townSeats'

/*
 * The drawn place and the near plane it stands on, met (`StyleLight.meet`): the print cuts the town and its ground from
 * one wood, so each reads what it needs of the other. The town takes the ink its ground is printed in at its feet (the
 * plane's base block, under the lived-on block's step), so in a dull light its walls are anchored to the ground's value
 * and hue, not to a palette of their own; the plane takes where every body of the town stands and the cast's direction,
 * so it cuts each body's seat and cast in its own shade step. Pure: the two descs.
 */

export function drawnMeet(outside: LayerOf<'outside'>, near: LayerOf<'plane'>): { outside: LayerOf<'outside'>; near: LayerOf<'plane'> } {
  const own = outside.own as OwnOutside | undefined
  if (!own?.form || !near.town) return { outside, near }
  const ground = groundInkOf(near)
  const seats = townSeats(outside)
  const groundKey = ground.map((v) => Math.round(v * 1000)).join(',')
  const seatKey = `${seats.key}:${seats.cast.map((v) => Math.round(v * 64)).join(',')}`
  return {
    outside: { ...outside, own: { ...own, ground }, light: outside.light && { ...outside.light, key: `${outside.light.key}|g${groundKey}` } },
    near: { ...near, own: { seats: seats.bodies, cast: seats.cast, rows: seats.rows } satisfies PlaneSeats, key: `${near.key}|s${seats.key}`,
      light: { ...near.light, key: `${near.light.key}|s${seatKey}` } },
  }
}

/**
 * The ink the near plane prints the town's ground in: its base block (`land/shadeBlock` `inksOf`: the plane's mean
 * material under its mean light and air, in the hand's pigment), then the lived-on block's step over it.
 */
export function groundInkOf(near: LayerOf<'plane'>): RGB {
  const f = near.light.litField, n = f.cols * f.rows
  let sVis = 0, mVis = 0, vSky = 0, haze = 0
  for (let k = 0; k < n; k++) {
    sVis += f.grid[k * 4]; mVis += f.grid[k * 4 + 1]; vSky += f.grid[k * 4 + 2]; haze += f.grid[k * 4 + 3]
  }
  const d = 255 * Math.max(1, n), air = Math.round((haze / d) * 20) / 20
  const lin = shadeLinearRgb(albedoLinear(near.fill), f.eSun, f.eMoon, f.eSky, sVis / d, mVis / d, vSky / d, f.yHorizon, air, f.hazeLin)
  const base = skied(rgbOfLab(labOf(linearRgbToSrgb(lin))), 0, air)
  return dusted(base, LIVED_ON.by, LIVED_ON.dust)
}
