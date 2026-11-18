import type { AddProtocolAction } from 'maplibre-gl'
import { recolorClouds, recolorRadar } from './recolor'

export const TILE_SIZE = 512
export const ECHO_GRID = 32
export const SAT_PROTOCOL = 'shamayim-sat'
export const RADAR_PROTOCOL = 'shamayim-radar'
export type TileResult = { echoes?: Uint8Array } | 'failed'

const SHADOW_MARGIN = 16

function paddedWmsUrl(url: string) {
  const padded = new URL(url)
  const [west, south, east, north] = padded.searchParams.get('bbox')!.split(',').map(Number)
  const dx = (east - west) * SHADOW_MARGIN / TILE_SIZE
  const dy = (north - south) * SHADOW_MARGIN / TILE_SIZE
  padded.searchParams.set('bbox', [west - dx, south - dy, east + dx, north + dy].join(','))
  padded.searchParams.set('width', String(TILE_SIZE + 2 * SHADOW_MARGIN))
  padded.searchParams.set('height', String(TILE_SIZE + 2 * SHADOW_MARGIN))
  return padded.href
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas is unavailable')
  return context
}

/** Meteosat pixels are ~4 km: blur the mask so clouds read as soft shapes, not blocks. */
const CLOUD_BLUR_PX = 3

function softened(mask: HTMLCanvasElement) {
  const ctx = canvasOf(mask.width, mask.height)
  ctx.filter = `blur(${CLOUD_BLUR_PX}px)`
  ctx.drawImage(mask, 0, 0)
  return ctx.canvas
}

function cropped(padded: HTMLCanvasElement) {
  const ctx = canvasOf(TILE_SIZE, TILE_SIZE)
  ctx.drawImage(padded, -SHADOW_MARGIN, -SHADOW_MARGIN)
  return ctx.canvas
}

function offsetShadow(mask: HTMLCanvasElement) {
  const ctx = canvasOf(TILE_SIZE, TILE_SIZE)
  // Move the mask off-canvas and cast only its shadow onto the tile.
  ctx.shadowColor = '#1b2637'
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = mask.width + 2
  ctx.shadowOffsetY = 2
  ctx.drawImage(mask, -mask.width - SHADOW_MARGIN, -SHADOW_MARGIN)
  return ctx.canvas
}

export function tileProtocol(results: Map<string, TileResult>): AddProtocolAction {
  return async ({ url }, { signal }) => {
    const radar = url.startsWith(RADAR_PROTOCOL)
    const shadow = url.startsWith(`${SAT_PROTOCOL}://shadow/`)
    try {
      const separator = url.indexOf('https://')
      if (separator === -1) throw new Error('Weather tile URL must use HTTPS')
      const upstream = url.slice(separator)
      // Cloud tiles come padded so the blur (and the shadow) can reach across tile edges without seams.
      const response = await fetch(radar ? upstream : paddedWmsUrl(upstream), {
        signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
      })
      if (!response.ok) throw new Error(`Weather tile returned ${response.status}`)
      const original = await createImageBitmap(await response.blob())
      const { width, height } = original
      const ctx = canvasOf(width, height)
      try {
        ctx.drawImage(original, 0, 0)
      } finally {
        original.close()
      }
      const pixels = ctx.getImageData(0, 0, width, height)
      const echoes = radar ? new Uint8Array(ECHO_GRID ** 2) : undefined
      if (echoes) recolorRadar(pixels.data, (i) => {
        const col = Math.floor(i % width * ECHO_GRID / width)
        const row = Math.floor(Math.floor(i / width) * ECHO_GRID / height)
        echoes[row * ECHO_GRID + col] = 1
      })
      else recolorClouds(pixels.data, shadow)
      ctx.putImageData(pixels, 0, 0)
      const data = await createImageBitmap(radar ? ctx.canvas : shadow ? offsetShadow(softened(ctx.canvas)) : cropped(softened(ctx.canvas)))
      if (signal.aborted) data.close()
      signal.throwIfAborted()
      results.set(url, { echoes })
      return { data }
    } catch (error) {
      if (!signal.aborted) results.set(url, 'failed')
      throw error
    }
  }
}
