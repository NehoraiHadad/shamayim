import { expect, it } from 'vitest'
import { sightingsNow } from '../domain/cloudSightings'
import { addMinutes } from '../domain/minutes'
import { rollForward } from '../domain/now'
import type { Forecast, LocalTime } from '../domain/types'
import { worldInput, type LoadedPlace } from './sceneWorld'
import { makeWorldBuilder, shownAir } from '../world/world'

const OBSERVED_AT = '2026-11-17T13:45'
const HELD_AT = '2026-11-17T14:00'

function satelliteFixture(loaded: LoadedPlace, model: number | null, observed: number, at = OBSERVED_AT) {
  const input = worldInput(loaded, at)
  const forecast: Forecast = model === null ? input.forecast : {
    ...input.forecast,
    hours: input.forecast.hours.map((hour) => ({ ...hour, cloudCover: model, thickCloud: model,
      cloudLow: model, cloudMid: 0, cloudHigh: 0 })),
  }
  return { ...input, forecast, observedCloud: { at, cover: observed } }
}

export function liveLightSatelliteCases(context: () => { loaded: LoadedPlace; bound: number }) {
  it('keeps sightings, lightning and light fixed when now passes a held storm preview', () => {
    const { loaded } = context()
    const selected = '2026-11-17T14:00'
    const input = worldInput(loaded, selected)
    const forecast: Forecast = {
      ...input.forecast,
      hours: input.forecast.hours.map((hour) => ({ ...hour, cloudCover: 25, thickCloud: 25,
        cloudLow: 25, cloudMid: 0, cloudHigh: 0,
        ...(hour.time === selected ? { weatherCode: 95, temperature: 18, precipitation: 2 } : {}) })),
    }
    const observedCloud = { at: addMinutes(selected, -15), cover: 25,
      sightings: [{ azimuth: 250, distanceKm: 8, widthKm: 6 }] }
    const seenClouds = sightingsNow(observedCloud, selected, 25)
    const build = makeWorldBuilder()
    const frame = (now: LocalTime, selection: LocalTime | null) => {
      const frameInput = { ...input, forecast, now, selected: selection, observedCloud, seenClouds }
      const world = build(frameInput)
      const shown = shownAir(frameInput)
      return { preview: world.preview, seenClouds: shown.seenClouds, cloudsSeen: shown.cloudsSeen,
        banks: world.clouds.flatMap((layer) => layer.banks.filter((bank) => bank.seen)),
        thunderWeight: world.rain?.thunderWeight, light: world.light }
    }

    const before = frame(addMinutes(selected, -1), selected)
    expect(before).toMatchObject({ preview: true, seenClouds: [], cloudsSeen: 0, banks: [], thunderWeight: 0 })
    expect(frame(selected, selected)).toEqual(before)
    expect(frame(addMinutes(selected, 1), selected)).toEqual(before)

    const live = frame(selected, null)
    expect(live).toMatchObject({ preview: false, seenClouds, cloudsSeen: 1, thunderWeight: 1 })
    expect(live.banks).toHaveLength(1)
  })

  it.each([
    [25, 80, HELD_AT, 35],
    [97, 5, HELD_AT, 35],
    [null, 80, HELD_AT, 35],
    [null, 80, '2026-11-17T16:00', 40],
  ] as const)(
    'keeps model %s and satellite %s fixed at %s while now advances %s minutes', (model, observed, selected, minutes) => {
      const { loaded } = context()
      const input = satelliteFixture(loaded, model, observed)
      const build = makeWorldBuilder()
      let forecast = input.forecast
      const frames = Array.from({ length: minutes + 1 }, (_, minute) => {
        const now = addMinutes(OBSERVED_AT, minute)
        forecast = rollForward(forecast, now)
        const frame = { ...input, forecast, now, selected }
        const { clouds, cloudField, light } = build(frame)
        return { cover: shownAir(frame).cloudCover, clouds, field: cloudField!.field, light }
      })
      const readings = frames.map(({ cover, light }) => [cover, light.direct])
      const maxDirectStep = Math.max(...readings.slice(1).map(([, direct], i) => Math.abs(direct - readings[i][1])))
      console.info('Jerusalem held satellite preview', {
        model, observed, selected, at1345: readings[0], at1400: readings[15], last: readings.at(-1), maxDirectStep,
      })
      expect(readings.every(([cover]) => cover === readings[0][0])).toBe(true)
      for (const frame of frames) expect(frame).toEqual(frames[0])
    })

  it('matches the cover and light at a scrubbed minute when it becomes live', () => {
    const { loaded } = context()
    const input = satelliteFixture(loaded, 97, 80)
    const build = makeWorldBuilder()
    const scrub = { ...input, selected: HELD_AT }
    const live = { ...input, now: HELD_AT, forecast: rollForward(input.forecast, HELD_AT) }
    const scrubLight = build(scrub).light
    const liveLight = build(live).light
    const scrubCover = shownAir(scrub).cloudCover
    const liveCover = shownAir(live).cloudCover
    console.info('Jerusalem scrub and live at 14:00', { scrubCover, liveCover, scrub: scrubLight.direct, live: liveLight.direct })
    expect(scrubCover).toBe(liveCover)
    expect(scrubLight).toEqual(liveLight)
  })

  it.each([[40, [57, 57, 57 + 40 / 110]], [150, [97 - 40 / 110, 97, 97]]] as const)(
    'keeps live cover and direct light continuous across %s minutes of age', (boundary, expectedCover) => {
      const { loaded, bound } = context()
      const input = satelliteFixture(loaded, 97, 5, '2026-11-17T12:00')
      const build = makeWorldBuilder()
      const readings = [-1, 0, 1].map((offset) => {
        const now = addMinutes(input.observedCloud.at, boundary + offset)
        const live = { ...input, now, forecast: rollForward(input.forecast, now) }
        return { cover: shownAir(live).cloudCover, direct: build(live).light.direct }
      })
      const coverStep = Math.max(...readings.slice(1).map(({ cover }, i) => Math.abs(cover - readings[i].cover) / 100))
      const directStep = Math.max(...readings.slice(1).map(({ direct }, i) => Math.abs(direct - readings[i].direct)))
      console.info('Jerusalem satellite age boundary', { boundary, readings, coverStep, directStep, bound })
      expect(coverStep).toBeLessThan(bound)
      expect(directStep).toBeLessThan(bound)
      // The endpoints also show the fade begins at 40 minutes and reaches the model only at 150.
      for (const [i, { cover }] of readings.entries()) expect(cover).toBeCloseTo(expectedCover[i], 10)
    })
}
