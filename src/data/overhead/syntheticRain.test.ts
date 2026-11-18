import { describe, expect, it } from 'vitest'
import { radarBand } from './radarBand'
import { bandAt, newestFrame, paintTile, parseRain, RAIN_PRESETS, syntheticIndex, syntheticOutlook,
  syntheticPainter } from './syntheticRain'

const now = Date.UTC(2026, 10, 18, 12, 7)
const shadmot: [number, number] = [35.5, 32.4]
const outlook = (preset: string) => syntheticOutlook(parseRain(preset), shadmot[1], now)

describe('synthetic rain for ?rain=', () => {
  it('reads presets and explicit discs, and skips malformed parts', () => {
    expect(parseRain('far')).toEqual([{ bearing: 0, km: 230, radiusKm: 30, band: 2, toward: 0, kmh: 0 }])
    expect(parseRain('90:10:5:3:180:20,bad,1:2:3:9')).toEqual([{ bearing: 90, km: 10, radiusKm: 5, band: 3, toward: 180, kmh: 20 }])
    expect(parseRain('none')).toEqual([])
    for (const preset of Object.keys(RAIN_PRESETS).filter((p) => p !== 'none')) expect(parseRain(preset)).toHaveLength(1)
  })

  it('moves a disc backwards in time along its heading, with a lighter rim', () => {
    const [blob] = parseRain('0:0:20:3:90:60')
    expect(bandAt([blob], now, now, 0, 0)).toBe(3)
    expect(bandAt([blob], now, now, 15, 0)).toBe(2)
    expect(bandAt([blob], now, now, 21, 0)).toBe(0)
    // Half an hour ago it was 30 km west.
    expect(bandAt([blob], now, now - 30 * 60_000, -30, 0)).toBe(3)
  })

  it('gives an index of 13 frames ten minutes apart, newest a few minutes behind now', () => {
    const { host, frames } = syntheticIndex(now)
    expect(host).toBe('https://synthetic.invalid')
    expect(frames).toHaveLength(13)
    expect(frames.at(-1)!.time).toBe(newestFrame(now))
    expect(now - frames.at(-1)!.time).toBeGreaterThanOrEqual(5 * 60_000)
    expect(frames[1].time - frames[0].time).toBe(10 * 60_000)
  })

  it('drives every preset through the real nowcast', () => {
    const arrive = outlook('arrive')
    expect(arrive.now).toBe(0)
    expect(arrive.arrivesIn).toBeGreaterThan(20)
    expect(arrive.approach?.bearing).toBeCloseTo(270, -1)
    expect(arrive.motion?.heading).toBeCloseTo(90, -1)
    expect(outlook('here').now).toBe(3)
    const pass = outlook('pass')
    expect(pass.arrivesIn).toBeNull()
    expect(pass.nearest!.km).toBeLessThan(80)
    expect(outlook('far').nearest!.km).toBeGreaterThan(180)
    const still = outlook('still')
    expect(still.motion?.kmh ?? 0).toBeLessThan(4)
    expect(still.nearest!.band).toBe(1)
    expect(outlook('none').nearest).toBeNull()
    expect(arrive.at).toBe(newestFrame(now))
  })

  it('paints tiles whose colours the radar decoder reads back as the same bands', () => {
    // z6 tile 38/25 holds the place; the 'here' disc is over it.
    const pixels = paintTile(parseRain('here'), shadmot, now, newestFrame(now), 6, 38, 25, 64)
    const bands = new Set<number>()
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) bands.add(radarBand(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]) + 1)
    expect([...bands].sort()).toEqual([2, 3])
  })

  it('paints only synthetic URLs', () => {
    const paint = syntheticPainter(parseRain('here'), shadmot, now)
    const sec = newestFrame(now) / 1000
    expect(paint(`https://synthetic.invalid/synthetic/${sec}/64/6/38/25/2/1_1.png`)?.size).toBe(64)
    expect(paint('https://tilecache.rainviewer.com/v2/radar/1/512/6/38/25/2/1_1.png')).toBeNull()
  })
})
