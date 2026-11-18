import { radarBand } from '../../data/overhead/radarBand'

type Wash = readonly (readonly [number, number, number, number])[]

/**
 * The rain ladder, light (קל), moderate (בינוני), heavy (חזק), as RGB and opacity over the map. On the light map
 * heavier rain is darker; on the dark map heavier is brighter. The hue path (blue → indigo/violet → plum/pink) is the
 * same in both, so the legend reads the same. Values: docs/design/radar-ux-fable.md §2; contrast in recolor.test.ts.
 */
export const RADAR_WASH: { light: Wash; dark: Wash } = {
  light: [[47, 127, 196, 0.78], [56, 72, 168, 0.86], [106, 15, 94, 0.95]],
  dark: [[74, 154, 216, 0.85], [176, 164, 255, 0.92], [255, 180, 230, 0.97]],
}

/** Clouds: chalk white with a shadow on the light map; a slate veil without shadow on the dark map. */
export const CLOUD_INK = {
  light: { rgb: [252, 251, 246], opacity: 0.95, shadow: 0.22 },
  dark: { rgb: [142, 151, 173], opacity: 0.6, shadow: 0 },
} as const
const SHADOW_RGB = [27, 38, 55]

/**
 * Paints in place. The callback runs for each visible echo, in pixel order, so the map can report
 * absence of echoes in its viewport without sampling the WebGL canvas.
 */
export function recolorRadar(pixels: Uint8ClampedArray, echo: (pixel: number) => void, dark = false): void {
  const wash = dark ? RADAR_WASH.dark : RADAR_WASH.light
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (!a) continue
    const [r, g, b, opacity] = wash[radarBand(pixels[i], pixels[i + 1], pixels[i + 2], a)]
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = a * opacity
    if (pixels[i + 3]) echo(i / 4)
  }
}

export function recolorClouds(pixels: Uint8ClampedArray, shadow = false, dark = false): void {
  const [r, g, b] = shadow ? SHADOW_RGB : CLOUD_INK[dark ? 'dark' : 'light'].rgb
  for (let i = 0; i < pixels.length; i += 4) {
    const cloud = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >= 245
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = cloud ? pixels[i + 3] : 0
  }
}
