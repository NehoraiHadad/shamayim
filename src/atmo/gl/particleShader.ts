/**
 * Stateless particles: each quad's position is a function of its seed and the field's travelled
 * distance, wrapped on a torus slightly larger than the viewport. No per-frame CPU work per particle.
 * Coordinates are CSS px, y down. Output is premultiplied alpha.
 */
export const PARTICLE_VERT = `
attribute vec4 aSeed;
attribute vec2 aCorner;
uniform vec2 uView, uBand, uDir;
uniform float uTime, uTravel, uLen, uWid, uAlpha, uDensity, uSway, uLift, uMargin;
varying float vA;
varying vec2 vC;
void main() {
  float depth = 0.55 + 0.75 * aSeed.z;
  vec2 box = uView + 2.0 * uMargin;
  vec2 pos = mod(aSeed.xy * box + uDir * uTravel * depth, box) - uMargin;
  float phase = aSeed.w * 6.2832;
  pos.x += uSway * sin(uTime * 2.5 + phase);
  pos.y += uLift * sin(uTime * 1.3 + phase + pos.x * 0.01);
  vec2 nrm = vec2(-uDir.y, uDir.x);
  float len = uLen * mix(0.55, 1.45, aSeed.z);
  float wid = uWid * mix(0.7, 1.25, aSeed.z);
  vec2 v = pos - uDir * aCorner.y * len + nrm * aCorner.x * wid * 2.0;
  float band = smoothstep(uBand.x - 28.0, uBand.x, v.y) * (1.0 - smoothstep(uBand.y, uBand.y + 28.0, v.y));
  float on = 1.0 - smoothstep(uDensity - 0.03, uDensity, fract(aSeed.w * 7.13));
  vA = uAlpha * mix(0.5, 1.0, aSeed.z) * mix(1.0, 0.45, band) * on;
  vC = aCorner;
  gl_Position = vec4(v / uView * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`

export const PARTICLE_FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uShape; // 0 rain (bright head), 1 streak (tapered), 2 round
varying float vA;
varying vec2 vC;
void main() {
  float a = vA;
  if (uShape > 1.5) {
    a *= 1.0 - smoothstep(0.55, 1.0, length(vec2(vC.x * 2.0, vC.y * 2.0 - 1.0)));
  } else {
    a *= 1.0 - abs(vC.x) * 2.0;
    a *= uShape > 0.5 ? sin(vC.y * 3.1416) : 1.0 - vC.y * 0.75;
  }
  gl_FragColor = vec4(uColor * a, a);
}`
