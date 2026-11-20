// VARIANT 2 · FLAT VECTOR (after the flatVector plate).
// MEDIUM: pen-tool paths in a vector app. Every shape is a closed path filled with ONE flat colour; no
// strokes anywhere, an edge is only where two fills meet. Depth from overlapping planes and atmospheric
// colour; shadows are separate shapes with a transparency ramp (long shadows thrown right, away from the
// low sun on the left); texture is a grain brush: raster speckle painted over the SHADE sides only.
// ORDER: sky bands, sun and halo rings, geometric flat-bottom clouds, far -> mid -> near hills, shade
// shapes, settlement and landmarks, long shadows, grain brush last. PALETTE: 14 swatches in one key:
// indigo -> lilac -> peach sky steps, lilac / dusty violet / deep teal-navy hills, peach lit faces, coral
// roofs, mustard sun, bone white. UI: the same flat language: flat filled icons, flat cards, no hairlines.
import { rng, sample, type Ctx, type Env, type P } from "./core";
import { drawUI, type Skin } from "./ui";
import { DOT, FAR, FH, FW, HOUSES, ICON, MID, NEAR, PINES, SEA_Y, SUN, closeDown, roundRect, tracePoly } from "./valley";
import { longShadow, placedMarks, shadeRuns } from "./valleyKit";

const C = { s0: "#2c3a6b", s1: "#45508a", s2: "#6d6aa3", s3: "#a982a6", s4: "#e19a8a", s5: "#f4bf8e", halo: "#f9d6a6", sun: "#fff1d2", cloud: "#f6dcc8", cloudS: "#d9a9a6",
  far: "#9b88b0", sea: "#f2c39a", mid: "#5d5a8c", midS: "#4a477a", near: "#24395a", nearS: "#1a2b47", peach: "#f0a983", wall: "#5b6b8a", wallS: "#3a4767", coral: "#ee7a58", navy: "#1f2c45", pine: "#2f5d5a", pineL: "#4d8a74", bone: "#fbf4ea", mustard: "#f1b74a", ink: "#1f3a56" };

const fill = (c: Ctx, pts: P[], col: string) => { c.fillStyle = col; tracePoly(c, pts); c.fill(); };
/** The grain brush: raster speckle in broad passes, clipped to a shade shape. */
const grainBrush = (c: Ctx, clip: P[][], seed: number, col: string, a: number) => {
  c.save(); c.beginPath(); for (const p of clip) { p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); } c.clip();
  const r = rng(seed); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; clip.flat().forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  const n = Math.floor((x1 - x0) * (y1 - y0) * 1.4); c.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = 0.35 + r() * 0.5; c.globalAlpha = a * r(); c.fillRect(x, y, s, s); }
  c.restore(); c.globalAlpha = 1;
};
const cloud = (x: number, y: number, s: number): P[] => sample([[x - 40 * s, y], [x - 34 * s, y - 7 * s], [x - 20 * s, y - 10 * s], [x - 10 * s, y - 18 * s], [x + 8 * s, y - 19 * s], [x + 18 * s, y - 11 * s], [x + 32 * s, y - 10 * s], [x + 41 * s, y]], false, 8);

const scene = (c: Ctx) => {
  // sky in stepped flat bands (each a closed path with a gentle smooth top), lightest at the horizon
  const bands: [number, string][] = [[0, C.s0], [120, C.s1], [220, C.s2], [300, C.s3], [360, C.s4], [398, C.s5]];
  bands.forEach(([y, col], i) => { const pts: P[] = i === 0 ? [[0, 0], [FW, 0], [FW, FH], [0, FH]] : [...sample([[-5, y + 6], [90, y - 4], [200, y + 3], [300, y - 2], [380, y + 4]], false, 8), [380, FH], [-5, FH]]; fill(c, pts, col); });
  for (const [r, col] of [[46, "rgba(249,214,166,0.35)"], [28, "rgba(249,214,166,0.55)"], [16, C.halo]] as [number, string][]) { c.fillStyle = col; c.beginPath(); c.arc(SUN[0], SUN[1], r, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = C.sun; c.beginPath(); c.arc(SUN[0], SUN[1], 9.5, 0, Math.PI * 2); c.fill();
  for (const [x, y, s] of [[96, 96, 1], [292, 74, 0.8], [300, 352, 0.9], [150, 372, 0.6]] as [number, number, number][]) { const top = cloud(x, y, s); fill(c, [...top], C.cloud); fill(c, [...sample([[x - 36 * s, y], [x - 10 * s, y - 4 * s], [x + 20 * s, y - 3 * s], [x + 39 * s, y]], false, 6)], C.cloudS); }
  // hills by distance
  fill(c, closeDown(FAR), C.far); c.fillStyle = C.sea; c.fillRect(0, SEA_Y - 1.2, 162, 2.4);
  fill(c, closeDown(MID), C.mid); const midS = shadeRuns(MID, 14); midS.forEach((p) => fill(c, p, C.midS)); grainBrush(c, midS, 5, "#1a1a3a", 0.35);
  fill(c, closeDown(NEAR), C.near); const nearS = shadeRuns(NEAR, 26); nearS.forEach((p) => fill(c, p, C.nearS)); grainBrush(c, nearS, 6, "#000814", 0.4);
  // a lit crest: a thin peach shape along the sun-facing slope
  const lit: P[] = []; for (let i = 1; i < NEAR.length; i++) if ((NEAR[i][1] - NEAR[i - 1][1]) < -0.15) lit.push(NEAR[i]);
  if (lit.length > 2) fill(c, [...lit, ...lit.map(([x, y]) => [x + 1.4, y + 1.6] as P).reverse()], "#c9846f");
  // pines: two flat halves
  for (const p of PINES) { c.fillStyle = C.pine; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); c.fillStyle = C.pineL; c.beginPath(); c.arc(p.x, p.y, p.r, Math.PI * 0.5, Math.PI * 1.5); c.fill(); }
  // settlement: long shadows first, then flat blocks (front, lit side face, roof cap), flat windows
  for (const h of HOUSES) longShadow(c, h.x - h.w / 2, h.x + h.w / 2, h.base, Math.min(10, h.h * 0.9), "rgba(10,18,40,A)", 0.55);
  for (const h of HOUSES) {
    const x0 = h.x - h.w / 2, y0 = h.base - h.h;
    fill(c, [[x0, y0], [x0 + h.w, y0], [x0 + h.w, h.base], [x0, h.base]], C.wall);
    fill(c, [[x0, y0], [x0 + h.w * 0.3, y0], [x0 + h.w * 0.3, h.base], [x0, h.base]], C.peach);
    fill(c, [[x0 + h.w - 1, y0], [x0 + h.w, y0], [x0 + h.w, h.base], [x0 + h.w - 1, h.base]], C.wallS);
    if (h.roof === "tile") fill(c, [[x0 - 0.5, y0], [h.x, y0 - 2.4], [x0 + h.w + 0.5, y0]], C.coral);
    const r = rng(h.seed); for (let j = 0; j < h.wins + (h.h > 8 ? 2 : 0); j++) { c.fillStyle = r() < 0.3 ? C.mustard : C.navy; c.fillRect(x0 + h.w * 0.35 + Math.floor(r() * Math.max(1, h.w * 0.55 - 1)), y0 + 1.5 + Math.floor(r() * Math.max(1, h.h - 3)), 0.9, 1.1); }
  }
  // landmarks: their parts as flat fills, long shadow first
  for (const m of placedMarks()) {
    longShadow(c, m.x - 4, m.x + 4, m.base, Math.min(16, m.h * 0.7), "rgba(10,18,40,A)", 0.55);
    for (const p of m.parts) fill(c, p.pts, p.role === "lit" ? C.peach : p.role === "shade" ? C.wallS : p.role === "open" ? C.navy : p.role === "roof" ? C.coral : C.wall);
  }
  // the location dot: flat disc on a flat ring
  c.fillStyle = C.navy; c.beginPath(); c.arc(DOT[0], DOT[1], 6.5, 0, Math.PI * 2); c.fill(); c.fillStyle = C.mustard; c.beginPath(); c.arc(DOT[0], DOT[1], 4.4, 0, Math.PI * 2); c.fill();
};

const flatIcon = (c: Ctx, k: string, x: number, y: number, sheet: boolean) => {
  const sun = sheet ? C.mustard : "#ffd27a", body = sheet ? "#c9d3e0" : C.bone, moon = sheet ? C.ink : "#fff1d2";
  if (k === "sun" || k === "set") { c.fillStyle = sun; c.beginPath(); c.arc(x, y, 4.2, k === "set" ? Math.PI : 0, Math.PI * 2); c.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; if (k === "set" && Math.sin(a) > 0.1) continue; const p = (r: number, d: number): P => [x + Math.cos(a + d) * r, y + Math.sin(a + d) * r]; fill(c, [p(6, -0.18), p(8.8, 0), p(6, 0.18)], sun); } if (k === "set") { c.fillStyle = body; c.fillRect(x - 9, y + 0.5, 18, 1.6); } }
  else if (k === "moon") { c.fillStyle = moon; ICON.moon(c, x, y); }
  else { if (k === "partly") { c.fillStyle = sun; c.beginPath(); c.arc(x - 3, y - 3, 4, 0, 7); c.fill(); } else { c.fillStyle = moon; ICON.moon(c, x - 3, y - 3, 4.4); } const cl = ICON.cloud(x + 2, y + 2, 0.85); fill(c, cl, body); }
};

const SKIN: Skin = {
  fonts: { name: "Assistant", hero: "800 112px Assistant", sentence: "600 18px Assistant", label: "Assistant", body: "600 15px Assistant", num: "Assistant" },
  ink: { sky: C.bone, skyMuted: "rgba(251,244,234,0.78)", sheet: C.ink, sheetMuted: "#6f7d92" },
  topButton: (c, x, y) => { c.fillStyle = "rgba(251,244,234,0.18)"; c.beginPath(); c.arc(x, y, 13, 0, 7); c.fill(); c.fillStyle = C.bone; c.beginPath(); c.arc(x, y, 5.5, -2.6, 1.9); c.arc(x, y, 3.8, 1.9, -2.6, true); c.closePath(); c.fill(); fill(c, [[x - 6.8, y - 4.2], [x - 3.4, y - 2.8], [x - 6, y - 0.6]], C.bone); },
  icon: flatIcon,
  hourLine: (c, pts) => { const area: P[] = [...pts, [pts[pts.length - 1][0], 312], [pts[0][0], 312]]; const g = c.createLinearGradient(0, 296, 0, 312); g.addColorStop(0, "rgba(238,122,88,0.45)"); g.addColorStop(1, "rgba(238,122,88,0)"); c.fillStyle = g; tracePoly(c, area); c.fill();
    const band: P[] = [...pts.map(([x, y]) => [x, y - 1.2] as P), ...pts.map(([x, y]) => [x, y + 1.2] as P).reverse()]; fill(c, band, C.coral); pts.forEach(([x, y], i) => { c.fillStyle = i ? C.coral : C.bone; c.beginPath(); c.arc(x, y, i ? 2.6 : 4.2, 0, 7); c.fill(); }); },
  chip: (c, x, y, w, h) => { c.fillStyle = C.navy; roundRect(c, x, y, w, h, 3); c.fill(); },
  seaLine: (c, x0, x1, y) => { c.fillStyle = "rgba(251,244,234,0.35)"; for (let x = x0; x < x1; x += 5) c.fillRect(x, y - 0.5, 2.5, 1); },
  sheet: (c, y) => { c.fillStyle = C.bone; c.fillRect(0, y, FW, FH - y); c.fillStyle = "#ffffff"; roundRect(c, 12, y + 10, FW - 24, 86, 10); c.fill(); },
  accent: (c, x, y, h) => { c.fillStyle = C.coral; roundRect(c, x - 1, y, 4, h, 2); c.fill(); },
  bar: (c, x, y, w, lo, hi) => { c.fillStyle = "#e7ddd0"; roundRect(c, x, y, w, 6, 3); c.fill(); const a = x + (lo - 14) * 6, b = a + (hi - lo) * 9; c.fillStyle = "#5fa3b8"; roundRect(c, a, y, (b - a) / 2, 6, 3); c.fill(); c.fillStyle = C.mustard; roundRect(c, (a + b) / 2, y, (b - a) / 2, 6, 3); c.fill(); c.fillRect((a + b) / 2 - 2, y, 4, 6); },
  rule: (c, x0, x1, y) => { c.fillStyle = "#efe5d8"; c.fillRect(x0, y - 0.5, x1 - x0, 1.5); },
  chevron: (c, x, y) => fill(c, [[x - 4.5, y - 2], [x + 4.5, y - 2], [x, y + 2.5]], "#c4b8a8"),
};

export const drawFlat = (c: Ctx, env: Env) => { c.setTransform(env.scale, 0, 0, env.scale, 0, 0); scene(c); drawUI(c, SKIN); };
