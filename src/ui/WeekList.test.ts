import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { makeForecast, TODAY } from '../test/makeForecast'
import { WeekList } from './WeekList'

const daily = { max: 22, min: 12 }

it('omits an expired week', () => {
  const forecast = makeForecast([daily])
  expect(renderToStaticMarkup(createElement(WeekList, { forecast, now: `${TODAY}T09:00` }))).toBe('')
})

it('omits a past day and still labels tomorrow when today is missing', () => {
  const forecast = makeForecast([daily, daily, daily, daily])
  forecast.days = forecast.days.filter(day => day.date !== TODAY)
  const markup = renderToStaticMarkup(createElement(WeekList, { forecast, now: `${TODAY}T09:00` }))

  expect(markup).not.toContain('day-2026-07-14')
  expect(markup).toMatch(/aria-controls="day-2026-07-16" aria-label="מחר,/)
  expect(markup).not.toMatch(/aria-controls="day-2026-07-17" aria-label="מחר,/)
})
