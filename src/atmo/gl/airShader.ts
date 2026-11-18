/** Full-screen vertex shader shared by the air and blit passes. */
export const FULL_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

/** Upsamples the low-resolution air into the canvas (premultiplied). */
export const BLIT_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
void main() { gl_FragColor = texture2D(uTex, vUv); }`

/**
 * The air over the CSS sky: overcast darkening, haze, clouds, sun bloom, rays, heat lines, flashes.
 * Works in CSS px with y down. Output is premultiplied alpha.
 */
export const AIR_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uView;
uniform float uTime, uOct;
uniform float uCoverage, uLow, uDrift, uCloudAlpha, uDarken, uFlash;
uniform vec3 uCloudLit, uCloudShade;
uniform float uLit, uWarm, uFront;
uniform vec2 uBand;   // text band top, bottom
uniform float uScene; // scene top
uniform vec3 uHaze; uniform float uHazeAmt;
uniform vec3 uSun; uniform vec3 uSunCol; uniform float uRays, uBloom, uCoin;
uniform vec2 uHeat;   // band height, amplitude

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { if (float(i) >= uOct) break; v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v / (1.0 - pow(0.5, uOct));
}
void over(inout vec4 acc, vec3 col, float a) { acc = vec4(col * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a)); }

const vec2 CLOUD_STRETCH = vec2(300.0, 110.0);
float cloudLayer(vec2 p, float scale, float speed, float cov, vec2 offset, out float shade, out float depth) {
  vec2 q = p / CLOUD_STRETCH * scale;
  q.x -= uDrift * speed / 300.0;
  float warp = fbm(q * 0.5 + uTime * 0.008);
  vec2 w = q + warp * 0.7 + vec2(0.0, uTime * 0.003);
  float n = fbm(w);
  shade = clamp((n - fbm(w + offset)) * 5.0 + 0.7, 0.0, 1.0);
  // Measured on the GPU, the warped fbm sits mostly in 0.22–0.6 (median ~0.34): the threshold walks that range so a
  // few clouds are its top tail (separate puffs) and overcast is nearly all of it.
  float t = mix(0.62, 0.20, cov);
  depth = clamp((n - t) / 0.22, 0.0, 1.0); // how far into the cloud: 0 at the edge, 1 in a thick core
  return smoothstep(t - 0.03, t + 0.10, n);
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uView;
  float band = smoothstep(uBand.x - 28.0, uBand.x, p.y) * (1.0 - smoothstep(uBand.y, uBand.y + 28.0, p.y));
  float k = mix(1.0, 0.45, band);
  vec4 acc = vec4(0.0);

  over(acc, vec3(0.0), uDarken * (1.0 - p.y / uView.y));

  float hz = uHazeAmt * smoothstep(uScene - 300.0, uScene + 72.0, p.y);
  over(acc, uHaze, hz * 0.6 * k);

  if (uCoverage > 0.0) {
    float s1, s2, z1, z2;
    float prof = 1.0 - smoothstep(uScene - 30.0, uScene + 60.0, p.y);
    float silver = 0.0, cover = 1.0;
    float lit = uLit * uSun.z * (1.0 - smoothstep(0.75, 0.95, uCoverage));
    vec2 offset = vec2(0.05, 0.09);
    if (lit > 0.0) {
      // Layer shifts cancel in the direction vector, and normalization cancels each layer's scalar zoom.
      vec2 towardSun = (uSun.xy - p) / CLOUD_STRETCH;
      vec2 dir = dot(towardSun, towardSun) > 0.0 ? normalize(towardSun) : vec2(0.0, -1.0);
      // Near noon the sun is high and south, behind the viewer (who faces north): light falls from above, not from the
      // disc's side of the picture.
      dir = normalize(mix(dir, vec2(0.0, -1.0), uFront) + vec2(0.0, -1e-3));
      offset = mix(offset, dir * 0.103, lit);
    }
    float d = cloudLayer(p, 1.0, 0.6, uCoverage, offset, s1, z1);
    float d2 = uLow * cloudLayer(p + 91.0, 0.55, 1.0, uCoverage * 0.9, offset, s2, z2) * smoothstep(80.0, 260.0, p.y);
    float shade = d2 > d ? s2 : s1;
    float dens = max(d * 0.85, d2) * prof;
    vec3 col = mix(uCloudShade, uCloudLit, mix(shade, shade * 0.4, band));
    if (lit > 0.0) {
      // The flag-off shade is biased to 0.7 and saturates, so most of a cloud reads lit wherever the sun is. Undo that
      // bias: the density gradient toward the sun splits each cloud into a sun-facing half and a self-shadowed half.
      float toward = clamp((shade - 0.7) * 2.0 + 0.5, 0.0, 1.0);
      float body = smoothstep(0.38, 0.62, toward);
      float edge = smoothstep(0.74, 0.92, toward);
      // Front-lit (sun behind the viewer) faces are flat and bright; side light models lit edge, body and underside.
      float painted = mix(0.55 * body + 0.45 * edge, 0.7 + 0.3 * edge, 0.6 * uFront);
      // Direct sun on a cloud face is far brighter than the sky behind it; the self-shadowed side keeps only skylight.
      vec3 sunFace = mix(uCloudLit, vec3(1.0), 0.55);
      vec3 paintedCol = mix(uCloudShade, sunFace, mix(painted, painted * 0.4, band));
      bool low = d2 > d;
      // Optical depth: light is scattered out on its way through, so thick cores are darker than the sunlit rim.
      float depth = low ? z2 : z1;
      paintedCol *= 1.0 - 0.24 * depth * (1.0 - edge);
      // Low sun light is reddened by the long path through the air. The high layer catches it fully; the low layer sits
      // in the ridge's shadow sooner, so it takes half.
      paintedCol = mix(paintedCol, uSunCol, 0.35 * uWarm * (low ? 0.5 : 1.0) * edge * mix(1.0, 0.4, band));
      // Forward scattering near the disc: thick cloud in front of the sun goes darker...
      float fwd = uSun.z * exp(-length(p - uSun.xy) / 120.0);
      paintedCol *= 1.0 - 0.3 * fwd * depth;
      col = mix(col, paintedCol, lit);
      // A sunlit face reads as solid; the same cloud seen on its shadow side blends into the sky.
      cover = 1.0 + lit * (0.45 * edge - 0.15 * (1.0 - body)) * (1.0 - band);
      // ...and its thin edges glow (the silver lining), added like light, strongest where the cloud is half thin.
      silver = lit * fwd * (1.0 - depth) * 4.0 * dens * (1.0 - dens) * 0.45 * k;
    }
    over(acc, col, min(1.0, dens * uCloudAlpha * k * cover));
    acc.rgb += uSunCol * silver * uCloudAlpha;
    acc.rgb += uFlash * dens * k * vec3(0.85, 0.9, 1.0);
  }

  if (uSun.z > 0.0) {
    vec2 v = p - uSun.xy;
    float r = length(v);
    float glow = exp(-pow(r / (34.0 + 26.0 * uBloom), 2.0)) * (0.18 + 0.3 * uBloom) * (1.0 - uCoin) * uSun.z;
    acc.rgb += uSunCol * glow * k;
    if (uRays > 0.0) {
      float ang = atan(v.y, v.x);
      float st = pow(0.5 + 0.5 * sin(ang * 9.0 + noise(vec2(ang * 2.0, uTime * 0.05)) * 3.0), 5.0);
      acc.rgb += uSunCol * st * uRays * exp(-r / 240.0) * smoothstep(20.0, 60.0, r) * k * uSun.z;
    }
  }

  if (uHeat.x > 0.0) {
    float floorY = uScene + 96.0;
    float env = smoothstep(floorY - uHeat.x, floorY - uHeat.x * 0.5, p.y) * (1.0 - smoothstep(floorY - 4.0, floorY, p.y));
    float wav = 0.5 + 0.5 * sin(p.y * 0.45 - uTime * 7.5 + noise(vec2(p.x * 0.02, uTime * 0.7)) * 5.0);
    acc.rgb += uSunCol * wav * env * 0.06 * uHeat.y;
  }
  gl_FragColor = acc;
}`
