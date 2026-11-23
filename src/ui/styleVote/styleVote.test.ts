import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { mix, ratio } from '../../theme/contrast'
import { contrastSamples } from '../../theme/contrastSamples'
import { StyleVotePanel } from './StyleVotePanel'
import { SEE_OTHER, THANKS, VOTE, whatsappUrl } from './styleVoteText'
import type { StyleVoteState } from './useStyleVote'

const none = () => undefined
const panel = (state: Pick<StyleVoteState, 'style' | 'vote' | 'seenBoth'>) => renderToStaticMarkup(createElement(StyleVotePanel, {
  state: { ...state, choose: none, castVote: none, close: none }, placeName: 'חיפה', at: '2026-11-17T14:00', picked: false }))

describe('style panel', () => {
  it('asks to see the other style before a vote', () => {
    const html = panel({ style: 'real', vote: null, seenBoth: false })
    expect(html).toContain(SEE_OTHER)
    expect(html).not.toContain(VOTE)
    expect(html).toContain('role="radiogroup"')
    expect(html.match(/type="radio"/g)).toHaveLength(2)
  })

  it('offers the vote once both were seen', () => {
    const html = panel({ style: 'drawn', vote: null, seenBoth: true })
    expect(html).toContain(VOTE)
    expect(html).not.toContain(SEE_OTHER)
  })

  it('thanks and marks the choice, and offers a change on the other style', () => {
    const voted = panel({ style: 'drawn', vote: 'drawn', seenBoth: true })
    expect(voted).toContain(THANKS)
    expect(voted).not.toContain(VOTE)
    expect(voted.match(/הסגנון שהעדפתם/g)).toHaveLength(1)
    const other = panel({ style: 'real', vote: 'drawn', seenBoth: true })
    expect(other).toContain(VOTE)
    expect(other).not.toContain(THANKS)
  })
})

describe('WhatsApp message', () => {
  const text = (url: string) => new URL(url).searchParams.get('text')

  it('names the preferred style, the place and the hour shown, and no contact', () => {
    const url = whatsappUrl({ vote: 'drawn', style: 'real', placeName: 'חיפה', at: '2026-11-17T14:00' })
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(text(url)).toContain('הסגנון שאני מעדיף: מאויר.')
    expect(text(url)).toContain('חיפה, 17.11 בשעה 14:00.')
  })

  it('says so when there is no vote yet', () => {
    const message = text(whatsappUrl({ vote: null, style: 'real', placeName: 'חיפה', at: '2026-11-17T09:30' }))
    expect(message).toContain('עוד לא בחרתי. מוצג לי הסגנון: מציאותי.')
    expect(message).not.toContain('מעדיף')
  })
})

/** Mirrors StyleVote.module.css: everything is mixed from the paper's ink. */
describe('style panel contrast (WCAG AA)', () => {
  for (const { name, paper } of contrastSamples) {
    it(`${name}: texts ≥ 4.5, the vote's border ≥ 3`, () => {
      const wash = mix(paper.sheet, paper.sheetInk, 0.09)
      expect(ratio(paper.sheetInk, wash), 'style not shown').toBeGreaterThanOrEqual(4.5)
      expect(ratio(paper.sheet, paper.sheetInk), 'style shown').toBeGreaterThanOrEqual(4.5)
      expect(ratio(paper.sheetMuted, paper.sheet), 'toggle and link').toBeGreaterThanOrEqual(4.5)
      expect(ratio(mix(paper.sheet, paper.sheetInk, 0.6), paper.sheet), 'vote border').toBeGreaterThanOrEqual(3)
    })
  }
})
