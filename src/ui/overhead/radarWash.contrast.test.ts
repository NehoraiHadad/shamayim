import { describe, expect, it } from 'vitest'
import { mix, ratio } from '../../theme/contrast'
import { mapInk } from './mapStyle'
import { CLOUD_INK, RADAR_WASH } from './recolor'

/**
 * The rain ladder must stay visible where it lands: over land, sea and cloud, on the light map and on the dark
 * (night and dusk) map. Thresholds from docs/design/radar-ux-fable.md §6 (P0 item 5 and P1 item 7); before this,
 * heavy rain over the dark sea was 1.05:1, i.e. invisible.
 */
const hex = (rgb: readonly number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const over = (backdrop: string, [r, g, b, alpha]: readonly number[]) => mix(backdrop, hex([r, g, b]), alpha)

const light = { land: mapInk(false).land!, sea: mapInk(false).water }
const lightCloud = over(light.land, [...CLOUD_INK.light.rgb, CLOUD_INK.light.opacity])
const nightSheets = ['#12162B', '#211A33']

describe('rain wash contrast', () => {
  it('light map: light rain stands off the sea, every step off the land', () => {
    const [weak] = RADAR_WASH.light
    expect(ratio(over(light.sea, weak), light.sea)).toBeGreaterThanOrEqual(2.2)
    for (const step of RADAR_WASH.light) expect(ratio(over(light.land, step), light.land)).toBeGreaterThanOrEqual(2.35)
  })

  it('light map: neighbouring steps are told apart over cloud', () => {
    const seen = RADAR_WASH.light.map((step) => over(lightCloud, step))
    expect(ratio(seen[0], seen[1])).toBeGreaterThanOrEqual(1.8)
    expect(ratio(seen[1], seen[2])).toBeGreaterThanOrEqual(1.8)
  })

  it.each(nightSheets)('dark map on %s: heavy rain stands off the dark sea, light rain off the cloud veil', (sheet) => {
    const sea = mapInk(true).water
    const cloud = over(sheet, [...CLOUD_INK.dark.rgb, CLOUD_INK.dark.opacity])
    const [weak, , heavy] = RADAR_WASH.dark
    expect(ratio(over(sea, heavy), sea)).toBeGreaterThanOrEqual(5)
    expect(ratio(over(cloud, weak), cloud)).toBeGreaterThanOrEqual(1.7)
    for (const step of RADAR_WASH.dark) expect(ratio(over(sheet, step), sheet)).toBeGreaterThanOrEqual(3)
  })

  it('dark map: heavier rain is brighter, so the ladder does not sink into the night', () => {
    const sea = mapInk(true).water
    const [a, b, c] = RADAR_WASH.dark.map((step) => ratio(over(sea, step), sea))
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
  })
})
