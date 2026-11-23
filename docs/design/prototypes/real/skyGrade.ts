/*
 * The sky's grade for the concept page. The sky's base is a CSS background the surface lays (`skyBackground`, shared by
 * both hands), so a style cannot paint it: here its colours are regraded where they are laid. In phase 2 this is a need
 * of the contract (a style's own grade of the sky's stops), never DOM work.
 */

/** How far a blue is taken from its grey, and how far a mid tone is lifted. */
const CHROMA = 0.28, LIFT = 0.2

const curve = (v: number) => v + LIFT * v * (1 - v) * (1 - v) * 1.6

export function gradeRgb(rgb: readonly number[]): number[] {
  const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  // Only a blue sky's blues: a dusk's warm colours and a night's dark stay the model's.
  const gap = rgb[2] - rgb[0]
  const blue = Math.min(1, Math.max(0, gap * 4)) * Math.min(1, Math.max(0, y * 9 - 1)) * Math.min(1, 0.3 + Math.max(0, 0.44 - gap) * 3)
  return rgb.map((v) => Math.min(1, Math.max(0, (1 - blue) * v + blue * curve(y + (v - y) * (1 + CHROMA)))))
}

const regrade = (background: string) => background.replace(/rgba?\((\d+), ?(\d+), ?(\d+)/g, (all, r, g, b) =>
  (all.startsWith('rgba') ? 'rgba(' : 'rgb(') + gradeRgb([r / 255, g / 255, b / 255]).map((v) => Math.round(v * 255)).join(', '))

/** Regrades every sky canvas once, as the surface lays it. */
export function watchSky(): void {
  const done = new WeakMap<HTMLElement, string>()
  const grade = () => document.querySelectorAll<HTMLElement>('[data-sky-canvas]').forEach((sky) => {
    const laid = sky.style.background || sky.style.backgroundImage
    if (!laid || done.get(sky) === laid) return
    sky.style.background = regrade(laid)
    done.set(sky, sky.style.background || sky.style.backgroundImage)
  })
  new MutationObserver(grade).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] })
}
