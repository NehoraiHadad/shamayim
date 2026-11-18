import type { StyleSpecification } from 'maplibre-gl'
import { mapInk, POSITRON, restylePositron, TOWN_LABELS } from './mapStyle'
import { addRings, MAP_BOUNDS, openingZoom } from './placeMap'
import { RADAR_PROTOCOL, SAT_PROTOCOL, tileProtocol, type TileResult } from './tileProtocols'
import { addWeatherLayers, showWeather, type Frame, type Timeline } from './weatherLayers'
import { weatherInView, type WeatherStatus } from './weatherViewport'
import type { Place } from '../../config/place'

export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]) })
  if (!response.ok) throw new Error(`Weather service returned ${response.status}`)
  return response.json()
}

interface Options {
  container: HTMLElement
  marker: HTMLElement
  place: Place
  timeline: Promise<Timeline>
  signal: AbortSignal
  onReady: () => void
  onMapError: () => void
  onStatus: (status: WeatherStatus) => void
}

export async function createOverheadMap({ container, marker, place, timeline, signal, onReady, onMapError, onStatus }: Options) {
  const upstream = fetchJson(POSITRON, signal).catch(() => null)
  const [maplibre, , rawStyle, weather] = await Promise.all([
    import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css'), upstream, timeline,
  ])
  // Hebrew labels are shaped right-to-left only with this plugin (@mapbox/mapbox-gl-rtl-text 0.3.0, BSD-2, served
  // from our own origin so it works offline too).
  if (maplibre.getRTLTextPluginStatus() === 'unavailable') {
    void maplibre.setRTLTextPlugin(new URL(`${import.meta.env.BASE_URL}vendor/mapbox-gl-rtl-text.js`, location.href).href, false)
  }
  signal.throwIfAborted()
  const app = container.closest('.app')
  const paper = () => ({
    sheet: getComputedStyle(container).getPropertyValue('--sheet').trim(),
    dark: app?.classList.contains('dark-sheet') ?? false,
  })
  const { sheet, dark } = paper()
  const input = rawStyle as StyleSpecification | null
  const valid = input?.version === 8 && Array.isArray(input.layers) && input.sources
  if (!valid) onMapError()
  const style = restylePositron(valid ? input : { version: 8, sources: {}, layers: [] }, sheet, dark)
  const results = new Map<string, TileResult>()
  const protocol = tileProtocol(results)
  const zoom = openingZoom(container.clientWidth, place.lat)
  const map = new maplibre.Map({
    container, style, center: [place.lon - 0.22, place.lat], zoom, minZoom: zoom, maxZoom: zoom + 1,
    maxBounds: MAP_BOUNDS, attributionControl: false, renderWorldCopies: false, dragRotate: false,
    pitchWithRotate: false, touchPitch: false, maxPitch: 0, refreshExpiredTiles: false, fadeDuration: 0,
  })
  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()
  map.getCanvas().setAttribute('aria-label', `מפת עננים וגשם סביב ${place.nameHe}`)
  maplibre.addProtocol(SAT_PROTOCOL, protocol)
  maplibre.addProtocol(RADAR_PROTOCOL, protocol)

  let frame = weather.latest
  let now = Date.now()
  let loaded = false
  let ready = false
  let queued = 0
  let previousStatus: WeatherStatus | undefined
  const report = () => {
    queued = 0
    if (!loaded || map.isMoving()) return
    const view = weatherInView(map, (bounds) => [
      maplibre.MercatorCoordinate.fromLngLat(bounds.getNorthWest()),
      maplibre.MercatorCoordinate.fromLngLat(bounds.getSouthEast()),
    ], results, weather, frame)
    const { status } = view
    if (status.echoes !== previousStatus?.echoes || status.radarFailed !== previousStatus.radarFailed
      || status.cloudFailed !== previousStatus.cloudFailed) {
      previousStatus = status
      onStatus(status)
    }
    if (view.ready && !ready) {
      ready = true
      onReady()
    }
  }
  const queueReport = () => { if (!queued) queued = requestAnimationFrame(report) }
  const updatePaper = () => {
    if (!loaded) return
    const theme = paper()
    const ink = mapInk(theme.dark)
    const paint = (id: string, property: string, value: string) => {
      if (map.getLayer(id) && map.getPaintProperty(id, property) !== value) map.setPaintProperty(id, property, value)
    }
    paint('overhead-paper', 'background-color', ink.land ?? theme.sheet)
    paint('overhead-water', 'fill-color', ink.water)
    paint('overhead-water', 'fill-outline-color', ink.shore)
    paint('overhead-rivers', 'line-color', ink.shore)
    paint('overhead-distance', 'line-color', ink.shore)
    paint(TOWN_LABELS, 'text-color', ink.text)
    paint(TOWN_LABELS, 'text-halo-color', ink.land ?? theme.sheet)
  }
  const themeObserver = new MutationObserver(updatePaper)
  if (app) themeObserver.observe(app, { attributes: true, attributeFilter: ['class', 'style'] })
  map.once('style.load', () => {
    addWeatherLayers(map, weather)
    addRings(map, place, mapInk(paper().dark).shore)
    new maplibre.Marker({ element: marker }).setLngLat([place.lon, place.lat]).addTo(map)
    showWeather(map, weather, frame, now)
    loaded = true
    updatePaper()
    queueReport()
  })
  map.on('sourcedata', queueReport)
  map.on('moveend', queueReport)
  map.on('idle', queueReport)
  map.on('error', (event) => {
    const { sourceId } = event as typeof event & { sourceId?: string }
    if (!weather.layers.some(({ id }) => id === sourceId)) onMapError()
    queueReport()
  })
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(queued)
    themeObserver.disconnect()
    map.remove()
    maplibre.removeProtocol(SAT_PROTOCOL)
    maplibre.removeProtocol(RADAR_PROTOCOL)
  }, { once: true })

  return {
    show(selected: Frame, at: number) {
      frame = selected
      now = at
      if (loaded) showWeather(map, weather, frame, at)
      queueReport()
    },
  }
}
