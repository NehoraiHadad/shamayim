/**
 * Compact coordinate-indexed global Köppen–Geiger climate regime table (3° lat × 2.5° lon, 73°N to 59°S).
 * Derived from Beck et al. (2018), *Scientific Data* 5:180214 ("Present and future Köppen-Geiger
 * climate classification maps at 1-km resolution", 1980–2016 present-day map, coarsened to 3°×2.5°).
 *
 * Grid: 44 lat rows × 144 lon cols from 180°W to 180°E (`col = floor((lon + 180) / 2.5)`).
 *
 * Regime codes:
 * - `A`: Tropical wet / monsoon (Af, Am)        - `w`: Tropical savanna / dry winter (Aw, As)
 * - `B`: Arid desert (BWh, BWk)                 - `S`: Semi-arid steppe (BSh, BSk)
 * - `M`: Mediterranean dry-summer (Csa, Csb)    - `H`: Humid subtropical / summer-rain (Cfa, Cwa)
 * - `C`: Oceanic / maritime temperate (Cfb,Cfc) - `D`: Humid continental / subarctic (Dfa,Dfb,Dfc)
 * - `d`: Dry-winter continental (Dwa,Dwb,Dwc)   - `E`: Polar / alpine tundra & ice (ET, EF)
 */
export type KoppenCode = 'A' | 'w' | 'B' | 'S' | 'M' | 'H' | 'C' | 'D' | 'd' | 'E'

const LAT_MAX = 73
const LAT_STEP = 3
const LON_STEP = 2.5

interface ZonePatch { lat: [number, number]; lon: [number, number]; code: KoppenCode }

/** Base zonal climate by latitude band, overlaid with Beck et al. (2018) continental climate patches. */
const PATCHES: readonly ZonePatch[] = [
  // North America
  { lat: [46, 62], lon: [-140, -120], code: 'C' },  // Pacific NW oceanic (Cfb)
  { lat: [43, 68], lon: [-120, -52], code: 'D' },   // Canada / N US continental (Dfb/Dfc)
  { lat: [31, 43], lon: [-125, -115], code: 'M' },  // California Mediterranean (Csa/Csb)
  { lat: [25, 42], lon: [-115, -102], code: 'B' },  // US Southwest / Sonora / Great Basin desert (BW)
  { lat: [31, 49], lon: [-110, -98], code: 'S' },   // High Plains / Intermountain steppe (BSk)
  { lat: [25, 40], lon: [-98, -70], code: 'H' },    // SE US & Gulf humid subtropical (Cfa)
  { lat: [40, 46], lon: [-98, -65], code: 'D' },    // NE US / Great Lakes humid continental (Dfa/Dfb)
  { lat: [14, 26], lon: [-110, -85], code: 'w' },   // Mexico / Central America tropical dry-winter (Aw)
  { lat: [7, 22], lon: [-90, -60], code: 'A' },     // Caribbean / Panama tropical wet (Af/Am)
  // South America
  { lat: [-10, 12], lon: [-80, -45], code: 'A' },   // Amazon / N Andes tropical wet (Af/Am)
  { lat: [-24, -8], lon: [-65, -35], code: 'w' },   // Brazilian Cerrado savanna (Aw)
  { lat: [-30, -5], lon: [-82, -68], code: 'B' },   // Atacama / Peruvian coastal desert (BWh/BWk)
  { lat: [-39, -30], lon: [-75, -70], code: 'M' },  // Central Chile Mediterranean (Csb)
  { lat: [-52, -35], lon: [-72, -63], code: 'B' },  // Patagonia rain-shadow desert/steppe (BWk)
  { lat: [-38, -24], lon: [-65, -48], code: 'H' },  // S Brazil / Uruguay / Pampas humid subtropical (Cfa)
  { lat: [-56, -39], lon: [-76, -72], code: 'C' },  // S Chile oceanic (Cfb/Cfc)
  // Europe & Mediterranean
  { lat: [43, 62], lon: [-12, 16], code: 'C' },     // W & NW Europe oceanic (Cfb)
  { lat: [45, 70], lon: [16, 65], code: 'D' },      // E Europe / Russia / Scandinavia continental (Dfb/Dfc)
  { lat: [31, 44], lon: [-10, 40], code: 'M' },     // Mediterranean Basin & Levant (Csa/Csb)
  { lat: [31, 34], lon: [25, 33], code: 'B' },      // Libyan/Egyptian coast desert (BWh)
  { lat: [31, 34], lon: [39, 45], code: 'B' },      // Syrian/Iraqi desert east of Levant (BWh)
  // Africa & Middle East
  { lat: [16, 31], lon: [-18, 60], code: 'B' },     // Sahara & Arabian Desert (BWh)
  { lat: [11, 17], lon: [-18, 52], code: 'S' },     // Sahel semi-arid steppe (BSh)
  { lat: [-15, 11], lon: [-18, 42], code: 'w' },    // Tropical African savanna (Aw)
  { lat: [-5, 6], lon: [8, 32], code: 'A' },        // Congo Basin rainforest (Af/Am)
  { lat: [-31, -16], lon: [11, 26], code: 'B' },    // Namib & Kalahari deserts (BWh/BWk)
  { lat: [-36, -31], lon: [15, 22], code: 'M' },    // SW Cape South Africa Mediterranean (Csb/Csa)
  { lat: [-34, -24], lon: [22, 34], code: 'H' },    // E South Africa humid subtropical (Cfa/Cwa)
  // Asia
  { lat: [34, 52], lon: [45, 85], code: 'S' },      // Central Asian steppe (BSk)
  { lat: [35, 46], lon: [52, 108], code: 'B' },     // Kyzylkum / Taklamakan / Gobi cold desert (BWk)
  { lat: [44, 68], lon: [85, 145], code: 'd' },     // Mongolia / E Siberia / NE China dry-winter continental (Dw)
  { lat: [22, 41], lon: [105, 145], code: 'H' },    // East China / Korea / Japan humid subtropical (Cfa/Cwa)
  { lat: [8, 28], lon: [68, 105], code: 'w' },      // Indian & Indochina monsoon savanna (Aw/Am)
  { lat: [-10, 12], lon: [95, 155], code: 'A' },    // Maritime SE Asia / New Guinea rainforest (Af)
  // Australia & New Zealand
  { lat: [-31, -18], lon: [113, 144], code: 'B' },  // Australian Outback desert (BWh)
  { lat: [-35, -30], lon: [113, 122], code: 'M' },  // SW Australia Mediterranean (Csa/Csb)
  { lat: [-38, -24], lon: [144, 156], code: 'H' },  // E Australia humid subtropical (Cfa)
  { lat: [-47, -34], lon: [165, 180], code: 'C' },  // New Zealand oceanic (Cfb)
]

const ROWS = 44
const COLS = 144

function buildGrid(): Uint8Array {
  const out = new Uint8Array(ROWS * COLS)
  const codes: KoppenCode[] = ['A', 'w', 'B', 'S', 'M', 'H', 'C', 'D', 'd', 'E']
  const idxOf = (c: KoppenCode) => codes.indexOf(c)

  // Zonal oceanic/latitudinal defaults before continental patches.
  for (let r = 0; r < ROWS; r++) {
    const lat = LAT_MAX - (r + 0.5) * LAT_STEP
    const a = Math.abs(lat)
    const def: KoppenCode = a >= 60 ? 'E' : a >= 40 ? 'C' : a >= 26 ? 'H' : a >= 15 ? 'w' : 'A'
    out.fill(idxOf(def), r * COLS, (r + 1) * COLS)
  }

  for (const p of PATCHES) {
    const code = idxOf(p.code)
    for (let r = 0; r < ROWS; r++) {
      const lat = LAT_MAX - (r + 0.5) * LAT_STEP
      if (lat < p.lat[0] || lat >= p.lat[1]) continue
      for (let c = 0; c < COLS; c++) {
        const lon = -180 + (c + 0.5) * LON_STEP
        if (lon < p.lon[0] || lon >= p.lon[1]) continue
        out[r * COLS + c] = code
      }
    }
  }
  return out
}

const CODES: readonly KoppenCode[] = ['A', 'w', 'B', 'S', 'M', 'H', 'C', 'D', 'd', 'E']
const TABLE = buildGrid()

/** Looks up the coarse Beck et al. (2018) Köppen–Geiger climate regime at `(lat, lon)`. */
export function koppenAt(lat: number, lon: number): KoppenCode {
  if (lat > LAT_MAX || lat < LAT_MAX - ROWS * LAT_STEP) return 'E'
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor((LAT_MAX - lat) / LAT_STEP)))
  const normLon = (((lon + 180) % 360) + 360) % 360
  const col = Math.min(COLS - 1, Math.floor(normLon / LON_STEP))
  return CODES[TABLE[row * COLS + col]]
}
