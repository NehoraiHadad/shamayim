import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { heightText, tempText } from '../text/isolate'
import { isolateNumbers } from './isolateNumbers'

it('wraps bare clocks and keeps either minus spelling with the digits', () => {
  const parts = isolateNumbers('בשעה 05:40 בין -3° ל־−1°')
  expect(renderToStaticMarkup(createElement(Fragment, null, parts)))
    .toBe('בשעה <bdi>05:40</bdi> בין <bdi>−3°</bdi> ל־<bdi>−1°</bdi>')
})

it('preserves existing isolates, including nested ones, when wrapping bare numbers', () => {
  const isolated = `${tempText(-3)}, ${heightText(-137)}`
  const parts = isolateNumbers(`${isolated} בשעה 05:40`)
  expect(renderToStaticMarkup(createElement(Fragment, null, parts))).toBe(`${isolated} בשעה <bdi>05:40</bdi>`)
})
