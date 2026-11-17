import type { Layout } from './gl/renderer'

/**
 * Reads where the text band, the valley scene and the sun disc are on screen right now.
 * Elements are found by data attributes so the air stays decoupled from the components.
 */
export function readLayout(): Layout {
  const w = window.innerWidth
  const h = window.innerHeight
  const band = document.querySelector('[data-air-band]')?.getBoundingClientRect()
  const scene = document.querySelector('[data-scene]')?.getBoundingClientRect()
  const sunEl = document.querySelector<HTMLElement>('[data-sun]')
  const sunBox = sunEl && sunEl.dataset.sun === 'up' ? sunEl.getBoundingClientRect() : null
  return {
    w,
    h,
    bandTop: band?.top ?? 0,
    bandBottom: band?.bottom ?? h * 0.5,
    sceneTop: scene?.top ?? h * 0.55,
    sun: sunBox ? { x: sunBox.left + sunBox.width / 2, y: sunBox.top + sunBox.height / 2 } : null,
  }
}
