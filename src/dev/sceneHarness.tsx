import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { AirInput } from '../atmo/airTypes'
import type { Place } from '../config/place'
import { loadCity } from '../data/city/cityData'
import { loadFar } from '../data/city/farData'
import { loadIsrael } from '../data/landmarks/israelData'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { forecastUrl } from '../data/openMeteo/request'
import { unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import { waterAround } from '../data/water/waterInView'
import { loadWaterMask } from '../data/water/waterMask'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import { layersOn, sceneModel } from '../scene/model'
import type { SceneBox } from '../scene/model/types'
import type { Surface } from '../scene/compose/surface'
import { SceneOverlay } from '../scene/react/SceneOverlay'
import { SkyCanvas } from '../scene/react/SkyCanvas'
import { SCENE_STATS, useSurface } from '../scene/react/useSurface'
import { SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../test/scenePlaces'
import { SCENE_H } from '../world/sceneBox'
import type { WorldInput, WorldState } from '../world/types'
import { withVisibleSun } from '../world/visibleSun'
import { makeWorldBuilder } from '../world/world'

/**
 * The canvas scene alone, for pixel and performance tests (docs/design/CANVAS-SCENE-PLAN.md §3): `scene.html?place=haifa
 * &at=2026-11-17T16:30&weather=rain&phase=0[&overlay=1]`. The baseline places' recorded panoramas, the bundled water,
 * landmark and city data, and the forecast from the app's own request (the runners serve the fixture for it: nothing
 * reaches Open-Meteo). No UI text unless `overlay=1`. Sets `window.__sceneReady` once both surfaces are painted;
 * `window.__scene.scrub(at)` rebuilds and repaints one frame synchronously (perf runner).
 */

/** Weather moments as overrides of the shown air (like `?wx=`). */
const WEATHER: Record<string, Partial<AirInput>> = {
  clear: { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 },
  rain: { precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55, windDirection: 270,
    humidity: 95 },
  overcast: { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 },
  dust: { pm10: 400, dust: 400, visibilityKm: 3 },
  snow: { snowfall: 2, precipitation: 2, temperature: -1, feelsLike: -4, cloudCover: 100, thickCloud: 100, weatherCode: 73 },
}

/** Where the land's figure stands in the sky (px), and so the still's height: the sky above it, the figure under. */
const LAND_TOP = 300

const panoramas = import.meta.glob<StoredPanorama>('../test/fixtures/scene/*.panorama.json', { import: 'default' })

interface Harness {
  /** Times (ms) of one scrub frame: the world, the model, the paint of both surfaces and of each. */
  scrub(at: LocalTime): { world: number; model: number; paint: number; sky: number; land: number; painted: string[] }
}
type HarnessWindow = Window & { __sceneReady?: boolean; __sceneError?: string; __scene?: Harness; __world?: WorldState }
const win = window as HarnessWindow

async function loadInput(place: Place, at: LocalTime, weather: string): Promise<WorldInput> {
  const signal = new AbortController().signal
  const stored = await panoramas[`../test/fixtures/scene/${place.id}.panorama.json`]?.()
  const panorama = stored && unpackPanorama(stored)
  if (!panorama) throw new Error(`no panorama fixture for ${place.id}`)
  const mask = await loadWaterMask()
  const terrain = terrainFromPanorama(panorama, { water: mask ? waterAround(place, mask) : undefined })
  const [source, city, far, raw] = await Promise.all([
    loadLandmarkSource(place, signal, { israel: loadIsrael }),
    loadCity(place, signal),
    loadFar(),
    fetch(forecastUrl(place)).then((res) => {
      if (!res.ok) throw new Error(`forecast ${res.status}`)
      return res.json() as Promise<unknown>
    }),
  ])
  // One recorded forecast serves every place: its height is the place's own ground (the panorama's), as Open-Meteo's
  // answer for the place would give it.
  const base: Forecast = { ...mapForecast(raw), elevation: panorama.groundM, placeId: place.id, air: null, nowcast: null, normals: null, fetchedAt: 0,
    source: 'fixture', models: [] }
  const forecast = withVisibleSun(rollForward(base, at), terrain, place)
  return { place, forecast, now: at, selected: null, terrain, landmarks: withPlaceHomes(place, source.panoramaMarks), city,
    far, forced: WEATHER[weather] ?? null }
}

function Scene({ input }: { input: WorldInput }) {
  const params = new URLSearchParams(location.search)
  const overlay = params.get('overlay') === '1'
  const [build] = useState(makeWorldBuilder)
  const box: SceneBox = useMemo(() => ({ width: window.innerWidth, skyHeight: LAND_TOP + SCENE_H, landTop: LAND_TOP,
    landHeight: SCENE_H, dpr: window.devicePixelRatio || 1 }), [])
  const world = useMemo(() => SCENE_STATS.time('worldCold', () => build(input)), [build, input])
  const model = useMemo(() => SCENE_STATS.time('modelCold', () => sceneModel(world, box)), [world, box])
  const sky = useMemo(() => layersOn(model, 'sky'), [model])
  const land = useMemo(() => layersOn(model, 'land'), [model])
  const ready = useRef(new Set<string>())
  const onReady = useCallback((name: string) => {
    ready.current.add(name)
    if (ready.current.size < 2) return
    void document.fonts.ready.then(() => { win.__sceneReady = true })
  }, [])
  const onSky = useCallback(() => onReady('sky'), [onReady])
  const onLand = useCallback(() => onReady('land'), [onReady])
  const size = { width: box.width, height: box.landHeight, dpr: box.dpr }
  const { ref, surface: landSurface } = useSurface('land', land, size, onLand)
  const skySurface = useRef<Surface | null>(null)

  useEffect(() => {
    win.__world = world
    win.__scene = {
      scrub(at) {
        const t0 = performance.now()
        const next = build({ ...input, selected: at })
        const t1 = performance.now()
        const nextModel = sceneModel(next, box)
        const t2 = performance.now()
        const skyLayers = layersOn(nextModel, 'sky'), landLayers = layersOn(nextModel, 'land')
        const skyPainted = skySurface.current!.render(skyLayers)
        const tSky = performance.now()
        const landPainted = landSurface.current!.render(landLayers)
        const t3 = performance.now()
        SCENE_STATS.record('scrub.world', t1 - t0)
        SCENE_STATS.record('scrub.model', t2 - t1)
        SCENE_STATS.record('scrub.paint.sky', tSky - t2)
        SCENE_STATS.record('scrub.paint.land', t3 - tSky)
        return { world: t1 - t0, model: t2 - t1, paint: t3 - t2, sky: tSky - t2, land: t3 - tSky,
          painted: [...skyLayers.map((layer, i) => [layer.id, skyPainted[i]] as const),
            ...landLayers.map((layer, i) => [layer.id, landPainted[i]] as const)]
            .filter(([, kind]) => kind !== 'none').map(([id, kind]) => `${id}:${kind}`) }
      },
    }
  }, [world, build, input, box, landSurface])

  const palette = world.light.palette
  const vars = { '--ink': palette.ink, '--ridge-near': palette.ridgeNear, '--accent': palette.accent } as CSSProperties
  return (
    <div style={{ position: 'relative', width: box.width, height: box.skyHeight, overflow: 'hidden', fontFamily: 'var(--font-sans)', ...vars }}>
      <SkyCanvas layers={sky} size={{ width: box.width, height: box.skyHeight, dpr: box.dpr }} onReady={onSky} surfaceRef={skySurface} />
      <div style={{ position: 'absolute', left: 0, top: box.landTop, width: box.width, height: box.landHeight, color: 'var(--ink)' }}>
        <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        {overlay && <SceneOverlay items={model.overlay} width={box.width} />}
      </div>
    </div>
  )
}

export function SceneHarness() {
  const [input, setInput] = useState<WorldInput | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const place = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES].find((p) => p.id === (params.get('place') ?? 'shadmot-mehola'))
    const at = (params.get('at') ?? '2026-11-17T12:00') as LocalTime
    if (!place) { win.__sceneError = `unknown place ${params.get('place')}`; return }
    loadInput(place, at, params.get('weather') ?? '').then(setInput, (err: unknown) => {
      win.__sceneError = String(err)
      console.error(err)
    })
  }, [])
  return input ? <Scene input={input} /> : null
}
