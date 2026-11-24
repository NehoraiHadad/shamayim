import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSlotImage } from './fetchMask'

type Answer = () => Response
const image: Answer = () => new Response('png', { headers: { 'Content-Type': 'image/png' } })
const xml: Answer = () => new Response('<ServiceException/>', { headers: { 'Content-Type': 'text/xml' } })
const status = (code: number): Answer => () => new Response('', { status: code })
const unreachable: Answer = () => { throw new TypeError('Failed to fetch') }

function ask(answers: Answer[], signal = new AbortController().signal) {
  const fetched = vi.fn(async () => answers.shift()!())
  vi.stubGlobal('fetch', fetched)
  const pause = vi.fn(async () => {})
  return { result: fetchSlotImage('https://example.test/slot', signal, pause), fetched, pause }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('fetchSlotImage', () => {
  it.each([['503', status(503)], ['429', status(429)], ['no connection', unreachable]])(
    'asks once more after %s, with a wait between', async (_, failure) => {
      const { result, fetched, pause } = ask([failure, image])
      expect(await result).not.toBeNull()
      expect(fetched).toHaveBeenCalledTimes(2)
      expect(pause).toHaveBeenCalledTimes(1)
    })
  it('knows nothing after two failures, and asks no third time', async () => {
    const { result, fetched } = ask([status(503), unreachable, image])
    expect(await result).toBeNull()
    expect(fetched).toHaveBeenCalledTimes(2)
  })
  it.each([['a slot that is not out', xml], ['a wrong request', status(404)]])('does not ask again for %s', async (_, answer) => {
    const { result, fetched } = ask([answer, image])
    expect(await result).toBeNull()
    expect(fetched).toHaveBeenCalledTimes(1)
  })
  it('does not ask again once the place was left', async () => {
    const ctrl = new AbortController()
    const { result, fetched } = ask([() => { ctrl.abort(); return unreachable() }, image], ctrl.signal)
    expect(await result).toBeNull()
    expect(fetched).toHaveBeenCalledTimes(1)
  })
})
