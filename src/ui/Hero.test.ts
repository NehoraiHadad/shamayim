import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { makeForecast } from '../test/makeForecast'
import { Hero } from './Hero'

it('renders a negative feels-like temperature as one LTR isolate', () => {
  const { current } = makeForecast([])
  const markup = renderToStaticMarkup(createElement(Hero, {
    current: { ...current, temperature: -1, feelsLike: -5 },
  }))

  expect(markup).toContain('מרגיש כמו \u2066−5°\u2069')
  expect(markup).toContain('\u2066−1\u2069 מעלות')
})
