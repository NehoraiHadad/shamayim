export interface Oklab { l: number; a: number; b: number }

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function hexToOklab(hex: string): Oklab {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const r = channel(1), g = channel(3), b = channel(5)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

export function oklabToHex({ l, a, b }: Oklab): string {
  const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const encode = (value: number) => {
    const linear = clamp(value)
    const srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
    return Math.round(clamp(srgb) * 255).toString(16).padStart(2, '0')
  }
  return `#${encode(4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z)}${encode(-1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z)}${encode(-0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z)}`.toUpperCase()
}

export function mixOklab(from: string, to: string, amount: number): string {
  const a = hexToOklab(from), b = hexToOklab(to), t = clamp(amount)
  return oklabToHex({ l: a.l + (b.l - a.l) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t })
}

export function deltaE(a: string, b: string): number {
  const x = hexToOklab(a), y = hexToOklab(b)
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}
