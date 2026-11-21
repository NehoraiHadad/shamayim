import type { Box } from './types'
import type { BuildEnv } from './vegBuilders'
import type { Footprint } from './vegFootprint'

export { vegBuffers as emptyBuf } from './vegDescriptor'

const overlaps = ([l, t, r, b]: Footprint, box: Box) => r > box.x && l < box.x + box.w && b > box.y && t < box.y + box.h

export function flatEnv(cover: number, scale = 12, clear: readonly Box[] = [],
  patches: readonly (Box & { cover: number })[] = []): BuildEnv {
  return {
    sx: 1, horizonY: 40, koppen: 'M', solarMonth: 6, crestAt: () => 50, footAt: () => 128,
    scaleAt: () => scale, farScale: () => scale,
    fits: (area, accepts, mapped) => !clear.some((b) => overlaps(area, b)) && accepts(cover)
      && patches.every((b) => !overlaps(area, b) || accepts(b.cover)) && (!mapped || mapped(area, 1, 1)),
  }
}
