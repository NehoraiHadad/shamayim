import type { Map as MapLibre, RasterLayerSpecification } from 'maplibre-gl'
import { CLOUD_MASK_LAYER, latestSatelliteSlot, radarTiles, RADAR_MAX_ZOOM, satelliteMapUrl,
  satelliteSlotFor, type RadarIndex } from '../../data/overhead/sources'
import { TOWN_LABELS } from './mapStyle'
import { RADAR_PROTOCOL, SAT_PROTOCOL, TILE_SIZE } from './tileProtocols'
import { frameIsStale } from './timing'

export type Frame = { radar: number | null; cloud: number }
export type WeatherLayer = { type: 'cloud' | 'shadow' | 'radar'; time: number; id: string; tiles: [string] }
export const WEATHER_MAX_ZOOM = RADAR_MAX_ZOOM

export function weatherTimeline(index: RadarIndex | null, now: number) {
  const radar = index?.frames ?? []
  const frames: Frame[] = radar.length
    ? radar.map(({ time }) => ({ radar: time, cloud: satelliteSlotFor(time, now) }))
    : [{ radar: null, cloud: latestSatelliteSlot(now) }]
  const layers: WeatherLayer[] = []
  for (const time of new Set(frames.map(({ cloud }) => cloud))) {
    const wms = satelliteMapUrl(CLOUD_MASK_LAYER, '{bbox-epsg-3857}', TILE_SIZE, time)
    for (const type of ['shadow', 'cloud'] as const) {
      layers.push({ type, time, id: `${type}-${time}`, tiles: [`${SAT_PROTOCOL}://${type}/${wms}`] })
    }
  }
  if (index) for (const frame of radar) {
    layers.push({ type: 'radar', time: frame.time, id: `radar-${frame.time}`,
      tiles: [`${RADAR_PROTOCOL}://${radarTiles(index, frame)}`] })
  }
  return { frames, layers, latest: frames[frames.length - 1] }
}

export type Timeline = ReturnType<typeof weatherTimeline>

export function addWeatherLayers(map: MapLibre, timeline: Timeline) {
  const before = map.getLayer(TOWN_LABELS) ? TOWN_LABELS : undefined
  for (const { id, tiles } of timeline.layers) {
    map.addSource(id, { type: 'raster', tiles, tileSize: TILE_SIZE, maxzoom: WEATHER_MAX_ZOOM })
    map.addLayer({
      id, type: 'raster', source: id,
      paint: { 'raster-opacity': 0, 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 0 } },
    }, before)
  }
}

export function showWeather(map: MapLibre, timeline: Timeline, frame: Frame, now: number) {
  for (const { type, time, id } of timeline.layers) {
    const radar = type === 'radar'
    const visible = time === (radar ? frame.radar : frame.cloud)
    const stale = frameIsStale(radar ? timeline.latest.radar : timeline.latest.cloud, now)
    const paint: RasterLayerSpecification['paint'] = {
      'raster-opacity': visible ? (type === 'shadow' ? 0.22 : 0.95) : 0,
      'raster-saturation': stale ? -1 : 0,
      'raster-brightness-max': stale && !radar ? 0.70 : 1,
    }
    for (const [property, value] of Object.entries(paint)) {
      if (map.getPaintProperty(id, property) !== value) map.setPaintProperty(id, property, value)
    }
  }
}
