/**
 * The cloud layers of the air pass (GLSL, spliced into AIR_FRAG after its uniforms and noise): two fbm layers, the
 * flat-scene shading, the lit scene's sun-side light and the afterglow on clouds around sunset and sunrise.
 */
export const CLOUD_GLSL = `
const vec2 CLOUD_STRETCH = vec2(300.0, 110.0);
// Where a layer's noise is read for a point: drifting with the wind and slowly warped.
vec2 cloudWarp(vec2 p, float scale, float speed) {
  vec2 q = p / CLOUD_STRETCH * scale;
  q.x -= uDrift * speed / 300.0;
  float warp = fbm(q * 0.5 + uTime * 0.008);
  return q + warp * 0.7 + vec2(0.0, uTime * 0.003);
}
float cloudLayer(vec2 p, float scale, float speed, float cov, vec2 offset, out float shade, out float depth) {
  vec2 w = cloudWarp(p, scale, speed);
  float n = fbm(w);
  shade = clamp((n - fbm(w + offset)) * 5.0 + 0.7, 0.0, 1.0);
  // Measured on the GPU, the warped fbm sits mostly in 0.22–0.6 (median ~0.34): the threshold walks that range so a
  // few clouds are its top tail (separate puffs) and overcast is nearly all of it.
  float t = mix(0.62, 0.20, cov);
  depth = clamp((n - t) / 0.22, 0.0, 1.0); // how far into the cloud: 0 at the edge, 1 in a thick core
  return smoothstep(t - 0.03, t + 0.10, n);
}

// How much cloud stands at a point, both layers, without shading: what the rays read to find the real gaps.
float cloudAt(vec2 p) {
  float t = mix(0.62, 0.20, uCoverage), t2 = mix(0.62, 0.20, uCoverage * 0.9);
  float hi = smoothstep(t - 0.03, t + 0.10, fbm(cloudWarp(p, 1.0, 0.6)));
  float lo = uLow * smoothstep(t2 - 0.03, t2 + 0.10, fbm(cloudWarp(p + 91.0, 0.55, 1.0))) * smoothstep(80.0, 260.0, p.y);
  return max(hi * 0.85, lo) * (1.0 - smoothstep(uScene - 30.0, uScene + 60.0, p.y));
}

// Whether a cloud this high (screen y, sky top = highest) still sees the sunken sun. Earth's shadow climbs as the sun
// sinks: clouds by the ridge (~3 km) go grey by ~1.5° below, the top of the sky (~10 km) holds out to ~3.5°.
float afterglowLit(float y) {
  float reach = 0.5 + 3.0 * clamp(1.0 - y / uScene, 0.0, 1.0);
  return 1.0 - smoothstep(reach - 0.4, reach + 0.4, -uAfterAt.y);
}

void drawClouds(vec2 p, float band, float k, inout vec4 acc) {
  float s1, s2, z1, z2;
  float prof = 1.0 - smoothstep(uScene - 30.0, uScene + 60.0, p.y);
  float silver = 0.0, cover = 1.0, afterLight = 0.0;
  float clear = 1.0 - smoothstep(0.75, 0.95, uCoverage);
  float lit = uLit * uSun.z * clear;
  float glow = uAfter * clear;
  // By night the moon lights cloud edges the same way, faint and silver (only without sun or afterglow).
  float moon = uLit * uMoon.z * clear * (1.0 - uSun.z) * (1.0 - min(1.0, glow * 4.0));
  vec2 offset = vec2(0.05, 0.09);
  if (lit > 0.0 || glow > 0.0 || moon > 0.0) {
    // Once the disc is down the light comes from under the horizon, below the glow on the ridge.
    vec2 src = uSun.z > 0.0 ? uSun.xy : glow > 0.0 ? vec2(uAfterAt.x, uScene + 60.0) : uMoon.xy;
    // Layer shifts cancel in the direction vector, and normalization cancels each layer's scalar zoom.
    vec2 towardSun = (src - p) / CLOUD_STRETCH;
    vec2 dir = dot(towardSun, towardSun) > 0.0 ? normalize(towardSun) : vec2(0.0, -1.0);
    // Near noon the sun is high and south, behind the viewer (who faces north): light falls from above, not from the
    // disc's side of the picture.
    dir = normalize(mix(dir, vec2(0.0, -1.0), uFront) + vec2(0.0, -1e-3));
    offset = mix(offset, dir * 0.103, max(max(lit, glow), moon > 0.0 ? 1.0 : 0.0));
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
  if (moon > 0.0) {
    float face = smoothstep(0.5, 0.9, clamp((shade - 0.7) * 2.0 + 0.5, 0.0, 1.0));
    col = mix(col, uCloudLit * 1.9 + vec3(0.04, 0.05, 0.08), moon * face * 0.6 * mix(1.0, 0.4, band));
  }
  if (glow > 0.0) {
    // Afterglow: the faces toward the sunken sun take its gold-to-pink light, the far sides a dim wash of it, and
    // only while Earth's shadow has not yet climbed to this cloud's height.
    float face = smoothstep(0.25, 0.75, clamp((shade - 0.7) * 2.0 + 0.5, 0.0, 1.0));
    float g = glow * afterglowLit(p.y) * mix(1.0, 0.4, band);
    vec3 tint = uAfterCol * mix(0.55, 1.0, face) * mix(1.0, 0.75, smoothstep(0.0, 4.0, -uAfterAt.y));
    col = mix(col, tint, g * mix(0.45, 1.0, face));
    // A sunlit cloud over the dusk valley is brighter than the darkening sky behind it: it reads solid, and glows.
    cover *= 1.0 + 0.7 * g * (1.0 - band);
    afterLight = g * face * dens * 0.3 * k;
  }
  over(acc, col, min(1.0, dens * uCloudAlpha * k * cover));
  acc.rgb += uSunCol * silver * uCloudAlpha + uAfterCol * afterLight;
  acc.rgb += uFlash * dens * k * vec3(0.85, 0.9, 1.0);
}`
