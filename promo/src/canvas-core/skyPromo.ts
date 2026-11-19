// SHAMAYIM · social film (9x16). Clean register: the live app's own frames are the star; one accent, the app's gold.
// One phone, one sky: Shadmot Mehola from this morning (the crane V crossing) through the day, the night and tomorrow's
// sunrise, four other places in one bar, and the sunrise's sun lifting out to become the sun of the app's icon. BRIEF.md.
import { rng, type Ctx, type Env } from "./core";
import { texture } from "./readable";
import type { Film } from "./film";
import karH from "../../assets/fonts/karantina-hebrew-700-normal.woff2";
import karL from "../../assets/fonts/karantina-latin-700-normal.woff2";
import frkH from "../../assets/fonts/frank-ruhl-libre-hebrew-500-normal.woff2";
import frkL from "../../assets/fonts/frank-ruhl-libre-latin-500-normal.woff2";
import asH from "../../assets/fonts/assistant-hebrew-600-normal.woff2";
import asL from "../../assets/fonts/assistant-latin-600-normal.woff2";

type FontFile = { path: string; format: string; data: string };
const HEB = "U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F";
const LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
// the app's faces, each as its Hebrew and Latin subsets (as @fontsource ships them), registered before frame 0
(() => {
  const g = globalThis as unknown as { FontFace?: new (f: string, s: ArrayBuffer, d?: Record<string, string>) => { load(): Promise<unknown> }; document?: { fonts: { add(f: unknown): void } } };
  if (!g.FontFace || !g.document) return;
  const add = (family: string, file: FontFile, range: string) => {
    const bin = atob(file.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const face = new g.FontFace(family, u8.buffer, { weight: "1 1000", style: "normal", unicodeRange: range }); g.document!.fonts.add(face); void face.load();
  };
  add("SkyNum", karH as FontFile, HEB); add("SkyNum", karL as FontFile, LAT);
  add("SkySerif", frkH as FontFile, HEB); add("SkySerif", frkL as FontFile, LAT);
  add("SkySans", asH as FontFile, HEB); add("SkySans", asL as FontFile, LAT);
})();

export const W = 1080, H = 1920, FPS = 30, BPM = 90;
const C = { ground: "#0F1730", ground2: "#16214A", ink: "#F3F5F7", muted: "#A9B4CC", gold: "#FFD241", hair: "rgba(243,245,247,0.14)" };
// safe rectangle for 9x16 (top 14 %, bottom 25 %, right 14 %)
const SAFE = { top: Math.round(H * 0.14), bottom: Math.round(H * 0.75), right: Math.round(W * 0.86) };

const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

// the phone: the live app's own frame (390x844 CSS at 3x), kept inside the safe width; its lower part (the week
// list) may run into the bottom zone, everything a viewer must read (place, number, line, strip, valley, clothesline)
// sits above y 1290
const PHONE = { x: 180, y: 250, w: 721 }; const PH = Math.round(PHONE.w * 2532 / 1170); const CSS = PHONE.w / 390;
// the frame's ground takes the app's sky at that moment, so the phone reads as a window in the same sky
export const SKY_0615 = { top: "#203779", mid: "#4e5b93", low: "#1b2350" };

const touch = (ctx: Ctx, x: number, y: number, trail: number) => {
  // a touch indicator, as screen recordings show one: a soft disc with a fading trail behind the way it came
  for (let i = 8; i >= 1; i--) { const t = i / 8; ctx.globalAlpha = 0.16 * (1 - t); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + trail * t, y, 30 * (1 - 0.35 * t), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.28; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
};

export const phoneFrame = (ctx: Ctx, env: Env, key: string, sky: { top: string; mid: string; low: string }) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky.top); g.addColorStop(0.55, sky.mid); g.addColorStop(1, sky.low);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // a soft shadow under the phone (stacked translucent rounded rects; no ctx.filter)
  for (let i = 6; i >= 1; i--) { ctx.globalAlpha = 0.05; ctx.fillStyle = "#070b1c"; rr(ctx, PHONE.x - i * 5, PHONE.y + 18 - i * 3, PHONE.w + i * 10, PH + i * 8, 64 + i * 5); ctx.fill(); }
  ctx.globalAlpha = 1;
  const img = env.image?.(key);
  ctx.save(); rr(ctx, PHONE.x, PHONE.y, PHONE.w, PH, 64); ctx.clip();
  if (img) ctx.drawImage(img, PHONE.x, PHONE.y, PHONE.w, PH); else { ctx.fillStyle = sky.mid; ctx.fillRect(PHONE.x, PHONE.y, PHONE.w, PH); }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; rr(ctx, PHONE.x, PHONE.y, PHONE.w, PH, 64); ctx.stroke();
  // the thumb on the valley (CSS y ~390), mid-drag toward later (leftward in RTL)
  touch(ctx, PHONE.x + 300 * CSS, PHONE.y + 392 * CSS, 150);
};


// ================================================================ THE FILM
import { SKY, CLOCK } from "./skyPromoColors";
import { filmScore } from "./score";
import { filmScoreMat } from "./skyPromoScore";

const DUR = 580; // 90 bpm: a beat is 20 frames, a bar 80; the landing is bar 7's downbeat (480 = 16.0 s)
const PLACES = [["tlv", "תל אביב"], ["hfa", "חיפה"], ["jlm", "ירושלים"], ["mzr", "מצפה רמון"]] as const;
// the cue table: every frame number of the film lives here
const CUE = {
  day: [0, 240], night: [240, 320], range: [320, 400], dawn: [400, 440], lift: [440, 480], end: [480, DUR],
  lines: [
    { text: "תחזית שנראית כמו השמיים שמעליך.", from: 0, to: 75, enter: false },
    { text: "מזיזים את האצבע, והיום עובר.", from: 80, to: 130 },
    { text: "השמש נעלמת מאחורי ההרים שמול הבית.", from: 135, to: 235 },
    { text: "גם הירח, בדיוק איפה שהוא.", from: 245, to: 315 },
    { text: "בכל מקום, השמיים שלו.", from: 325, to: 395 },
    { text: "ומחר בבוקר, מעל הגלעד.", from: 400, to: 440 },
  ],
  card: { iris: [480, 495], word: 480, line: 485, url: 490 },
} as const;
(() => { // the grid checker, at load
  const nums: number[] = [];
  for (const v of Object.values(CUE)) if (Array.isArray(v) && typeof v[0] === "number") nums.push(...(v as number[]));
  for (const l of CUE.lines) nums.push(l.from, l.to);
  nums.push(...Object.values(CUE.card).flat());
  for (const f of nums) if (f < 0 || f > DUR || f % 5 !== 0) throw new Error(`cue ${f} is off the 5-frame grid or outside the film`);
  for (const k of ["day", "night", "range", "dawn", "lift", "end"] as const) if (CUE[k][0] % 20 !== 0) throw new Error(`section ${k} does not start on a beat`);
})();

const P2 = { x: 210, y: 545, w: 660 }; // the phone; above it the gold clock (baseline 365) and the line (baseline 505)
const K = P2.w / 390, SPLIT = 470; // CSS px -> frame px; the footage's top/bottom split (CSS y)
const TOP_H = SPLIT * K, BOT_H = (844 - SPLIT) * K;
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lin = (f: number, a: number, b: number) => (f <= a ? 0 : f >= b ? 1 : (f - a) / (b - a));
const inCubic = (u: number) => u * u * u, outCubic = (u: number) => 1 - (1 - u) ** 3;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };

type Pick = { seq: string; i: number };
const pick = (f: number): Pick => {
  if (f < CUE.day[1]) return { seq: "day", i: f };
  if (f < CUE.night[1]) return { seq: "night", i: f - CUE.night[0] };
  if (f < CUE.range[1]) return { seq: `range-${PLACES[Math.floor((f - CUE.range[0]) / 20)][0]}`, i: (f - CUE.range[0]) % 20 };
  return { seq: "dawn", i: Math.min(60, 20 + f - CUE.dawn[0]) };
};
const N3 = (i: number) => String(i).padStart(3, "0");
const clockOf = (pk: Pick) => (CLOCK as unknown as Record<string, number[]>)[pk.seq]?.[pk.i] ?? null;
// the thumb's x on the valley, in CSS px, from the drag's own log (4 min per px, RTL: later is left)
const thumbX = (pk: Pick) => { const c = clockOf(pk); if (c === null) return null; let m = c - CLOCK.now; if (m < 0) m += 1440; return CLOCK.x0 - m / 4; };
const hhmm = (c: number) => { const m = Math.round(c) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

const ground = (ctx: Ctx, top: string, low: string) => {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, low);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};
const drawPhone = (ctx: Ctx, env: Env, pk: Pick, y: number) => {
  for (let i = 6; i >= 1; i--) { ctx.globalAlpha = 0.05; ctx.fillStyle = "#070b1c"; rr(ctx, P2.x - i * 5, y + 18 - i * 3, P2.w + i * 10, 844 * K + i * 8, 60 + i * 5); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.save(); rr(ctx, P2.x, y, P2.w, 844 * K, 60); ctx.clip();
  const t = env.image?.(`${pk.seq}t${N3(pk.i)}`), b = env.image?.(`${pk.seq}b${N3(pk.i - (pk.i % 4))}`);
  if (t) ctx.drawImage(t, P2.x, y, P2.w, TOP_H);
  if (b) ctx.drawImage(b, P2.x, y + TOP_H, P2.w, BOT_H);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; rr(ctx, P2.x, y, P2.w, 844 * K, 60); ctx.stroke();
};
const touchAt = (ctx: Ctx, x: number, y: number, vx: number, press: number) => {
  if (press <= 0) return;
  const R = 36 * (0.7 + 0.3 * press);
  for (let i = 8; i >= 1; i--) { const t = i / 8; ctx.globalAlpha = 0.18 * (1 - t) * press; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + vx * t, y, R * 0.8 * (1 - 0.35 * t), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.28 * press; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9 * press; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
};

// a line SET in the app's serif: words rise into place from behind the baseline (quick: 8 frames, 1-frame stagger)
const typeLine = (ctx: Ctx, text: string, f: number, from: number, to: number, enter = true, cx = 540, y = 505, px = 46) => {
  if (f < from || f >= to) return;
  ctx.font = `500 ${px}px SkySerif`; ctx.direction = "rtl"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = C.ink;
  const words = text.split(" "), sp = ctx.measureText(" ").width, ws = words.map((w) => ctx.measureText(w).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let xr = cx + total / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - total / 2 - px, y - px * 1.25, total + 2 * px, px * 1.6); ctx.clip();
  words.forEach((w, i) => {
    const inn = enter ? outCubic(lin(f, from + i, from + i + 8)) : 1, out = inCubic(lin(f, to - 8 + Math.min(4, words.length - 1 - i), to));
    ctx.fillText(w, xr - ws[i], y + (1 - inn) * px * 1.25 + out * px * 1.3); xr -= ws[i] + sp;
  });
  ctx.restore();
};
// the gold slot above the phone: the dragged clock, or the place's name (the app's display face)
const goldSlot = (ctx: Ctx, text: string, alpha: number, dy = 0) => {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha; ctx.font = "700 90px SkyNum"; ctx.direction = /[0-9]/.test(text) ? "ltr" : "rtl"; ctx.textAlign = "center"; ctx.fillStyle = C.gold;
  ctx.fillText(text, 540, 362 + dy); ctx.globalAlpha = 1;
};

// the app's own icon (public/icon.svg), from its paths
const ICON = { size: 300, x: 390, y: 500 };
const iconSun = () => { const s = ICON.size / 512; return { x: ICON.x + 256 * s, y: ICON.y + 318 * s, r: 92 * s }; };
const drawIcon = (ctx: Ctx, iris: number, ridge: number) => {
  const s = ICON.size / 512;
  ctx.save(); ctx.translate(ICON.x, ICON.y); ctx.scale(s, s);
  rr(ctx, 0, 0, 512, 512, 112); ctx.clip();
  ctx.beginPath(); ctx.arc(256, 318, 92 + iris * 420, 0, Math.PI * 2); ctx.clip(); // the iris opens from the sun
  const g = ctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#1F2A52"); g.addColorStop(0.55, "#8E4A6E"); g.addColorStop(1, "#F6B26B");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  const sg = ctx.createRadialGradient(256, 318, 0, 256, 318, 92); sg.addColorStop(0, "#FFE7B0"); sg.addColorStop(1, "#FFC56A");
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(256, 318, 92, 0, Math.PI * 2); ctx.fill();
  const rise = (1 - outCubic(ridge)) * 210, rise2 = (1 - outCubic(ridge)) * 230; // the ridges rise over the disc: the sun sets into the icon
  ctx.fillStyle = "#3A2A4A"; ctx.beginPath(); ctx.moveTo(0, 330 + rise); ctx.bezierCurveTo(70, 300 + rise, 120, 312 + rise, 180, 290 + rise); ctx.bezierCurveTo(240, 268 + rise, 300, 250 + rise, 360, 270 + rise); ctx.bezierCurveTo(420, 290 + rise, 460, 300 + rise, 512, 286 + rise); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1A1428"; ctx.beginPath(); ctx.moveTo(0, 372 + rise2); ctx.bezierCurveTo(80, 356 + rise2, 140, 366 + rise2, 210, 348 + rise2); ctx.bezierCurveTo(280, 330 + rise2, 330, 330 + rise2, 400, 344 + rise2); ctx.bezierCurveTo(470, 358 + rise2, 480, 360 + rise2, 512, 352 + rise2); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
  ctx.restore();
};
const END = { top: "#1F2A52", low: "#121833" };
const DAWN_SUN = { x: 300.3, y: 378.0, r: 8 }; // the sunrise's sun in the dawn footage's last frame (measured, CSS px)
const sunDisc = (ctx: Ctx, x: number, y: number, r: number, glow: number) => {
  if (glow > 0) { const gl = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.4); gl.addColorStop(0, `rgba(255,210,65,${0.35 * glow})`); gl.addColorStop(1, "rgba(255,210,65,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill(); }
  const sg = ctx.createRadialGradient(x, y, 0, x, y, r); sg.addColorStop(0, "#FFE7B0"); sg.addColorStop(1, "#FFC56A");
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
};

const drawFilm = (ctx: Ctx, f: number, env: Env) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  if (f < CUE.lift[0]) {
    const pk = pick(f), col = SKY[pk.seq][pk.i];
    ground(ctx, col[0], col[1]);
    // the four places: a slow push in across the bar, so each cut lands on a moving picture
    const push = f >= CUE.range[0] && f < CUE.range[1] ? 1 + 0.05 * lin(f, CUE.range[0], CUE.range[1]) : f >= CUE.dawn[0] ? 1 + 0.03 * lin(f, CUE.dawn[0], CUE.dawn[1]) : 1 + 0.012 * Math.sin((f / CUE.range[0]) * Math.PI); // a breath of camera over the day; a push into the sunrise
    ctx.save(); ctx.translate(540, P2.y + 400); ctx.scale(push, push); ctx.translate(-540, -(P2.y + 400));
    drawPhone(ctx, env, pk, P2.y);
    ctx.restore();
    const tx = thumbX(pk);
    if (tx !== null) {
      const press = pk.seq === "night" ? 1 - lin(f, CUE.night[1] - 8, CUE.night[1]) : pk.seq === "dawn" ? lin(f, CUE.dawn[0], CUE.dawn[0] + 6) * (1 - lin(f, CUE.dawn[1] - 6, CUE.dawn[1])) : 1;
      const back = thumbX({ seq: pk.seq, i: Math.max(0, pk.i - 4) }) ?? tx;
      touchAt(ctx, P2.x + tx * K + 0.8 * Math.sin(f * 0.9), P2.y + 393 * K + 0.6 * Math.sin(f * 0.53 + 1), (back - tx) * K, press); // a real finger never holds perfectly still
    }
    // the gold slot: the clock the thumb moves; in the places bar, each place's name on its beat
    if (f >= CUE.range[0] && f < CUE.range[1]) {
      const j = Math.floor((f - CUE.range[0]) / 20), loc = (f - CUE.range[0]) % 20;
      texture(ctx, () => goldSlot(ctx, PLACES[j][1], 1, (1 - outCubic(lin(loc, 0, 5))) * 30)); // a beat each: the app's own header names them too
    } else {
      const c = clockOf(pk);
      // a running readout, glanced at, not read: marked as texture for the reading-time check
      if (c !== null) texture(ctx, () => goldSlot(ctx, hhmm(c), 1));
    }
    for (const l of CUE.lines) typeLine(ctx, l.text, f, l.from, l.to, (l as { enter?: boolean }).enter ?? true);
    return;
  }
  // ---- the lift (440-480): the phone drops away; the sunrise's sun rises out of it, swings wide of the app's UI,
  // and comes to rest as the sun of the app's icon; the icon opens from it and its ridges rise over it
  const u = lin(f, CUE.lift[0], CUE.lift[1]);
  const dawnCol = SKY.dawn[60];
  if (f < CUE.end[0]) {
    ground(ctx, mix(dawnCol[0], END.top, ease(u)), mix(dawnCol[1], END.low, ease(u)));
    const py = P2.y + inCubic(lin(f, CUE.lift[0] + 2, CUE.lift[1] - 6)) * 1500;
    if (py < H) {
      drawPhone(ctx, env, { seq: "dawn", i: 60 }, py);
      const sx = P2.x + DAWN_SUN.x * K, sy = py + DAWN_SUN.y * K, rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, DAWN_SUN.r * K * 3);
      rg.addColorStop(0, "#5a83b0"); rg.addColorStop(0.6, "rgba(84,128,173,1)"); rg.addColorStop(1, "rgba(80,124,171,0)");
      ctx.save(); rr(ctx, P2.x, py, P2.w, TOP_H, 60); ctx.clip(); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, DAWN_SUN.r * K * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // the clock rides up and away with the last line of the morning
    texture(ctx, () => goldSlot(ctx, hhmm(CLOCK.dawn[60]), 1 - lin(f, CUE.lift[0], CUE.lift[0] + 10), -lin(f, CUE.lift[0], CUE.lift[0] + 10) * 40));
  } else {
    ground(ctx, END.top, END.low);
    const r = rng(2611);
    for (let i = 0; i < 140; i++) {
      const x = r() * W, y = 60 + r() * (H - 120), ph = r() * Math.PI * 2, sp = 0.08 + r() * 0.12, sz = 1.2 + r() * 2.2;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ph + f * sp)), on = lin(f, CUE.end[0] + 10 + (i % 20), CUE.end[0] + 30 + (i % 20));
      ctx.globalAlpha = 0.55 * tw * on; ctx.fillStyle = "#E8ECF8"; ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const hold = f >= CUE.end[0] ? 1 + 0.09 * lin(f, CUE.end[0], DUR) : 1;
  ctx.save(); ctx.translate(540, 820); ctx.scale(hold, hold); ctx.translate(-540, -820);
  // the sun: one object, from the phone's valley (440) out to the right of the phone, over, and down onto the icon (480)
  const a = { x: P2.x + DAWN_SUN.x * K, y: P2.y + DAWN_SUN.y * K, r: DAWN_SUN.r * K }, b = iconSun();
  const v = ease(u), c1 = { x: 1010, y: a.y - 80 }, c2 = { x: 900, y: b.y - 360 };
  const bz = (p0: number, p1: number, p2: number, p3: number) => (1 - v) ** 3 * p0 + 3 * (1 - v) ** 2 * v * p1 + 3 * (1 - v) * v * v * p2 + v ** 3 * p3;
  const sx = bz(a.x, c1.x, c2.x, b.x), sy = bz(a.y, c1.y, c2.y, b.y), sr = a.r + (b.r - a.r) * v;
  if (f < CUE.end[0]) sunDisc(ctx, sx, sy, sr, 1);
  else {
    const iris = ease(lin(f, CUE.card.iris[0], CUE.card.iris[1]));
    drawIcon(ctx, iris, ease(lin(f, CUE.card.iris[0] + 4, CUE.card.iris[1] + 14)));
    const gl = 1 - lin(f, CUE.end[0], CUE.end[0] + 10); // the flight's glow settles into the icon
    if (gl > 0) { const g2 = ctx.createRadialGradient(b.x, b.y, b.r * 0.6, b.x, b.y, b.r * 2.4); g2.addColorStop(0, `rgba(255,210,65,${0.35 * gl})`); g2.addColorStop(1, "rgba(255,210,65,0)"); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.4, 0, Math.PI * 2); ctx.fill(); }
    // the wordmark rises (no clip: the letters are never cut), the line, then the address
    const wq = outCubic(lin(f, CUE.card.word, CUE.card.word + 12));
    ctx.globalAlpha = wq; ctx.font = "500 132px SkySerif"; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillStyle = C.ink;
    ctx.fillText("שמיים", 540, 975 + (1 - wq) * 40); ctx.globalAlpha = 1;
    typeLine(ctx, "השמיים שלך.", f, CUE.card.line, DUR + 99, true, 540, 1058, 54);
    if (f >= CUE.card.url) {
      const q = outCubic(lin(f, CUE.card.url, CUE.card.url + 10));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1088, W, 90); ctx.clip();
      ctx.font = "600 52px SkySans"; ctx.direction = "ltr"; ctx.textAlign = "center"; ctx.fillStyle = C.gold;
      ctx.fillText("sky.nehoraihadad.com", 540, 1150 + (1 - q) * 70); ctx.restore();
    }
  }
  ctx.restore();
};

const images: Record<string, string> = {};
for (let f = 0; f < CUE.lift[0]; f++) { const pk = pick(f); images[`${pk.seq}t${N3(pk.i)}`] = `assets/film/${pk.seq}/t${N3(pk.i)}.jpg`; const bi = pk.i - (pk.i % 4); images[`${pk.seq}b${N3(bi)}`] = `assets/film/${pk.seq}/b${N3(bi)}.jpg`; }
images["dawnt060"] = "assets/film/dawn/t060.jpg"; images["dawnb060"] = "assets/film/dawn/b060.jpg";

const scoreAudio = filmScore(filmScoreMat(), FPS, DUR);
// a look-ahead peak limiter on the delivered mix (the fitted film render can stack the bar-5 strikes past full scale):
// gain follows the loudest sample 5 ms ahead, recovers over 120 ms; ceiling -2 dBFS leaves the AAC encode its headroom
const limit = (L: Float32Array, R: Float32Array, sr: number): [Float32Array, Float32Array] => {
  const ceil = 10 ** (-2 / 20), ahead = Math.round(0.005 * sr), rel = Math.exp(-1 / (0.12 * sr)), n = L.length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) { const pk = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = pk > ceil ? ceil / pk : 1; }
  const tgt = new Float32Array(n); // the smallest gain needed anywhere in the next `ahead` samples
  for (let i = n - 1; i >= 0; i--) { let m = need[i]; const j = i + 1; if (j < n && tgt[j] < m && j - i <= ahead) m = Math.min(m, tgt[j]); tgt[i] = m; }
  let g = 1;
  for (let i = 0; i < n; i++) { let m = 1; for (let k = 0; k <= ahead && i + k < n; k += 16) m = Math.min(m, need[i + k]); g = m < g ? m : m + (g - m) * rel; L[i] *= g; R[i] *= g; }
  return [L, R];
};
export const skyPromo: Film = {
  meta: { title: "skyPromo", W, H, fps: FPS, bpm: BPM, durationFrames: DUR },
  assets: { images },
  shots: [{ id: "film", start: 0, end: DUR, draw: drawFilm }],
  audio: Object.assign((sr: number): [Float32Array, Float32Array] => limit(...scoreAudio(sr), sr), { scores: scoreAudio.scores }),
};
