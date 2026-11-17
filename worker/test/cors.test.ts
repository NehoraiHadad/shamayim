import { describe, expect, it } from 'vitest'
import { checkOrigin, parseOrigins } from '../src/cors'

const allowed = parseOrigins('https://shamayim.nehoraihadad.com, https://*.shamayim.pages.dev,http://localhost:5173')

describe('checkOrigin', () => {
  it('allows listed origins exactly', () => {
    expect(checkOrigin('https://shamayim.nehoraihadad.com', allowed)).toBe('allowed')
    expect(checkOrigin('http://localhost:5173', allowed)).toBe('allowed')
    expect(checkOrigin('http://localhost:5174', allowed)).toBe('denied')
  })

  it('allows one subdomain level under a wildcard entry', () => {
    expect(checkOrigin('https://feat-weather-proxy-worker.shamayim.pages.dev', allowed)).toBe('allowed')
    expect(checkOrigin('https://a1b2c3d4.shamayim.pages.dev', allowed)).toBe('allowed')
  })

  it('does not stretch a wildcard', () => {
    expect(checkOrigin('https://shamayim.pages.dev', allowed)).toBe('denied')
    expect(checkOrigin('https://a.b.shamayim.pages.dev', allowed)).toBe('denied')
    expect(checkOrigin('https://evilshamayim.pages.dev', allowed)).toBe('denied')
    expect(checkOrigin('http://x.shamayim.pages.dev', allowed)).toBe('denied')
    expect(checkOrigin('https://x.shamayim.pages.dev.evil.com', allowed)).toBe('denied')
  })

  it('lets requests without an Origin through', () => {
    expect(checkOrigin(null, allowed)).toBe('none')
  })
})
