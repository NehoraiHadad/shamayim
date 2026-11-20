import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { gustAt, swayAt, GUST, GUST_TIMES } from './anim'
import { labOf } from './tone'
import type { LayerOf, RGB } from './types'
import { catenary, dimmed, ropeOf, wearAir, wearLayers, wearLight, wearSurface, wearWet, W } from './wear'

/**
 * The wear card's clothesline (`wear.ts`) from the scene's one world: the wind's swing and its sign on screen, the calm
 * that hangs still, the rain that wets and weighs the cloth, the night that dims it, the sun's side; the catenary; the
 * gust cycle; every transform a pure function of the phase, the rest pose under reduced motion.
 */
const DAY = '2026-11-17'
const PAPER = { sheet: '#F3F5F7', ink: '#1C1A17', muted: '#625C52', accent: '#3172B0' }
const BOX = { width: 335, dpr: 2 }
const LINE = ['sweater', 'jacket', 'umbrella']
const CALM = { windSpeed: 3, windGusts: 5, cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, humidity: 40 }
const GALE = (windDirection: number) => ({ windSpeed: 50, windGusts: 75, windDirection, cloudCover: 30, thickCloud: 10, precipitation: 0, weatherCode: 2 })
const RAIN = { precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55, windDirection: 270, humidity: 95 }
const SNOW = { snowfall: 2, precipitation: 2, temperature: -1, feelsLike: -4, cloudCover: 100, thickCloud: 100, weatherCode: 73, windSpeed: 20,
  windDirection: 300 }
const DUST = { pm10: 400, dust: 400, visibilityKm: 3, humidity: 30 }

let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => p.id === 'jerusalem' || p.id === 'tel-aviv'))
})
afterAll(() => { vi.unstubAllGlobals() })

const world = (id: string, hour: string, forced: WorldInput['forced'] = null): WorldState =>
  buildWorld({ ...worldInput(loaded.get(id)!, `${DAY}T${hour}` as LocalTime), forced })
const items = (w: WorldState, garments = LINE) => wearLayers(w, garments, PAPER, BOX).filter((l): l is LayerOf<'wearItem'> => l.kind === 'wearItem')
const lightness = (rgb: RGB) => labOf(rgb).l

describe('the gust cycle', () => {
  it('passes through the old line\'s stops and is periodic', () => {
    GUST_TIMES.forEach((t, i) => expect(gustAt(t)).toBeCloseTo(GUST[i], 9))
    for (const t of [0.07, 0.33, 0.71]) expect(gustAt(t + 3)).toBeCloseTo(gustAt(t), 9)
  })
  it('under reduced motion a sway stands in its rest pose at every phase', () => {
    const sway = { pivot: [10, 5] as const, period: 4, delay: 0.3, lift: 3, skew: 0.2, skew0: -0.1, turn: 0, turn0: 0, stretch: 0 }
    const rest = swayAt(sway, 0, true)!
    for (const phase of [0.7, 2.1, 9.3]) expect(swayAt(sway, phase, true)).toEqual(rest)
    // The pivot (the peg line) stays put at rest; a point below it is sheared by the lean alone.
    expect(rest[0] * 10 + rest[2] * 5 + rest[4]).toBeCloseTo(10, 9)
    expect(rest[1] * 10 + rest[3] * 5 + rest[5]).toBeCloseTo(5, 9)
    expect(rest[0] * 10 + rest[2] * 25 + rest[4] - 10).toBeCloseTo(Math.tan(-0.1) * 20, 9)
  })
  it('the same phase gives the same pose (no clock)', () => {
    const sway = { pivot: [0, 0] as const, period: 3.3, delay: 0.44, lift: 2, skew: 0.3, skew0: 0.1, turn: 0, turn0: 0, stretch: -0.05 }
    expect(swayAt(sway, 1.234)).toEqual(swayAt(sway, 1.234))
    const later = swayAt(sway, 1.234 + 3.3 * 7)!
    swayAt(sway, 1.234)!.forEach((v, i) => expect(later[i]).toBeCloseTo(v, 9))
  })
})

describe('the rope', () => {
  it('hangs in a catenary: tied level at both ends, its sag at the middle, steeper than a parabola near the posts', () => {
    const y = catenary(W, 20)
    expect(y(0)).toBeCloseTo(0, 6)
    expect(y(W)).toBeCloseTo(0, 6)
    expect(y(W / 2)).toBeCloseTo(20, 4)
    const parabola = (x: number) => 4 * 20 * (x / W) * (1 - x / W)
    expect(y(W / 2) - y(W / 4)).toBeLessThan(parabola(W / 2) - parabola(W / 4))
  })
  it('kinks down under each load and stays tied at the ends', () => {
    const bare = ropeOf(20, []), loaded = ropeOf(20, [{ x: 120, drop: 3 }])
    expect(loaded.y(120) - bare.y(120)).toBeGreaterThan(2)
    expect(loaded.y(0)).toBeCloseTo(bare.y(0), 6)
    expect(loaded.y(W)).toBeCloseTo(bare.y(W), 6)
  })
})

describe('the wind of the shown hour', () => {
  it('a calm hangs still: no lean, no swing, nothing animated', () => {
    const w = world('jerusalem', '12:00', CALM)
    const air = wearAir(w)
    expect(air.calm).toBe(true)
    expect(air.lean).toBe(0)
    expect(air.flap).toBe(0)
    expect(wearLayers(w, LINE, PAPER, BOX).every((l) => !l.animated)).toBe(true)
  })

  it('swings with the scene\'s wind sign on screen, both ways, harder in a gale than a breeze', () => {
    for (const dir of [90, 270]) {
      const w = world('jerusalem', '12:00', GALE(dir))
      const air = wearAir(w)
      expect(air.calm).toBe(false)
      expect(Math.sign(air.lean)).toBe(Math.sign(w.wind.across))
      expect(Math.sign(air.flap)).toBe(Math.sign(w.wind.across))
      // Pegged cloth: the hem goes downwind (x of a point below the peg moves with the wind's sign); hooked: it swings there.
      for (const layer of items(w)) {
        const m = swayAt(layer.animated!.sway, 0, true)!
        const [px, py] = layer.animated!.sway!.pivot
        const hemX = m[0] * px + m[2] * (py + 30) + m[4]
        expect(Math.sign(hemX - px)).toBe(Math.sign(w.wind.across))
      }
    }
    const breeze = wearAir(world('jerusalem', '12:00', { ...GALE(270), windSpeed: 18, windGusts: 24 }))
    const gale = wearAir(world('jerusalem', '12:00', GALE(270)))
    expect(Math.abs(gale.flap)).toBeGreaterThan(Math.abs(breeze.flap))
    expect(Math.abs(gale.lean)).toBeGreaterThan(Math.abs(breeze.lean))
    expect(gale.lift).toBeGreaterThan(breeze.lift)
    expect(gale.period).toBeLessThan(breeze.period)
  })

  it('gusts over the mean wind swing harder', () => {
    const steady = wearAir(world('jerusalem', '12:00', { ...GALE(270), windSpeed: 25, windGusts: 28 }))
    const gusty = wearAir(world('jerusalem', '12:00', { ...GALE(270), windSpeed: 25, windGusts: 60 }))
    expect(Math.abs(gusty.flap)).toBeGreaterThan(Math.abs(steady.flap))
    expect(gusty.lift).toBeGreaterThan(steady.lift)
  })

  it('the line lifts in a gust and the cloth rides it: each garment lifted by its share of the rope\'s sag', () => {
    const layers = wearLayers(world('jerusalem', '12:00', GALE(270)), LINE, PAPER, BOX)
    const rope = layers.find((l): l is LayerOf<'wearRope'> => l.kind === 'wearRope' && l.part === 'line')!
    expect(rope.animated?.sway?.stretch).toBeLessThan(0)
    const tie = rope.animated!.sway!.pivot[1]
    for (const layer of layers.filter((l): l is LayerOf<'wearItem'> => l.kind === 'wearItem')) {
      const sway = layer.animated!.sway!
      // At a gust's peak the rope at the garment rises by (y − tie) × −stretch × G; the garment by lift × G.
      expect(sway.lift).toBeCloseTo((layer.item.y - tie) * -rope.animated!.sway!.stretch, 6)
    }
  })
})

describe('the rain, the snow, the dust', () => {
  it('rain wets the cloth: darker, heavier (less swing, a deeper sag), beads on the rope and drops falling', () => {
    const dry = world('jerusalem', '12:00', { ...RAIN, precipitation: 0, weatherCode: 3 })
    const wet = world('jerusalem', '12:00', RAIN)
    expect(wearWet(dry)).toBeLessThan(0.05)
    expect(wearWet(wet)).toBeGreaterThan(0.9)
    expect(wearAir(wet).heavy).toBeLessThan(wearAir(dry).heavy)
    expect(Math.abs(wearAir(wet).flap)).toBeLessThan(Math.abs(wearAir(dry).flap))
    const a = items(dry), b = items(wet)
    a.forEach((layer, i) => {
      expect(lightness(b[i].item.tones.body)).toBeLessThan(lightness(layer.item.tones.body))
      expect(b[i].item.y).toBeGreaterThan(layer.item.y)
      expect(b[i].item.hang).toBeGreaterThan(1)
    })
    const wetLayers = wearLayers(wet, LINE, PAPER, BOX)
    expect(wetLayers.find((l): l is LayerOf<'wearRope'> => l.kind === 'wearRope')!.beads.length).toBeGreaterThan(2)
    expect(wetLayers.some((l) => l.kind === 'wearDrip' && l.animated?.flight)).toBe(true)
    expect(wearLayers(dry, LINE, PAPER, BOX).some((l) => l.kind === 'wearDrip')).toBe(false)
  })
  it('snow lies on the cloth and the rope; dust dulls the cloth', () => {
    const snow = world('jerusalem', '12:00', SNOW)
    expect(items(snow).every((l) => l.item.snow > 0.3)).toBe(true)
    expect(wearLayers(snow, LINE, PAPER, BOX).find((l): l is LayerOf<'wearRope'> => l.kind === 'wearRope')!.snow).toBeGreaterThan(0.3)
    expect(items(world('jerusalem', '12:00', DUST)).every((l) => l.item.dust > 0.5)).toBe(true)
    expect(items(world('jerusalem', '12:00', CALM)).every((l) => l.item.dust === 0 && l.item.snow === 0)).toBe(true)
  })
})

describe('the light', () => {
  it('lights the cloth from the scene\'s own side on screen, in its colour', () => {
    let checked = 0
    for (const hour of ['09:00', '12:00', '15:30']) {
      const w = world('jerusalem', hour, CALM)
      const light = wearLight(w)
      if (!w.light.side || w.light.source === 'sky') continue
      checked++
      expect(light.side).toBe(w.light.side === 'left' ? -1 : 1)
      for (const layer of items(w)) {
        expect(layer.item.side).toBe(light.side)
        expect(lightness(layer.item.tones.lit)).toBeGreaterThan(lightness(layer.item.tones.shade))
      }
    }
    expect(checked).toBeGreaterThan(1)
    // Overcast: no side, the cloth lit from the sky above.
    const grey = world('jerusalem', '12:00', { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 })
    expect(items(grey).every((l) => l.item.side === 0)).toBe(true)
  })

  it('by night everything is dim and moonlit (cooler), the rope and the pegs too', () => {
    const day = world('jerusalem', '12:00', CALM), night = world('jerusalem', '21:00', CALM)
    expect(night.night.dark).toBeGreaterThan(0.9)
    const d = items(day), n = items(night)
    d.forEach((layer, i) => {
      for (const tone of ['body', 'peg', 'edge'] as const) {
        expect(lightness(n[i].item.tones[tone])).toBeLessThan(lightness(layer.item.tones[tone]))
      }
    })
    const ropeOfWorld = (w: WorldState) => wearLayers(w, LINE, PAPER, BOX).find((l): l is LayerOf<'wearRope'> => l.kind === 'wearRope')!
    expect(lightness(ropeOfWorld(night).rgb)).toBeLessThan(lightness(ropeOfWorld(day).rgb))
    const warm: RGB = [0.8, 0.6, 0.4]
    const cool = dimmed(warm, 1)
    expect(cool[2] / cool[0]).toBeGreaterThan(warm[2] / warm[0])
    expect(dimmed(warm, 0)).toEqual(warm)
  })
})

describe('the layout', () => {
  it('keeps the card\'s box: the surface stands out from it by its margins at any width, and layers lie inside it', () => {
    for (const width of [300, 335]) {
      const surface = wearSurface(width)
      expect(surface.height).toBeGreaterThan((width * 86) / 335)
      expect(surface.width).toBeGreaterThan(width)
      for (const layer of wearLayers(world('jerusalem', '12:00', CALM), ['coat', 'sweater', 'umbrella', 'sunHat'], PAPER, { width, dpr: 2 })) {
        expect(layer.bounds.x).toBeGreaterThanOrEqual(0)
        expect(layer.bounds.y).toBeGreaterThanOrEqual(0)
        expect(layer.bounds.x + layer.bounds.w).toBeLessThanOrEqual(Math.ceil(surface.width))
        expect(layer.bounds.y + layer.bounds.h).toBeLessThanOrEqual(Math.ceil(surface.height))
      }
    }
  })
  it('hangs the garments in the sentence\'s order, the first on the right; unknown ones are left out', () => {
    const layers = items(world('jerusalem', '12:00', CALM), ['tee', 'nonesuch', 'coat'])
    expect(layers.map((l) => l.item.garment)).toEqual(['tee', 'coat'])
    expect(layers[0].item.x).toBeGreaterThan(layers[1].item.x)
  })
  it('a layer\'s key never changes with nothing but the phase, and changes with the light', () => {
    const w = world('jerusalem', '12:00', GALE(270))
    expect(wearLayers(w, LINE, PAPER, BOX).map((l) => l.key)).toEqual(wearLayers(w, LINE, PAPER, BOX).map((l) => l.key))
    const later = world('jerusalem', '16:30', GALE(270))
    expect(items(later)[0].key).not.toBe(items(w)[0].key)
  })
})
