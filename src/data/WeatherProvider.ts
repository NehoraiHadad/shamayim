import type { Place } from '../config/place'
import type { Forecast } from '../domain/types'

/**
 * Every data source implements this. v1 has one (Open-Meteo ICON);
 * later a blending provider can combine several behind the same interface.
 */
export interface WeatherProvider {
  readonly id: string
  getForecast(place: Place, signal?: AbortSignal): Promise<Forecast>
}
