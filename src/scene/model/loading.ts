//# allFunctionsCalledOnLoad
import { hashId, seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import { sunLight } from '../../world/sceneLight'
import { SCENE_W } from '../../world/sceneBox'
import { UNKNOWN_EYE_Y } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { landBoxKey, layerKey } from './keys'
import { toneAt } from './planeLight'
import { mixRgb, rgbOf } from './tone'
import type { AnimSpec, LandClock, LayerDesc, LayerOf, MistBandDesc, MistPuff, Pt, RGB, SceneBox } from './types'

/*
 * The land not known yet (stage C8, docs/design/CANVAS-SCENE-PLAN.md §4; owner decision 2: "mist with a faint ridge line
 * forming in it; offline with no land data ever: quiet mist"). While the place's panorama loads, the sky and the weather
 * show as they are (they do not need it) and the land's place holds a bank of mist in the hour's air and light, a faint
 * generic ridge line forming in it from the place outward. When the land arrives, its true near crest is drawn over the
 * same front (the guess unmade as it goes), the land comes up under the mist as the mist thins away, and the sky, drawn on
 * the land's own eye level, settles there from the guessed one: no pop. Offline with no land ever, the mist stays,
 * drifting slowly, and nothing is guessed. Every timing is a pure function of the phase and the shell's `LandClock`.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]
const q = (v: number, step: number) => Math.round(v / step)
const tone = (rgb: RGB) => rgb.map((c) => Math.round(c * 64))
const whole = (px: number, dpr: number) => Math.max(1, Math.round(px * dpr)) / dpr

/** Draw order on the land surface: the mist over every land layer but the falling rain (60) and the dust (50); the line on it. */
const Z = { mist: 48, line: 49 }

/** While the land loads: the mist shows first, then the line forms from the place outward over `GROW` s. */
export const GUESS = { delay: 0.5, grow: 2.8, breath: { depth: 0.35, period: 6.5 } } as const

/**
 * The land's arrival (s from the reveal's start): the true crest drawn from the place outward over the guess, the land
 * fading up under the mist as the mist thins away, the line giving way to the land's own crest, the sky settling.
 */
export const ARRIVAL = {
  crest: { at: 0, dur: 0.9 },
  land: { at: 0.3, dur: 1.4 },
  mist: { at: 0.35, dur: 1.5 },
  crestOut: { at: 1.1, dur: 0.8 },
  guessOut: { at: 0.6, dur: 0.6 },
  glide: { at: 0.3, dur: 1.4 },
} as const

/** When the arrival is over (s from its start): the shell drops the clock's reveal after it. */
export const ARRIVAL_END = 1.9

/** A held reveal (the land's layers still being painted) stands at its start: every timing this far off. */
const HELD = Infinity

/** The land layers that do not stand on the land and so show while it loads: the near rain and the dust over it. */
const UNANCHORED = new Set(['fall.land', 'grains.land'])

/** Whether a land layer shows while the land is unknown (C8): the mist, the line and the weather that needs no land. */
export const showsUnknown = (layer: LayerDesc) => layer.surface === 'sky' || layer.kind === 'loading' || UNANCHORED.has(layer.id)

/** Seeded puffs along a band's top, wrapping round the tile (as C7's mist). */
function puffsOf(seed: string, w: number, top: number, depth: number, n: number, size: number): MistPuff[] {
  const r = seeded(hashId(seed))
  return Array.from({ length: n }, (_, i) => {
    const rx = (14 + 30 * r()) * size
    return { x: ((i + 0.6 * r()) / n) * w, y: top + depth * (0.1 + 0.7 * r()), rx, ry: (2.5 + 5 * r()) * size, alpha: 0.35 + 0.55 * r() }
  })
}

/**
 * The mist's own tones: its top the low sky through the air, a little paler by full day (fog takes the light of the sky
 * over it, so at dusk it is the dusk's grey-violet, by night the night's), its foot darker with the land hidden under
 * it; and the light its tops catch from a low sun through the cloud. Only from what does not depend on the land (the
 * hour's palette, the air, the sun's true altitude, the cloud's covers), so the bank and its line are the same canvases
 * before the land arrives and through its arrival: nothing repainted, nothing popping.
 */
function mistTones(world: WorldState) {
  const dark = world.night.dark
  const { palette } = world.light
  const sun = world.bodies.sun.altitude
  const day = smoothstep(2, 20, sun)
  // By night a bank holds a little of the night sky's own glow (and the towns' under it), so it still reads as a bank.
  const sky = mixRgb(rgbOf(palette.horizon), rgbOf(palette.mid), 0.15)
  const body = mixRgb(mixRgb(sky, world.air.haze, 0.3 * (1 - dark)), WHITE, 0.2 * day + 0.07 * dark)
  const foot = mixRgb(body, toneAt(world, 2), 0.32)
  // A low sun lights the bank's top (the warm of the hour) as far as the cloud lets it through.
  const cover = (level: string) => world.clouds.find((c) => c.level === level)?.cover ?? 0
  const through = (1 - 0.95 * cover('low')) * (1 - 0.85 * cover('mid')) * (1 - 0.3 * cover('high'))
  const low = sun > -1 ? smoothstep(25, 4, sun) : 0
  const litAlpha = clamp01(through * low * 0.6 * (1 - dark))
  const glow = sunLight(Math.max(0, sun), { visibilityKm: world.air.visibilityKm, dust: world.air.dust }).rgb
  return { body, foot, lit: mixRgb(body, glow, 0.6), litAlpha }
}

/**
 * The bank of mist in the land's place: a dense body from a little over the guessed eye level to the figure's foot,
 * wisps above it, soft puffs along both tops; a tile that drifts with the ground wind (slower, quieter offline). Its
 * geometry is the guessed eye level's, never the land's, so it is the same canvas before and through the arrival.
 */
function mistLayer(world: WorldState, box: SceneBox): LayerOf<'loading'> {
  const offline = world.terrain.status === 'offline'
  const { body, foot, lit, litAlpha } = mistTones(world)
  const period = whole(300, box.dpr)
  const eye = UNKNOWN_EYE_Y
  const id = world.place.id
  const bands: MistBandDesc[] = [
    // Wisps standing over the bank, thin and torn.
    { top: eye - 44, fade: 10, bottom: eye - 18, rgb: body, alpha: 0.16, puffs: puffsOf(`${id}:loading.wisps`, period, eye - 50, 16, 6, 1.3) },
    // The bank: its soft top a little over eye level, dense below.
    { top: eye - 18, fade: 22, bottom: box.landHeight, rgb: body, alpha: offline ? 0.97 : 0.95,
      puffs: puffsOf(`${id}:loading.bank`, period, eye - 24, 12, 12, 1.1) },
    // The foot: the land's dark breathing through the bank low down.
    { top: eye + 12, fade: 18, bottom: box.landHeight, rgb: foot, alpha: 0.55, puffs: puffsOf(`${id}:loading.foot`, period, eye + 6, 10, 5, 1.2) },
  ]
  const across = world.wind.across
  // A slow drift with the ground wind (a still air still breathes along a little); offline, quieter still.
  const speed = (Math.abs(across) > 0.05 ? Math.sign(across) : 1) * (offline ? 0.6 : 1) * (1 + 0.25 * Math.min(world.wind.ms, 8))
    * (box.width / SCENE_W)
  const y0 = Math.max(0, Math.floor(eye - 64))
  return { kind: 'loading', part: 'mist', id: 'loading.mist', surface: 'land', z: Z.mist, soft: true, bands, lit, litAlpha,
    bounds: { x: 0, y: y0, w: period, h: box.landHeight - y0 },
    animated: { mode: 'drift', speed, period },
    key: layerKey('loading.mist', landBoxKey(box, true), period, y0, offline, tone(body), tone(foot), tone(lit), q(litAlpha, 0.02)) }
}

/** Seeded 1-D value noise (−1…1) with knots every `span` px, eased between them. */
function noise1(seed: string, span: number, length: number): (x: number) => number {
  const r = seeded(hashId(seed))
  const knots = Array.from({ length: Math.ceil(length / span) + 2 }, () => r() * 2 - 1)
  return (x) => {
    const i = Math.floor(x / span), t = x / span - i, k = t * t * (3 - 2 * t)
    return knots[i] + (knots[i + 1] - knots[i]) * k
  }
}

/**
 * A generic soft ridge line (the land is not known): round the guessed eye level, rising a little toward the edges, in
 * slow swells and smaller knolls seeded by the place (value noise at two scales, never a sine). Not a shape of the place,
 * and drawn faint: a ridge glimpsed through the mist.
 */
export function guessLine(placeId: string): Pt[] {
  const swell = noise1(`${placeId}:loading.swell`, 120, SCENE_W)
  const knoll = noise1(`${placeId}:loading.knoll`, 31, SCENE_W * 2.4)
  const out: Pt[] = []
  for (let x = 0; x <= SCENE_W; x += 5) {
    const u = x / SCENE_W - 0.5
    out.push([x, UNKNOWN_EYE_Y - 6 - 14 * u * u - 9 * swell(x) - 3.5 * Math.max(0, knoll(x)) - 1.2 * knoll(x * 2.3)])
  }
  return out
}

/** The line's tone: the near ridge's own at a few km, half lost in the mist. */
function lineTone(world: WorldState): RGB {
  return mixRgb(toneAt(world, 3), mistTones(world).body, 0.42)
}

function ridgeLayer(world: WorldState, box: SceneBox, id: 'loading.guess' | 'loading.crest', points: readonly Pt[],
  animated: AnimSpec): LayerOf<'loading'> {
  const sx = box.width / SCENE_W
  const line: Pt[] = points.map(([x, y]) => [x * sx, y])
  const rgb = lineTone(world)
  const alpha = id === 'loading.guess' ? 0.5 : 0.62
  const mass = 24
  const top = Math.max(0, Math.floor(Math.min(...line.map(([, y]) => y)) - 4))
  const bottom = Math.min(box.landHeight, Math.ceil(Math.max(...line.map(([, y]) => y)) + mass + 2))
  const seed = hashId(`${world.place.id}:${id}`)
  return { kind: 'loading', part: 'ridge', id, surface: 'land', z: Z.line, line, rgb, alpha, mass, seed,
    bounds: { x: 0, y: top, w: box.width, h: Math.max(1, bottom - top) }, animated,
    key: layerKey(id, landBoxKey(box), top, bottom, line.map(([x, y]) => [q(x, 0.25), q(y, 0.25)]), tone(rgb), q(alpha, 0.02), seed) }
}

/** Where a line forms from: the place's own direction, the middle of the view (the dot). */
const fromX = (box: SceneBox) => box.width / 2

/**
 * The land not known (C8): the mist, and while it loads (not offline) the guess line forming from the place outward and
 * breathing once formed, timed from `clock.loadingAt` on the scene's one clock, so a new model does not start them again.
 */
export function loadingLayers(world: WorldState, box: SceneBox, clock: LandClock): LayerOf<'loading'>[] {
  const mist = mistLayer(world, box)
  if (world.terrain.status === 'offline') return [mist]
  const guess = ridgeLayer(world, box, 'loading.guess', guessLine(world.place.id), {
    mode: 'settle', breath: GUESS.breath,
    reveal: { x: fromX(box), at: clock.loadingAt + GUESS.delay, dur: GUESS.grow, still: 'whole', feather: 18 } })
  return [mist, guess]
}

/**
 * The land arriving (C8): the model of the known land, with the loading layers over it and every motion of the arrival
 * timed from the reveal's start (`clock.reveal.at` on the scene's clock; held at the start while it is null):
 * - the true near crest drawn from the place outward, the guess unmade over the same front, then both give way;
 * - every layer that stands on the land fading up from nothing under the mist, and the mist thinning away;
 * - the sky (painted on the land's eye level) laid off by the difference from the eye level it stood on, settling.
 */
export function arrivingLayers(world: WorldState, box: SceneBox, layers: readonly LayerDesc[], clock: LandClock): LayerDesc[] {
  const reveal = clock.reveal
  if (!reveal) return [...layers]
  const t0 = reveal.at === null ? HELD : reveal.at
  const at = (step: { at: number }) => t0 + step.at
  const ramp = (step: { at: number; dur: number }, from: number, to: number) => ({ at: at(step), dur: step.dur, from, to })
  const dy = reveal.fromHorizonY - world.relief.horizonY
  const out = layers.map((layer): LayerDesc => {
    if (layer.surface === 'sky') {
      if (Math.abs(dy) < 0.5) return layer
      return { ...layer, animated: { ...(layer.animated ?? { mode: 'settle' }), glide: { dy, at: at(ARRIVAL.glide), dur: ARRIVAL.glide.dur } } }
    }
    if (UNANCHORED.has(layer.id)) return layer
    return { ...layer, animated: { ...(layer.animated ?? { mode: 'settle' }), fade: ramp(ARRIVAL.land, 0, 1) } }
  })
  const unknown = loadingLayers({ ...world, terrain: { ...world.terrain, status: 'loading' } }, box, clock)
  const x = fromX(box)
  for (const layer of unknown) {
    if (layer.id === 'loading.mist') {
      out.push({ ...layer, animated: { ...layer.animated!, fade: ramp(ARRIVAL.mist, 1, 0) } })
    } else if (layer.id === 'loading.guess' && reveal.guessed) {
      // The guess, formed (or as far as it had formed: it stands whole once the arrival begins), unmade from the place
      // outward as the crest is drawn, and gone by the time the land is half up.
      out.push({ ...layer, animated: { mode: 'settle', breath: GUESS.breath, fade: ramp(ARRIVAL.guessOut, 1, 0),
        reveal: { x, at: at(ARRIVAL.crest), dur: ARRIVAL.crest.dur, erase: true, still: 'whole', feather: 18 } } })
    }
  }
  out.push(ridgeLayer(world, box, 'loading.crest', world.terrain.near.points, { mode: 'settle', fade: ramp(ARRIVAL.crestOut, 1, 0),
    reveal: { x, at: at(ARRIVAL.crest), dur: ARRIVAL.crest.dur, still: 'hide', feather: 18 } }))
  return out.sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
}
