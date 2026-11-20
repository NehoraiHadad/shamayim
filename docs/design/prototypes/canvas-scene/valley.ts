// THE VALLEY MODEL: one composition shared by every style variant, so only the hand changes.
// Haifa, 19 November, 16:30, golden light. Ridge profiles traced from the app's own still
// (docs/design/qa/true-scene/stage2c/after-haifa.png, 390 px wide scene) and scaled to 375 px;
// the sun is low on the LEFT (west, as in the app's glow-dusk-west still). UI copy and layout follow
// the app (src/ui: TopBar, Hero, Sentence, hourly row, Sheet with WearCard and WeekList;
// layout from docs/design/qa/scene-time-golden.png).
import { rng, sample, type Ctx, type P } from "./core";

export const FW = 375, FH = 700;
export const SCENE_TOP = 316, SHEET_TOP = 446;
const sx = (x: number) => (x * FW) / 390, sy = (y: number) => SCENE_TOP + y;
const map = (pts: P[]): P[] => pts.map(([x, y]) => [sx(x), sy(y)]);

// ---------------------------------------------------------------- land (frame coordinates)
export const NEAR: P[] = sample(map([[-8, 112], [60, 111.5], [120, 111], [135, 104], [150, 93], [165, 82], [180, 72], [195, 63], [210, 56], [225, 51], [245, 47], [270, 44], [300, 45], [325, 48], [345, 56], [365, 68], [382, 82], [398, 92]]), false, 10);
export const MID: P[] = sample(map([[150, 112], [190, 66], [215, 50], [245, 38], [275, 33], [310, 34], [345, 41], [372, 52], [398, 64]]), false, 10);
export const FAR: P[] = sample(map([[-8, 97], [18, 92], [42, 96], [64, 92], [86, 98], [104, 95], [124, 101], [140, 106], [160, 108]]), false, 10);
export const SEA_Y = sy(108.5);
export const groundAt = (x: number, line: P[] = NEAR) => { for (let i = 1; i < line.length; i++) if (line[i][0] >= x) { const a = line[i - 1], b = line[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; } return line[line.length - 1][1]; };
/** A ridge line closed down to `base` (the sheet hides the rest). */
export const closeDown = (top: P[], base = FH): P[] => [...top, [top[top.length - 1][0], base], [top[0][0], base]];

// ---------------------------------------------------------------- sky
export const SUN: P = [62, 398];
export const SUN_R = 9;
export const CLOUDS: { x: number; y: number; w: number; h: number }[] = [
  { x: 40, y: 92, w: 150, h: 10 }, { x: 230, y: 70, w: 120, h: 8 }, { x: 260, y: 330, w: 140, h: 9 }, { x: 120, y: 360, w: 90, h: 6 }, { x: 300, y: 214, w: 80, h: 5 },
];

// ---------------------------------------------------------------- the settlement round the dot
export const DOT: P = [sx(197), sy(64)];
export type House = { x: number; base: number; w: number; h: number; roof: "flat" | "tile"; seed: number; wins: number };
export const HOUSES: House[] = (() => {
  const r = rng(4021), out: House[] = [];
  for (let i = 0; i < 30; i++) {
    const x = sx(168 + r() * 72), g = groundAt(x), drop = Math.pow(r(), 1.6) * 16;
    const tall = r() < 0.22, w = tall ? 4 + r() * 2.5 : 4.5 + r() * 4, h = tall ? 9 + r() * 7 : 3.5 + r() * 4.5;
    if (Math.hypot(x - DOT[0], g + drop - DOT[1]) < 7) continue; // the dot keeps a clearing
    out.push({ x, base: g + drop + 1, w, h, roof: !tall && r() < 0.22 ? "tile" : "flat", seed: i + 1, wins: Math.floor(r() * 3) });
  }
  return out.sort((a, b) => a.base - b.base);
})();
/** Carmel pine scrub: clusters of small round crowns on the slopes. */
export const PINES: { x: number; y: number; r: number }[] = (() => {
  const r = rng(77), out: { x: number; y: number; r: number }[] = [];
  for (const [cx, n] of [[sx(150), 7], [sx(250), 6], [sx(318), 5], [sx(368), 5]] as [number, number][]) for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * 22; out.push({ x, y: groundAt(x) + 2 + r() * 12, r: 1.3 + r() * 1.3 }); }
  return out.sort((a, b) => a.y - b.y);
})();

// ---------------------------------------------------------------- landmarks (glyph kinds, base points)
export const MARKS: { kind: "waterTower" | "highrise" | "church" | "minaret"; x: number; base: number; h: number }[] = [
  { kind: "waterTower", x: sx(127), base: groundAt(sx(127)) + 1, h: 18 },
  { kind: "highrise", x: sx(160), base: groundAt(sx(160)) + 1, h: 28 },
  { kind: "church", x: sx(292), base: groundAt(sx(292)) + 1, h: 15.5 },
  { kind: "minaret", x: sx(344), base: groundAt(sx(344)) + 1.5, h: 20 },
];
/** Each landmark as plain polygons in glyph space (sun left): the shared silhouette every hand draws from. */
export type Part = { pts: P[]; role: "body" | "lit" | "shade" | "open" | "roof" };
const R = (x: number, y: number, w: number, h: number): P[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const ARCH = (x: number, y: number, w: number, h: number): P[] => { const r = w / 2, out: P[] = [[x, y]]; for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; out.push([x + r + Math.cos(a) * r, y - h + r + Math.sin(a) * r]); } out.push([x + w, y]); return out; };
const DOME = (cx: number, y: number, rx: number, ry: number): P[] => Array.from({ length: 13 }, (_, i) => { const a = Math.PI + (i / 12) * Math.PI; return [cx + Math.cos(a) * rx, y + Math.sin(a) * ry] as P; });
export const PARTS = (kind: string, h: number): Part[] => {
  switch (kind) {
    case "minaret": { const bal = -h * 0.68, top = -h + 4.6; return [
      { pts: R(-7, -5.5, 9, 5.5), role: "body" }, { pts: R(-7, -5.5, 1.5, 5.5), role: "lit" }, { pts: R(-5, -6.5, 5, 1), role: "body" },
      { pts: DOME(-2.5, -6.5, 2.7, 3.1), role: "body" }, { pts: DOME(-3.2, -6.5, 1.6, 2.6), role: "lit" }, { pts: R(-2.75, -10.6, 0.5, 1), role: "body" },
      { pts: R(1.9, -6, 2.6, 6), role: "body" }, { pts: R(2.2, bal, 2, -6 - bal), role: "body" }, { pts: R(2.2, bal, 0.8, -6 - bal), role: "lit" },
      { pts: R(1.4, bal - 0.6, 3.6, 0.6), role: "body" }, { pts: R(2.45, top, 1.5, bal - 0.6 - top), role: "body" }, { pts: [[2.35, top], [4.05, top], [3.2, -h + 0.9]], role: "body" }, { pts: R(3.05, -h, 0.3, 1), role: "body" },
      { pts: ARCH(-4.4, -1.2, 1, 2.4), role: "open" }, { pts: ARCH(-1.6, -1.2, 1, 2.4), role: "open" }, { pts: ARCH(-0.2, 0, 1.2, 2.6), role: "open" }]; }
    case "church": { const tt = -12.4; return [
      { pts: [[-6.5, 0], [-6.5, -6], [-4.6, -8.4], [-2.7, -6], [-2.7, 0]], role: "lit" }, { pts: R(-2.7, -6, 5, 6), role: "body" },
      { pts: [[-4.6, -8.4], [1.8, -8.4], [2.3, -6], [-2.7, -6]], role: "roof" },
      { pts: R(2, tt, 3.8, -tt), role: "body" }, { pts: R(2, tt, 1.3, -tt), role: "lit" }, { pts: [[1.8, tt], [6, tt], [3.9, tt - 1.7]], role: "body" },
      { pts: R(3.65, -h - 0.5, 0.5, 2.5), role: "body" }, { pts: R(3.2, -h + 0.1, 1.4, 0.5), role: "body" },
      { pts: ARCH(3.45, -9.3, 1.3, 2.4), role: "open" }, { pts: Array.from({ length: 10 }, (_, i) => [-4.6 + Math.cos(i * 0.628) * 0.65, -5.6 + Math.sin(i * 0.628) * 0.65] as P), role: "open" },
      { pts: ARCH(-5.15, 0, 1.1, 2.6), role: "open" }, { pts: ARCH(-1.6, -1.6, 0.8, 2.6), role: "open" }, { pts: ARCH(0.5, -1.6, 0.8, 2.6), role: "open" }]; }
    case "waterTower": { const s = h - 7.2; return [
      { pts: [[-1.5, 0], [1.5, 0], [1.15, -s], [-1.15, -s]], role: "body" }, { pts: [[-1.5, 0], [-0.3, 0], [-0.3, -s], [-1.15, -s]], role: "lit" },
      { pts: [[-1.15, -s], [1.15, -s], [4.4, -s - 2.2], [-4.4, -s - 2.2]], role: "shade" },
      { pts: R(-4.5, -s - 5.6, 9, 3.4), role: "body" }, { pts: R(-4.5, -s - 5.6, 3.6, 3.4), role: "lit" },
      { pts: [[-4.6, -s - 5.6], [4.6, -s - 5.6], [3.4, -s - 6.4], [-3.4, -s - 6.4]], role: "body" }, { pts: R(-0.6, -s - 7.2, 1.4, 0.8), role: "body" },
      { pts: R(-0.45, -1.6, 0.9, 1.6), role: "open" }]; }
    default: { const crown = -h + 2.6; return [
      { pts: R(-5, -2.6, 10, 2.6), role: "body" }, { pts: R(-5, -2.6, 1.2, 2.6), role: "lit" },
      { pts: R(-3.4, crown, 6.8, -2.6 - crown), role: "body" }, { pts: R(-3.4, crown, 1.8, -2.6 - crown), role: "lit" },
      { pts: R(-2.6, -h + 1.2, 5.2, 1.4), role: "body" }, { pts: R(0.9, -h - 1.6, 0.4, 2.8), role: "body" }]; }
  }
};
export const place = (pts: P[], x: number, base: number, k = 1): P[] => pts.map(([px, py]) => [x + px * k, base + py * k]);

// ---------------------------------------------------------------- UI copy and data (Hebrew, RTL)
export const UI = {
  place: "חיפה", region: "חוף הכרמל", temp: "22", sentence: "היום בהיר ונעים, עד 24°.", sub: "הלילה צלול, סביב 17°.",
  hours: [{ t: "עכשיו", v: 22, ic: "sun" }, { t: "17", v: 21, ic: "set" }, { t: "18", v: 20, ic: "moon" }, { t: "19", v: 19, ic: "moon" }, { t: "20", v: 19, ic: "cloudMoon" }, { t: "21", v: 18, ic: "moon" }],
  sunset: "שקיעה 16:41", height: "250 מ׳", sea: "פני הים",
  wearTitle: "מה ללבוש מחר", wear: ["חולצה קצרה בצהריים, סוודר דק", "בערב ובבוקר."],
  weekTitle: "השבוע הקרוב",
  week: [{ d: "היום", n: "19.11", lo: 17, hi: 24, ic: "sun" }, { d: "מחר", n: "20.11", lo: 16, hi: 23, ic: "partly" }],
};
export const HOUR_X = [336, 281, 226, 171, 116, 61];
export const HOUR_LINE_Y = (v: number) => 290 - (v - 18) * 3.2;

/** Write RTL text with the right edge at x. */
export const he = (c: Ctx, s: string, x: number, y: number, font: string, col: string, align: CanvasTextAlign = "right") => {
  c.save(); c.direction = "rtl"; c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = "alphabetic"; c.fillText(s, x, y); c.restore();
};
export const ltr = (c: Ctx, s: string, x: number, y: number, font: string, col: string, align: CanvasTextAlign = "center") => {
  c.save(); c.direction = "ltr"; c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = "alphabetic"; c.fillText(s, x, y); c.restore();
};
export const tracePoly = (c: Ctx, pts: P[]) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
export const roundRect = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

/** Icon geometry shared by all hands (centre cx, cy; size ~16). Each hand draws these its own way. */
export const ICON = {
  sun: (cx: number, cy: number) => ({ disc: [cx, cy, 4] as [number, number, number], rays: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [[cx + Math.cos(a) * 6.2, cy + Math.sin(a) * 6.2], [cx + Math.cos(a) * 8.4, cy + Math.sin(a) * 8.4]] as P[]; }) }),
  cloud: (cx: number, cy: number, s = 1): P[] => sample([[cx - 8 * s, cy + 3 * s], [cx - 8 * s, cy - 0.5 * s], [cx - 5 * s, cy - 3 * s], [cx - 1 * s, cy - 6 * s], [cx + 4 * s, cy - 4.5 * s], [cx + 6 * s, cy - 1.5 * s], [cx + 8.5 * s, cy + 0.5 * s], [cx + 8.5 * s, cy + 3 * s]], false, 6),
  /** A crescent: the outer disc minus an offset inner disc (clip to the outer, fill even-odd). */
  moon: (c: Ctx, cx: number, cy: number, r = 5.6) => { c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.arc(cx + r * 0.55, cy - r * 0.4, r * 0.86, 0, Math.PI * 2, true); c.fill("evenodd"); c.restore(); },
};
