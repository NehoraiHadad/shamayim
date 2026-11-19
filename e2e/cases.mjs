// The pixel test moments (docs/design/CANVAS-SCENE-PLAN.md §3, tier 2): the 8 baseline places at 4 hours, the weather
// moments at Haifa, Jerusalem and Tiberias, and 6 references at dpr 2 for crispness.
export const PLACES = ['shadmot-mehola', 'tel-aviv', 'jerusalem', 'haifa', 'rosh-pina', 'ramon-crater', 'tiberias', 'ein-gedi']
export const HOURS = ['06:20', '12:00', '16:30', '21:00']
const DAY = '2026-11-17'
const WEATHER = [['rain', '12:00'], ['overcast', '12:00'], ['clear', '21:00'], ['dust', '12:00'], ['snow', '12:00']]

export const CASES = [
  ...PLACES.flatMap((place) => HOURS.map((hour) => ({ place, at: `${DAY}T${hour}` }))),
  ...['haifa', 'jerusalem', 'tiberias'].flatMap((place) => WEATHER.map(([weather, hour]) => ({ place, at: `${DAY}T${hour}`, weather }))),
  ...[['haifa', '16:30'], ['jerusalem', '06:20'], ['tiberias', '12:00'], ['tel-aviv', '12:00'], ['ein-gedi', '16:30'],
    ['shadmot-mehola', '06:20']].map(([place, hour]) => ({ place, at: `${DAY}T${hour}`, dpr: 2 })),
]
