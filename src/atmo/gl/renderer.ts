import type { AirMotion } from '../motion'
import { AIR_FRAG, BLIT_FRAG, FULL_VERT } from './airShader'
import { setCloudLight } from './cloudLight'
import { fullScreenTriangle, program, renderTarget, type GL, type Program, type Target } from './glUtil'
import type { AirPalette } from './palette'
import { PARTICLE_FRAG, PARTICLE_VERT } from './particleShader'
import { bindParticleAttribs, drawField, particleBuffer } from './particles'
import { fieldUniforms } from './fieldUniforms'

/** Where things are on screen this frame, in CSS px. */
export interface Layout {
  w: number
  h: number
  bandTop: number
  bandBottom: number
  sceneTop: number
  sun: { x: number; y: number } | null
}

const AIR_SCALE = 1 / 3

/** Draws the air (low resolution, upsampled) and the particle fields into one WebGL canvas. */
export class AirRenderer {
  private gl: GL
  private air: Program
  private blit: Program
  private parts: Program
  private tri: WebGLBuffer
  private pbuf: WebGLBuffer
  private target: Target | null = null
  dpr = 1
  octaves = 3

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) throw new Error('no webgl')
    this.gl = gl
    this.air = program(gl, FULL_VERT, AIR_FRAG)
    this.blit = program(gl, FULL_VERT, BLIT_FRAG)
    this.parts = program(gl, PARTICLE_VERT, PARTICLE_FRAG)
    this.tri = fullScreenTriangle(gl)
    this.pbuf = particleBuffer(gl)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  resize(w: number, h: number) {
    const W = Math.round(w * this.dpr)
    const H = Math.round(h * this.dpr)
    if (this.canvas.width === W && this.canvas.height === H && this.target) return
    this.canvas.width = W
    this.canvas.height = H
    this.target = renderTarget(this.gl, Math.max(1, Math.round(w * AIR_SCALE)), Math.max(1, Math.round(h * AIR_SCALE)), this.target ?? undefined)
  }

  private fullScreen(p: Program) {
    const gl = this.gl
    gl.useProgram(p.prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri)
    const loc = p.a('aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  }

  /** Refresh the low-resolution air layer (called at 12–20 Hz). */
  drawAir(t: number, m: AirMotion, L: Layout, pal: AirPalette) {
    const gl = this.gl
    const T = this.target!
    const c = m.cur
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb)
    gl.viewport(0, 0, T.w, T.h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.fullScreen(this.air)
    const u = this.air.u
    gl.uniform2f(u('uView'), L.w, L.h)
    gl.uniform1f(u('uTime'), t)
    gl.uniform1f(u('uOct'), this.octaves)
    gl.uniform1f(u('uCoverage'), c.coverage)
    gl.uniform1f(u('uLow'), c.low)
    gl.uniform1f(u('uDrift'), m.drift)
    gl.uniform1f(u('uCloudAlpha'), (0.6 + 0.3 * c.coverage) * pal.night)
    gl.uniform1f(u('uDarken'), c.darken)
    gl.uniform1f(u('uFlash'), m.flash)
    gl.uniform3fv(u('uCloudLit'), pal.cloudLit)
    gl.uniform3fv(u('uCloudShade'), pal.cloudShade)
    gl.uniform2f(u('uBand'), L.bandTop, L.bandBottom)
    gl.uniform1f(u('uScene'), L.sceneTop)
    gl.uniform3fv(u('uHaze'), pal.haze)
    gl.uniform1f(u('uHazeAmt'), c.haze)
    gl.uniform3f(u('uSun'), L.sun?.x ?? 0, L.sun?.y ?? 0, L.sun ? 1 : 0)
    gl.uniform3fv(u('uSunCol'), pal.sun)
    setCloudLight(gl, this.air, L)
    gl.uniform1f(u('uRays'), c.rays)
    gl.uniform1f(u('uBloom'), c.bloom)
    gl.uniform1f(u('uCoin'), c.coin)
    gl.uniform2f(u('uHeat'), c.heatBand, c.heatAmp)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Composite the air and draw the particle fields (every displayed frame). */
  drawFrame(t: number, m: AirMotion, L: Layout, pal: AirPalette) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.fullScreen(this.blit)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.target!.tex)
    gl.uniform1i(this.blit.u('uTex'), 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    const p = this.parts
    gl.useProgram(p.prog)
    bindParticleAttribs(gl, this.pbuf, p.a('aSeed'), p.a('aCorner'))
    gl.uniform2f(p.u('uView'), L.w, L.h)
    gl.uniform2f(p.u('uBand'), L.bandTop, L.bandBottom)
    gl.uniform1f(p.u('uTime'), t)
    for (const f of fieldUniforms(m, pal, t)) {
      gl.uniform2f(p.u('uDir'), f.dir[0], f.dir[1])
      gl.uniform1f(p.u('uTravel'), m.travel[f.name])
      for (const [k, v] of Object.entries(f.scalars)) gl.uniform1f(p.u(k), v)
      gl.uniform3fv(p.u('uColor'), f.color)
      drawField(gl, f.name)
    }
  }

  dispose() {
    // Free resources but keep the context: the same canvas may be reused (StrictMode remounts effects).
    const gl = this.gl
    for (const p of [this.air, this.blit, this.parts]) gl.deleteProgram(p.prog)
    gl.deleteBuffer(this.tri)
    gl.deleteBuffer(this.pbuf)
    if (this.target) {
      gl.deleteFramebuffer(this.target.fb)
      gl.deleteTexture(this.target.tex)
      this.target = null
    }
  }
}
