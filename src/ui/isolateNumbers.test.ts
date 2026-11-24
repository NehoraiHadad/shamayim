import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ltr, PDI, RLI, tempText } from '../text/isolate'
import { isolateNumbers } from './isolateNumbers'

it('wraps bare clocks and keeps either minus spelling with the digits', () => {
  const parts = isolateNumbers('בשעה 05:40 בין -3° ל־−1°')
  expect(renderToStaticMarkup(createElement(Fragment, null, parts)))
    .toBe('בשעה <bdi>05:40</bdi> בין <bdi>−3°</bdi> ל־<bdi>−1°</bdi>')
})

it('keeps the range hyphen between separately isolated numbers', () => {
  const parts = isolateNumbers('10-15')
  expect(renderToStaticMarkup(createElement(Fragment, null, parts))).toBe('<bdi>10</bdi>-<bdi>15</bdi>')
})

it('preserves existing isolates, including nested ones, when wrapping bare numbers', () => {
  const isolated = `${tempText(-3)}, ${RLI}${ltr('−137')} מ׳${PDI}`
  const parts = isolateNumbers(`${isolated} בשעה 05:40`)
  expect(renderToStaticMarkup(createElement(Fragment, null, parts))).toBe(`${isolated} בשעה <bdi>05:40</bdi>`)
})
