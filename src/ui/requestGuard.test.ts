import { describe, expect, it, vi } from 'vitest'
import { createRequestGuard } from './requestGuard'

describe('createRequestGuard', () => {
  it('invalidates and aborts an in-flight request on cancel (close or manual select)', () => {
    const guard = createRequestGuard()
    const req = guard.start()
    expect(req.isCurrent()).toBe(true)
    expect(req.signal.aborted).toBe(false)

    guard.cancel()
    expect(req.isCurrent()).toBe(false)
    expect(req.signal.aborted).toBe(true)
  })

  it('invalidates an earlier request when a newer one starts', () => {
    const guard = createRequestGuard()
    const first = guard.start()
    const second = guard.start()

    expect(first.isCurrent()).toBe(false)
    expect(first.signal.aborted).toBe(true)
    expect(second.isCurrent()).toBe(true)
    expect(second.signal.aborted).toBe(false)
  })

  it('ignores stale geolocation and reverse-geocode callbacks arriving after close or manual choice', async () => {
    const guard = createRequestGuard()
    const onSelect = vi.fn()
    const onError = vi.fn()

    // Case 1: picker closes before geolocation responds.
    const req1 = guard.start()
    guard.cancel()
    if (req1.isCurrent()) onSelect('stale-geo')
    if (req1.isCurrent()) onError('stale-err')

    // Case 2: geolocation responded, reverse-geocode resolves after manual choice.
    const req2 = guard.start()
    let resolveReverse!: (name: string) => void
    const reverse = new Promise<string>((resolve) => { resolveReverse = resolve })
    const settled = reverse.then((name) => { if (req2.isCurrent()) onSelect(name) })
    guard.cancel()
    resolveReverse('stale-reverse')
    await settled

    expect(onSelect).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
