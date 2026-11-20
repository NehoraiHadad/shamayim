// VARIANT 1b · THE CURRENT HAND, ENRICHED, drawn end to end in canvas from one MOMENT (time + weather).
// MEDIUM: the app's own scene hand: flat opaque bodies cut from the ridge colour, soft one-sided light, haze by
// distance; no outlines. ENRICHED: layered planes with aerial perspective (each plane mixed toward the horizon
// haze by its distance); on the near ridge, light on the sun-facing slopes, gullies that cut down them, terraces
// on the lower slopes, olive and scrub dots in drifts, a soft low-frequency ground texture; the bay with a glint
// path under the sun; a settlement portrait in contour rows with streets as gaps, lit and shade faces, flat roofs
// with water heaters and some tiled hips, trees and cypresses between, dense at the dot and thinning at its
// edge; the modelled landmark glyphs (sceneGlyphs.ts) lit from the moment's light; a sky with the app's smooth
// gradient plus layered clouds whose sun-facing sides catch the light, a glow round the sun or moon and a haze
// band at the horizon. ORDER: sky, glow, clouds far to near, back planes, bay, near ridge and its modelling,
// settlement and trees back to front, landmarks, weather (rain, mist), the dot, then the app's UI.
// Pure in (moment); randomness only from rng(seed).
import { fractal, rng, sample, type Ctx, type Env, type P } from "./core";
import { drawGlyph, LIGHTS, css, mix, type Light, type RGB } from "./sceneGlyphs";
import { drawUI, type Skin, type UIData } from "./ui";
import { shadeRuns } from "./valleyKit";
import { SKIN_APP } from "./styleCurrent";
import { DOT, FAR, FH, FW, MID, NEAR, SEA_Y, SHEET_TOP, UI, closeDown, groundAt, tracePoly, roundRect } from "./valley";

export type Moment = {
  id: string; sky: [number, string][]; horizon: RGB; ridge: RGB; haze: RGB; sun: P | null; sunCol: RGB; sunK: number; glow: number;
  moon?: P; stars?: boolean; night?: boolean; rain?: boolean; overcast?: boolean; clouds: "golden" | "noon" | "night" | "rain";
  warmWin: number; light: Light; ui: UIData;
};
const hours = (rows: [string, number, string][]) => rows.map(([t, v, ic]) => ({ t, v, ic }));
export const MOMENTS: Record<string, Moment> = {
  golden: {
    id: "golden", sky: [[0, "#2f4677"], [0.42, "#5f6f9c"], [0.72, "#b98f95"], [0.88, "#e7aa7c"], [1, "#f3c487"]], horizon: [243, 196, 140], ridge: [38, 42, 64], haze: [176, 150, 160],
    sun: [62, 398], sunCol: [255, 214, 160], sunK: 0.9, glow: 1, clouds: "golden", warmWin: 0.07,
    light: { name: "golden", ridge: [40, 44, 66], sky: [214, 168, 128], sun: [252, 204, 146], sunK: 0.85, night: false, hazeTo: [150, 132, 150], haze: 0.07, mist: 0.18, cast: 0.8 }, ui: UI,
  },
  noon: {
    id: "noon", sky: [[0, "#1d5aa3"], [0.45, "#3f7fbf"], [0.8, "#8fb8de"], [1, "#c4dbef"]], horizon: [196, 219, 239], ridge: [46, 59, 78], haze: [150, 178, 205],
    sun: [52, 74], sunCol: [255, 252, 240], sunK: 0.6, glow: 0.7, clouds: "noon", warmWin: 0,
    light: { name: "noon", ridge: [46, 59, 78], sky: [188, 214, 236], sun: [240, 240, 232], sunK: 0.7, night: false, hazeTo: [130, 160, 192], haze: 0.06, mist: 0.12, cast: 0.25 },
    ui: { ...UI, temp: "24", sentence: "בהיר וחמים, עד 25°.", hours: hours([["עכשיו", 24, "sun"], ["13", 25, "sun"], ["14", 25, "sun"], ["15", 24, "partly"], ["16", 23, "partly"], ["17", 21, "set"]]) },
  },
  night: {
    id: "night", sky: [[0, "#070b1e"], [0.5, "#131c3f"], [0.9, "#262c58"], [1, "#2c3262"]], horizon: [44, 50, 96], ridge: [11, 14, 28], haze: [36, 42, 82],
    sun: null, sunCol: [210, 220, 255], sunK: 0, glow: 0, moon: [292, 118], stars: true, night: true, clouds: "night", warmWin: 0.42,
    light: LIGHTS.night,
    ui: { ...UI, temp: "17", sentence: "לילה צלול, סביב 16°.", sunset: "זריחה 06:09", hours: hours([["עכשיו", 17, "moon"], ["22", 17, "moon"], ["23", 16, "moon"], ["00", 16, "cloudMoon"], ["01", 15, "moon"], ["02", 15, "moon"]]) },
  },
  rain: {
    id: "rain", sky: [[0, "#2b3846"], [0.5, "#4b5d6d"], [0.85, "#7d909e"], [1, "#94a6b2"]], horizon: [150, 168, 180], ridge: [27, 37, 47], haze: [118, 136, 150],
    sun: null, sunCol: [220, 226, 230], sunK: 0, glow: 0, rain: true, overcast: true, clouds: "rain", warmWin: 0.12,
    light: { name: "rain", ridge: [27, 37, 47], sky: [143, 163, 176], sun: null, sunK: 0, night: false, hazeTo: [112, 130, 144], haze: 0.12, mist: 0.24, cast: 0 },
    ui: { ...UI, temp: "15", sentence: "גשם לסירוגין, עד 17°.", hours: hours([["עכשיו", 15, "rain"], ["16", 15, "rain"], ["17", 15, "cloud"], ["18", 14, "rain"], ["19", 14, "rain"], ["20", 13, "cloud"]]) },
  },
};

// ---------------------------------------------------------------- the land, shared by every moment
/** The near ridge with a real foreshore on the bay side (the app's profile, its flat foot lowered to the water). */
const NEAR_R: P[] = NEAR.map(([x, y]) => { if (x > 132) return [x, y]; const t = Math.max(0, Math.min(1, (132 - x) / 34)); return [x, y + (439 - y) * t]; });
const BACK: P[] = sample([[150, 392], [200, 376], [250, 366], [300, 360], [345, 364], [390, 372]], false, 10);
const gAt = (x: number) => groundAt(x, NEAR_R);
const slope = (x: number) => (gAt(x + 2) - gAt(x - 2)) / 4;

type Drawn = { y: number; draw: (c: Ctx) => void };
const sh = (a: RGB, t: number, b: RGB) => css(mix(a, t, b));

export const drawRich = (M: Moment) => (c: Ctx, env: Env) => {
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const R = M.ridge, H = M.haze, sunK = M.sunK, lightCol: RGB = M.sun ? M.sunCol : M.night ? [150, 165, 220] : [200, 210, 218];
  const plane = (d: number): RGB => mix(R, d, H);                            // d = 1 near, 0 = lost in the haze
  // ---------------- sky: the app's smooth gradient, a glow round the light, a haze band at the horizon
  const g = c.createLinearGradient(0, 0, 0, 440); for (const [t, col] of M.sky) g.addColorStop(t, col); c.fillStyle = g; c.fillRect(0, 0, FW, FH);
  if (M.stars) { const r = rng(5); for (let i = 0; i < 140; i++) { const x = r() * FW, y = r() * 380, b = r(); c.fillStyle = `rgba(230,236,255,${(0.25 + 0.6 * b * b) * (1 - y / 460)})`; c.fillRect(x, y, b > 0.9 ? 1 : 0.5, b > 0.9 ? 1 : 0.5); } }
  if (M.sun && M.glow) { const [sx, sy] = M.sun; for (const [r, a] of [[220, 0.28], [90, 0.4], [34, 0.55]] as [number, number][]) { const b = c.createRadialGradient(sx, sy, 0, sx, sy, r); b.addColorStop(0, css(M.sunCol, a * M.glow)); b.addColorStop(1, css(M.sunCol, 0)); c.fillStyle = b; c.fillRect(0, 0, FW, FH); } }
  if (M.moon) { const [mx, my] = M.moon, b = c.createRadialGradient(mx, my, 0, mx, my, 70); b.addColorStop(0, "rgba(200,210,255,0.22)"); b.addColorStop(1, "rgba(200,210,255,0)"); c.fillStyle = b; c.fillRect(0, 0, FW, FH); }
  const hb = c.createLinearGradient(0, 360, 0, 430); hb.addColorStop(0, css(M.horizon, 0)); hb.addColorStop(0.75, css(M.horizon, M.night ? 0.25 : 0.38)); hb.addColorStop(1, css(M.horizon, 0.1)); c.fillStyle = hb; c.fillRect(0, 360, FW, 90);
  clouds(c, M);
  if (M.sun && M.glow) { c.fillStyle = css(mix(M.sunCol, 0.6, [255, 255, 255]), 0.96); c.beginPath(); c.arc(M.sun[0], M.sun[1], M.id === "noon" ? 8 : 9, 0, Math.PI * 2); c.fill(); }
  if (M.moon) { const [mx, my] = M.moon; c.fillStyle = "#e9ecf6"; c.beginPath(); c.arc(mx, my, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(170,178,205,0.5)"; for (const [dx, dy, r] of [[-2, -1.5, 1.6], [2, 1.8, 1.2], [1.5, -3, 0.8]]) { c.beginPath(); c.arc(mx + dx, my + dy, r, 0, 7); c.fill(); } }

  // ---------------- back planes: aerial perspective, each lighter and bluer with distance
  const fill = (pts: P[], col: string) => { c.fillStyle = col; tracePoly(c, pts); c.fill(); };
  fill(closeDown(BACK), sh(plane(0.22), 1, R));
  fill(closeDown(FAR), sh(plane(0.34), 1, R));
  crestLight(c, FAR, 0.6, M, lightCol, 0.18);
  // the bay: horizon reflection on top, deepening toward the shore, a glint path under the sun
  const sea0 = SEA_Y - 0.5, sea = c.createLinearGradient(0, sea0, 0, 446); sea.addColorStop(0, css(mix(M.horizon, 0.7, plane(0.4)))); sea.addColorStop(1, css(mix(M.horizon, 0.25, plane(0.7))));
  c.fillStyle = sea; c.fillRect(0, sea0, 170, 446 - sea0);
  c.fillStyle = css(mix(M.horizon, 0.9, [255, 255, 255]), M.night ? 0.25 : 0.55); c.fillRect(0, sea0, 170, 0.5);
  const glintX = M.sun ? M.sun[0] : M.moon ? M.moon[0] : -1;
  { const r = rng(12); for (let i = 0; i < 260; i++) { const y = sea0 + 1 + r() * (444 - sea0), w = 1 + r() * 4, x = r() * 170; const near = glintX >= 0 ? Math.exp(-Math.pow((x - glintX) / (6 + (y - sea0) * 0.9), 2)) : 0; const a = glintX >= 0 ? near * (M.night ? 0.5 : 0.9) : 0.12; if (a < 0.03) continue; c.fillStyle = css(glintX >= 0 ? mix(M.sunCol, 0.8, [255, 255, 255]) : M.horizon, a * (0.4 + 0.6 * r())); c.fillRect(x, y, w, 0.5); } }
  // mid ridge with its own (fainter) modelling
  fill(closeDown(MID), sh(plane(0.62), 1, R));
  model(c, MID, plane(0.62), M, lightCol, 0.55, 21);
  // near ridge
  const nearCol = plane(1); fill(closeDown(NEAR_R), css(nearCol));
  model(c, NEAR_R, nearCol, M, lightCol, 1, 31);

  // ---------------- settlement portrait + trees, back to front
  const list: Drawn[] = [...portrait(M), ...scrubTrees(M)];
  list.sort((a, b) => a.y - b.y).forEach((d) => d.draw(c));
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  // landmarks on the shared light
  const marks: [string, number, number][] = [["waterTower", 122, 18], ["highrise", 154, 28], ["church", 281, 15.5], ["minaret", 331, 20]];
  for (const [kind, x, h] of marks) drawGlyph(c, env, kind as never, x, gAt(x) + 1.2, M.light, { h, seed: 3 });
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  // weather: rain curtain and low cloud on the ridge
  if (M.rain) rain(c);
  // the dot
  c.fillStyle = M.night ? "rgba(255,227,160,0.25)" : "rgba(20,22,40,0.5)"; c.beginPath(); c.arc(DOT[0], DOT[1], 6.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#FFE3A0"; c.beginPath(); c.arc(DOT[0], DOT[1], 4.4, 0, Math.PI * 2); c.fill();
  drawUI(c, skinFor(M), M.ui);
};

/** Light along a crest: the sun-facing slopes (rising to the right, sun on the left) take a soft band of light. */
const crestLight = (c: Ctx, top: P[], k: number, M: Moment, light: RGB, depth = 26) => {
  if (!M.sun && !M.night) k *= 0.35;
  const n = top.length, face = top.map((_, i) => { const a = top[Math.max(0, i - 3)], b = top[Math.min(n - 1, i + 3)], s = (b[1] - a[1]) / (b[0] - a[0] || 1); return M.sun ? Math.max(0, Math.min(1, -s * 1.8 + 0.04)) : 0.5; });
  const base = 0.3 * k * (M.sun ? M.sunK + 0.2 : 0.4), steps = Math.ceil(depth / 1.2);
  c.save(); tracePoly(c, closeDown(top)); c.clip(); c.lineWidth = 1.5; c.lineCap = "round";
  for (let j = 0; j < steps; j++) { const fall = Math.pow(1 - j / steps, 1.6) * base * 0.32; for (let i = 1; i < n; i++) { const f = (face[i] + face[i - 1]) / 2; if (f < 0.02) continue; c.strokeStyle = css(light, fall * f); c.beginPath(); c.moveTo(top[i - 1][0], top[i - 1][1] + j * 1.2); c.lineTo(top[i][0], top[i][1] + j * 1.2); c.stroke(); } }
  c.restore();
};

/** Terrain modelling on a ridge: crest light, gullies, terraces, scrub drifts, soft ground texture. */
const model = (c: Ctx, top: P[], base: RGB, M: Moment, light: RGB, k: number, seed: number) => {
  const r = rng(seed), poly = closeDown(top), at = (x: number) => groundAt(x, top), x0 = top[0][0], x1 = top[top.length - 1][0];
  c.save(); tracePoly(c, poly); c.clip();
  // soft ground texture: a 3 px mottle, warmer on the lit side
  for (let y = Math.min(...top.map((p) => p[1])); y < SHEET_TOP + 2; y += 1) for (let x = Math.max(0, x0); x < Math.min(FW, x1); x += 1) {
    if (y < at(x)) continue; const n = fractal(seed, x * 0.06, y * 0.1, 1, 1, 3) - 0.5 + (fractal(seed + 4, x * 0.7, y * 0.7, 1, 1, 1) - 0.5) * 0.25; if (Math.abs(n) < 0.06) continue;
    c.fillStyle = n > 0 ? css(mix(light, 0.5, base), Math.min(0.07, n * 0.22 * k)) : `rgba(0,0,8,${Math.min(0.09, -n * 0.26 * k).toFixed(3)})`; c.fillRect(x, y, 1, 1);
  }
  crestLight(c, top, k, M, light, 30);
  // shade side: the slopes turned away from the sun sink a step, falling off softly down the slope
  if (M.sun) { const n = top.length, f = top.map((_, i) => { const a = top[Math.max(0, i - 4)], b = top[Math.min(n - 1, i + 4)]; return Math.max(0, Math.min(1, ((b[1] - a[1]) / (b[0] - a[0] || 1)) * 1.6 - 0.1)); });
    c.lineWidth = 1.5; for (let j = 0; j < 30; j++) { const fall = Math.pow(1 - j / 30, 1.3) * 0.075 * k; for (let i = 1; i < n; i++) { const ff = (f[i] + f[i - 1]) / 2; if (ff < 0.02) continue; c.strokeStyle = `rgba(4,6,20,${(fall * ff).toFixed(4)})`; c.beginPath(); c.moveTo(top[i - 1][0], top[i - 1][1] + j * 1.2); c.lineTo(top[i][0], top[i][1] + j * 1.2); c.stroke(); } } }
  // gullies: a tapered shade cut down the sun-facing slope, a lit lip on its sun side
  for (let i = 0; i < 7 * k + 2; i++) {
    const gx = x0 + 20 + r() * (x1 - x0 - 40); if (M.sun && slope(gx) > 0.05) continue;
    const gy = at(gx) + 1.5 + r() * 3, len = 6 + r() * 12, bend = (r() - 0.5) * 3; if (gy + len > SHEET_TOP - 2) continue;
    const pts: P[] = []; for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push([gx - t * len * 0.3 + Math.sin(t * Math.PI) * bend, gy + t * len]); }
    for (let j = 1; j < pts.length; j++) { const t = j / pts.length, w = 0.9 * (1 - t) + 0.25; c.strokeStyle = `rgba(0,0,10,${(0.16 * k * (1 - t * 0.6)).toFixed(3)})`; c.lineWidth = w; c.beginPath(); c.moveTo(pts[j - 1][0], pts[j - 1][1]); c.lineTo(pts[j][0], pts[j][1]); c.stroke(); }
    if (M.sun) { c.strokeStyle = css(mix(light, 0.45, base), 0.22 * k); c.lineWidth = 0.4; c.beginPath(); pts.slice(0, 6).forEach(([x, y], j) => (j ? c.lineTo(x - 0.6, y) : c.moveTo(x - 0.6, y))); c.stroke(); }
  }
  // terraces on the lower lit slopes: short contour pairs, dark under, light above
  for (let row = 1; row < 7; row++) {
    const off = 6 + row * 4.2; let x = x0 + 8 + r() * 10;
    while (x < x1 - 10) { const len = 5 + r() * 12, xs = x; x += len + 4 + r() * 14; if (slope(xs) > 0.25 && M.sun) continue; const yA = at(xs) + off, pts: P[] = []; for (let u = xs; u < xs + len; u += 2) pts.push([u, at(u) + off + Math.sin(u * 0.2) * 0.3]); if (yA > SHEET_TOP - 2) continue;
      c.strokeStyle = `rgba(0,0,12,${0.12 * k})`; c.lineWidth = 0.5; c.beginPath(); pts.forEach(([px, py], j) => (j ? c.lineTo(px, py + 0.5) : c.moveTo(px, py + 0.5))); c.stroke();
      c.strokeStyle = css(mix(light, 0.4, base), 0.14 * k); c.beginPath(); pts.forEach(([px, py], j) => (j ? c.lineTo(px, py - 0.2) : c.moveTo(px, py - 0.2))); c.stroke(); }
  }
  // olive and scrub drifts: clustered dots, lit on the sun side, thinning where the drift ends
  const green: RGB = mix([62, 80, 64], 0.55, base);
  for (let d = 0; d < 7 * k + 2; d++) {
    const cx = x0 + 15 + r() * (x1 - x0 - 30), cy = at(cx) + 4 + r() * 22, n = 6 + Math.floor(r() * 14);
    for (let j = 0; j < n; j++) { const a = r() * 6.283, rr = Math.pow(r(), 0.7) * 9, x = cx + Math.cos(a) * rr * 1.6, y = cy + Math.sin(a) * rr * 0.6; if (y < at(x) + 1.5 || y > SHEET_TOP) continue; const s = (0.6 + r() * 0.7) * (1 - rr / 14);
      c.fillStyle = css(green, 0.9); c.beginPath(); c.arc(x, y, s, 0, 6.283); c.fill();
      if (M.sun) { c.fillStyle = css(mix(light, 0.35, green), 0.7); c.beginPath(); c.arc(x - s * 0.35, y - s * 0.3, s * 0.45, 0, 6.283); c.fill(); }
      c.fillStyle = "rgba(0,0,10,0.25)"; c.fillRect(x, y + s * 0.6, s * 1.4, 0.4); }
  }
  c.restore();
  // the crest catches the light: a fine rim on the sun-facing stretches
  c.lineWidth = 0.6; for (let i = 1; i < top.length; i++) { const [xa, ya] = top[i - 1], [xb, yb] = top[i], s = (yb - ya) / (xb - xa || 1), f = M.sun ? Math.max(0, -s * 1.4 + 0.2) : M.night ? 0.25 : 0.12; if (f <= 0.02) continue; c.strokeStyle = css(light, Math.min(0.55, f * 0.6) * k); c.beginPath(); c.moveTo(xa, ya + 0.3); c.lineTo(xb, yb + 0.3); c.stroke(); }
};

// ---------------------------------------------------------------- clouds
type Puff = { x: number; y: number; rx: number; ry: number };
const cloudBank = (cx: number, cy: number, w: number, h: number, n: number, seed: number): Puff[] => {
  const r = rng(seed), out: Puff[] = [{ x: cx, y: cy + h * 0.25, rx: w * 0.55, ry: h * 0.45 }];      // the soft base the puffs sit on
  for (let i = 0; i < n; i++) { const t = r(), x = cx + (t - 0.5) * w * 0.8, dome = Math.sin(t * Math.PI), rx = w * (0.1 + r() * 0.16) * (0.6 + dome * 0.6); out.push({ x, y: cy - dome * h * (0.2 + r() * 0.5), rx, ry: rx * (0.45 + r() * 0.2) }); }
  return out.sort((a, b) => a.y - b.y);
};
const clouds = (c: Ctx, M: Moment) => {
  const L = M.sun ?? M.moon ?? [FW / 2, -200];
  const draw = (puffs: Puff[], body: RGB, lit: RGB, litA: number, alpha: number) => {
    for (const p of puffs) {   // body, soft-edged
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx); g.addColorStop(0, css(body, alpha)); g.addColorStop(0.65, css(body, alpha * 0.85)); g.addColorStop(1, css(body, 0));
      c.save(); c.translate(p.x, p.y); c.scale(1, p.ry / p.rx); c.translate(-p.x, -p.y); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.rx, 0, 6.283); c.fill(); c.restore();
    }
    for (const p of puffs) {   // the side toward the light catches it (an underside when the sun is low)
      const dx = L[0] - p.x, dy = L[1] - p.y, d = Math.hypot(dx, dy) || 1, ox = p.x + (dx / d) * p.rx * 0.45, oy = p.y + (dy / d) * p.ry * 0.55;
      const g = c.createRadialGradient(ox, oy, 0, ox, oy, p.rx * 0.8); g.addColorStop(0, css(lit, litA)); g.addColorStop(1, css(lit, 0));
      c.save(); c.translate(p.x, p.y); c.scale(1, p.ry / p.rx); c.translate(-p.x, -p.y); c.beginPath(); c.arc(p.x, p.y, p.rx * 0.98, 0, 6.283); c.clip(); c.fillStyle = g; c.fillRect(p.x - p.rx, p.y - p.rx, p.rx * 2, p.rx * 2); c.restore();
    }
  };
  const stratus = (y: number, x: number, w: number, h: number, col: RGB, a: number, seed: number) => draw(cloudBank(x, y, w, h, 9, seed), col, mix(M.sunCol, 0.9, [255, 255, 255]), M.sun ? 0.55 : 0.1, a);
  if (M.clouds === "golden") {
    stratus(392, 230, 200, 5, [196, 140, 150], 0.55, 1); stratus(372, 110, 140, 6, [176, 130, 150], 0.5, 2);
    draw(cloudBank(270, 330, 130, 16, 12, 3), [136, 120, 150], [255, 200, 150], 0.75, 0.85);
    draw(cloudBank(90, 96, 150, 12, 12, 4), [120, 128, 168], [250, 190, 170], 0.45, 0.6);
    draw(cloudBank(300, 214, 90, 7, 8, 5), [150, 140, 175], [255, 205, 170], 0.5, 0.55);
  } else if (M.clouds === "noon") {
    draw(cloudBank(300, 330, 120, 20, 12, 6), [196, 210, 228], [255, 255, 255], 0.9, 0.9);
    draw(cloudBank(60, 365, 90, 12, 9, 7), [190, 206, 226], [255, 255, 255], 0.85, 0.85);
    draw(cloudBank(250, 60, 110, 10, 9, 8), [210, 224, 240], [255, 255, 255], 0.8, 0.6);
  } else if (M.clouds === "night") {
    draw(cloudBank(110, 300, 160, 8, 10, 9), [40, 46, 84], [150, 160, 210], 0.35, 0.7);
    draw(cloudBank(320, 210, 100, 6, 8, 10), [36, 42, 80], [150, 160, 210], 0.35, 0.6);
  } else {
    for (let i = 0; i < 9; i++) draw(cloudBank(20 + (i % 3) * 170 + (i % 2) * 40, 30 + i * 42, 320, 12, 16, 20 + i), mix([70, 84, 98], i / 9, [128, 144, 156]), [196, 206, 214], 0.25, 0.7);
    draw(cloudBank(250, 372, 220, 10, 14, 30), [150, 164, 174], [210, 218, 224], 0.3, 0.75);
  }
};

const rain = (c: Ctx) => {
  const r = rng(44);
  c.lineWidth = 0.45; for (let i = 0; i < 900; i++) { const x = r() * (FW + 40) - 20, y = r() * 460, l = 5 + r() * 9; c.strokeStyle = `rgba(210,222,232,${0.08 + r() * 0.16})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * 0.22, y + l); c.stroke(); }
  // a low cloud dragging over the crest, and rain shafts hanging from the bank
  for (let i = 0; i < 4; i++) { const x = 60 + i * 95, g = c.createLinearGradient(x, 300, x - 20, 440); g.addColorStop(0, "rgba(150,166,178,0)"); g.addColorStop(0.5, "rgba(150,166,178,0.16)"); g.addColorStop(1, "rgba(150,166,178,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(x - 20, 300); c.lineTo(x + 25, 300); c.lineTo(x - 5, 446); c.lineTo(x - 50, 446); c.closePath(); c.fill(); }
  for (const [x, y, w] of [[250, 376, 120], [330, 392, 90]] as [number, number, number][]) { const g = c.createRadialGradient(x, y, 0, x, y, w / 2); g.addColorStop(0, "rgba(176,188,198,0.55)"); g.addColorStop(1, "rgba(176,188,198,0)"); c.save(); c.translate(x, y); c.scale(1, 0.16); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, w / 2, 0, 6.283); c.fill(); c.restore(); }
};

// ---------------------------------------------------------------- the settlement portrait
type Home = { x: number; base: number; w: number; h: number; tile: boolean; heater: boolean; tint: number; seed: number };
const HOMES: Home[] = (() => {
  const r = rng(9001), out: Home[] = [];
  for (let row = 0; row < 8; row++) {
    let x = DOT[0] - 52 + r() * 6, run = 0;
    while (x < DOT[0] + 54) {
      const w = 3.6 + r() * 4.2, d = Math.hypot((x - DOT[0]) / 44, row / 7.5), p = Math.exp(-d * d * 1.7);
      run++; if (run > 3 + Math.floor(r() * 3)) { x += 3 + r() * 3; run = 0; continue; }           // a street
      const base = gAt(x + w / 2) + 1.5 + row * 3.6 + r() * 1.2;
      if (r() < p && base < SHEET_TOP - 2 && Math.hypot(x + w / 2 - DOT[0], base - 3 - DOT[1]) > 8) {
        const tall = r() < 0.18 * p, h = tall ? 9 + r() * 6 : 3.4 + r() * 4.2;
        out.push({ x, base, w, h, tile: !tall && r() < 0.2, heater: !tall && r() < 0.45, tint: r(), seed: out.length + 1 });
      }
      x += w + (r() < 0.25 ? 0.6 + r() * 1.4 : 0);
    }
  }
  return out;
})();
const portrait = (M: Moment): Drawn[] => {
  const R = M.ridge, light = M.light, sun = !!M.sun;
  const wallBase = M.night ? mix(M.horizon, 0.25, R) : mix(light.sky, 0.2, R), stone: RGB = [226, 214, 190];
  return HOMES.map((h): Drawn => ({ y: h.base, draw: (c) => {
    const wall = mix(stone, M.night ? 0.04 : 0.04 + 0.16 * h.tint, wallBase), lit = sun ? mix(light.sun ?? stone, 0.42 * light.sunK, mix(stone, 0.16, R)) : M.night ? mix([150, 165, 220], 0.06, wall) : mix([255, 255, 255], 0.1, wall);
    const shade = mix([0, 0, 0], 0.3, wall), x0 = h.x, y0 = h.base - h.h, side = Math.max(0.8, Math.min(1.8, h.w * 0.28));
    if (sun && light.cast > 0) { const g = c.createLinearGradient(x0 + h.w, 0, x0 + h.w + h.h * 0.9 * light.cast, 0); g.addColorStop(0, "rgba(5,6,20,0.45)"); g.addColorStop(1, "rgba(5,6,20,0)"); c.fillStyle = g; c.fillRect(x0 + h.w, h.base - 1.2, h.h * 0.9 * light.cast, 1.6); }
    c.fillStyle = css(wall); c.fillRect(x0, y0, h.w, h.h);
    c.fillStyle = css(lit); c.fillRect(x0, y0, side, h.h);
    c.fillStyle = css(shade, sun ? 0.7 : 0.35); c.fillRect(x0 + h.w - Math.min(1.2, h.w * 0.2), y0, Math.min(1.2, h.w * 0.2), h.h);
    // windows: rows by storey, a few warm at dusk and at night
    const r = rng(h.seed * 31);
    for (let wy = y0 + 1.3; wy < h.base - 1.4; wy += 2.3) for (let wx = x0 + side + 0.5; wx < x0 + h.w - 1.2; wx += 1.7) {
      if (r() < 0.35) continue; const warm = r() < M.warmWin;
      c.fillStyle = warm ? (M.night ? "rgba(255,214,150,0.95)" : "rgba(255,206,140,0.85)") : css(shade, M.night ? 0.5 : 0.6); c.fillRect(wx, wy, 0.7, 0.9);
    }
    if (h.tile) { // a hipped tiled roof: lit plane toward the sun, dark plane away
      const roof: RGB = mix([181, 85, 60], M.night ? 0.15 : 0.5, R), roofLit: RGB = sun ? mix([214, 120, 84], 0.55 * light.sunK + 0.15, R) : roof;
      c.fillStyle = css(roof); c.beginPath(); c.moveTo(x0 - 0.5, y0 + 0.2); c.lineTo(x0 + h.w * 0.35, y0 - 2.2); c.lineTo(x0 + h.w * 0.65, y0 - 2.2); c.lineTo(x0 + h.w + 0.5, y0 + 0.2); c.closePath(); c.fill();
      c.fillStyle = css(roofLit); c.beginPath(); c.moveTo(x0 - 0.5, y0 + 0.2); c.lineTo(x0 + h.w * 0.35, y0 - 2.2); c.lineTo(x0 + h.w * 0.5, y0 - 2.2); c.lineTo(x0 + h.w * 0.3, y0 + 0.2); c.closePath(); c.fill();
    } else {
      c.fillStyle = css(sun ? lit : mix([255, 255, 255], M.night ? 0.06 : 0.18, wall), 0.75); c.fillRect(x0, y0, h.w, 0.5);   // parapet catching the light
      if (h.heater) { const hx = x0 + h.w * (0.3 + 0.4 * h.tint); c.fillStyle = css(mix([235, 235, 230], 0.25, wall)); c.fillRect(hx, y0 - 1, 1.3, 0.6); c.fillStyle = css(mix([40, 60, 90], 0.6, wall)); c.beginPath(); c.moveTo(hx - 1.4, y0); c.lineTo(hx - 0.2, y0 - 0.9); c.lineTo(hx - 0.2, y0); c.closePath(); c.fill(); }
    }
    c.fillStyle = "rgba(4,5,18,0.5)"; c.fillRect(x0 - 0.2, h.base - 0.4, h.w + 0.6, 0.7);
  } }));
};
/** Trees between the houses and on the town's edge: cypresses and round pines, lit on the sun side. */
const scrubTrees = (M: Moment): Drawn[] => {
  const r = rng(616), out: Drawn[] = [], sun = !!M.sun, light = M.light;
  const dark: RGB = mix([52, 74, 58], M.night ? 0.2 : 0.55, M.ridge), litC: RGB = sun ? mix(light.sun ?? [200, 200, 160], 0.3, dark) : mix([255, 255, 255], 0.08, dark);
  for (let i = 0; i < 46; i++) {
    const x = DOT[0] - 62 + r() * 124, d = Math.abs(x - DOT[0]) / 62, base = gAt(x) + 2 + r() * 28 * (1 - d * 0.5);
    if (base > SHEET_TOP - 1 || Math.hypot(x - DOT[0], base - DOT[1]) < 9) continue;
    const cyp = r() < 0.4, s = 0.8 + r() * 0.6;
    out.push({ y: base + 0.1, draw: (c) => {
      if (cyp) { const hh = 5 * s + 2; c.fillStyle = css(dark); c.beginPath(); c.moveTo(x, base - hh); c.quadraticCurveTo(x + 1.2 * s, base - hh * 0.45, x + 0.4, base); c.lineTo(x - 0.4, base); c.quadraticCurveTo(x - 1.2 * s, base - hh * 0.45, x, base - hh); c.fill(); c.fillStyle = css(litC, 0.8); c.beginPath(); c.moveTo(x, base - hh); c.quadraticCurveTo(x - 1.2 * s, base - hh * 0.45, x - 0.4, base); c.lineTo(x - 0.1, base); c.closePath(); c.fill(); }
      else { const rr = 1.3 * s + 0.4; c.fillStyle = css(dark); c.beginPath(); c.arc(x, base - rr, rr, 0, 6.283); c.arc(x + rr * 0.8, base - rr * 0.8, rr * 0.75, 0, 6.283); c.fill(); c.fillStyle = css(litC, 0.75); c.beginPath(); c.arc(x - rr * 0.35, base - rr * 1.25, rr * 0.55, 0, 6.283); c.fill(); c.fillStyle = "rgba(4,6,18,0.4)"; c.fillRect(x - rr * 0.4, base - 0.3, rr * 2.4, 0.5); }
    } });
  }
  return out;
};

// ---------------------------------------------------------------- UI skin per moment (the app's; a dark sheet at night)
const skinFor = (M: Moment): Skin => {
  if (!M.night) return SKIN_APP;
  return { ...SKIN_APP, ink: { ...SKIN_APP.ink, sheet: "#EEF1FF", sheetMuted: "#A3ACCE" },
    sheet: (c, y) => { c.fillStyle = "#12162B"; roundRect(c, 0, y, FW, FH - y + 30, 22); c.fill(); },
    icon: (c, k, x, y, s) => SKIN_APP.icon(c, k, x, y, false && s),
    rule: (c, x0, x1, y) => { c.fillStyle = "#262b48"; c.fillRect(x0, y, x1 - x0, 0.6); },
    bar: (c, x, y, w, lo, hi) => { c.fillStyle = "#262b48"; roundRect(c, x, y, w, 6, 3); c.fill(); const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#7FB7D9"); g.addColorStop(1, "#F2C14E"); c.fillStyle = g; roundRect(c, x + (lo - 14) * 6, y, (hi - lo) * 9, 6, 3); c.fill(); },
  };
};
