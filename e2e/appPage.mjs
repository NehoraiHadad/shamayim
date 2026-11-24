import fs from 'node:fs'
import path from 'node:path'
import { utcOf } from '../src/astro/utc.ts'
import { addMinutes, minutesBetweenLocal } from '../src/domain/minutes.ts'
import { nowIn } from '../src/domain/now.ts'
import { BELOW_SEA_PLACES, SCENE_PLACES, SKYLINE_STUDY_PLACES, STILL_PLACES } from '../src/test/scenePlaces.ts'
import { SCENE_W } from '../src/world/sceneBox.ts'
import { DEFAULT_DAY, forecastForDay, root } from './harness.mjs'

const places = [...SCENE_PLACES, ...SKYLINE_STUDY_PLACES, ...STILL_PLACES, ...BELOW_SEA_PLACES]

function fixtureFor(place, day, groundM) {
  const forecast = JSON.parse(forecastForDay(day, place.id))
  forecast.elevation = groundM
  if (!forecast._synthetic || day === DEFAULT_DAY) return JSON.stringify(forecast)

  // Hold the synthetic weather at the same wall-clock hours on days with no recording.
  const shift = minutesBetweenLocal(`${DEFAULT_DAY}T00:00`, `${day}T00:00`)
  const move = (time) => addMinutes(time, shift)
  forecast.current.time = move(forecast.current.time)
  forecast.hourly.time = forecast.hourly.time.map(move)
  forecast.daily.time = forecast.daily.time.map((date) => move(`${date}T00:00`).slice(0, 10))
  for (const key of Object.keys(forecast.daily).filter((key) => /^sun(rise|set)/.test(key))) {
    forecast.daily[key] = forecast.daily[key].map(move)
  }
  return JSON.stringify(forecast)
}

/** Open the real app with recorded terrain, a shifted clock and no live services. */
export async function openAppPage(browser, base, { id, at, dpr, wx }) {
  const place = places.find((place) => place.id === id)
  if (!place) throw new Error(`unknown place ${id}`)
  const instant = utcOf(at, place.timezone)
  if (nowIn(place.timezone, instant) !== at) throw new RangeError(`Invalid wall time in ${place.timezone}: ${at}`)
  const panorama = fs.readFileSync(path.join(root, `src/test/fixtures/scene/${id}.panorama.json`), 'utf8')
  const forecast = fixtureFor(place, at.slice(0, 10), JSON.parse(panorama).groundM)
  const host = new URL(base).host
  const context = await browser.newContext({ viewport: { width: SCENE_W, height: 812 }, deviceScaleFactor: dpr,
    reducedMotion: 'reduce', serviceWorkers: 'block' })
  const refused = new Set()
  const errors = []
  try {
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (/\/v1\/forecast$/.test(url.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: forecast })
      }
      if (url.host === host) return route.continue()
      refused.add(url.host)
      return route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.addInitScript(({ place, panorama, timestamp }) => {
      localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
      localStorage.setItem(`shamayim:horizon:v3:${place.id}`, panorama)
      const RealDate = Date, offset = timestamp - RealDate.now()
      class ShiftedDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [ShiftedDate.now()])) }
        static now() { return RealDate.now() + offset }
      }
      window.Date = ShiftedDate
    }, { place, panorama, timestamp: instant.getTime() })
    // The app only reads the weather override on the dev server.
    const query = wx ? `?${new URLSearchParams({ wx })}` : ''
    await page.goto(`${base}/${query}`)
    return { context, page, refused, errors }
  } catch (error) {
    await context.close()
    throw error
  }
}
