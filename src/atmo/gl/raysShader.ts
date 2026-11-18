/**
 * Rays of sunlight and cloud shadow on the air (GLSL, spliced into AIR_FRAG after the clouds), only in the lit scene.
 * Real rays need three things: something hiding part of the sun (cloud gaps, a cloud edge, a ridge), particles in the
 * air to show the beam (haze, but not so thick it drowns the contrast), and the viewer looking toward the sun.
 * - Disc up: shafts fan from the disc, lit where the drawn clouds just around the sun leave a gap and shadowed where
 *   they stand (read from the same cloud field, so bright shafts come out of real gaps). Strongest with the disc
 *   partly hidden, faint with it clear; any hour with broken cloud, stronger with a low sun, weaker with it behind the
 *   viewer (midday, as the viewer faces north).
 * - Disc behind the ridge or under the horizon (to ~6° below): rays from below the skyline, gold to pink with blue-grey
 *   shadow bands. Cast by clouds past the horizon (not drawn, so a slow pattern stands for them) or, with the sun
 *   in hazy air, by the ridge itself and the hills past the horizon, even under a clear sky.
 * Cost: three cloud lookups a pixel while the disc's rays are on, one noise lookup for the twilight ones.
 */
export const RAYS_GLSL = `
// How well the air shows a beam: some aerosol is needed, heavy haze drowns the contrast.
float beamAir() { return (0.35 + 0.65 * smoothstep(0.0, 0.3, uHazeAmt)) * (1.0 - 0.7 * smoothstep(0.6, 1.0, uHazeAmt)); }

void drawSunRays(vec2 p, float above, float k, inout vec4 acc) {
  float broken = smoothstep(0.12, 0.3, uCoverage) * (1.0 - smoothstep(0.8, 0.95, uCoverage));
  float s = uLit * uSun.z * broken * mix(0.55, 1.0, uWarm) * mix(1.0, 0.6, uFront) * beamAir() * above;
  if (s <= 0.0) return;
  vec2 v = p - uSun.xy;
  float r = length(v);
  float fall = exp(-r / 520.0) * smoothstep(30.0, 90.0, r);
  if (fall < 0.01) return;
  // The clouds on two rings around the disc decide where light gets out (a gap) and where cloud throws its shadow
  // toward this pixel. The drawn clouds are broad and soft, so a fine angular pattern splits each gap into shafts the
  // way the small ragged edges of real cloud do.
  vec2 dir = v / max(r, 1.0);
  float cloud = 0.5 * (cloudAt(uSun.xy + dir * 80.0) + cloudAt(uSun.xy + dir * 190.0));
  float gap = 1.0 - smoothstep(0.1, 0.7, cloud);
  float fine = smoothstep(0.35, 0.75, noise(dir * 6.0 + vec2(uDrift * 0.002, uTime * 0.01)));
  float hidden = smoothstep(0.1, 0.6, cloudAt(uSun.xy));
  float t = s * fall * k;
  acc.rgb += uSunCol * gap * fine * 0.3 * mix(0.35, 1.0, hidden) * t;
  over(acc, vec3(0.0), mix(1.0 - fine, 1.0, smoothstep(0.2, 0.9, cloud)) * 0.12 * t);
}

void drawTwilightRays(vec2 p, float above, float k, inout vec4 acc) {
  float alt = uAfterAt.y;
  float cloudy = smoothstep(0.08, 0.25, uCoverage) * (1.0 - smoothstep(0.7, 0.85, uCoverage));
  float ridge = smoothstep(0.1, 0.4, uHazeAmt);
  float s = uLit * (1.0 - uSun.z) * smoothstep(3.0, 2.0, alt) * (1.0 - smoothstep(-4.0, -6.5, alt))
    * max(cloudy, ridge) * beamAir() * above;
  if (s <= 0.0) return;
  vec2 v = p - vec2(uAfterAt.x, uScene + 40.0);
  float r = length(v);
  float beams = smoothstep(0.35, 0.75, noise(v / max(r, 1.0) * 4.0 + vec2(uDrift * 0.001, 3.0)));
  float t = s * exp(-r / 700.0) * smoothstep(20.0, 70.0, r) * k;
  acc.rgb += uAfterCol * beams * 0.24 * t;
  over(acc, vec3(0.20, 0.24, 0.40), (1.0 - beams) * 0.2 * t);
}

void drawCrepuscular(vec2 p, float k, inout vec4 acc) {
  float above = 1.0 - smoothstep(uScene - 10.0, uScene + 30.0, p.y);
  if (above <= 0.0) return;
  drawSunRays(p, above, k, acc);
  drawTwilightRays(p, above, k, acc);
}`
