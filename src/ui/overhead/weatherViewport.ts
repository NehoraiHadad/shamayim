import type { LngLatBounds, Map as MapLibre, MercatorCoordinate } from 'maplibre-gl'
import { ECHO_GRID, TILE_SIZE, type TileResult } from './tileProtocols'
import { WEATHER_MAX_ZOOM, type Frame, type Timeline } from './weatherLayers'

export type WeatherStatus = {
  echoes: 'loading' | 'clear' | 'wet'
  radarFailed: boolean
  cloudFailed: boolean
}

export function weatherInView(map: MapLibre, bounds: (bounds: LngLatBounds) => [MercatorCoordinate, MercatorCoordinate],
  results: Map<string, TileResult>, timeline: Timeline, frame: Frame) {
  const tiles = map.coveringTiles({ tileSize: TILE_SIZE, maxzoom: WEATHER_MAX_ZOOM, roundZoom: true })
  const [nw, se] = bounds(map.getBounds())
  let ready = tiles.length > 0
  let radarLoaded = tiles.length > 0 && frame.radar !== null
  let wet = false
  let radarFailed = false
  let cloudFailed = false
  for (const { type, time, tiles: template } of timeline.layers) {
    const radar = type === 'radar'
    for (const { canonical } of tiles) {
      const tile = results.get(canonical.url(template, map.getPixelRatio(), 'xyz'))
      if (!tile) ready = false
      if (time !== (radar ? frame.radar : frame.cloud)) continue
      if (radar) {
        if (!tile || tile === 'failed') radarLoaded = false
        if (tile === 'failed') radarFailed = true
        else if (tile?.echoes && !wet) {
          const { x, y, z } = canonical
          const scale = 2 ** z
          const edge = (point: number, origin: number, round: typeof Math.floor) =>
            Math.max(0, Math.min(ECHO_GRID, round((point * scale - origin) * ECHO_GRID)))
          const left = edge(nw.x, x, Math.floor)
          const right = edge(se.x, x, Math.ceil)
          const top = edge(nw.y, y, Math.floor)
          const bottom = edge(se.y, y, Math.ceil)
          for (let row = top; row < bottom && !wet; row++) {
            const start = row * ECHO_GRID
            wet = tile.echoes.subarray(start + left, start + right).includes(1)
          }
        }
      } else if (tile === 'failed' && type === 'cloud') cloudFailed = true
    }
  }
  const status: WeatherStatus = {
    echoes: wet ? 'wet' : radarLoaded ? 'clear' : 'loading',
    radarFailed,
    cloudFailed,
  }
  return { ready, status }
}
