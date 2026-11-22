import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { AirInput } from '../atmo/airTypes'
import type { Place } from '../config/place'
import { loadBounds } from '../data/city/bounds'
import { loadCity } from '../data/city/cityData'
import { loadLandCover } from '../data/land/landData'
import { loadFar } from '../data/city/farData'
import { loadIsrael } from '../data/landmarks/israelData'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { forecastUrl } from '../data/openMeteo/request'
import { type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import { waterAround } from '../data/water/waterInView'
import { loadWaterMask } from '../data/water/waterMask'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import { layersOn, sceneModel } from '../scene/model'
import { glideAt, strikes } from '../scene/model/anim'
import type { LandClock, LayerOf, SceneBox } from '../scene/model/types'
import type { Surface } from '../scene/compose/surface'
import { SceneOverlay } from '../scene/react/SceneOverlay'
import { onSkyCanvas } from '../scene/paint/sky'
import { SkyCanvas } from '../scene/react/SkyCanvas'
import { SCENE_STATS, useSurface } from '../scene/react/useSurface'
import { SCENE_H } from '../world/sceneBox'
import type { WorldInput, WorldState } from '../world/types'
import { withVisibleSun } from '../world/visibleSun'
import { makeWorldBuilder } from '../world/world'
import { UNKNOWN_EYE_Y } from '../world/terrain'
import { harnessPlace, fixturePanorama } from './sceneFixture'
import { ARRIVAL } from '../scene/model/loading'
import { WearCanvas } from '../scene/react/WearCanvas'
import { isDarkPaper, sheetLight } from '../theme/sheetLight'
import type { ThemeId } from '../theme/skyThemes'

/**
 * The canvas scene alone, for pixel and performance tests (docs/design/CANVAS-SCENE-PLAN.md §3): `scene.html?place=haifa
 * &at=2026-11-17T16:30&weather=rain&phase=0[&overlay=1]`. The baseline places' recorded panoramas, the bundled water,
 * landmark and city data, and the forecast from the app's own request (the runners serve the fixture for it: nothing
 * reaches Open-Meteo). No UI text unless `overlay=1`. Sets `window.__sceneReady` once both surfaces are painted;
 * `window.__scene.scrub(at)` rebuilds and repaints one frame synchronously (perf runner).
 *
 * `land=loading|offline|arrive` (C8): the land not known yet (the mist with the line forming, from phase 0), offline with
 * none (the quiet mist), or arriving (its reveal begun at phase 0, after a mist shown for 3.5 s): with `phase`, a still of
 * that moment.
 *
 * `wear=tee,umbrella` (the wear card): only the card's clothesline, drawn from the same world on the sheet's paper for the
 * hour (its light or dark paper by the sun, as the app's), in a 335 px box at (20, 24); `phase` lays it at that moment.
 */

/** Weather moments as overrides of the shown air (like `?wx=`). */
const WEATHER: Record<string, Partial<AirInput>> = {
  clear: { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 },
  rain: { precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55, windDirection: 270,
    humidity: 95 },
  overcast: { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 },
  dust: { pm10: 400, dust: 400, visibilityKm: 3 },
  snow: { snowfall: 2, precipitation: 2, temperature: -1, feelsLike: -4, cloudCover: 100, thickCloud: 100, weatherCode: 73 },
  // C6's sky moments: a thunderstorm (lightning in the raining banks), a hot dry hour (heat shimmer), a broken sky.
  thunder: { precipitation: 6, weatherCode: 95, cloudCover: 90, thickCloud: 85, windSpeed: 25, windGusts: 50, windDirection: 250,
    humidity: 90 },
  hot: { temperature: 41, feelsLike: 43, cloudCover: 5, thickCloud: 0, precipitation: 0, weatherCode: 0, humidity: 20 },
  broken: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 },
  // C7's moments: fog in the valleys, scattered showers (some banks rain, some do not), a gale with no rain.
  fog: { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, precipitation: 0, weatherCode: 45, windSpeed: 6, windGusts: 10 },
  showers: { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45, windDirection: 250,
    humidity: 80 },
  gale: { windSpeed: 50, windGusts: 75, windDirection: 270, cloudCover: 30, thickCloud: 10, precipitation: 0, weatherCode: 2 },
  // C10's moments: a veil of cirrostratus over a clear lower sky (the halo, persistent contrails), a sunny calm (thermals).
  cirrus: { cloudCover: 75, thickCloud: 0, precipitation: 0, weatherCode: 2, windSpeed: 8, windGusts: 14 },
  // The wear card's calm: a still, clear noon.
  calm: { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, windSpeed: 3, windGusts: 5, humidity: 40 },
  sunny: { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, windSpeed: 10, windGusts: 16, temperature: 24, humidity: 40 },
}

/** C10's moments that pin the cloud layers themselves (the fixture's hours always carry mid cloud with their high). */
const LAYERS: Record<string, { low: number; mid: number; high: number }> = {
  cirrus: { low: 0, mid: 0, high: 0.75 },
}

/** Where the land's figure stands in the sky (px), and so the still's height: the sky above it, the figure under. */
const LAND_TOP = 300

const panoramas = import.meta.glob<StoredPanorama>('../test/fixtures/scene/*.panorama.json', { import: 'default' })

interface Harness {
  /**
   * Times (ms) of one scrub frame: the world, the model, the paint of both surfaces and of each (with the paint worker:
   * asking for the stale layers and laying what is there; what arrives later is laid outside this frame).
   */
  scrub(at: LocalTime): { world: number; model: number; paint: number; sky: number; land: number; painted: string[] }
  /** Resolves once the paint worker has delivered everything asked of it (at once without one). */
  settled(): Promise<void>
  /** Whether the layers are painted in the paint worker. */
  offThread: boolean
  /** Lays both surfaces at a phase, with motion (a frame of a clip, `e2e/scene.clip.mjs`): nothing is repainted. */
  lay(phase: number): void
}
type HarnessWindow = Window & { __sceneReady?: boolean; __sceneError?: string; __scene?: Harness; __world?: WorldState
  __sceneStill?: boolean }
const win = window as HarnessWindow
// Under reduced motion (the runners' stills) the harness lays every frame itself: no loop, not even the arrival's.
win.__sceneStill = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// oxlint-disable-next-line react/only-export-components
export async function loadInput(place: Place, at: LocalTime, weather: string): Promise<WorldInput> {
  const signal = new AbortController().signal
  const stored = await panoramas[`../test/fixtures/scene/${place.id}.panorama.json`]?.()
  const panorama = fixturePanorama(stored)
  if (!panorama) throw new Error(`no panorama fixture for ${place.id}`)
  const mask = await loadWaterMask()
  const terrain = terrainFromPanorama(panorama, { water: mask ? waterAround(place, mask) : undefined })
  const [source, city, far, bounds, cover, raw] = await Promise.all([
    loadLandmarkSource(place, signal, { israel: loadIsrael }),
    loadCity(place, signal),
    loadFar(),
    loadBounds(),
    loadLandCover(place, signal, 6),
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
  return { place, forecast, now: at, selected: null, terrain, landmarks: withPlaceHomes(place, source.sceneMarks),
    seatCandidates: source.seatCandidates, city, far, forced: WEATHER[weather] ?? null,
    forcedLayers: LAYERS[weather] ?? null, waterMask: mask, bounds, cover }
}

/** The land's moment (`land=`): its status for the world, and the clock the model is built with. */
function landMoment(asked: string | null): { status: 'loading' | 'offline' | null; clock: LandClock | null } {
  if (asked === 'loading' || asked === 'offline') return { status: asked, clock: { loadingAt: 0 } }
  // The reveal at `from` (default 0) after 3.5 s of mist: a clip lays the loading part, then this from 3.5 on (one clock).
  const from = Number(new URLSearchParams(location.search).get('from') ?? 0) || 0
  if (asked === 'arrive') return { status: null, clock: { loadingAt: from - 3.5, reveal: { at: from, fromHorizonY: UNKNOWN_EYE_Y, guessed: true } } }
  return { status: null, clock: null }
}

function Scene({ input: given }: { input: WorldInput }) {
  const params = new URLSearchParams(location.search)
  const overlay = params.get('overlay') === '1'
  const [build] = useState(makeWorldBuilder)
  const moment = useMemo(() => landMoment(new URLSearchParams(location.search).get('land')), [])
  const input = useMemo(() => (moment.status ? { ...given, terrain: { ...given.terrain, status: moment.status } } : given),
    [given, moment])
  const box: SceneBox = useMemo(() => ({ width: window.innerWidth, skyHeight: LAND_TOP + SCENE_H, landTop: LAND_TOP,
    landHeight: SCENE_H, dpr: window.devicePixelRatio || 1 }), [])
  const world = useMemo(() => SCENE_STATS.time('worldCold', () => build(input)), [build, input])
  const model = useMemo(() => SCENE_STATS.time('modelCold', () => sceneModel(world, box, moment.clock)), [world, box, moment])
  const sky = useMemo(() => layersOn(model, 'sky'), [model])
  const land = useMemo(() => layersOn(model, 'land'), [model])
  const ready = useRef(new Set<string>())
  /** The land's surface, once `useSurface` made it (for laying the land at a phase). */
  const landHold = useRef<Surface | null>(null)
  /** Both surfaces laid at a phase as the loop lays them with motion on (`still` false), whatever the page's reduced motion. */
  const lay = useCallback((phase: number) => {
    skySurface.current?.composite(onSkyCanvas(sky), phase, false)
    landHold.current?.composite(land, phase, false)
    // The sky's base glides by its background's position (C8), as `SkyCanvas` lays it.
    const base = sky.find((layer): layer is LayerOf<'sky'> => layer.kind === 'sky')
    const canvas = skySurface.current?.canvas as HTMLCanvasElement | undefined
    if (base?.animated?.glide && canvas?.style) canvas.style.backgroundPosition = `0 ${glideAt(base.animated, phase).toFixed(2)}px`
  }, [sky, land])
  const onReady = useCallback((name: string) => {
    ready.current.add(name)
    if (ready.current.size < 2) return
    // `phase=<s>` (or `phase=flash`: a moment into the first lightning stroke) lays the sky as the loop would at that
    // phase: a still of the animation, the same pixels every time.
    const asked = new URLSearchParams(location.search).get('phase')
    const flash = sky.find((layer) => layer.kind === 'flash')?.animated?.pulse
    // `phase=meteor` (C10): a moment into the first meteor of the night, of every meteor spot.
    const meteors = sky.filter((layer) => layer.kind === 'meteor').map((layer) => strikes(layer.animated!.pulse!)[0]?.at ?? Infinity)
    const phase = asked === 'flash' ? (flash ? strikes(flash)[0].at + 0.03 : 0)
      : asked === 'meteor' ? (meteors.length ? Math.min(...meteors) + 0.25 : 0) : Number(asked ?? 0) || 0
    // The land too (C7: falling rain, mist, smoke, water and trees in the wind), at the same phase.
    if (phase > 0) lay(phase)
    void document.fonts.ready.then(() => { win.__sceneReady = true })
  }, [sky, lay])
  const onSky = useCallback(() => onReady('sky'), [onReady])
  const onLand = useCallback(() => onReady('land'), [onReady])
  const size = { width: box.width, height: box.landHeight, dpr: box.dpr }
  const { ref, surface: landSurface } = useSurface('land', land, size, onLand)
  useEffect(() => { landHold.current = landSurface.current })
  const skySurface = useRef<Surface | null>(null)

  useEffect(() => {
    win.__world = world
    win.__scene = {
      scrub(at) {
        const t0 = performance.now()
        const next = build({ ...input, selected: at })
        const t1 = performance.now()
        const nextModel = sceneModel(next, box, moment.clock)
        const t2 = performance.now()
        // The sky's base is the canvas's CSS background (C6): a scrub frame here repaints the rest; the base's CSS is the
        // browser's to composite (not timed).
        const skyLayers = onSkyCanvas(layersOn(nextModel, 'sky')), landLayers = layersOn(nextModel, 'land')
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
      settled: () => Promise.all([skySurface.current!.settled(), landSurface.current!.settled()]).then(() => {}),
      get offThread() { return Boolean(skySurface.current?.remote && landSurface.current?.remote) },
      lay,
    }
  }, [world, build, input, box, landSurface, moment, lay])

  // The labels wait for the land as the app's do (`useLandClock`): an arriving still shows them once it has settled.
  const labelsShown = !moment.clock?.reveal || (Number(params.get('phase')) || 0) >= ARRIVAL.land.at + ARRIVAL.land.dur * 0.6 + 0.3
  const palette = world.light.palette
  const vars = { '--ink': palette.ink, '--ridge-near': palette.ridgeNear, '--accent': palette.accent } as CSSProperties
  return (
    <div style={{ position: 'relative', width: box.width, height: box.skyHeight, overflow: 'hidden', fontFamily: 'var(--font-sans)', ...vars }}>
      <SkyCanvas layers={sky} size={{ width: box.width, height: box.skyHeight, dpr: box.dpr }} onReady={onSky} surfaceRef={skySurface} />
      <div style={{ position: 'absolute', left: 0, top: box.landTop, width: box.width, height: box.landHeight, color: 'var(--ink)' }}>
        <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
        {overlay && <SceneOverlay items={model.overlay} width={box.width} style={labelsShown ? undefined : { opacity: 0 }} />}
      </div>
    </div>
  )
}

/** The sheet's paper for a weather moment, as the app picks it (`useSheetPaper`, with the weather's theme). */
const PAPER_THEME: Record<string, ThemeId> = { rain: 'rain', thunder: 'rain', showers: 'rain', dust: 'dust', overcast: 'cloudy', snow: 'cloudy',
  fog: 'cloudy', hot: 'heat' }

/** The wear card's line alone (`wear=`), laid at `phase`. */
function WearStill({ input, garments }: { input: WorldInput; garments: string[] }) {
  const [build] = useState(makeWorldBuilder)
  const world = useMemo(() => build(input), [build, input])
  const weather = new URLSearchParams(location.search).get('weather') ?? ''
  const altitude = world.bodies.sun.altitude
  const sheet = sheetLight(altitude, PAPER_THEME[weather] ?? 'clearDay', isDarkPaper(altitude, null))
  const paper = useMemo(() => ({ sheet: sheet.sheet, ink: sheet.sheetInk, muted: sheet.sheetMuted, accent: sheet.sheetAccent }),
    [sheet.sheet, sheet.sheetInk, sheet.sheetMuted, sheet.sheetAccent])
  const surface = useRef<Surface | null>(null)
  const onReady = useCallback(() => {
    const phase = Number(new URLSearchParams(location.search).get('phase') ?? 0) || 0
    const lay = (at: number) => surface.current?.lay(at)
    if (phase > 0) lay(phase)
    win.__world = world
    win.__scene = { lay, settled: () => Promise.resolve(), offThread: false,
      scrub: () => ({ world: 0, model: 0, paint: 0, sky: 0, land: 0, painted: [] }) }
    void document.fonts.ready.then(() => { win.__sceneReady = true })
  }, [world])
  return (
    <div style={{ position: 'relative', width: 375, height: 150, background: sheet.sheet, overflow: 'hidden' }}>
      <div data-wear-line style={{ position: 'absolute', left: 20, top: 24, width: 335, height: 86 }}>
        <WearCanvas world={world} garments={garments} paper={paper} width={335} onReady={onReady} surfaceRef={surface} />
      </div>
    </div>
  )
}

export function SceneHarness() {
  const [input, setInput] = useState<WorldInput | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const place = harnessPlace(params)
    const at = (params.get('at') ?? '2026-11-17T12:00') as LocalTime
    if (!place) { win.__sceneError = `unknown place ${params.get('place')}`; return }
    loadInput(place, at, params.get('weather') ?? '').then(setInput, (err: unknown) => {
      win.__sceneError = String(err)
      console.error(err)
    })
  }, [])
  const wear = new URLSearchParams(location.search).get('wear')
  if (input && wear) return <WearStill input={input} garments={wear.split(',')} />
  return input ? <Scene input={input} /> : null
}
