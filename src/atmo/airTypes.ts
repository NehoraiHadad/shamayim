/** What the air renderer needs to know, already reduced from forecast data. */
export interface AirInput {
  temperature: number
  feelsLike: number
  /** 0–100 */
  cloudCover: number
  windSpeed: number
  windGusts: number
  /** Degrees the wind comes from; 0 = north. */
  windDirection: number
  /** mm/h */
  precipitation: number
  /** cm/h */
  snowfall: number
  /** km, null when unknown */
  visibilityKm: number | null
  /** µg/m³, null when unknown */
  pm10: number | null
  dust: number | null
  weatherCode: number
  /** Degrees above the horizon; negative after sunset. */
  sunElevation: number
  /** Selected-hour preview: no lightning. */
  preview: boolean
}

/** Particle field. Sizes and speeds in CSS px at the 375 × 812 reference viewport. */
export interface Particles {
  count: number
  speed: number
  length: number
  alpha: number
}

export interface AirState {
  /** Nothing moves: draw one frame and stop. */
  calm: boolean
  wind: {
    /** −1…1, +1 = moving left → right on screen (a westerly). */
    u: number
    kmh: number
    /** Gust swell target in km/h above the mean; 0 = no swells. */
    gustExcess: number
    /** Cloud drift, px/s, signed. */
    cloudDrift: number
  }
  streaks: Particles
  rain: Particles & { slant: number; breathe: boolean }
  snow: Particles & { sway: number }
  grains: Particles
  cloud: { coverage: number; low: boolean; darken: number }
  haze: { farFade: number; nearFade: number; amount: number; color: string }
  heat: { band: number; amplitude: number; bloom: number }
  rays: { alpha: number }
  /** In-cloud flashes (thunderstorm codes), never in preview. */
  thunder: boolean
  /** Dust turns the sun into a flat coin. */
  sunCoin: number
}
