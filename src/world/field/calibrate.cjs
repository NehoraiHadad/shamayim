/* Run with node --experimental-strip-types src/world/field/calibrate.cjs to regenerate the correction knots. */
const { registerHooks } = require('node:module')
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (error) {
      if (!specifier.startsWith('.') || !['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(error.code)) throw error
      return next(specifier + '.ts', context)
    }
  },
})
const { coverageSample } = require('./calibration')
const { COVER_KNOTS, occupancyOf } = require('./occupancy')
const { buildField } = require('./field')
const field = buildField({
  placeId: 'shadmot-mehola', hours: [], at: '2026-11-17T12:00',
  covers: { low: 0.64, mid: 0.54, high: 0.56 }, lowBaseKm: 1.1, elevationKm: 0.05,
  weatherCode: 80, rateMmH: 0.5, sunAltitude: 20, wind10: { speedKmh: 10, fromDeg: 270 },
})
const windows = [30, 31, 32].map(i => coverageSample(field.placeId, i))
for (const layer of field.layers) {
  const row = COVER_KNOTS.map(cover => {
    if (cover === 0 || cover >= 0.98) return cover
    let lo = 0
    let hi = 0.98
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2
      const occupancy = occupancyOf(layer.lattice, mid, false)
      const result = windows.reduce((sum, sample) => sum + sample({ ...layer, ...occupancy, cover }), 0) / windows.length
      if (result < cover) lo = mid
      else hi = mid
    }
    return Number(((lo + hi) / 2).toFixed(4))
  })
  process.stdout.write(`${layer.lattice}: [${row.join(', ')}],\n`)
}
