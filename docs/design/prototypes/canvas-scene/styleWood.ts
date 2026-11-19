// VARIANT 5 (WILDCARD) · UKIYO-E COLOUR WOODBLOCK (after the woodcut plate), a Hiroshige-style "view".
// WHY for a calm weather app: ukiyo-e landscape prints are exactly "this place, in this weather, at this
// hour" (Hiroshige's stations); BOKASHI, the graded wipe, is the medium's own sky gradient, so the WebGL sky
// maps onto it at any hour; flat colour blocks and one carved keyline stay legible at 10-30 px; KASUMI mist
// bands give the haze-with-distance the scene already has. It is quiet, not busy.
// MEDIUM: water-based pigment printed by baren from carved cherry blocks onto damp kozo washi. KEYBLOCK
// line (sumi): two knife cuts per line, width steps, chisel ends. COLOUR BLOCKS: flat, showing plank grain
// and baren speckle. BOKASHI: indigo wiped down from the top of the sky, a pale orange wiped up from the
// horizon, each ridge darkest at its crest fading down. ORDER: keyblock, colour blocks light to dark,
// bokashi last. PALETTE: washi, sumi, bero-ai indigo, usuzumi, kihada yellow, beni-red sun, pale peach
// kasumi, grey-green and deep indigo-green hills. NOT riso: no screen, no overprint; tone only bokashi.
// UI: printed with the same blocks: sumi type on washi, a vermilion title cartouche for the sunset chip,
// carved rules; the hero numeral is uncut paper standing in the indigo.
import { fractal, rng, type Ctx, type Env, type P } from "./core";
import { drawUI, type Skin } from "./ui";
import { WASHI, carved, fillAll, gouged, grain, washi } from "./woodcutKit";
import { DOT, FAR, FH, FW, HOUSES, ICON, MID, NEAR, PINES, SEA_Y, SUN, closeDown, tracePoly } from "./valley";
import { placedMarks, shadeRuns, visibleCrest } from "./valleyKit";

const C = { sumi: "#1f1b18", ai: "#2c4a78", aiL: "#5d7aa6", sky: "#c9d3d8", kihada: "#e9b85a", beni: "#d0452f", peach: "#f3d7b8", far: "#b9bfb4", mid: "#8a9a8a", near: "#3c5a55", nearD: "#26403f", wall: "#e8dcc2", wallS: "#b7a98a", roof: "#5a4a3e", pine: "#2f4a38" };
/** Bokashi, wiped with a damp cloth: full at one edge, gone by the other, the fade's edge wavering across
 * the block. Columns abut exactly (no overlap), so no seams show at phone scale. */
const bokashi = (c: Ctx, x0: number, x1: number, yFull: number, yGone: number, color: string, seed: number, clip?: P[]) => {
  c.save(); if (clip) { tracePoly(c, clip); c.clip(); }
  const dir = Math.sign(yGone - yFull) || 1, span = Math.abs(yGone - yFull), [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let x = x0; x < x1; x += 1) { const wob = (fractal(seed, x, 0, 0.01, 0.01, 3) - 0.5) * span * 0.4, end = yGone + wob * dir, gr = c.createLinearGradient(0, yFull, 0, end); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.45, `rgba(${r},${g},${b},0.7)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); c.fillStyle = gr; const top = dir > 0 ? Math.min(yFull, end) - 600 : Math.min(yFull, end); c.fillRect(x, top, 1, dir > 0 ? (end - top) : (Math.max(yFull, end) - top + 600)); }
  c.restore();
};
const key = (c: Ctx, pts: P[], w: number, seed: number, smooth = false) => { const p = carved(pts, w, seed, { step: 0.2, smooth }); if (p.length) fillAll(c, [p], C.sumi); };
const block = (c: Ctx, env: Env, pts: P[], col: string, seed: number, g = 0.25, off: P = [0.3, 0.2]) => {
  let L = env.cache.get("wood:block") as ReturnType<Env["canvas"]> | undefined; if (!L) { L = env.canvas(Math.round(FW * env.scale), Math.round(FH * env.scale)); env.cache.set("wood:block", L); } const x = L.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.clearRect(0, 0, L.canvas.width, L.canvas.height); x.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  fillAll(x, [gouged(pts.map(([px, py]) => [px + off[0], py + off[1]] as P), seed, true, 0.5)], col); grain(x, env, g, [seed % 97, (seed * 7) % 89], 0.02);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L.canvas, 0, 0); c.restore();
};

const scene = (c: Ctx, env: Env) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(washi(env).canvas, 0, 0); c.restore();
  // sky block, then the bokashi: indigo wiped down from the top, warm wiped up from the horizon
  block(c, env, [[0, 0], [FW, 0], [FW, 450], [0, 450]], C.sky, 3, 0.12, [0, 0]);
  bokashi(c, 0, FW, 0, 330, C.ai, 5);
  bokashi(c, 0, FW, 440, 300, "#f0a35c", 6);
  // kasumi: stylised mist bands with rounded ends, uncut paper tinted peach
  for (const [x, y, w] of [[-30, 60, 120], [292, 140, 120], [230, 352, 170], [-30, 384, 150]] as [number, number, number][]) { const h = 7; const pts: P[] = []; for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI; pts.push([x + h + Math.cos(a) * h, y + Math.sin(a) * h]); } for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; pts.push([x + w - h + Math.cos(a) * h, y + Math.sin(a) * h]); } block(c, env, pts, y > 300 ? C.peach : "#eef0ea", x + 100, 0.1, [0, 0]); }
  // the beni sun: a flat red disc, no glow (the print has no light, only colour)
  block(c, env, Array.from({ length: 36 }, (_, i) => [SUN[0] + Math.cos(i * 0.1745) * 10, SUN[1] + Math.sin(i * 0.1745) * 10] as P), C.beni, 7, 0.05, [0, 0]);
  // hills: flat blocks, each with its crest bokashi, keyline on the near and mid crests
  block(c, env, closeDown(FAR), C.far, 11, 0.15); c.fillStyle = "#e7e3d6"; c.fillRect(0, SEA_Y - 1, 160, 2);
  block(c, env, closeDown(MID), C.mid, 12, 0.2); bokashi(c, 140, FW, Math.min(...MID.map((p) => p[1])), 410, "#56685f", 13, closeDown(MID));
  block(c, env, closeDown(NEAR), C.near, 14, 0.28); bokashi(c, 120, FW, Math.min(...NEAR.map((p) => p[1])), 440, C.nearD, 15, closeDown(NEAR));
  shadeRuns(NEAR, 22).forEach((p, i) => block(c, env, p, C.nearD, 20 + i, 0.2));
  // pines: Hiroshige clumps, dark flat crowns over a short keyline trunk
  for (const p of PINES) { block(c, env, Array.from({ length: 9 }, (_, i) => [p.x + Math.cos(i * 0.698) * p.r * 1.5, p.y - p.r * 0.9 + Math.sin(i * 0.698) * p.r * 0.75] as P), C.pine, Math.round(p.x * 5), 0.05, [0, 0]); }
  // town: flat wall blocks, a wall-shade block on the right, roof blocks, keyline last
  for (const h of HOUSES) { const x0 = h.x - h.w / 2, y0 = h.base - h.h; fillAll(c, [[[x0, y0], [x0 + h.w, y0], [x0 + h.w, h.base], [x0, h.base]]], C.wall); fillAll(c, [[[x0 + h.w * 0.65, y0], [x0 + h.w, y0], [x0 + h.w, h.base], [x0 + h.w * 0.65, h.base]]], C.wallS); if (h.roof === "tile") fillAll(c, [[[x0 - 0.6, y0 + 0.3], [h.x, y0 - 2.4], [x0 + h.w + 0.6, y0 + 0.3]]], C.beni); else fillAll(c, [[[x0 - 0.3, y0 - 0.6], [x0 + h.w + 0.3, y0 - 0.6], [x0 + h.w + 0.3, y0], [x0 - 0.3, y0]]], C.roof); }
  for (const h of HOUSES) { const x0 = h.x - h.w / 2, y0 = h.base - h.h; key(c, [[x0, h.base], [x0, y0], [x0 + h.w, y0], [x0 + h.w, h.base]], 0.4, h.seed); const r = rng(h.seed); for (let j = 0; j < h.wins; j++) fillAll(c, [[[x0 + 1 + r() * h.w * 0.4, y0 + 1.6 + r() * (h.h - 3)], [x0 + 1.8 + r() * h.w * 0.4, y0 + 1.6], [x0 + 1.8, y0 + 2.8]]], C.sumi); }
  for (const m of placedMarks()) { for (const p of m.parts) fillAll(c, [p.pts], p.role === "lit" ? "#f3ead6" : p.role === "open" ? C.sumi : p.role === "roof" ? C.beni : p.role === "shade" ? C.wallS : C.wall); for (const p of m.parts.filter((q) => q.role === "body")) key(c, [...p.pts, p.pts[0]], 0.35, Math.round(m.x + p.pts[0][1] * 3)); }
  // a kasumi band across the foot of the town: the haze, printed
  const band: P[] = []; for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI; band.push([150 + 5 + Math.cos(a) * 5, 432 + Math.sin(a) * 5]); } for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; band.push([300 - 5 + Math.cos(a) * 5, 432 + Math.sin(a) * 5]); }
  block(c, env, band, C.peach, 99, 0.08, [0, 0]);
  key(c, visibleCrest(MID), 0.7, 31, true); key(c, NEAR, 1, 32, true);
  // the dot: kihada yellow in a sumi ring
  fillAll(c, [Array.from({ length: 16 }, (_, i) => [DOT[0] + Math.cos(i * 0.39) * 6.4, DOT[1] + Math.sin(i * 0.39) * 6.4] as P)], C.sumi); fillAll(c, [Array.from({ length: 16 }, (_, i) => [DOT[0] + Math.cos(i * 0.39) * 4.4, DOT[1] + Math.sin(i * 0.39) * 4.4] as P)], C.kihada);
};

const woodIcon = (c: Ctx, k: string, x: number, y: number, sheet: boolean) => {
  const line = sheet ? C.sumi : WASHI;
  if (k === "sun" || k === "set") { fillAll(c, [Array.from({ length: 16 }, (_, i) => [x + Math.cos(i * 0.39) * 4.6, y + Math.sin(i * 0.39) * 4.6] as P).filter(([, py]) => k !== "set" || py <= y + 0.6)], C.beni); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; if (k === "set" && Math.sin(a) > 0.1) continue; const p = carved([[x + Math.cos(a) * 6.3, y + Math.sin(a) * 6.3], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]], 1, x + i, { smooth: false }); fillAll(c, [p], line); } if (k === "set") fillAll(c, [carved([[x - 9.5, y + 1.6], [x + 9.5, y + 1.6]], 0.9, x, { smooth: false })], line); }
  else if (k === "moon") { c.fillStyle = sheet ? C.kihada : "#f2e2b0"; ICON.moon(c, x, y); }
  else { if (k === "partly") fillAll(c, [Array.from({ length: 12 }, (_, i) => [x - 3 + Math.cos(i * 0.52) * 4, y - 3 + Math.sin(i * 0.52) * 4] as P)], C.beni); else { c.fillStyle = "#f2e2b0"; ICON.moon(c, x - 3, y - 3, 4.4); } const cl = ICON.cloud(x + 2, y + 2, 0.85); fillAll(c, [[...cl]], sheet ? "#dfe4e6" : "#eef0ea"); fillAll(c, [carved(cl, 0.7, x + 5)], C.sumi); }
};

const SKIN: Skin = {
  fonts: { name: "Frank Ruhl Libre", hero: '700 108px "Frank Ruhl Libre"', sentence: '700 18px "Frank Ruhl Libre"', label: '"Frank Ruhl Libre"', body: '400 16px "Frank Ruhl Libre"', num: '"Frank Ruhl Libre"' },
  ink: { sky: WASHI, skyMuted: "rgba(239,230,209,0.8)", sheet: C.sumi, sheetMuted: "#6b5f52", land: WASHI, landMuted: "rgba(239,230,209,0.75)" },
  topButton: (c, x, y) => { fillAll(c, [carved(Array.from({ length: 30 }, (_, i) => [x + Math.cos(i * 0.22) * 12, y + Math.sin(i * 0.22) * 12] as P), 0.9, 3)], WASHI); fillAll(c, [carved(Array.from({ length: 12 }, (_, i) => [x + Math.cos(-2.6 + i * 0.38) * 5, y + Math.sin(-2.6 + i * 0.38) * 5] as P), 1.1, 4)], WASHI); },
  icon: woodIcon,
  hourLine: (c, pts) => { fillAll(c, [carved(pts, 1.6, 51, { smooth: false })], C.sumi); pts.forEach(([x, y], i) => fillAll(c, [Array.from({ length: 12 }, (_, j) => [x + Math.cos(j * 0.52) * (i ? 2.4 : 3.8), y + Math.sin(j * 0.52) * (i ? 2.4 : 3.8)] as P)], i ? C.beni : C.kihada)); },
  chip: (c, x, y, w, h) => { fillAll(c, [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]], C.beni); fillAll(c, [carved([[x + 1.5, y + 1.5], [x + w - 1.5, y + 1.5], [x + w - 1.5, y + h - 1.5], [x + 1.5, y + h - 1.5], [x + 1.5, y + 1.5]], 0.5, 61, { smooth: false })], WASHI); },
  seaLine: (c, x0, x1, y) => { for (let x = x0; x < x1; x += 7) fillAll(c, [carved([[x, y], [x + 3.5, y]], 0.7, x, { smooth: false })], "rgba(239,230,209,0.6)"); },
  sheet: (c, y) => { c.save(); c.beginPath(); c.rect(0, y, FW, FH - y); c.clip(); c.setTransform(1, 0, 0, 1, 0, 0); c.restore(); c.fillStyle = WASHI; c.fillRect(0, y, FW, FH - y); fillAll(c, [carved([[0, y], [FW, y]], 1.6, 71, { smooth: false })], C.sumi); fillAll(c, [carved([[10, y + 6], [FW - 10, y + 6]], 0.6, 72, { smooth: false })], C.sumi); },
  accent: (c, x, y, h) => fillAll(c, [[[x - 1, y], [x + 3, y], [x + 3, y + h], [x - 1, y + h]]], C.beni),
  bar: (c, x, y, w, lo, hi) => { fillAll(c, [[[x, y], [x + w, y], [x + w, y + 6], [x, y + 6]]], "#e2d8c0"); const a = x + (lo - 14) * 6, b = a + (hi - lo) * 9; fillAll(c, [[[a, y], [b, y], [b, y + 6], [a, y + 6]]], C.aiL); bokashi(c, a, b + 6, y, y + 6, "#e9b85a", lo + hi, [[(a + b) / 2, y], [b, y], [b, y + 6], [(a + b) / 2, y + 6]]); fillAll(c, [carved([[x, y + 7.5], [x + w, y + 7.5]], 0.5, lo, { smooth: false })], C.sumi); },
  rule: (c, x0, x1, y) => fillAll(c, [carved([[x0, y], [x1, y]], 0.6, 91, { smooth: false })], C.sumi),
  chevron: (c, x, y) => fillAll(c, [carved([[x + 5, y - 2], [x, y + 2.5], [x - 5, y - 2]], 0.9, 92, { smooth: false })], "#7a6e60"),
};

export const drawWood = (c: Ctx, env: Env) => { c.setTransform(env.scale, 0, 0, env.scale, 0, 0); scene(c, env); drawUI(c, SKIN); };
