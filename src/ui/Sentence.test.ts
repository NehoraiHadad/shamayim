import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Sentence } from './Sentence'

it('puts the night forecast and the next day into separate paragraphs', () => {
  const markup = renderToStaticMarkup(createElement(Sentence, {
    sentences: ['הלילה נעים, סביב 17°.', 'מחר צפוי גשם וחמים, עד 27°.'],
  }))

  expect(markup).toMatch(/<p[^>]*>הלילה.*?<\/p><p[^>]*>מחר/)
})
