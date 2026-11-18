type MapLibreModule = typeof import('maplibre-gl')

export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]) })
  if (!response.ok) throw new Error(`Weather service returned ${response.status}`)
  return response.json()
}

/**
 * Hebrew labels are shaped right-to-left only with this plugin (@mapbox/mapbox-gl-rtl-text 0.3.0, BSD-2, served
 * from our own origin so it works offline too).
 */
export function loadHebrewShaping(maplibre: MapLibreModule) {
  if (maplibre.getRTLTextPluginStatus() === 'unavailable') {
    void maplibre.setRTLTextPlugin(new URL(`${import.meta.env.BASE_URL}vendor/mapbox-gl-rtl-text.js`, location.href).href, false)
  }
}
