import { useEffect, useRef } from 'react'
import { css, type PaintEnv } from '../scene/paint/hand'
import { paintCloud, paintShaft, type CloudSprite, type SpriteGenus } from '../scene/paint/clouds/index'
import { rng } from '../scene/paint/core'
import type { RGB } from '../world/types'

/**
 * The cloud sheet (track D, `scene.html?sheet=clouds`; still by `e2e/scene.clouds.mjs`): every genus the field paints, at
 * scene size and at 3×, in four lights: high sun, low sun behind (silver), overcast grey, moonlit night. The painters'
 * proving ground, judged against the anidoodle craft bar before they go into the scene.
 */
interface Light { name: string; sky: [string, string]; body: RGB; shade: RGB; lit: RGB; litA: number; toward: [number, number] | null; silver: number; glow: number }
const LIGHTS: Light[] = [
  { name: 'high sun', sky: ['#4f86c6', '#a9c9e6'], body: [0.94, 0.95, 0.97], shade: [0.58, 0.63, 0.72], lit: [1, 0.99, 0.95], litA: 0.8, toward: [-0.6, -0.8], silver: 0.05, glow: 0 },
  { name: 'low sun behind', sky: ['#5a79a8', '#f2c48e'], body: [0.62, 0.6, 0.66], shade: [0.36, 0.36, 0.44], lit: [1, 0.86, 0.62], litA: 0.6, toward: [0.95, 0.3], silver: 0.8, glow: 0.5 },
  { name: 'overcast', sky: ['#8c939c', '#b7bcc2'], body: [0.72, 0.74, 0.77], shade: [0.42, 0.45, 0.5], lit: [0.85, 0.86, 0.88], litA: 0.1, toward: null, silver: 0, glow: 0 },
  { name: 'moonlit', sky: ['#0d1626', '#243650'], body: [0.26, 0.3, 0.38], shade: [0.1, 0.12, 0.17], lit: [0.62, 0.68, 0.8], litA: 0.5, toward: [-0.4, -0.9], silver: 0.3, glow: 0 },
]
interface Form { genus: SpriteGenus; w: number; under: number; tall: number; lean: number; tau: number; rains?: boolean; axis?: number }
const FORMS: Form[] = [
  { genus: 'cu', w: 60, under: 4, tall: 34, lean: 0.3, tau: 30 },
  { genus: 'cg', w: 54, under: 3, tall: 70, lean: 0.4, tau: 70 },
  { genus: 'cb', w: 90, under: 5, tall: 95, lean: 0.5, tau: 140, rains: true },
  { genus: 'sc', w: 80, under: 8, tall: 6, lean: 0, tau: 18 },
  { genus: 'st', w: 110, under: 5, tall: 3, lean: 0, tau: 10 },
  { genus: 'ac', w: 80, under: 14, tall: 4, lean: 0, tau: 5 },
  { genus: 'as', w: 120, under: 18, tall: 6, lean: 0, tau: 12 },
  { genus: 'ns', w: 120, under: 16, tall: 10, lean: 0, tau: 90, rains: true },
  { genus: 'ci', w: 80, under: 5, tall: 8, lean: 0.6, tau: 1, axis: 0.15 },
  { genus: 'cs', w: 120, under: 8, tall: 6, lean: 0, tau: 1.5 },
]
const CELL = { w: 150, h: 130 }

function env(scale: number): PaintEnv {
  return { hand: { grain: 1 }, phase: 0, scale, canvas: (w, h) => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w); canvas.height = Math.ceil(h)
    return { canvas, ctx: canvas.getContext('2d')! }
  } }
}

function spriteOf(f: Form, l: Light, seed: number): CloudSprite {
  return { ...f, seed, rains: f.rains ?? false, body: l.body, shade: l.shade, lit: l.lit, litA: l.litA, toward: l.toward,
    silver: l.silver, glow: l.glow, share: 1 }
}

function Cell({ form, light, zoom }: { form: Form; light: Light; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const w = CELL.w * (zoom > 1 ? 2.2 : 1), h = CELL.h * (zoom > 1 ? 2.2 : 1)
  useEffect(() => {
    const canvas = ref.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr; canvas.height = h * dpr
    const c = canvas.getContext('2d')!
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, light.sky[0]); g.addColorStop(1, light.sky[1])
    c.fillStyle = g; c.fillRect(0, 0, w, h)
    const s = spriteOf(form, light, 7)
    const k = zoom > 1 ? 1.8 : 1
    const sk = { ...s, w: s.w * k, under: s.under * k, tall: s.tall * k }
    const baseY = h * 0.62 + (s.tall > 50 ? h * 0.18 : 0)
    if (s.rains) {
      c.save(); c.translate(w / 2, baseY + sk.under)
      paintShaft(c, { w: sk.w * 0.6, fall: h - baseY - sk.under, trail: -sk.w * 0.15, rate: 0.7, reaches: form.genus !== 'ns', tone: light.body }, rng(11))
      c.restore()
    }
    paintCloud(c, sk, w / 2, baseY, env(dpr))
    c.fillStyle = css([1, 1, 1], 0.8); c.font = '10px sans-serif'
    c.fillText(`${form.genus} · ${light.name}`, 4, 12)
  }, [form, light, zoom, w, h])
  return <canvas ref={ref} style={{ width: w, height: h, display: 'block' }} />
}

export function CloudSheet() {
  useEffect(() => { (window as Window & { __sceneReady?: boolean }).__sceneReady = true }, [])
  const zoom = Number(new URLSearchParams(location.search).get('zoom') ?? '1')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LIGHTS.length}, max-content)`, gap: 2, background: '#222' }}>
      {FORMS.flatMap(f => LIGHTS.map(l => <Cell key={f.genus + l.name} form={f} light={l} zoom={zoom} />))}
    </div>
  )
}
