import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SceneScrubber } from './SceneScrubber'

const BASE = {
  at: '2026-11-17T14:30',
  now: '2026-11-17T14:30',
  first: '2026-11-17T14:00',
  last: '2026-11-18T13:00',
  onScrub: vi.fn(),
  onRelease: vi.fn(),
  onNow: vi.fn(),
}

describe('SceneScrubber aria-valuetext', () => {
  it('isolates the current clock when readout is null', () => {
    const html = renderToStaticMarkup(createElement(SceneScrubber, { ...BASE, readout: null }))
    expect(html).toContain('aria-valuetext="עכשיו, \u206614:30\u2069"')
  })

  it('isolates bare clocks, percentages and counts in readout without double-isolating temperatures', () => {
    const readout = '15:00, גשום, \u2066−3°\u2069, סיכוי לגשם 40%, רוח 14 קמ״ש'
    const html = renderToStaticMarkup(createElement(SceneScrubber, { ...BASE, at: '2026-11-17T15:00', readout }))
    expect(html).toContain('aria-valuetext="\u206615:00\u2069, גשום, \u2066−3°\u2069, סיכוי לגשם \u206640%\u2069, רוח \u206614\u2069 קמ״ש"')
  })
})
