import { describe, expect, it } from 'vitest'
import { RADAR_WASH, recolorClouds, recolorRadar } from './recolor'

describe('weather tile recoloring', () => {
  it('paints a synthetic 512 px rainy tile using RainViewer’s published Universal Blue RGBA colors', () => {
    const width = 512
    const pixels = new Uint8ClampedArray(width * width * 4)
    const returns = [
      [0x88, 0xdd, 0xee, 255], // 15 dBZ, light blue
      [0x00, 0x55, 0x88, 255], // 30 dBZ, dark blue
      [0xff, 0xee, 0x00, 255], // 35 dBZ, yellow
      [0xff, 0x44, 0x00, 255], // 45 dBZ, red-orange
      [0xff, 0xaa, 0xff, 255], // 55 dBZ, pink
      [0xd2, 0xc4, 0x8b, 160], // 11 dBZ, low-opacity weak return
    ]
    const bands = [0, 1, 1, 2, 2, 0]
    returns.forEach((rgba, i) => pixels.set(rgba, (width + i) * 4))
    const echoes: number[] = []
    recolorRadar(pixels, (i) => echoes.push(i))
    expect(echoes).toEqual(returns.map((_, i) => width + i))
    expect([...pixels.slice(0, 4)]).toEqual([0, 0, 0, 0])
    returns.forEach((rgba, i) => {
      const [r, g, b, alpha] = RADAR_WASH[bands[i]]
      const offset = (width + i) * 4
      expect([...pixels.slice(offset, offset + 4)]).toEqual([r, g, b, Math.round(rgba[3] * alpha)])
    })
  })

  it('keeps only the white cloud mask, with identical opacity in its shadow', () => {
    const image = [255, 255, 255, 255, 0, 192, 0, 255, 0, 0, 255, 255, 255, 255, 255, 0]
    const cloud = new Uint8ClampedArray(image)
    const shadow = new Uint8ClampedArray(image)
    recolorClouds(cloud)
    recolorClouds(shadow, true)
    expect([...cloud.slice(0, 4)]).toEqual([252, 251, 246, 255])
    expect([...shadow.slice(0, 4)]).toEqual([27, 38, 55, 255])
    expect([cloud[7], cloud[11], cloud[15], shadow[7], shadow[11], shadow[15]]).toEqual([0, 0, 0, 0, 0, 0])
  })
})
