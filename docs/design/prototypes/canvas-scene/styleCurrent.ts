// VARIANT 1 · THE CURRENT HAND, REFINED (baseline).
// MEDIUM: the app's own scene: flat opaque tone shapes, hard edges, no outline; a soft WebGL-like sky
// (gradient, sun disc with a bloom, long soft cloud bands); ridges as flat silhouettes lifted by haze
// with distance; settlement blocks with a lit side face and a core shadow; then what is NEW: modelled
// glyphs (sceneGlyphs.ts), a 0.5 px material grain on the land, foot mist, warm rim light on the
// sun-facing edges. UI is the app as it ships: white Assistant on the sky, Frank Ruhl sentence, a
// pale sheet with the wear card and week rows.
import { fractal, rng, type Ctx, type Env, type P } from "./core";
import { drawGlyph, type Light } from "./sceneGlyphs";
import { drawUI, type Skin } from "./ui";
import { CLOUDS, DOT, FAR, FH, FW, HOUSES, HOUR_LINE_Y, HOUR_X, ICON, MARKS, MID, NEAR, PINES, SEA_Y, SHEET_TOP, SUN, SUN_R, UI, closeDown, he, ltr, roundRect, tracePoly } from "./valley";

const GOLD: Light = { name: "golden", ridge: [40, 44, 66], sky: [214, 168, 128], sun: [252, 204, 146], sunK: 0.85, night: false, hazeTo: [150, 132, 150], haze: 0.07, mist: 0.18, cast: 0.8 };
const C = { near: "#282c42", nearLit: "#3a3b52", mid: "#4f5170", far: "#8a7e95", sea: "#c9a888", green: "#3f5040", wall: "#4c4c62", lit: "#77685f", shade: "#1f2133", roof: "#7a4b48", ink: "#ffffff", sheet: "#F3F5F7", sheetInk: "#1C1A17", muted: "#625C52", accent: "#2A6AA8" };

const grainOver = (c: Ctx, pts: P[], seed: number, amt: number) => {
  c.save(); tracePoly(c, pts); c.clip(); const r = rng(seed);
  for (let y = 300; y < SHEET_TOP + 4; y += 0.5) for (let x = 0; x < FW; x += 0.5) { const v = (r() - 0.5) + (fractal(seed, x * 0.25, y * 0.25, 1, 1, 2) - 0.5); if (Math.abs(v) < 0.18) continue; c.fillStyle = v > 0 ? `rgba(255,236,210,${(v * amt).toFixed(3)})` : `rgba(0,0,10,${(-v * amt).toFixed(3)})`; c.fillRect(x, y, 0.5, 0.5); }
  c.restore();
};

export const sky = (c: Ctx) => {
  const g = c.createLinearGradient(0, 0, 0, 430);
  g.addColorStop(0, "#2f4677"); g.addColorStop(0.42, "#5f6f9c"); g.addColorStop(0.72, "#b98f95"); g.addColorStop(0.88, "#e7aa7c"); g.addColorStop(1, "#f3c487");
  c.fillStyle = g; c.fillRect(0, 0, FW, FH);
  const b = c.createRadialGradient(SUN[0], SUN[1], 0, SUN[0], SUN[1], 150); b.addColorStop(0, "rgba(255,226,170,0.75)"); b.addColorStop(0.25, "rgba(255,200,140,0.32)"); b.addColorStop(1, "rgba(255,190,140,0)");
  c.fillStyle = b; c.fillRect(0, 0, FW, FH);
  for (const k of CLOUDS) { // soft bands, lit warm from below-left near the horizon
    const warm = Math.min(1, Math.max(0, (k.y - 120) / 260));
    for (let i = 0; i < 4; i++) { const e = c.createRadialGradient(k.x + k.w / 2, k.y, 0, k.x + k.w / 2, k.y, k.w / 2); const col = warm > 0.4 ? "255,214,180" : "214,214,236"; e.addColorStop(0, `rgba(${col},${0.16 - i * 0.03})`); e.addColorStop(1, `rgba(${col},0)`); c.save(); c.translate(0, k.y); c.scale(1, (k.h * (1 + i * 0.5)) / k.w); c.translate(0, -k.y); c.fillStyle = e; c.fillRect(k.x - 20, k.y - k.w, k.w + 40, k.w * 2); c.restore(); }
  }
  c.fillStyle = "rgba(255,240,214,0.95)"; c.beginPath(); c.arc(SUN[0], SUN[1], SUN_R, 0, Math.PI * 2); c.fill();
};

const land = (c: Ctx, env: Env) => {
  // far bay hills and the sea glint, hazed almost to the sky
  c.fillStyle = C.far; tracePoly(c, closeDown(FAR)); c.fill();
  c.fillStyle = C.sea; c.fillRect(0, SEA_Y - 1, 160, 2.2); c.fillStyle = "rgba(255,230,190,0.6)"; c.fillRect(0, SEA_Y - 1, 120, 0.6);
  // mid ridge, then the near ridge with a warm rim on its sun-facing crest
  c.fillStyle = C.mid; tracePoly(c, closeDown(MID)); c.fill();
  c.fillStyle = C.near; tracePoly(c, closeDown(NEAR)); c.fill();
  c.save(); tracePoly(c, closeDown(NEAR)); c.clip(); c.strokeStyle = "rgba(255,190,140,0.32)"; c.lineWidth = 1; c.beginPath(); NEAR.forEach(([x, y], i) => (i ? c.lineTo(x, y + 0.5) : c.moveTo(x, y + 0.5))); c.stroke(); c.restore();
  for (const p of PINES) { c.fillStyle = C.green; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(160,150,90,0.35)"; c.beginPath(); c.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.5, 0, Math.PI * 2); c.fill(); }
  // settlement: blocks with a lit side face, a core shadow, a lighter roof line, a few dark windows
  for (const h of HOUSES) {
    const x0 = h.x - h.w / 2, y0 = h.base - h.h;
    c.fillStyle = C.wall; c.fillRect(x0, y0, h.w, h.h); c.fillStyle = C.lit; c.fillRect(x0, y0, Math.max(1, h.w * 0.28), h.h);
    c.fillStyle = "rgba(20,20,40,0.45)"; c.fillRect(x0 + h.w - 0.8, y0, 0.8, h.h);
    if (h.roof === "tile") { c.fillStyle = C.roof; c.beginPath(); c.moveTo(x0 - 0.4, y0); c.lineTo(x0 + h.w * 0.5, y0 - 2.2); c.lineTo(x0 + h.w + 0.4, y0); c.closePath(); c.fill(); }
    else { c.fillStyle = "rgba(255,210,170,0.45)"; c.fillRect(x0, y0, h.w, 0.5); }
    const r = rng(h.seed); for (let j = 0; j < h.wins + (h.h > 8 ? 3 : 0); j++) { c.fillStyle = "rgba(18,18,34,0.7)"; c.fillRect(x0 + 1 + Math.floor(r() * Math.max(1, h.w - 2)), y0 + 1.5 + Math.floor(r() * Math.max(1, h.h - 3)), 0.8, 1); }
    c.fillStyle = "rgba(10,10,24,0.5)"; c.fillRect(x0, h.base - 0.5, h.w + 1.2, 0.8);
  }
  grainOver(c, closeDown(NEAR), 91, 0.07);
  for (const m of MARKS) drawGlyph(c, env, m.kind, m.x, m.base, GOLD, { h: m.h, seed: 3 });
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
};

const dot = (c: Ctx) => {
  c.fillStyle = "rgba(20,22,40,0.55)"; c.beginPath(); c.arc(DOT[0], DOT[1], 6.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#FFE3A0"; c.beginPath(); c.arc(DOT[0], DOT[1], 4.4, 0, Math.PI * 2); c.fill();
};

const icon = (c: Ctx, kind: string, cx: number, cy: number, col: string, fillDark: string, w = 1.3) => {
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round";
  if (kind === "sun" || kind === "set") { const s = ICON.sun(cx, cy); c.beginPath(); c.arc(s.disc[0], s.disc[1], s.disc[2], 0, Math.PI * 2); c.stroke(); for (const [a, b] of s.rays) { if (kind === "set" && b[1] > cy + 1) continue; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } if (kind === "set") { c.beginPath(); c.moveTo(cx - 9, cy + 1.5); c.lineTo(cx + 9, cy + 1.5); c.stroke(); } }
  else if (kind === "moon") ICON.moon(c, cx, cy);
  else if (kind === "partly") { const s = ICON.sun(cx - 3, cy - 3); c.beginPath(); c.arc(s.disc[0], s.disc[1], 3.4, 0, 7); c.stroke(); const cl = ICON.cloud(cx + 2, cy + 2, 0.8); c.fillStyle = fillDark; tracePoly(c, cl); c.fill(); c.beginPath(); cl.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
  else if (kind === "rain") { const cl = ICON.cloud(cx, cy - 1.5); c.beginPath(); cl.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); for (const dx of [-4, 0, 4]) { c.beginPath(); c.moveTo(cx + dx + 0.8, cy + 4); c.lineTo(cx + dx - 0.6, cy + 7.5); c.stroke(); } }
  else if (kind === "cloud") { const cl = ICON.cloud(cx, cy + 1); c.beginPath(); cl.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
  else { ICON.moon(c, cx - 3, cy - 3, 4.4); const cl = ICON.cloud(cx + 1.5, cy + 2, 0.8); c.fillStyle = fillDark; tracePoly(c, cl); c.fill(); c.beginPath(); cl.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
  c.restore();
};

export const SKIN_APP: Skin = {
  fonts: { name: "Assistant", hero: "800 112px Assistant", sentence: '400 19px "Frank Ruhl Libre"', label: "Assistant", body: '400 16px "Frank Ruhl Libre"', num: "Assistant" },
  ink: { sky: "#ffffff", skyMuted: "rgba(255,255,255,0.78)", sheet: C.sheetInk, sheetMuted: C.muted },
  topButton: (c, x, y) => { c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x, y, 5, -2.6, 1.9); c.stroke(); },
  icon: (c, k, x, y, sheet) => icon(c, k, x, y, sheet ? "#3a3f4a" : "rgba(255,255,255,0.92)", sheet ? C.sheet : "rgba(70,70,100,0.9)"),
  hourLine: (c, pts) => { c.strokeStyle = "#F2D58A"; c.lineWidth = 2; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); pts.forEach(([x, y], i) => { c.fillStyle = "#F2D58A"; c.beginPath(); c.arc(x, y, i ? 2.2 : 4, 0, Math.PI * 2); c.fill(); }); },
  chip: (c, x, y, w, h) => { c.setLineDash([2, 2]); c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + 40, y - 12); c.lineTo(x + 40, y); c.stroke(); c.setLineDash([]); c.fillStyle = "rgba(30,34,60,0.55)"; roundRect(c, x, y, w, h, h / 2); c.fill(); },
  seaLine: (c, x0, x1, y) => { c.setLineDash([2, 3]); c.strokeStyle = "rgba(255,255,255,0.4)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]); },
  sheet: (c, y) => { c.fillStyle = C.sheet; roundRect(c, 0, y, FW, FH - y + 30, 22); c.fill(); },
  accent: (c, x, y, h) => { c.fillStyle = C.accent; c.fillRect(x, y, 2.5, h); },
  bar: (c, x, y, w, lo, hi) => { c.fillStyle = "#E2E5EA"; roundRect(c, x, y, w, 6, 3); c.fill(); const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#7FB7D9"); g.addColorStop(1, "#F2C14E"); c.fillStyle = g; roundRect(c, x + (lo - 14) * 6, y, (hi - lo) * 9, 6, 3); c.fill(); },
  rule: (c, x0, x1, y) => { c.fillStyle = "#E3E6EA"; c.fillRect(x0, y, x1 - x0, 0.6); },
  chevron: (c, x, y) => { c.strokeStyle = "#B8BCC4"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 5, y - 2); c.lineTo(x, y + 2.5); c.lineTo(x - 5, y - 2); c.stroke(); },
};

export const drawCurrent = (c: Ctx, env: Env) => {
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  sky(c); land(c, env); dot(c); drawUI(c, SKIN_APP);
};
