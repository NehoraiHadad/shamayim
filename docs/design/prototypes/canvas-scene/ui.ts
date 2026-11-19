// The app's UI layout (TopBar, Hero, Sentence, hourly row, sunset chip, scene labels, Sheet with WearCard and
// WeekList), drawn through a SKIN so each hand restyles the same layout: its own type, colours, icons, rules.
import type { Ctx, P } from "./core";
import { DOT, FH, FW, HOUR_X, SEA_Y, SHEET_TOP, UI as UI0, he, ltr } from "./valley";
export type UIData = typeof UI0;

export type Skin = {
  fonts: { name: string; hero: string; sentence: string; label: string; body: string; num: string };
  ink: { sky: string; skyMuted: string; sheet: string; sheetMuted: string; land?: string; landMuted?: string };
  topButton(c: Ctx, x: number, y: number): void;
  icon(c: Ctx, kind: string, x: number, y: number, onSheet: boolean): void;
  hourLine(c: Ctx, pts: P[]): void;
  chip(c: Ctx, x: number, y: number, w: number, h: number): void;
  seaLine(c: Ctx, x0: number, x1: number, y: number): void;
  sheet(c: Ctx, y: number): void;
  accent(c: Ctx, x: number, y: number, h: number): void;
  bar(c: Ctx, x: number, y: number, w: number, lo: number, hi: number): void;
  rule(c: Ctx, x0: number, x1: number, y: number): void;
  chevron(c: Ctx, x: number, y: number): void;
  heroSize?: number;
};
export const lineY = (v: number) => 306 - (v - 18) * 2.6;

export const drawUI = (c: Ctx, s: Skin, UI: UIData = UI0) => {
  const f = s.fonts;
  s.topButton(c, 37, 30);
  he(c, UI.place, 355, 35, `700 17px ${f.label}`, s.ink.sky); he(c, `${UI.region} ⌄`, 308, 35, `400 12px ${f.label}`, s.ink.skyMuted);
  ltr(c, UI.temp, 182, 172, `${f.hero}`, s.ink.sky); ltr(c, "°", 252, 106, `400 34px ${f.label}`, s.ink.sky);
  he(c, UI.sentence, 187, 214, f.sentence, s.ink.sky, "center");
  UI.hours.forEach((h, i) => { const x = HOUR_X[i]; he(c, h.t, x, 244, `${i ? 400 : 700} 13px ${f.label}`, i ? s.ink.skyMuted : s.ink.sky, "center"); s.icon(c, h.ic, x, 262, false); ltr(c, `${h.v}°`, x, 288, `700 14px ${f.num}`, s.ink.sky); });
  const vs = UI.hours.map((h) => h.v), lo = Math.min(...vs), hi = Math.max(...vs);
  s.hourLine(c, UI.hours.map((h, i) => [HOUR_X[i], 306 - ((h.v - lo) / (hi - lo || 1)) * 10] as P));
  s.chip(c, 270, 314, 80, 15); he(c, UI.sunset, 343, 325, `700 10px ${f.label}`, s.ink.sky);
  // scene labels
  s.seaLine(c, 196, 370, SEA_Y + 0.5);
  he(c, UI.sea, 362, SEA_Y - 5, `600 12px ${f.label}`, s.ink.landMuted ?? s.ink.skyMuted);
  he(c, UI.height, DOT[0] + 26, DOT[1] + 28, `600 16px ${f.label}`, s.ink.land ?? s.ink.sky, "center");
  // sheet
  s.sheet(c, SHEET_TOP);
  s.accent(c, 354, SHEET_TOP + 20, 64);
  he(c, UI.wearTitle, 344, SHEET_TOP + 36, `400 14px ${f.label}`, s.ink.sheetMuted);
  he(c, UI.wear[0], 344, SHEET_TOP + 58, f.body, s.ink.sheet); he(c, UI.wear[1], 344, SHEET_TOP + 78, f.body, s.ink.sheet);
  he(c, UI.weekTitle, 355, SHEET_TOP + 118, `400 14px ${f.label}`, s.ink.sheetMuted);
  UI.week.forEach((d, i) => {
    const y = SHEET_TOP + 150 + i * 46;
    he(c, d.d, 355, y, `700 15px ${f.label}`, s.ink.sheet); he(c, d.n, 355, y + 15, `400 11px ${f.label}`, s.ink.sheetMuted);
    s.icon(c, d.ic, 262, y - 3, true);
    ltr(c, `${d.hi}°`, 214, y + 2, `700 15px ${f.num}`, s.ink.sheet); ltr(c, `${d.lo}°`, 62, y + 2, `400 15px ${f.num}`, s.ink.sheetMuted);
    s.bar(c, 84, y - 5, 108, d.lo, d.hi);
    s.chevron(c, 25, y - 4);
    if (i === 0) s.rule(c, 16, FW - 16, y + 24);
  });
  void FH;
};
