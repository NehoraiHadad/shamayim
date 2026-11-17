import type { GL } from './glUtil'

/** Fixed slots per field (the spec's caps). Density uniforms reveal a fraction, so counts never pop. */
export const FIELDS = {
  rain: { first: 0, cap: 480 },
  snow: { first: 480, cap: 220 },
  grains: { first: 700, cap: 200 },
  streaks: { first: 900, cap: 44 },
} as const
export type FieldName = keyof typeof FIELDS
const TOTAL = 944
const CORNERS = [[-0.5, 0], [0.5, 0], [-0.5, 1], [-0.5, 1], [0.5, 0], [0.5, 1]]
const STRIDE = 6 // seed.xyzw + corner.xy

/** One static buffer for every field, seeded deterministically (the same sky on every load). */
export function particleBuffer(gl: GL): WebGLBuffer {
  let s = 1234567
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const data = new Float32Array(TOTAL * CORNERS.length * STRIDE)
  let o = 0
  for (let i = 0; i < TOTAL; i++) {
    const seed = [rand(), rand(), rand(), rand()]
    for (const c of CORNERS) {
      data.set(seed, o)
      data.set(c, o + 4)
      o += STRIDE
    }
  }
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  return buf
}

/** Bind the seed/corner attributes of the particle program to the shared buffer. */
export function bindParticleAttribs(gl: GL, buf: WebGLBuffer, seedLoc: number, cornerLoc: number): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.enableVertexAttribArray(seedLoc)
  gl.vertexAttribPointer(seedLoc, 4, gl.FLOAT, false, STRIDE * 4, 0)
  gl.enableVertexAttribArray(cornerLoc)
  gl.vertexAttribPointer(cornerLoc, 2, gl.FLOAT, false, STRIDE * 4, 16)
}

export function drawField(gl: GL, name: FieldName): void {
  const f = FIELDS[name]
  gl.drawArrays(gl.TRIANGLES, f.first * CORNERS.length, f.cap * CORNERS.length)
}
