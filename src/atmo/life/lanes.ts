/** Where the text band and the valley scene are, in the sky's own coordinates: the birds' lanes hang off them. */
export interface Lanes {
  w: number
  bandTop: number
  bandBottom: number
  sceneTop: number
}

/**
 * Read from the page by data attributes, so the birds stay decoupled from the components (`[data-sky]`, the sky;
 * `[data-air-band]`, the text band; `[data-scene]`, the valley's figure). The sky scrolls with the page, so these stay
 * put while scrolling.
 */
export function readLanes(): Lanes {
  const origin = document.querySelector('[data-sky]')?.getBoundingClientRect()
  const w = origin?.width || window.innerWidth
  const h = origin?.height || window.innerHeight
  const y0 = origin?.top ?? 0
  const band = document.querySelector('[data-air-band]')?.getBoundingClientRect()
  const scene = document.querySelector('[data-scene]')?.getBoundingClientRect()
  return {
    w,
    bandTop: band ? band.top - y0 : 0,
    bandBottom: band ? band.bottom - y0 : h * 0.5,
    sceneTop: scene ? scene.top - y0 : h * 0.55,
  }
}
