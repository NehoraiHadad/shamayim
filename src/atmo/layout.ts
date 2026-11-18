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
  const sceneEl = document.querySelector<HTMLElement>('[data-scene]')
  const scene = sceneEl?.getBoundingClientRect()
  // Only the scene's disc while it is up: the hourly strip's sunrise/sunset marks also carry a bare `data-sun` and
  // come first in the page, so `[data-sun]` used to find them and the air never saw the sun.
  const sunEl = document.querySelector<HTMLElement>('[data-sun="up"]')
  const sunBox = sunEl?.getBoundingClientRect() ?? null
  return {
    w,
    h,
    bandTop: band ? band.top - y0 : 0,
    bandBottom: band ? band.bottom - y0 : h * 0.5,
    sceneTop: scene ? scene.top - y0 : h * 0.55,
    afterglow: scene && sceneEl ? readAfterglow(sceneEl, scene.left - x0, scene.width) : null,
    moon: readMoon(x0, y0),
    sun: sunBox ? { x: sunBox.left - x0 + sunBox.width / 2, y: sunBox.top - y0 + sunBox.height / 2 } : null,
  }
}

/** The afterglow the scene publishes (see `ui/scene/afterglow.ts`), placed in sky px. */
function readAfterglow(el: HTMLElement, left: number, width: number) {
  const { afterglow, afterglowX, afterglowRgb } = el.dataset
  if (afterglow === undefined || afterglowX === undefined || !afterglowRgb) return null
  const rgb = afterglowRgb.split(',').map(Number) as [number, number, number]
  return { altitude: Number(afterglow), x: left + Number(afterglowX) * width, rgb }
}

/** The moon disc's centre and its light on the clouds, as the scene publishes it (`data-moon-light`). */
function readMoon(x0: number, y0: number) {
  const el = document.querySelector<HTMLElement>('[data-moon-light]')
  const light = Number(el?.dataset.moonLight ?? 0)
  if (!el || !(light > 0)) return null
  const box = el.getBoundingClientRect()
  return { x: box.left - x0 + box.width / 2, y: box.top - y0 + box.height / 2, light }
}
