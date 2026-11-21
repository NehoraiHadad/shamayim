import { coverageEvaluator } from '../src/world/field/calibration.test-helper'
import { buildField } from '../src/world/field/field'
import { COVER_KNOTS } from '../src/world/field/occupancy'

const field = buildField({
  placeId: 'calibration-reference', hours: [], at: '2026-11-17T12:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
})

for (const layer of field.layers) {
  const fit = coverageEvaluator(layer, false)
  const validate = coverageEvaluator(layer, true)
  const row = COVER_KNOTS.map(cover => {
    if (cover === 0 || cover >= 0.98) return cover
    let lo = 0
    let hi = 0.979999
    for (let i = 0; i < 15; i++) {
      const mid = (lo + hi) / 2
      if (fit(mid, false) < cover) lo = mid
      else hi = mid
    }
    return Number(((lo + hi) / 2).toFixed(4))
  })
  const errors = COVER_KNOTS.map(cover => Number((validate(cover) - cover).toFixed(4)))
  console.log(layer.lattice, JSON.stringify(row), 'held-out errors (current table)', JSON.stringify(errors))
}
