import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IconButton } from './IconButton'
import { CloseIcon, PauseIcon, PlayIcon } from './icons'

describe('IconButton and shared icons', () => {
  it('renders a typed button with aria-label and hidden 24x24 SVG icons', () => {
    const close = renderToStaticMarkup(createElement(IconButton, { label: 'סגירה' }, createElement(CloseIcon)))
    expect(close).toContain('type="button"')
    expect(close).toContain('aria-label="סגירה"')
    expect(close).toContain('viewBox="0 0 24 24"')
    expect(close).toContain('stroke="currentColor"')
    expect(close).toContain('aria-hidden="true"')

    const play = renderToStaticMarkup(createElement(PlayIcon))
    expect(play).toContain('viewBox="0 0 24 24"')
    expect(play).toContain('fill="currentColor"')
    expect(play).toContain('aria-hidden="true"')

    const pause = renderToStaticMarkup(createElement(PauseIcon))
    expect(pause).toContain('viewBox="0 0 24 24"')
    expect(pause).toContain('fill="currentColor"')
    expect(pause).toContain('aria-hidden="true"')
  })
})
