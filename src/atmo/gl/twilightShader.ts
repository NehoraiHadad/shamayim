/**
 * Earth's shadow and the belt of Venus (GLSL, spliced into AIR_FRAG). Around sunset the sky opposite the sun holds a
 * blue-grey band low on the horizon (the planet's own shadow on the air) with a pink band above it (air still lit by
 * the reddened sun, backscattered). The shadow climbs about as fast as the sun sinks and merges with the night by
 * ~6° below; before sunrise it sinks in the west. Uses the afterglow uniforms: uAfterAt = (sun-side x, sun altitude).
 */
export const TWILIGHT_GLSL = `
// About 14 CSS px a degree above the ridge line on a phone sky.
const float PX_PER_DEG = 14.0;
void drawTwilightArch(vec2 p, float k, inout vec4 acc) {
  float alt = uAfterAt.y;
  float on = smoothstep(1.5, -0.5, alt) * (1.0 - smoothstep(-5.0, -7.0, alt)) * (1.0 - smoothstep(0.4, 0.8, uCoverage));
  if (on <= 0.0) return;
  // Strongest opposite the sun, gone on the sun's own side.
  float anti = smoothstep(0.2, 0.8, abs(p.x - uAfterAt.x) / uView.x);
  float deg = (uScene + 12.0 - p.y) / PX_PER_DEG;
  float top = 1.0 + 1.1 * max(0.0, -alt);
  float shadow = 1.0 - smoothstep(top - 1.0, top + 1.0, deg);
  float belt = smoothstep(top - 0.5, top + 1.5, deg) * (1.0 - smoothstep(top + 4.0, top + 12.0, deg));
  float w = on * anti * k;
  over(acc, vec3(0.20, 0.24, 0.40), 0.42 * shadow * w);
  acc.rgb += vec3(0.60, 0.32, 0.40) * 0.24 * belt * (1.0 - shadow) * w;
}`
