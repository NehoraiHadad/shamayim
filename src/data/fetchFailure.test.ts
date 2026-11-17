import { describe, expect, it } from 'vitest'
import { HttpError, toFetchFailure } from './fetchFailure'

describe('toFetchFailure', () => {
  it('429 is a busy service', () => expect(toFetchFailure(new HttpError(429, 'api.open-meteo.com')).cause).toBe('busy'))
  it('5xx is a busy service', () => expect(toFetchFailure(new HttpError(503, 'api.open-meteo.com')).cause).toBe('busy'))
  it('other HTTP errors fall back to network', () => expect(toFetchFailure(new HttpError(404, 'x')).cause).toBe('network'))
  it('a failed fetch is the network', () => expect(toFetchFailure(new TypeError('Failed to fetch')).cause).toBe('network'))
  it('a timeout is the network', () => {
    expect(toFetchFailure(new DOMException('timed out', 'TimeoutError')).cause).toBe('network')
  })
  it('tells a daily or hourly limit apart from a busy minute', () => {
    expect(toFetchFailure(new HttpError(429, 'h', 'Daily API request limit exceeded. Please try again tomorrow.')).cause)
      .toBe('limit-day')
    expect(toFetchFailure(new HttpError(429, 'h', 'Hourly API request limit exceeded. Please try again in the next hour.')).cause)
      .toBe('limit-hour')
    expect(toFetchFailure(new HttpError(429, 'h', 'Minutely API request limit exceeded. Please try again in one minute.')).cause)
      .toBe('busy')
    expect(toFetchFailure(new HttpError(503, 'h', 'Daily maintenance')).cause).toBe('busy')
  })
  it('keeps the message for the console', () => {
    expect(toFetchFailure(new HttpError(429, 'api.open-meteo.com')).message).toBe('HTTP 429 for api.open-meteo.com')
    expect(toFetchFailure('boom').message).toBe('boom')
  })
})
