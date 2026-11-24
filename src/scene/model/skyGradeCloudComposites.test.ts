import { it } from 'vitest'
import { ratio } from '../../theme/contrast'
import { skyStops, stopAt } from './skyColour'
import { SKY_FILTER_MID } from './skyFilter'
import { filterAt, skyGradeOf } from './skyGrade'
import { BOX, sheetOf, skyGradeCloudFixture } from './skyGradeCloudFixture'
import { hexOf, mixSrgb, rgbOf } from './tone'

const { frame, input: ramonInput } = skyGradeCloudFixture()

it('limits model cloud composites through concentration and visibility sweeps', () => {
  const input = ramonInput()
  const visibilities = [1, 2, 3, 5, 8, 12, 20, 30]
  // The reference always forces zero PM10 and dust. Only its visibility follows the sweep.
  const cleanByVisibility = new Map(visibilities.map(km => {
    const clean = frame(0, km, input)
    return [km, { clean, sheet: sheetOf(clean), stops: skyStops(clean, BOX) }] as const
  }))
  const sweep = (pm10: number, visibilityKm: number) => {
    const world = frame(pm10, visibilityKm, input)
    const grade = skyGradeOf(world, BOX)
    const { clean, sheet: clearSheet, stops: cleanStops } = cleanByVisibility.get(visibilityKm)!
    const sheet = sheetOf(world), stops = skyStops(world, BOX)
    let worst = Infinity
    for (const [row, y] of sheet.ys.entries()) {
      if (y > SKY_FILTER_MID * (BOX.landTop + world.relief.horizonY)) break
      const maxAlpha = (s: typeof sheet) => Math.max(...s.alpha.slice(row * s.xs.length, (row + 1) * s.xs.length))
      const alpha = maxAlpha(sheet) * (sheet.through?.[row] ?? 1)
      const behind = rgbOf(hexOf(stopAt(stops, y / BOX.skyHeight, mixSrgb)))
      const cleanBehind = rgbOf(hexOf(stopAt(cleanStops, y / BOX.skyHeight, mixSrgb)))
      const cleanAlpha = maxAlpha(clearSheet)
      for (const tone of ['body', 'shade', 'lit'] as const) {
        const composite = rgbOf(hexOf(mixSrgb(behind, sheet[tone], alpha)))
        const cleanComposite = hexOf(mixSrgb(cleanBehind, clearSheet[tone], cleanAlpha))
        const contrast = ratio(world.light.palette.ink, hexOf(filterAt(grade, y, composite)))
        const target = Math.min(4.6, ratio(clean.light.palette.ink, cleanComposite))
        if (!(contrast >= target)) {
          throw new Error(`Contrast ${contrast} below ${target} at PM10 ${pm10}, ${visibilityKm} km, row ${row}, ${tone}`)
        }
        worst = Math.min(worst, contrast - target)
      }
    }
    return worst
  }
  // Keep the clean onset as an endpoint, outside the search for the worst dusty scene.
  sweep(100, 3)
  let worstPm = 150, worst = Infinity
  for (let pm10 = 150; pm10 <= 1000; pm10 += 50) {
    const margin = sweep(pm10, 3)
    if (margin < worst) {
      worstPm = pm10
      worst = margin
    }
  }
  for (const km of visibilities) if (km !== 3) sweep(400, km)
  // One-tenth of the coarse step, skipping concentrations already checked.
  for (let pm10 = Math.max(100, worstPm - 50); pm10 <= Math.min(1000, worstPm + 50); pm10 += 5) {
    if (pm10 % 50) sweep(pm10, 3)
  }
})
