import { expect, it } from 'vitest'
import { skyHeight } from './cityHeight'

it.each([[6, 5.4], [100, 22], [238, 33.9], [1000, 34]])(
  'maps %s metres to %s scene pixels', (metres, pixels) => {
    expect(skyHeight(metres)).toBeCloseTo(pixels, 1)
  },
)
