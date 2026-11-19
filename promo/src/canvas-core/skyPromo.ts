// SHAMAYIM · social film (9x16). Clean register: the live app's own frames are the star; one accent, the app's gold.
// One phone, one sky: Shadmot Mehola from this morning (the crane V crossing) through the day, the night and tomorrow's
// sunrise, four other places in one bar, and the sunrise's sun lifting out to become the sun of the app's icon. BRIEF.md.
import { rng, type Ctx, type Env } from "./core";
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
import { SKY } from "./skyPromoColors";
import { filmScore } from "./score";
import { filmScoreMat } from "./skyPromoScore";
import { addCranes } from "./skyPromoBirds";

const BAR = 80, DUR = 580; // 90 bpm: a beat is 20 frames, a bar 80; the landing is bar 7's downbeat (480 = 16.0 s)
// the cue table: every frame number of the film lives here
const CUE = {
  live: [0, 80], day: [80, 240], night: [240, 320], range: [320, 400], dawn: [400, 440], lift: [440, 480], end: [480, DUR],
  lines: [
    { text: "התחזית, כמו שהשמיים נראים.", from: 0, to: 70, enter: false },
    { text: "גוררים, והיום עובר.", from: 85, to: 150 },
    { text: "השמש נעלמת מאחורי ההר האמיתי.", from: 160, to: 235 },
    { text: "בכל מקום, השמיים שלו.", from: 325, to: 395 },
  ],
  glide: { up: [245, 270], down: [300, 320], by: 330 }, // night: the phone rises to show the clothesline, then settles
  card: { iris: [480, 496], word: 494, line: 502, url: 510 },
} as const;
(() => { // the grid checker, at load
  const all: number[] = [...Object.values(CUE).flatMap((v) => (Array.isArray(v) && typeof v[0] === "number" ? (v as number[]) : []))];
  for (const f of all) if (f < 0 || f > DUR || f % 5 !== 0) throw new Error(`cue ${f} is off the 5-frame grid or outside the film`);
  for (const k of ["live", "day", "night", "range", "dawn", "lift"] as const) if (CUE[k][0] % 20 !== 0) throw new Error(`section ${k} does not start on a beat`);
})();

const P2 = { x: 180, y: 420, w: 721 }; // the phone in the film: the type band above it is y 300..400
const K = P2.w / 390, SPLIT = 470; // CSS px -> frame px; the footage's top/bottom split (CSS y)
const TOP_H = SPLIT * K, BOT_H = (844 - SPLIT) * K;
const NOW_MIN = 552; // the capture's "now" (09:12): the drag's x is 384 - (clock - now) / 4 CSS px
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lin = (f: number, a: number, b: number) => (f <= a ? 0 : f >= b ? 1 : (f - a) / (b - a));
const inCubic = (u: number) => u * u * u, outCubic = (u: number) => 1 - (1 - u) ** 3;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };

// which footage frame each film frame shows
type Pick = { seq: string; i: number };
const pick = (f: number): Pick => {
  if (f < CUE.live[1]) return { seq: "live", i: f };
  if (f < CUE.day[1]) return { seq: "day", i: f - CUE.day[0] };
  if (f < CUE.night[1]) return { seq: "night", i: f - CUE.night[0] };
  if (f < CUE.range[1]) return { seq: `range-${["tlv", "hfa", "jlm", "mzr"][Math.floor((f - CUE.range[0]) / 20)]}`, i: (f - CUE.range[0]) % 20 };
  return { seq: "dawn", i: Math.min(60, 20 + f - CUE.dawn[0]) };
};
const N3 = (i: number) => String(i).padStart(3, "0");
// the drag's clock keys (copied from capture/film.cjs) -> where the thumb is, in CSS x
const KEYS: Record<string, [number, number][]> = {
  day: [[0, NOW_MIN], [55, 940], [125, 995], [160, 1045]], night: [[0, 1045], [80, 1300]], dawn: [[0, 1795], [40, 1840], [60, 1852]],
};
const thumbX = (seq: string, i: number) => {
  const k = KEYS[seq]; if (!k) return null; let j = 0; while (j < k.length - 2 && i > k[j + 1][0]) j++;
  const [fa, ca] = k[j], [fb, cb] = k[j + 1], c = ca + (cb - ca) * ease((i - fa) / (fb - fa));
  return 384 - (c - NOW_MIN) / 4;
};

const ground = (ctx: Ctx, top: string, low: string) => {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, low);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
};

const drawPhone = (ctx: Ctx, env: Env, pk: Pick, y: number) => {
  for (let i = 6; i >= 1; i--) { ctx.globalAlpha = 0.05; ctx.fillStyle = "#070b1c"; rr(ctx, P2.x - i * 5, y + 18 - i * 3, P2.w + i * 10, 844 * K + i * 8, 64 + i * 5); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.save(); rr(ctx, P2.x, y, P2.w, 844 * K, 64); ctx.clip();
  const t = env.image?.(`${pk.seq}t${N3(pk.i)}`), b = env.image?.(`${pk.seq}b${N3(pk.i - (pk.i % 4))}`);
  if (t) ctx.drawImage(t, P2.x, y, P2.w, TOP_H);
  if (b) ctx.drawImage(b, P2.x, y + TOP_H, P2.w, BOT_H);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; rr(ctx, P2.x, y, P2.w, 844 * K, 64); ctx.stroke();
};

const touchAt = (ctx: Ctx, x: number, y: number, vx: number, press: number) => {
  if (press <= 0) return;
  const R = 38 * (0.7 + 0.3 * press);
  for (let i = 8; i >= 1; i--) { const t = i / 8; ctx.globalAlpha = 0.18 * (1 - t) * press; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x + vx * 14 * t, y, R * 0.8 * (1 - 0.35 * t), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 0.28 * press; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9 * press; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
};

// a line SET in the app's serif: each word rises into place from behind its baseline; it sinks out the same way
const typeLine = (ctx: Ctx, text: string, f: number, from: number, to: number, enter = true, cx = 540, y = 372, px = 54) => {
  if (f < from || f >= to) return;
  ctx.font = `500 ${px}px SkySerif`; ctx.direction = "rtl"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = C.ink;
  const words = text.split(" "), sp = ctx.measureText(" ").width, ws = words.map((w) => ctx.measureText(w).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let xr = cx + total / 2; // RTL: the first word at the right
  ctx.save(); ctx.beginPath(); ctx.rect(cx - total / 2 - px, y - px * 1.15, total + 2 * px, px * 1.5); ctx.clip();
  words.forEach((w, i) => {
    const inn = enter ? outCubic(lin(f, from + i * 3, from + i * 3 + 12)) : 1, out = inCubic(lin(f, to - 10 + (words.length - 1 - i) * 1, to));
    const dy = (1 - inn) * px * 1.2 + out * px * 1.3;
    ctx.fillText(w, xr - ws[i], y + dy); xr -= ws[i] + sp;
  });
  ctx.restore();
};

// the app's own icon (public/icon.svg), drawn from its paths at scale s with its top-left at (x, y)
const ICON = { size: 300, x: 390, y: 520 };
const iconSun = () => { const s = ICON.size / 512; return { x: ICON.x + 256 * s, y: ICON.y + 318 * s, r: 92 * s }; };
const drawIcon = (ctx: Ctx, iris: number) => {
  const s = ICON.size / 512, sun = iconSun();
  ctx.save(); ctx.translate(ICON.x, ICON.y); ctx.scale(s, s);
  rr(ctx, 0, 0, 512, 512, 112); ctx.clip();
  ctx.beginPath(); ctx.arc(256, 318, 92 + iris * 420, 0, Math.PI * 2); ctx.clip(); // the iris opens from the sun
  const g = ctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#1F2A52"); g.addColorStop(0.55, "#8E4A6E"); g.addColorStop(1, "#F6B26B");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  const sg = ctx.createRadialGradient(256, 318, 0, 256, 318, 92); sg.addColorStop(0, "#FFE7B0"); sg.addColorStop(1, "#FFC56A");
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(256, 318, 92, 0, Math.PI * 2); ctx.fill();
  const rise = (1 - outCubic(iris)) * 120; // the two ridges come up into place as the iris opens
  ctx.fillStyle = "#3A2A4A"; ctx.beginPath(); ctx.moveTo(0, 330 + rise); ctx.bezierCurveTo(70, 300 + rise, 120, 312 + rise, 180, 290 + rise); ctx.bezierCurveTo(240, 268 + rise, 300, 250 + rise, 360, 270 + rise); ctx.bezierCurveTo(420, 290 + rise, 460, 300 + rise, 512, 286 + rise); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
  const rise2 = (1 - outCubic(iris)) * 160;
  ctx.fillStyle = "#1A1428"; ctx.beginPath(); ctx.moveTo(0, 372 + rise2); ctx.bezierCurveTo(80, 356 + rise2, 140, 366 + rise2, 210, 348 + rise2); ctx.bezierCurveTo(280, 330 + rise2, 330, 330 + rise2, 400, 344 + rise2); ctx.bezierCurveTo(470, 358 + rise2, 480, 360 + rise2, 512, 352 + rise2); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
  ctx.restore();
  void sun;
};
const END = { top: "#1F2A52", low: "#121833" };
// the sunrise's sun in the dawn footage's last frame (measured: CSS 290.7, 374.6, r 8)
const DAWN_SUN = { x: 290.7, y: 374.6, r: 8 };

const drawFilm = (ctx: Ctx, f: number, env: Env) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  if (f < CUE.lift[0]) {
    const pk = pick(f), col = SKY[pk.seq][pk.i];
    ground(ctx, col[0], col[1]);
    // night: the phone rises to show the clothesline and the line under it, then settles for the next place
    const g = CUE.glide, lift = f < g.up[1] ? ease(lin(f, g.up[0], g.up[1])) : 1 - ease(lin(f, g.down[0], g.down[1]));
    const py = P2.y - g.by * lift;
    // the four places: a slow push in across the bar, so the cuts land on a moving picture
    const push = f >= CUE.range[0] && f < CUE.range[1] ? 1 + 0.06 * lin(f, CUE.range[0], CUE.range[1]) : f < CUE.live[1] ? 1 + 0.06 * (1 - ease(lin(f, 0, CUE.live[1]))) : 1; // bar 1 pulls back to the whole phone
    ctx.save(); ctx.translate(540, py + 400); ctx.scale(push, push); ctx.translate(-540, -(py + 400));
    drawPhone(ctx, env, pk, py);
    ctx.restore();
    const tx = thumbX(pk.seq, pk.i);
    if (tx !== null) {
      const segStart = pk.seq === "day" ? CUE.day[0] : pk.seq === "night" ? CUE.night[0] : CUE.dawn[0];
      const press = pk.seq === "night" ? 1 - lin(f, CUE.night[1] - 8, CUE.night[1]) : lin(f, segStart, segStart + 6) * (pk.seq === "dawn" ? 1 - lin(f, CUE.dawn[1] - 6, CUE.dawn[1]) : 1);
      const vx = (thumbX(pk.seq, Math.max(0, pk.i - 3)) ?? tx) - tx;
      touchAt(ctx, P2.x + tx * K, py + 393 * K, vx * K * 0.6, pk.seq === "day" ? lin(f, CUE.day[0], CUE.day[0] + 6) : press);
    }
    for (const l of CUE.lines) typeLine(ctx, l.text, f, l.from, l.to, (l as { enter?: boolean }).enter ?? true);
    return;
  }
  // ---- the lift (440-480): the phone drops away, the sun rises out of it and flies to the icon's sun
  const u = lin(f, CUE.lift[0], CUE.lift[1]);
  const dawnCol = SKY.dawn[60];
  if (f < CUE.end[0]) {
    ground(ctx, mix(dawnCol[0], END.top, ease(u)), mix(dawnCol[1], END.low, ease(u)));
    const py = P2.y + inCubic(lin(f, CUE.lift[0] + 4, CUE.lift[0] + 26)) * 1600;
    if (py < H) {
      drawPhone(ctx, env, { seq: "dawn", i: 60 }, py);
      // the sun has left the phone: the sky closes over where it was
      const sx = P2.x + DAWN_SUN.x * K, sy = py + DAWN_SUN.y * K, rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, DAWN_SUN.r * K * 3.2);
      rg.addColorStop(0, "#5a83b0"); rg.addColorStop(0.6, "rgba(84,128,173,1)"); rg.addColorStop(1, "rgba(80,124,171,0)");
      ctx.save(); rr(ctx, P2.x, py, P2.w, TOP_H, 64); ctx.clip(); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, DAWN_SUN.r * K * 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  } else {
    ground(ctx, END.top, END.low);
    // the night the icon's sun rises out of: seeded stars that twinkle (the app's own night has them)
    const r = rng(2611);
    for (let i = 0; i < 140; i++) {
      const x = r() * W, y = 60 + r() * (H - 120), ph = r() * Math.PI * 2, sp = 0.08 + r() * 0.12, sz = 1.2 + r() * 2.2;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ph + f * sp)), on = lin(f, CUE.end[0] + 10 + (i % 20), CUE.end[0] + 30 + (i % 20));
      ctx.globalAlpha = 0.55 * tw * on; ctx.fillStyle = "#E8ECF8"; ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // the card settles toward the viewer while it holds
  const hold = f >= CUE.end[0] ? 1 + 0.09 * lin(f, CUE.end[0], DUR) : 1;
  ctx.save(); ctx.translate(540, 900); ctx.scale(hold, hold); ctx.translate(-540, -900);
  // the sun: one object from the phone (440) to the icon (480), on an arc, growing to the icon's sun
  const a = { x: P2.x + DAWN_SUN.x * K, y: P2.y + DAWN_SUN.y * K, r: DAWN_SUN.r * K }, b = iconSun();
  // it rises straight up out of the valley first, then curves over to the icon (a quadratic path)
  const v = ease(u), cx = a.x, cy = a.y - 520;
  const sx = (1 - v) ** 2 * a.x + 2 * (1 - v) * v * cx + v * v * b.x, sy = (1 - v) ** 2 * a.y + 2 * (1 - v) * v * cy + v * v * b.y, sr = a.r + (b.r - a.r) * v;
  if (f >= CUE.end[0]) drawIcon(ctx, ease(lin(f, CUE.card.iris[0], CUE.card.iris[1])));
  if (f < CUE.card.iris[1]) {
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 2.4); glow.addColorStop(0, "rgba(255,210,65,0.35)"); glow.addColorStop(1, "rgba(255,210,65,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, sr * 2.4, 0, Math.PI * 2); ctx.fill();
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr); sg.addColorStop(0, "#FFE7B0"); sg.addColorStop(1, "#FFC56A");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
  if (f >= CUE.end[0]) {
    typeLine(ctx, "שמיים", f, CUE.card.word, DUR + 99, true, 540, 990, 132);
    typeLine(ctx, "השמיים שלך.", f, CUE.card.line, DUR + 99, true, 540, 1070, 54);
    // the address: the one gold line, set in the app's sans
    if (f >= CUE.card.url) {
      const q = outCubic(lin(f, CUE.card.url, CUE.card.url + 12));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1100, W, 70); ctx.clip();
      ctx.font = "600 42px SkySans"; ctx.direction = "ltr"; ctx.textAlign = "center"; ctx.fillStyle = C.gold;
      ctx.fillText("sky.nehoraihadad.com", 540, 1150 + (1 - q) * 56); ctx.restore();
    }
  }
  ctx.restore();
};

// every footage frame the film shows, as named assets
const images: Record<string, string> = {};
for (let f = 0; f < CUE.lift[0]; f++) { const pk = pick(f); images[`${pk.seq}t${N3(pk.i)}`] = `assets/film/${pk.seq}/t${N3(pk.i)}.jpg`; const bi = pk.i - (pk.i % 4); images[`${pk.seq}b${N3(bi)}`] = `assets/film/${pk.seq}/b${N3(bi)}.jpg`; }
for (const k of ["tlv", "hfa", "jlm", "mzr"]) for (let i = 0; i < 20; i += 4) images[`range-${k}b${N3(i)}`] = `assets/film/range-${k}/b${N3(i)}.jpg`;
images["dawnt060"] = "assets/film/dawn/t060.jpg"; images["dawnb060"] = "assets/film/dawn/b060.jpg";

const scoreAudio = filmScore(filmScoreMat(), FPS, DUR);
export const skyPromo: Film = {
  meta: { title: "skyPromo", W, H, fps: FPS, bpm: BPM, durationFrames: DUR },
  assets: { images },
  shots: [{ id: "film", start: 0, end: DUR, draw: drawFilm }],
  audio: Object.assign((sr: number): [Float32Array, Float32Array] => {
    const [L, R] = scoreAudio(sr);
    // the crane V crossing over the valley in the opening bar (the app's own November event)
    addCranes(L, R, sr, { at: 0.15, dur: 4.4, seed: 1911, panFrom: -0.5, panTo: 0.35, level: 0.05 });
    return [L, R];
  }, { scores: scoreAudio.scores }),
};
void BAR;
