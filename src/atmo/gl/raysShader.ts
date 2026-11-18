/**
 * Crepuscular rays (GLSL, spliced into AIR_FRAG after the clouds). With a low sun and broken cloud, gaps let shafts
 * of sunlight through and the clouds cast shadow shafts between them, fanning out from the disc. Drawn as a slow
 * angular pattern around the sun rather than by marching through the clouds: one noise lookup a pixel, so it costs
 * next to nothing. Only in the lit scene (uLit), with the sun up and low (uWarm), and part cloud.
 */
export const RAYS_GLSL = `
void drawCrepuscular(vec2 p, float k, inout vec4 acc) {
  float crep = uLit * uSun.z * uWarm * smoothstep(0.15, 0.35, uCoverage) * (1.0 - smoothstep(0.7, 0.9, uCoverage));
  if (crep <= 0.0) return;
  vec2 v = p - uSun.xy;
  float r = length(v);
  // Direction, not angle: no seam where atan wraps. The pattern drifts with the clouds that cast it.
  float beams = smoothstep(0.35, 0.75, noise(v / max(r, 1.0) * 5.0 + vec2(uDrift * 0.002, uTime * 0.01)));
  float fall = exp(-r / 520.0) * smoothstep(30.0, 90.0, r);
  float above = 1.0 - smoothstep(uScene - 10.0, uScene + 30.0, p.y);
  float s = crep * fall * above * k;
  acc.rgb += uSunCol * beams * 0.2 * s;
  over(acc, vec3(0.0), (1.0 - beams) * 0.1 * s);
}`
