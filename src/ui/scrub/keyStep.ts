const DEFAULT_PAGE = 6

/**
 * Map a navigation key on the RTL time axis (left/up = later, right/down = earlier) to a
 * clamped value in [first, last], or null for keys this control does not handle.
 */
export function keyStep(
  key: string,
  current: number,
  first: number,
  last: number,
  step = 1,
  page = DEFAULT_PAGE,
): number | null {
  let target: number
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      target = current + step
      break
    case 'ArrowRight':
    case 'ArrowDown':
      target = current - step
      break
    case 'PageUp':
      target = current + page * step
      break
    case 'PageDown':
      target = current - page * step
      break
    case 'Home':
      target = first
      break
    case 'End':
      target = last
      break
    default:
      return null
  }
  return Math.max(first, Math.min(last, target))
}
