import { SCENE_25D } from '../ui/sceneFlag'
import type { Layout } from './gl/renderer'

/**
 * Reads where the text band, the valley scene and the sun disc are, in the sky's own coordinates. The sky scrolls
 * with the page, so these stay put while scrolling and the air never trails the hill.
 * Elements are found by data attributes so the air stays decoupled from the components.
 */
export function readLayout(): Layout {
  const sky = document.querySelector('[data-sky]')
  const origin = sky?.getBoundingClientRect()
  const w = origin?.width || window.innerWidth
  const h = origin?.height || window.innerHeight
  const y0 = origin?.top ?? 0
  const x0 = origin?.left ?? 0
  const band = document.querySelector('[data-air-band]')?.getBoundingClientRect()
  const scene = document.querySelector('[data-scene]')?.getBoundingClientRect()
  // The hourly strip's sunrise/sunset marks also carry a bare `data-sun` and come first in the page, which hides the
  // scene's disc. `?scene=25d` asks for the disc itself; production keeps the old lookup until this is signed off.
  const sunEl = document.querySelector<HTMLElement>(SCENE_25D ? '[data-sun="up"]' : '[data-sun]')
  const sunBox = sunEl && sunEl.dataset.sun === 'up' ? sunEl.getBoundingClientRect() : null
  return {
    w,
    h,
    bandTop: band ? band.top - y0 : 0,
    bandBottom: band ? band.bottom - y0 : h * 0.5,
    sceneTop: scene ? scene.top - y0 : h * 0.55,
    sun: sunBox ? { x: sunBox.left - x0 + sunBox.width / 2, y: sunBox.top - y0 + sunBox.height / 2 } : null,
  }
}
