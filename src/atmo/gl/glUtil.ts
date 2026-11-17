/** Small WebGL1 helpers. Everything here throws on failure so the caller can fall back to CSS. */

export type GL = WebGLRenderingContext

function compile(gl: GL, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)
  if (!s) throw new Error('createShader failed')
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'compile failed')
  return s
}

export interface Program {
  prog: WebGLProgram
  u: (name: string) => WebGLUniformLocation | null
  a: (name: string) => number
}

export function program(gl: GL, vert: string, frag: string): Program {
  const prog = gl.createProgram()
  if (!prog) throw new Error('createProgram failed')
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vert))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed')
  const uCache = new Map<string, WebGLUniformLocation | null>()
  return {
    prog,
    u: (name) => {
      if (!uCache.has(name)) uCache.set(name, gl.getUniformLocation(prog, name))
      return uCache.get(name)!
    },
    a: (name) => gl.getAttribLocation(prog, name),
  }
}

/** A full-screen triangle; the vertex shader maps it to clip space. */
export function fullScreenTriangle(gl: GL): WebGLBuffer {
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  return buf
}

export interface Target {
  fb: WebGLFramebuffer
  tex: WebGLTexture
  w: number
  h: number
}

/** An RGBA render target with linear filtering (the low-resolution air pass). */
export function renderTarget(gl: GL, w: number, h: number, old?: Target): Target {
  if (old) {
    gl.deleteFramebuffer(old.fb)
    gl.deleteTexture(old.tex)
  }
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR)
  for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE)
  const fb = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { fb, tex, w, h }
}

/** '#RRGGBB' → [r, g, b] in 0–1. */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
