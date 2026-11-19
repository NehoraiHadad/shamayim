// VARIANT 4 · FOLK-TALE STORYBOOK (after the folkTale plate).
// MEDIUM: gouache and watercolour over an HB pencil drawing on warm cream cartridge. Everything is drawn
// in pencil first; then painted back to front, the paint thicker the nearer the thing is. DEPTH IS THE
// MEDIUM: the far bay hills stay bare pencil, the mid ridge is a thin pale wash that lets the drawing
// through and melts into the golden haze, the near ridge, town and landmarks are opaque body colour with
// dry-brush drags and mottle, edges settling darker. ORDER: sheet, pencil, sky glow wash, washes back to
// front, gouache near, haze, accents. PALETTE: cream paper, sap and olive greens, yellow ochre, cadmium
// orange, vermilion roofs, burnt umber, cobalt in the sky, Payne's grey only in the far pencil.
// LIGHT: the late sun low on the left, a golden haze in the middle distance, shadows to the right.
// UI: the page IS the paper: graphite type, pencil-ruled rules, watercolour for the bar and accents.
import { displace, rng, type Ctx, type Env, type P } from "./core";
import { drawUI, type Skin } from "./ui";
import { GRAPH, PAPER, far, gouache, pencil, type Line } from "./folkTaleKit";
import { CLOUDS, DOT, FAR, FH, FW, HOUSES, ICON, MID, NEAR, PINES, SEA_Y, SUN, closeDown, tracePoly } from "./valley";
import { placedMarks, shadeRuns, visibleCrest } from "./valleyKit";
import { dense, densePath } from "./styleMid";

const C = { cobalt: "#6f8fc0", glow: "#f3c56f", orange: "#ee9a4a", sap: "#6f8a3a", olive: "#56622e", oliveD: "#3d4522", umber: "#7a5232", umberD: "#4e3420", ochre: "#d9a441", verm: "#cf4b2a", cream: "#efe2c2", grey: "#9aa0a6", graph: "#4a4238" };
const pen = (c: Ctx, pts: P[], seed: number, w = 0.55, a = 0.75, closed = false) => pencil(c, { pts: densePath(pts, 1.2), seed, w, a, closed, per: 1, col: GRAPH } as Line);
const wc = (c: Ctx, pts: P[], col: string, a: number, seed: number, amp = 2) => { const s = displace(dense(pts, 2), amp, 0.06, 3, seed); c.globalAlpha = a; c.fillStyle = col; tracePoly(c, s); c.fill(); c.globalAlpha = a * 0.5; c.strokeStyle = col; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1; };

const scene = (c: Ctx) => {
  c.fillStyle = PAPER; c.fillRect(0, 0, FW, FH);
  // the sky: a pale cobalt wash from the top that never reaches the horizon, a golden glow wash round the sun
  const g = c.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, "rgba(111,143,192,0.42)"); g.addColorStop(0.6, "rgba(111,143,192,0.12)"); g.addColorStop(1, "rgba(111,143,192,0)");
  c.save(); tracePoly(c, displace(dense([[-30, -30], [FW + 30, -30], [FW + 30, 320], [-30, 336]], 3), 18, 0.02, 3, 3)); c.clip(); c.fillStyle = g; c.fillRect(0, 0, FW, 340); c.restore();
  const h = c.createRadialGradient(SUN[0], SUN[1], 0, SUN[0], SUN[1], 260); h.addColorStop(0, "rgba(243,197,111,0.85)"); h.addColorStop(0.3, "rgba(238,154,74,0.32)"); h.addColorStop(1, "rgba(243,197,111,0)"); c.fillStyle = h; c.fillRect(0, 160, FW, 300);
  // clouds: pencil contours with a warm underside wash
  for (const k of CLOUDS) { const top: P[] = [[k.x, k.y + 2], [k.x + k.w * 0.2, k.y - k.h * 0.6], [k.x + k.w * 0.45, k.y - k.h], [k.x + k.w * 0.7, k.y - k.h * 0.5], [k.x + k.w, k.y + 2]]; if (k.y > 250) wc(c, [...top, [k.x + k.w, k.y + 4], [k.x, k.y + 4]], C.orange, 0.22, k.x); pen(c, top, k.x, 0.45, 0.45); }
  // the sun: paper left bare inside a ring of glow, a light pencil circle
  c.fillStyle = "#fff6dc"; c.beginPath(); c.arc(SUN[0], SUN[1], 9, 0, 7); c.fill(); pen(c, Array.from({ length: 26 }, (_, i) => [SUN[0] + Math.cos(i * 0.26) * 9.4, SUN[1] + Math.sin(i * 0.26) * 9.4] as P), 5, 0.4, 0.4);
  // far bay hills: bare pencil
  pen(c, FAR, 11, 0.5, 0.55); pen(c, [[0, SEA_Y], [160, SEA_Y]], 12, 0.35, 0.35);
  // mid ridge: a thin pale wash that lets the drawing through, lost into the haze
  wc(c, closeDown(MID), far(C.sap, 0.55), 0.55, 21); pen(c, visibleCrest(MID), 22, 0.55, 0.6);
  const hz = c.createRadialGradient(110, 420, 0, 110, 420, 120); hz.addColorStop(0, "rgba(243,210,140,0.5)"); hz.addColorStop(1, "rgba(243,210,140,0)"); c.fillStyle = hz; c.fillRect(0, 300, FW, 160);
  // near ridge: opaque gouache, dry-brushed, darker where the slope turns away
  gouache(c, closeDown(NEAR), C.olive, { seed: 31, wob: 1.2, tex: { cols: [C.sap, "#8a8a3a", C.oliveD], n: 260, len: 10, w: 1.4, ang: -0.45, a: 0.35 }, rim: C.oliveD, rimW: 0.8, rimA: 0.5 });
  shadeRuns(NEAR, 24).forEach((p, i) => gouache(c, p, C.oliveD, { seed: 40 + i, a: 0.75, wob: 1.5, mottle: { cols: ["#2c3318"], n: 60, r: 1.6, a: 0.4 } }));
  // the golden haze over the middle distance, behind the town
  // pines
  for (const p of PINES) gouache(c, Array.from({ length: 10 }, (_, i) => [p.x + Math.cos(i * 0.628) * p.r * 1.25, p.y - p.r + Math.sin(i * 0.628) * p.r * 1.15] as P), "#3f5a2a", { seed: Math.round(p.x * 3), mottle: { cols: ["#6f8a3a", "#2a3a1c"], n: 4, r: 0.6, a: 0.7, freq: 1 } });
  // town: gouache walls, umber shade side, vermilion roofs, pencil over
  for (const hs of HOUSES) {
    const x0 = hs.x - hs.w / 2, y0 = hs.base - hs.h, box: P[] = [[x0, y0], [x0 + hs.w, y0], [x0 + hs.w, hs.base], [x0, hs.base]];
    gouache(c, box, C.cream, { seed: hs.seed, wob: 0.3 }); gouache(c, [[x0 + hs.w * 0.66, y0], [x0 + hs.w, y0], [x0 + hs.w, hs.base], [x0 + hs.w * 0.66, hs.base]], "#b98f63", { seed: hs.seed + 1, a: 0.85, wob: 0.2 });
    if (hs.roof === "tile") gouache(c, [[x0 - 0.6, y0 + 0.2], [hs.x, y0 - 2.6], [x0 + hs.w + 0.6, y0 + 0.2]], C.verm, { seed: hs.seed + 2, wob: 0.2 });
    const r = rng(hs.seed); for (let j = 0; j < 1 + hs.wins; j++) { c.fillStyle = C.umberD; c.fillRect(x0 + 0.8 + r() * hs.w * 0.45, y0 + 1.3 + r() * (hs.h - 3), 0.8, 1.1); }
    pen(c, [[x0, hs.base], [x0, y0], [x0 + hs.w, y0], [x0 + hs.w, hs.base]], hs.seed + 3, 0.35, 0.55);
  }
  for (const m of placedMarks()) { for (const p of m.parts) gouache(c, p.pts, p.role === "lit" ? "#f6ead0" : p.role === "open" ? C.umberD : p.role === "roof" ? C.verm : p.role === "shade" ? C.umber : "#c9b48e", { seed: m.x + p.pts.length, wob: 0.15 }); for (const p of m.parts.filter((q) => q.role === "body")) pen(c, [...p.pts, p.pts[0]], m.x + p.pts[0][1], 0.3, 0.6); }
  pen(c, NEAR, 33, 0.7, 0.7);
  // the dot: an ochre bead with a pencil ring
  gouache(c, Array.from({ length: 12 }, (_, i) => [DOT[0] + Math.cos(i * 0.5236) * 4.5, DOT[1] + Math.sin(i * 0.5236) * 4.5] as P), C.ochre, { seed: 9 }); pen(c, Array.from({ length: 24 }, (_, i) => [DOT[0] + Math.cos(i * 0.28) * 5.6, DOT[1] + Math.sin(i * 0.28) * 5.6] as P), 9, 0.5, 0.8);
};

const folkIcon = (c: Ctx, k: string, x: number, y: number) => {
  if (k === "sun" || k === "set") { wc(c, Array.from({ length: 12 }, (_, i) => [x + Math.cos(i * 0.5236) * 4.4, y + Math.sin(i * 0.5236) * 4.4] as P), C.ochre, 0.75, x, 0.8); pen(c, Array.from({ length: 22 }, (_, i) => [x + Math.cos(i * 0.3) * 4.6, y + Math.sin(i * 0.3) * 4.6] as P), x, 0.4, 0.75); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; if (k === "set" && Math.sin(a) > 0.1) continue; pen(c, [[x + Math.cos(a) * 6.2, y + Math.sin(a) * 6.2], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]], x + i, 0.7, 0.85); } if (k === "set") pen(c, [[x - 9.5, y + 1.5], [x + 9.5, y + 1.5]], x, 0.4, 0.7); }
  else if (k === "moon") { c.fillStyle = "rgba(111,143,192,0.45)"; ICON.moon(c, x, y); pen(c, Array.from({ length: 16 }, (_, i) => [x + Math.cos(2.0 + i * 0.25) * 5.6, y + Math.sin(2.0 + i * 0.25) * 5.6] as P), x, 0.4, 0.7); }
  else { if (k === "partly") wc(c, Array.from({ length: 10 }, (_, i) => [x - 3 + Math.cos(i * 0.628) * 4, y - 3 + Math.sin(i * 0.628) * 4] as P), C.ochre, 0.7, x, 0.6); else { c.fillStyle = "rgba(111,143,192,0.45)"; ICON.moon(c, x - 3, y - 3, 4.4); } const cl = ICON.cloud(x + 2, y + 2, 0.85); wc(c, cl, C.cobalt, 0.25, x + 5, 0.6); pen(c, cl, x + 9, 0.4, 0.75); }
};

const SKIN: Skin = {
  fonts: { name: "Frank Ruhl Libre", hero: '700 104px "Frank Ruhl Libre"', sentence: '400 19px "Frank Ruhl Libre"', label: '"Frank Ruhl Libre"', body: '400 16px "Frank Ruhl Libre"', num: '"Frank Ruhl Libre"' },
  ink: { sky: C.graph, skyMuted: "rgba(74,66,56,0.72)", sheet: C.graph, sheetMuted: "#8a7a62", land: "#f4edda", landMuted: "rgba(244,237,218,0.75)" },
  topButton: (c, x, y) => { pen(c, Array.from({ length: 30 }, (_, i) => [x + Math.cos(i * 0.22) * 12, y + Math.sin(i * 0.22) * 12] as P), 3, 0.45, 0.55); pen(c, Array.from({ length: 12 }, (_, i) => [x + Math.cos(-2.6 + i * 0.38) * 5, y + Math.sin(-2.6 + i * 0.38) * 5] as P), 4, 0.5, 0.8); },
  icon: (c, k, x, y) => folkIcon(c, k, x, y),
  hourLine: (c, pts) => { pen(c, pts, 51, 0.9, 0.85); pts.forEach(([x, y], i) => wc(c, Array.from({ length: 8 }, (_, j) => [x + Math.cos(j * 0.785) * (i ? 2.3 : 3.8), y + Math.sin(j * 0.785) * (i ? 2.3 : 3.8)] as P), i ? C.verm : C.ochre, 0.8, x, 0.4)); },
  chip: (c, x, y, w, h) => wc(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], C.glow, 0.55, 61, 1.5),
  seaLine: (c, x0, x1, y) => { for (let x = x0; x < x1; x += 7) pen(c, [[x, y], [x + 3.5, y]], x, 0.35, 0.5); },
  sheet: (c, y) => { c.fillStyle = PAPER; c.fillRect(0, y, FW, FH - y); const g = c.createLinearGradient(0, y, 0, y + 14); g.addColorStop(0, "rgba(217,164,65,0.35)"); g.addColorStop(1, "rgba(217,164,65,0)"); c.fillStyle = g; c.fillRect(0, y, FW, 14); pen(c, [[6, y + 0.5], [FW - 6, y]], 71, 0.6, 0.7); },
  accent: (c, x, y, h) => wc(c, [[x - 1, y], [x + 3, y], [x + 3, y + h], [x - 1, y + h]], C.verm, 0.6, 81, 1),
  bar: (c, x, y, w, lo, hi) => { pen(c, [[x, y + 6], [x + w, y + 6]], lo + hi, 0.35, 0.5); const a = x + (lo - 14) * 6, b = a + (hi - lo) * 9, g = c.createLinearGradient(a, 0, b, 0); g.addColorStop(0, "rgba(111,143,192,0.75)"); g.addColorStop(1, "rgba(217,164,65,0.85)"); c.save(); tracePoly(c, displace(dense([[a, y], [b, y], [b, y + 5], [a, y + 5]], 1.5), 1.2, 0.2, 2, lo)); c.fillStyle = g; c.fill(); c.restore(); },
  rule: (c, x0, x1, y) => pen(c, [[x0, y], [x1, y + 0.4]], 91, 0.4, 0.5),
  chevron: (c, x, y) => pen(c, [[x + 5, y - 2], [x, y + 2.5], [x - 5, y - 2]], 92, 0.5, 0.7),
};

export const drawFolk = (c: Ctx, env: Env) => { c.setTransform(env.scale, 0, 0, env.scale, 0, 0); scene(c); drawUI(c, SKIN); };
