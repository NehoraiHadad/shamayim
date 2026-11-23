const BOOT_CHANNEL_LIMIT = 12
const BOOT_MAX = 0.20
const HIDE_CHANNEL_LIMIT = 6
const HIDE_MIN = 0.60

export const STILL_OPTIONS = {
  animations: 'disabled',
  style: '*, *::before, *::after { transition: none !important; animation: none !important; }',
}

export async function waitForSky(page) {
  const deadline = performance.now() + 15_000
  const remaining = () => Math.max(1, Math.ceil(deadline - performance.now()))
  try {
    // A pair of equal CSS fallback frames would tell us nothing before the compositor paints.
    await page.waitForFunction(() => {
      const steps = window.__sceneStats?.steps
      return steps?.['firstPaint.sky']?.length || steps?.['frame.sky']?.length
    }, null, { timeout: remaining() })
    let previous
    while (performance.now() < deadline) {
      const shot = await page.screenshot({ ...STILL_OPTIONS, scale: 'css', timeout: remaining() })
      if (previous?.equals(shot)) return true
      previous = shot
    }
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error
  }
  return false
}

/** Check the composited sky above the scene and the separate sky canvas backing pixels. */
export async function skyProblem(page) {
  const width = page.viewportSize().width
  // Keep only whole CSS pixel rows above the figure so a fractional edge never samples the land.
  const height = await page.evaluate(() => {
    const figure = document.querySelector('figure[data-canvas]')
    return figure ? Math.floor(figure.getBoundingClientRect().top + scrollY) : 0
  })
  if (height <= 0) return 'no sky region above the scene figure'

  // With empty storage the served HTML paints its --boot-bg fallback before React or the CSS bundles load.
  const response = await page.request.get(page.url())
  const boot = (await response.text()).match(/var\(\s*--boot-bg\s*,\s*(#[\da-f]{6})\s*\)/i)?.[1]
  if (!response.ok() || !boot) return 'could not read the --boot-bg fallback from the served index.html'

  const options = { ...STILL_OPTIONS, fullPage: true, clip: { x: 0, y: 0, width, height }, scale: 'css' }
  const visible = await page.screenshot(options)
  // Playwright removes its screenshot stylesheet after capture, so visibility and layout are restored.
  const hidden = await page.screenshot({ ...options, style: `${options.style}\n[data-sky] { visibility: hidden !important; }` })
  const result = await page.evaluate(async ({ visible, hidden, boot, width, height, bootLimit, hideLimit }) => {
    const decode = async (base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), { colorSpaceConversion: 'none' })
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d', { colorSpace: 'srgb' })
      ctx.drawImage(bitmap, 0, 0)
      const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
      bitmap.close()
      return pixels
    }
    const [a, b] = await Promise.all([decode(visible), decode(hidden)])
    if (a.width !== width || b.width !== width || a.height !== height || b.height !== height) {
      return { problem: `expected ${width}x${height} CSS screenshots, got ${a.width}x${a.height} and ${b.width}x${b.height}` }
    }

    const [r, g, blue] = boot.slice(1).match(/../g).map((channel) => parseInt(channel, 16))
    let nearBoot = 0, changed = 0
    for (let i = 0; i < a.data.length; i += 4) {
      const red = a.data[i], green = a.data[i + 1], bBlue = a.data[i + 2]
      if (Math.max(Math.abs(red - r), Math.abs(green - g), Math.abs(bBlue - blue)) <= bootLimit) nearBoot++
      if (Math.max(Math.abs(red - b.data[i]), Math.abs(green - b.data[i + 1]),
        Math.abs(bBlue - b.data[i + 2])) > hideLimit) changed++
    }

    const canvas = document.querySelector('[data-sky] canvas[data-sky-canvas]')
    let backing = 'missing'
    if (canvas) {
      backing = `${canvas.width}x${canvas.height}`
      if (canvas.width && canvas.height) {
        // Copy backing pixels alone. The canvas's CSS gradient does not contribute alpha here.
        const ctx = new OffscreenCanvas(canvas.width, canvas.height).getContext('2d')
        ctx.drawImage(canvas, 0, 0)
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        if (data.some((value, i) => i % 4 === 3 && value !== 0)) return { nearBoot, changed, backing, hasInk: true }
        backing += ' fully transparent'
      }
    }
    return { nearBoot, changed, backing, hasInk: false }
  }, { visible: visible.toString('base64'), hidden: hidden.toString('base64'), boot, width, height,
    bootLimit: BOOT_CHANNEL_LIMIT, hideLimit: HIDE_CHANNEL_LIMIT })
  if (result.problem) return result.problem

  const total = width * height
  const bootRatio = result.nearBoot / total, changedRatio = result.changed / total
  const percent = (ratio) => `${(ratio * 100).toFixed(3)}%`
  const metrics = `sky ${width}x${height} CSS px  boot ${boot} ${percent(bootRatio)} (${result.nearBoot}/${total})`
    + `  sky-hide ${percent(changedRatio)} (${result.changed}/${total})  canvas ${result.backing}`
  const problems = []
  if (bootRatio > BOOT_MAX) problems.push(`boot-colour pixels > ${percent(BOOT_MAX)}`)
  if (changedRatio < HIDE_MIN) problems.push(`pixels changed by hiding sky < ${percent(HIDE_MIN)}`)
  if (!result.hasInk) problems.push('sky canvas has no backing pixels with non-zero alpha')
  if (problems.length) return `${problems.join(', ')}  ${metrics}`
  console.log(`ok   ${metrics}`)
  return null
}
