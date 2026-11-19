import { useEffect, useRef, useState } from 'react'
import type { LocalTime } from '../domain/types'
import { shineOf, tonesAt } from '../scene/model/marks'
import { rgbOf } from '../scene/model/tone'
import type { GlyphDesc, LayerOf } from '../scene/model/types'
import { css, type PaintEnv } from '../scene/paint/hand'
import { paintMarks } from '../scene/paint/marks'
import { SCENE_PLACES } from '../test/scenePlaces'
import { GLYPH_SPECS, type GlyphKind } from '../world/glyphSpecs'
import type { WorldState } from '../world/types'
import { makeWorldBuilder } from '../world/world'
import { loadInput } from './sceneHarness'

/**
 * The glyph sheet (stage C4, `scene.html?sheet=glyphs`; still `docs/design/qa/canvas/c4/glyphs.png` by
 * `e2e/scene.glyphs.mjs`): every glyph kind and icon at scene size and at 4× (re-inked at that size, never a scaled
 * bitmap), in one place's world light at four hours: morning (the light on the left), afternoon (on the right: the glyph
 * mirrored, the icons drawn for that side), dusk (no side) and night (lit windows, lamps). Like `qa/glyphs/sheet-v1.png`.
 */
const KINDS: GlyphKind[] = ['minaret', 'church', 'synagogue', 'waterTower', 'castle', 'homes', 'chimney', 'highrise', 'cooling', 'silo', 'mast',
  'lighthouse', 'turbine', 'bridge', 'palms', 'orchard', 'vineyard', 'solar', 'westernWall', 'babShrine', 'azrieli', 'chordsBridge']
const HEIGHT: Partial<Record<GlyphKind, number>> = { minaret: 20, waterTower: 18, chimney: 26, highrise: 28, silo: 16, mast: 20, lighthouse: 16,
  turbine: 20, bridge: 16, palms: 12, homes: 8, babShrine: 16, azrieli: 26, chordsBridge: 24 }
const HOURS: [string, LocalTime][] = [['08:00', '2026-11-17T08:00'], ['14:00', '2026-11-17T14:00'], ['16:30', '2026-11-17T16:30'],
  ['21:00', '2026-11-17T21:00']]
const CELL = { w: 64, h: 44 }
const BIG = { w: 150, h: 150 }

type SheetWindow = Window & { __sceneReady?: boolean; __sceneError?: string }

function env(scale: number): PaintEnv {
  return { hand: { grain: 1 }, phase: 0, scale, canvas: (w, h) => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w); canvas.height = Math.ceil(h)
    return { canvas, ctx: canvas.getContext('2d')! }
  } }
}

function Cell({ world, kind, zoom, w, h }: { world: WorldState; kind: GlyphKind; zoom: number; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr; canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const p = world.light.palette
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, p.mid); sky.addColorStop(1, p.horizon)
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
    const spec = GLYPH_SPECS[kind]
    const field = spec.field
    // A field lies on the ground's face: its rows reach down under the crest, so it stands higher in its cell.
    const groundY = h - (field ? 12 * zoom : 8 * Math.max(1, zoom / 2))
    ctx.fillStyle = css(rgbOf(p.ridgeNear))
    ctx.beginPath(); ctx.moveTo(0, groundY + 2); ctx.quadraticCurveTo(w / 2, groundY - 2, w, groundY + 2); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill()
    const gh = spec.h(HEIGHT[kind] ?? 0)
    const desc: GlyphDesc = { kind, x: w / 2, base: field ? groundY + 1.5 * zoom : groundY, h: gh, scale: zoom, w: spec.w * zoom, seed: 3,
      litSide: world.light.side, tones: tonesAt(world, 1.5), famous: false,
      ...(field ? { ground: Array.from({ length: spec.w + 1 }, (_, i) => -0.08 * (i - spec.w / 2)) } : {}) }
    const layer = { kind: 'marks', glyphs: [desc], shine: shineOf(world) } as unknown as LayerOf<'marks'>
    // On its own canvas, as the layer is in the scene: the grain takes only what the glyph draws.
    const own = env(dpr).canvas(w * dpr, h * dpr)
    own.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintMarks(own.ctx, layer, env(dpr))
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(own.canvas as HTMLCanvasElement, 0, 0)
  }, [world, kind, zoom, w, h])
  return <canvas ref={ref} style={{ width: w, height: h, display: 'block', borderRadius: 3 }} />
}

export function GlyphSheet() {
  const [worlds, setWorlds] = useState<WorldState[] | null>(null)
  useEffect(() => {
    const place = SCENE_PLACES.find((p) => p.id === 'rosh-pina')!
    const build = makeWorldBuilder()
    Promise.all(HOURS.map(([, at]) => loadInput(place, at, ''))).then((inputs) => {
      setWorlds(inputs.map((input) => build(input)))
      requestAnimationFrame(() => requestAnimationFrame(() => { (window as SheetWindow).__sceneReady = true }))
    }, (err: unknown) => { (window as SheetWindow).__sceneError = String(err) })
  }, [])
  if (!worlds) return null
  const label = { font: '600 11px Assistant, sans-serif', color: '#222' } as const
  return (
    <div style={{ background: '#f3f4f6', padding: 16, width: 'max-content', fontFamily: 'Assistant, sans-serif' }}>
      <div style={{ font: '700 18px Assistant, sans-serif', marginBottom: 4 }}>shamayim · canvas glyphs · C4</div>
      <div style={{ font: '400 12px Assistant, sans-serif', color: '#555', marginBottom: 12, maxWidth: 900 }}>
        Rosh Pina's world light at 08:00 (sun left), 14:00 (sun right: mirrored, icons drawn for that side), 16:30 (after sunset: no side)
        and 21:00 (night: lit windows, aviation lights). Scene size at dpr 2, and the 08:00 glyph re-inked at 4×.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `90px ${HOURS.map(() => `${CELL.w}px`).join(' ')} ${BIG.w}px ${HOURS.map(() => `${CELL.w}px`).join(' ')} ${BIG.w}px`, gap: 6, alignItems: 'center' }}>
        <div />
        {HOURS.map(([hour]) => <div key={hour} style={label}>{hour}</div>)}
        <div style={label}>08:00 at 4×</div>
        {HOURS.map(([hour]) => <div key={`b${hour}`} style={label}>{hour}</div>)}
        <div style={label}>08:00 at 4×</div>
        {Array.from({ length: Math.ceil(KINDS.length / 2) }, (_, row) => [KINDS[row * 2], KINDS[row * 2 + 1]]).map((pair) => [
          <div key={`n${pair[0]}`} style={{ font: '600 12px Assistant, sans-serif' }}>{pair[0]}<br /><span style={{ color: '#666', fontWeight: 400 }}>{pair[1] ?? ''}</span></div>,
          ...pair.flatMap((kind) => kind ? [
            ...worlds.map((world, i) => <Cell key={`${kind}${i}`} world={world} kind={kind} zoom={1} w={CELL.w} h={CELL.h} />),
            <Cell key={`${kind}big`} world={worlds[0]} kind={kind} zoom={4} w={BIG.w} h={BIG.h} />,
          ] : []),
        ])}
      </div>
    </div>
  )
}
