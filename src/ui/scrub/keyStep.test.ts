import { describe, expect, it } from 'vitest'
import { keyStep } from './keyStep'

describe('keyStep', () => {
  it('maps RTL arrow, page, home and end keys in slot steps', () => {
    expect(keyStep('ArrowLeft', 10, 0, 23)).toBe(11)
    expect(keyStep('ArrowRight', 10, 0, 23)).toBe(9)
    expect(keyStep('ArrowUp', 10, 0, 23)).toBe(11)
    expect(keyStep('ArrowDown', 10, 0, 23)).toBe(9)
    expect(keyStep('PageUp', 10, 0, 23)).toBe(16)
    expect(keyStep('PageDown', 10, 0, 23)).toBe(4)
    expect(keyStep('Home', 10, 0, 23)).toBe(0)
    expect(keyStep('End', 10, 0, 23)).toBe(23)
  })

  it('clamps results to [first, last]', () => {
    expect(keyStep('ArrowRight', 0, 0, 23)).toBe(0)
    expect(keyStep('ArrowDown', 0, 0, 23)).toBe(0)
    expect(keyStep('PageDown', 2, 0, 23)).toBe(0)
    expect(keyStep('ArrowLeft', 23, 0, 23)).toBe(23)
    expect(keyStep('ArrowUp', 23, 0, 23)).toBe(23)
    expect(keyStep('PageUp', 20, 0, 23)).toBe(23)
  })

  it('supports minute-based steps for the valley slider', () => {
    expect(keyStep('ArrowLeft', 30, 0, 1440, 60)).toBe(90)
    expect(keyStep('ArrowRight', 30, 0, 1440, 60)).toBe(0)
    expect(keyStep('PageUp', 30, 0, 1440, 60)).toBe(390)
    expect(keyStep('PageDown', 500, 0, 1440, 60)).toBe(140)
    expect(keyStep('Home', 500, 0, 1440, 60)).toBe(0)
    expect(keyStep('End', 500, 0, 1440, 60)).toBe(1440)
  })

  it('returns null for unhandled keys such as Escape or Tab', () => {
    expect(keyStep('Escape', 10, 0, 23)).toBeNull()
    expect(keyStep('Tab', 10, 0, 23)).toBeNull()
    expect(keyStep('Enter', 10, 0, 23)).toBeNull()
  })
})
