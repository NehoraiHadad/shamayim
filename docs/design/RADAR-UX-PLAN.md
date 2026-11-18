# Radar page UX — merged plan (2026-11-18)

**Status: steps 1–12 done** (see TASKS.md, "Rain map UX"). Step 13 waits for a rainy day. Changed on the way:
ring labels sit at the rings' eastern point (the south point hit Jerusalem's label); the off-screen chip shows up to
265 km (what the nowcast grid covers) and slides below the place's row when it lands on the ring labels.

Merges `radar-ux-fable.md` (design lane, Fable) and `radar-ux-tech.md` (engineering lane). Brief:
`docs/briefs/radar-ux.md`. Where they disagree, the decision here is final. Exact values this file does not repeat
(copy table, colours, sizes) come from the Fable review; file layout, data changes and tests come from the tech review.

## Goal

Everyone opens the page with one question: **"will it rain on me soon, and when?"** The page becomes a **verdict with
evidence**: words answer at the top, the map proves it. Today it is a map with a caption and unexplained furniture.

## Decisions on disagreements

| Topic | Fable | Tech | Decision |
|---|---|---|---|
| Nowcast frames on the rail (future) | Reject: a guess drawn like a measurement | Feasible to +60 min as one shifted image | **Not now.** The future lives in the headline's "כ־", the basis line and the arrow. Revisit only after rainy-day checks show the motion is good (owner's call). |
| ⓘ "how to read" | Reject | Neutral | **Cut.** |
| Ring labels | Both 25 and 50 km | Only 50 km (25 km ring is ~24 px at the opening zoom) | **50 km only** at opening zoom; `25 ק״מ` appears after the one zoom step. |
| Labels drawn how | — | DOM markers, not symbol layers (no glyph/RTL-plugin risk) | **DOM markers**, `dir="rtl"`, numbers in `<bdi>`. |
| Playback timing | 400 ms/frame, 1.2 s hold; open plays once; play button loops ≤ 3 | 450 ms, 1.5 s hold, loop 3 | **Fable's timing and behaviour**, implemented with tech's `setTimeout` chain + pure `playbackPlan.ts`, pause when hidden. |
| Reduced motion | No autoplay, play runs once at 800 ms/frame, prev/next buttons removed | No autoplay, 1.2 s step | **Fable** (800 ms, one control set). |
| Rain colours | Two ladders with exact values | Wash as `{light, dark}`, ink in protocol URL, contrast test | **Fable's values** through **tech's mechanism**; test thresholds from Fable's acceptance criteria. |
| Arrow | Static, length 24–64 px, only in "approaching"/"near, not coming", ≥ 4 km/h | GeoJSON line layers, only on the latest frame | **Both conditions**; length clamped in px (24–64). |
| Headline | Split sentence into headline + detail + basis | `rainHeadline` beside `rainSentence` | **One pure `rainVerdict()` → `{headline, detail, basis}`** for all 14 states; `rainSentence` kept only as the source of shared helpers. |
| Off-screen pointer | P2, ≤ 300 km | Needed; grid knows ±265 km | **P2**, shown ≤ 265 km (what the grid actually covers). |
| Data age line | Cut; clock readout + words when stale | Cut; one stale line | **Cut.** |

## Findings that change the work (from both lanes)

1. **Stale outlook (tech).** The outlook is aged once at fetch; offline it is kept forever, so "גשם בעוד כ־25 דקות"
   and the entry row can stay for an hour. Must carry the frame time and expire after 45 min. **Fix first.**
2. **Dark-sheet radar is invisible (both).** Heavy rain on the dark sea: 1.05:1. Light rain on the light sea: 1.54:1,
   in the sea's own hue.
3. **Files at their limit (tech).** `mapRuntime.ts` 136, `OverheadPage.tsx` 129, `OverheadPage.module.css` 118:
   split before adding.
4. **Today is dry (both).** No rainy state can be seen. A `?rain=` dev fixture that feeds the real `rainOutlook` is a
   prerequisite for every visual step.
5. **Title change breaks QA commands** that open the page by clicking "מבט מלמעלה" in `scripts/shot.mjs`.

## The page, top to bottom (summary — full spec in the Fable review §1–4)

1. Header 48 px: eyebrow `מפת גשם ועננים` (13 px muted), ✕ 44 px.
2. **Headline** (h2, labels the dialog, focus lands here on open): serif 28 px, e.g. `גשם בעוד כ־25 דקות`,
   `יורד עכשיו גשם`, `גשם קרוב, אבל לא בדרך אליך`, `לא נראה גשם בדרך אליך`.
3. Detail 15 px: `מגיע ממערב, בסביבות 15:40, ויימשך כ־40 דקות.`
4. Basis line 13 px muted, only when a time is predicted: `הערכה לפי תנועת הגשם בחצי השעה האחרונה`.
5. Map (≥ 240 px): place disc 10 px + 3 px ring + place name; rings with labels; one motion arrow; edge pill (P2).
6. Time: `14:40 · לפני 20 דק׳` (clock first, relative rounded); rail with `לפני שעתיים` / `עכשיו` ends, 24 px thumb;
   ▶/❚❚ 44 px.
7. Legend 13 px ink: `עננים · גשם קל · בינוני · חזק` with 14 px swatches painted over cloud.
8. Problem line only when something failed. 9. Attribution unchanged.

Entry row on the main sheet: the headline only (serif 18 px) + `למפת הגשם ‹`. Quiet link: `מפת גשם ועננים`.

## Steps (each ships alone; every step passes `npx tsc -b`, `npx vitest run`, `npm run -s lint`, `npx vite build`)

**Phase A — foundations (no visible change except where noted)**

1. **Splits.** `mapRuntime.ts` → + `mapPaper.ts`; `OverheadPage.tsx` → + `useSwipeClose.ts`, pure
   `overheadStatus.ts` (+test); new `geo.ts` (`destination`, used by `ring()`) (+test). Stills before/after identical.
2. **Outlook truth.** `rainOutlook` gains `at` (frame ms) and `approach: {km, bearing} | null`; `outlookNow()` ages
   it at render and returns null when > 45 min; App's `rainy` and the entry row use the aged outlook; the outlook is
   passed to the page. Tests for ageing, expiry and `approach`.
3. **`?rain=` fixture** (DEV only, dynamic import). `data/overhead/syntheticRain.ts`: `parseRain`, `syntheticGrids`
   (feeds the real `rainOutlook`), `syntheticIndex`, `paintTile` (Universal Blue pixels through the real recolour).
   Presets `arrive`, `here`, `pass`, `far`, `still`, `none`. Tests; one still per preset → `docs/design/qa/`.

**Phase B — P0: the page answers the question**

4. **Verdict + rename.** Pure `rainVerdict(outlook, status, clockIn, forecastRainAt)` → `{headline, detail, basis}`,
   one vitest case per row of the Fable copy table (14 states incl. loading, stale, radar failed, offline). Headline
   is the h2; focus on open; headline + detail in one polite atomic live region. Eyebrow/link/entry copy renamed;
   update QA click text in TASKS.md.
5. **Time.** `clockAt(ms, tz)` and relative rounding in `timing.ts` (vitest: 3, 7, 22, 58, 76, 93, 118 min →
   `עכשיו`, `לפני 5 דק׳`, `לפני 20 דק׳`, `לפני שעה`, `לפני שעה ורבע`, `לפני שעה וחצי`, `לפני שעתיים`). Rail end
   labels, 24 px thumb, played part in accent, Home/End keys, `aria-valuetext="14:40, לפני 20 דקות"`. Ages line deleted.
6. **Playback.** `playbackPlan.ts` (+test) and a `setTimeout` `usePlayback`: open = one pass at 400 ms/frame,
   1.2 s hold, rest on newest; ▶ loops ≤ 3 then stops; any rail touch pauses; pause when hidden. Reduced motion: no
   autoplay, ▶ = one pass at 800 ms; prev/next buttons removed.
7. **Marker and labels.** 10 px ink disc + 3 px paper ring, place name above (wins over a colliding town label),
   ring line `#4F6578` / `#9DB0C4`, `50 ק״מ` label (and `25 ק״מ` after zoom). Stills: Shadmot, Jerusalem, Tel Aviv.
8. **Colours and legend (both themes).** `RADAR_WASH` → `{light, dark}` with Fable's ladders; ink in the protocol URL;
   `setTiles` on paper change; dark cloud veil `#8E97AD` @ 0.60 without shadow. Legend: 14 px swatches over cloud,
   clouds entry, 13 px ink text. `radarWash.contrast.test.ts` asserts Fable's thresholds (light: light rain ≥ 2.2 on
   sea, every step ≥ 2.4 on land, neighbours ≥ 1.8 over cloud; dark: heavy ≥ 5 on dark sea, light ≥ 1.7 on dark
   cloud). Stills with `?rain=arrive` in day, `?theme=night`, `?theme=dusk`.

**Phase C — P1**

9. **Motion arrow.** Pure `motionArrow(outlook, place)` (+test, 8 octants, null cases); two line layers (halo +
   stroke) recoloured with the paper; only on the newest frame, ≥ 4 km/h, in "approaching" / "near, not coming".
10. **Screen-reader path.** Hidden map sentence (`במפה: שדמות מחולה במרכז… הגשם הקרוב כ־30 ק״מ צפון־מערבית, נע
    מזרחה.`), canvas label, legend as a list, overlays `aria-hidden`, focus order per Fable §4. Device check
    with VoiceOver/TalkBack listed as not verified until done.

**Phase D — P2**

11. **Off-screen pill.** Pure `edgePointer(from, to, size, inset)` (+test); DOM chip `גשם · כ־230 ק״מ` when no echo in
    view and nearest ≤ 265 km; slides along the edge to avoid labels.
12. **Entry row.** Headline only + `למפת הגשם ‹`.
13. **Rainy-day check** (when it rains): real frames in both themes, Israel coverage, clutter, motion quality; tune
    wash alphas only. Then decide the optional 60-min motion baseline and whether nowcast frames come back.

## Not in scope

Nowcast frames on the rail, ⓘ help, endless loop, a layer toggle, any new dependency.
