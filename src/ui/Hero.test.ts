import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { makeForecast } from '../test/makeForecast'
import { Hero } from './Hero'

it('renders a negative feels-like temperature as one LTR isolate', () => {
  const { current } = makeForecast([])
  const markup = renderToStaticMarkup(createElement(Hero, {
    current: { ...current, temperature: -1, feelsLike: -5 },
    now: current.time,
  }))

  expect(markup).toContain('מרגיש כמו \u2066−5°\u2069')
  expect(markup).toContain('\u2066−1\u2069 מעלות')
})

it('timestamps a saved value from a previous hour instead of labelling it as now', () => {
  const { current } = makeForecast([])
  const markup = renderToStaticMarkup(createElement(Hero, {
    current: { ...current, time: '2026-07-14T17:30' }, now: '2026-07-15T09:00',
  }))

  expect(markup).toContain('נתון אחרון מ־<time dateTime="2026-07-14T17:30"><bdi>14.7</bdi> ב־<bdi>17:30</bdi>')
  expect(markup).not.toContain('עכשיו')
})
