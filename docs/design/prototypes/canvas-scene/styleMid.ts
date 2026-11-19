// VARIANT 3 · MID-CENTURY GOUACHE (after the midCentury plate).
// MEDIUM: opaque matte designer's gouache on warm illustration board. Shapes laid flat with a loaded flat
// brush, the stroke visible only at a slightly ragged edge; a lighter colour may go over a darker one.
// Then a nearly dry brush dragged across the flats (broken parallel streaks: weather on the hills, cloud
// edges). Last a loose brush-and-ink line on its own plate, OFF REGISTER from the colour, open where the
// colour already says the edge. ORDER: big to small (sky, sun, hills, town, trees, landmarks), dry brush,
// then the line. PALETTE: warm board, mustard, tomato, turquoise, olive, deep green-black, pink, cream.
// LIGHT: low sun on the left; every house a darker right side, flat shadows thrown right.
// UI: the board continues into the sheet; the type is the period's: a condensed poster numeral (Karantina),
// a bookish serif (Frank Ruhl Libre); icons are painted shapes with the off-register ink line.
import { displace, fractal, rng, sample, type Ctx, type Env, type P } from "./core";
import { drawUI, type Skin } from "./ui";
import { gouache, ribbonOf } from "./folkTaleKit";
import { DOT, FAR, FH, FW, HOUSES, ICON, MID, NEAR, PINES, SEA_Y, SUN, closeDown, tracePoly } from "./valley";
import { placedMarks, shadeRuns, visibleCrest } from "./valleyKit";

const C = { board: "#f1e1b8", skyT: "#7fb5ad", skyM: "#cfc48e", skyL: "#efc27a", sun: "#f4d27a", sunR: "#e8a296", cloud: "#fbf2dc", far: "#c9a59c", sea: "#f7e3b0",
  mid: "#4f8f86", midS: "#3d746d", near: "#2d4b3c", nearS: "#22392f", olive: "#a6a340", ochre: "#e2a73a", tomato: "#d2462a", pink: "#e8a296", cream: "#f5e8c8", turq: "#56aba2", teal: "#244e4a", dark: "#2b2724", cyp: "#203f30" };
const REG: P = [0.9, -0.7];

/** Densify a polygon along straight lines (no curve overshoot), then let the brush edge wander. */
export const dense = (pts: P[], step = 1.5): P[] => { const out: P[] = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); } return out; };
/** Densify an open path along straight segments. */
export const densePath = (pts: P[], step = 1): P[] => { const out: P[] = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); } out.push(pts[pts.length - 1]); return out; };
const ragged = (pts: P[], seed: number, amp = 1.1) => displace(dense(pts), amp, 0.35, 2, seed);
const paint = (c: Ctx, pts: P[], col: string, seed: number, amp = 1.1) => { c.fillStyle = col; tracePoly(c, ragged(pts, seed, amp)); c.fill(); };
/** The dry brush: broken parallel bristle streaks dragged across a flat, clipped to it. */
const dry = (c: Ctx, pts: P[], cols: string[], n: number, ang: number, len: number, w: number, seed: number, a = 0.4) => gouache(c, pts, "rgba(0,0,0,0)", { seed, tex: { cols, n, len, w, ang, jit: 0.12, a } });
/** The ink line: a loose thick-thin brush line, broken where the colour already says the edge, printed off register. */
const ink = (c: Ctx, pts: P[], w: number, seed: number, open = 0.32, col = C.dark) => {
  const s = densePath(pts.map(([x, y]) => [x + REG[0], y + REG[1]] as P), 1); let run: P[] = [];
  const flush = () => { if (run.length > 2) { const poly = ribbonOf(run, (t) => Math.max(0.12, w * 0.5 * (0.45 + 0.8 * fractal(seed, t * 9, 1, 1, 1, 2)) * Math.min(1, t * 6, (1 - t) * 6 + 0.2))); c.fillStyle = col; tracePoly(c, poly); c.fill(); } run = []; };
  s.forEach((p, i) => { if (fractal(seed + 3, i * 0.05, 0, 1, 1, 2) < open) flush(); else run.push(p); }); flush();
};

const scene = (c: Ctx) => {
  c.fillStyle = C.board; c.fillRect(0, 0, FW, FH);
  // sky: three flat bands of gouache, brushed edges, a lighter one laid over the darker
  paint(c, [[-4, -4], [FW + 4, -4], [FW + 4, 250], [-4, 262]], C.skyT, 1, 2.2);
  paint(c, [[-4, 238], [FW + 4, 226], [FW + 4, 352], [-4, 360]], C.skyM, 2, 2.2);
  paint(c, [[-4, 344], [FW + 4, 338], [FW + 4, 450], [-4, 450]], C.skyL, 3, 2.2);
  dry(c, [[-4, 0], [FW + 4, 0], [FW + 4, 450], [-4, 450]], [C.cloud, "#a9cfc7"], 70, -0.05, 60, 2.6, 4, 0.18);
  // sun: a flat disc and a pink ring brushed round it
  c.strokeStyle = C.sunR; c.lineWidth = 3; c.globalAlpha = 0.8; c.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * 6.283, r = 17 + (fractal(5, i * 0.3, 0, 1, 1, 2) - 0.5) * 2.4; i ? c.lineTo(SUN[0] + Math.cos(a) * r, SUN[1] + Math.sin(a) * r) : c.moveTo(SUN[0] + r, SUN[1]); } c.stroke(); c.globalAlpha = 1;
  paint(c, Array.from({ length: 24 }, (_, i) => [SUN[0] + Math.cos(i * 0.2618) * 11, SUN[1] + Math.sin(i * 0.2618) * 11] as P), C.sun, 6, 1.2);
  // clouds: cream flats with dry-brushed tails
  for (const [x, y, w] of [[90, 98, 110], [290, 76, 80], [300, 350, 100]] as [number, number, number][]) { const pts: P[] = [[x - w / 2, y + 3], [x - w / 3, y - 4], [x, y - 7], [x + w / 3, y - 3], [x + w / 2, y + 3]]; paint(c, pts, C.cloud, x, 1.4); dry(c, [[x - w / 2 - 20, y - 2], [x + w / 2 + 20, y - 2], [x + w / 2 + 20, y + 6], [x - w / 2 - 20, y + 6]], [C.cloud], 10, 0, w * 0.7, 2, x + 1, 0.5); }
  // hills
  paint(c, closeDown(FAR), C.far, 7); c.fillStyle = C.sea; c.fillRect(0, SEA_Y - 1, 160, 2);
  paint(c, closeDown(MID), C.mid, 8); shadeRuns(MID, 16).forEach((p, i) => paint(c, p, C.midS, 20 + i));
  paint(c, closeDown(NEAR), C.near, 9); shadeRuns(NEAR, 26).forEach((p, i) => paint(c, p, C.nearS, 30 + i));
  dry(c, closeDown(NEAR), [C.olive, "#5c7a4a"], 90, -0.35, 22, 1.6, 10, 0.32);
  dry(c, closeDown(MID), ["#7fb0a3"], 30, -0.3, 18, 1.4, 11, 0.3);
  // trees: round dark crowns and a few cypresses, the period's shorthand
  for (const p of PINES) { paint(c, Array.from({ length: 10 }, (_, i) => [p.x + Math.cos(i * 0.628) * p.r * 1.2, p.y - p.r + Math.sin(i * 0.628) * p.r * 1.2] as P), C.cyp, p.x * 7, 0.6); }
  for (const x of [180, 236, 300]) { const g = NEAR.find(([px]) => px >= x)![1] + 3; paint(c, [[x, g - 13], [x + 2, g - 6], [x + 1.6, g], [x - 1.6, g], [x - 2, g - 6]], C.cyp, x, 0.5); }
  // town: flat walls in the palette, a darker right side, tomato roofs, flat shadows thrown right
  const walls = [C.cream, C.pink, C.ochre, C.cream, C.turq, C.cream];
  for (const h of HOUSES) {
    const x0 = h.x - h.w / 2, y0 = h.base - h.h, col = walls[h.seed % walls.length];
    c.fillStyle = "rgba(34,57,47,0.55)"; tracePoly(c, [[x0 + h.w, h.base - 0.5], [x0 + h.w + h.h * 0.6, h.base + 0.8], [x0 + h.w, h.base + 1]]); c.fill();
    paint(c, [[x0, y0], [x0 + h.w, y0], [x0 + h.w, h.base], [x0, h.base]], col, h.seed, 0.4);
    paint(c, [[x0 + h.w * 0.68, y0], [x0 + h.w, y0], [x0 + h.w, h.base], [x0 + h.w * 0.68, h.base]], mixDark(col), h.seed + 50, 0.3);
    if (h.roof === "tile") paint(c, [[x0 - 0.6, y0 + 0.2], [h.x, y0 - 2.6], [x0 + h.w + 0.6, y0 + 0.2]], C.tomato, h.seed + 9, 0.3);
    const r = rng(h.seed); for (let j = 0; j < 1 + h.wins; j++) { c.fillStyle = C.dark; c.fillRect(x0 + 0.8 + r() * (h.w * 0.5), y0 + 1.4 + r() * (h.h - 3), 0.9, 1.2); }
  }
  for (const m of placedMarks()) for (const p of m.parts) paint(c, p.pts, p.role === "lit" ? C.cream : p.role === "open" ? C.dark : p.role === "roof" ? C.tomato : p.role === "shade" ? C.teal : "#d9c9a4", m.x + p.pts.length, 0.25);
  // the line plate, off register
  ink(c, visibleCrest(MID), 0.9, 41, 0.45); ink(c, NEAR, 1.3, 42, 0.3); ink(c, FAR.slice(0, 18), 0.7, 43, 0.5);
  for (const h of HOUSES) { const x0 = h.x - h.w / 2, y0 = h.base - h.h; ink(c, [[x0, h.base], [x0, y0], [x0 + h.w, y0], [x0 + h.w, h.base]], 0.55, h.seed + 70, 0.38); }
  for (const m of placedMarks()) for (const p of m.parts.filter((q) => q.role === "body")) ink(c, [...p.pts, p.pts[0]], 0.5, m.x + p.pts[0][1], 0.35);
  // the dot: a mustard disc in a dark brushed ring
  c.fillStyle = C.dark; c.beginPath(); c.arc(DOT[0], DOT[1], 6.6, 0, 7); c.fill(); paint(c, Array.from({ length: 12 }, (_, i) => [DOT[0] + Math.cos(i * 0.5236) * 4.4, DOT[1] + Math.sin(i * 0.5236) * 4.4] as P), C.sun, 77, 0.6);
};
const mixDark = (hex: string) => { const n = parseInt(hex.slice(1), 16), k = 0.72; return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k * 0.95)},${Math.round((n & 255) * k * 0.98)})`; };

const midIcon = (c: Ctx, k: string, x: number, y: number) => {
  if (k === "sun" || k === "set") { paint(c, Array.from({ length: 12 }, (_, i) => [x + Math.cos(i * 0.5236) * 4.6, y + Math.sin(i * 0.5236) * 4.6] as P).filter(([, py]) => k !== "set" || py <= y + 0.5), C.ochre, x, 0.6); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; if (k === "set" && Math.sin(a) > 0.1) continue; ink(c, [[x + Math.cos(a) * 6.3, y + Math.sin(a) * 6.3], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]], 0.9, x + i, 0); } if (k === "set") ink(c, [[x - 9, y + 1.5], [x + 9, y + 1.5]], 0.9, x, 0); }
  else if (k === "moon") { c.fillStyle = C.cream; ICON.moon(c, x, y); c.save(); c.translate(REG[0], REG[1]); c.strokeStyle = C.dark; c.lineWidth = 0.7; c.beginPath(); c.arc(x, y, 5.6, 2.2, 5.6); c.stroke(); c.restore(); }
  else { if (k === "partly") paint(c, Array.from({ length: 10 }, (_, i) => [x - 3 + Math.cos(i * 0.628) * 4, y - 3 + Math.sin(i * 0.628) * 4] as P), C.ochre, x, 0.5); else { c.fillStyle = C.cream; ICON.moon(c, x - 3, y - 3, 4.4); } const cl = ICON.cloud(x + 2, y + 2, 0.85); paint(c, [...cl], "#f7efdc", x + 5, 0.5); ink(c, cl, 0.8, x + 9, 0.15); }
};

const SKIN: Skin = {
  fonts: { name: "Karantina / Frank Ruhl", hero: "700 150px Karantina", sentence: '700 19px "Frank Ruhl Libre"', label: '"Frank Ruhl Libre"', body: '400 16px "Frank Ruhl Libre"', num: '"Frank Ruhl Libre"' },
  ink: { sky: C.dark, skyMuted: "rgba(43,39,36,0.72)", land: C.cream, landMuted: "rgba(245,232,200,0.7)", sheet: C.dark, sheetMuted: "#7a5a3a" },
  topButton: (c, x, y) => { ink(c, Array.from({ length: 22 }, (_, i) => [x + Math.cos(i * 0.3) * 12, y + Math.sin(i * 0.3) * 12] as P), 1, 3, 0.2); ink(c, Array.from({ length: 12 }, (_, i) => [x + Math.cos(-2.6 + i * 0.38) * 5, y + Math.sin(-2.6 + i * 0.38) * 5] as P), 1, 4, 0); },
  icon: (c, k, x, y) => midIcon(c, k, x, y),
  hourLine: (c, pts) => { ink(c, pts, 2, 51, 0); pts.forEach(([x, y], i) => paint(c, Array.from({ length: 8 }, (_, j) => [x + Math.cos(j * 0.785) * (i ? 2.4 : 4), y + Math.sin(j * 0.785) * (i ? 2.4 : 4)] as P), i ? C.tomato : C.ochre, x, 0.4)); },
  chip: (c, x, y, w, h) => { paint(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], C.pink, 61, 0.8); },
  seaLine: (c, x0, x1, y) => { for (let x = x0; x < x1; x += 7) ink(c, [[x, y], [x + 3.5, y]], 0.6, x, 0, "rgba(43,39,36,0.6)"); },
  sheet: (c, y) => { paint(c, [[-4, y + 2], [FW + 4, y - 2], [FW + 4, FH + 4], [-4, FH + 4]], C.board, 71, 2); dry(c, [[-4, y - 3], [FW + 4, y - 3], [FW + 4, y + 8], [-4, y + 8]], [C.ochre], 16, 0, 60, 2, 72, 0.35); ink(c, [[0, y + 1], [FW, y - 1]], 1.2, 73, 0.2); },
  accent: (c, x, y, h) => paint(c, [[x - 1, y], [x + 3, y], [x + 3, y + h], [x - 1, y + h]], C.tomato, 81, 0.6),
  bar: (c, x, y, w, lo, hi) => { paint(c, [[x, y], [x + w, y], [x + w, y + 6], [x, y + 6]], "#e6d3a3", lo, 0.6); const a = x + (lo - 14) * 6, b = a + (hi - lo) * 9; paint(c, [[a, y], [(a + b) / 2, y], [(a + b) / 2, y + 6], [a, y + 6]], C.turq, hi, 0.6); paint(c, [[(a + b) / 2, y], [b, y], [b, y + 6], [(a + b) / 2, y + 6]], C.ochre, hi + 1, 0.6); ink(c, [[x, y + 7.5], [x + w, y + 7]], 0.6, lo + hi, 0.4); },
  rule: (c, x0, x1, y) => ink(c, [[x0, y], [x1, y + 0.6]], 0.7, 91, 0.3),
  chevron: (c, x, y) => ink(c, [[x + 5, y - 2], [x, y + 2.5], [x - 5, y - 2]], 1, 92, 0),
};

export const drawMid = (c: Ctx, env: Env) => { c.setTransform(env.scale, 0, 0, env.scale, 0, 0); scene(c); drawUI(c, SKIN); };
