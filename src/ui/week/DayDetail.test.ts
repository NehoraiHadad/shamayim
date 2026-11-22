import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { makeForecast } from '../../test/makeForecast'
import { DayDetail } from './DayDetail'

it('renders the daylight value with the sunrise isolate first for a sub-zero forecast', () => {
  const forecast = makeForecast([{ max: -1, min: -5 }])
  const day = forecast.days[0]
  const markup = renderToStaticMarkup(createElement(DayDetail, {
    day, forecast, now: `${day.date}T09:00`, nextDate: undefined,
  }))

  expect(markup).toContain('<dt>אור יום</dt><dd>\u206605:40\u2069–\u206619:45\u2069</dd>')
})
