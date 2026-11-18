# Brief: make "מבט מלמעלה" (rain radar page) understandable for ordinary people — UI + UX

Shamayim is a Hebrew RTL weather PWA (Vite + React 19 + TS, phone-first 375 px). The owner: "the radar should be more
accessible to users — both in design and in understanding". Owner's earlier rule: "not 'rain on radar' — tell people
what will happen".

## Read
- Original brief and decisions: `docs/design/overhead-brief.md`, TASKS.md section "View from above" (~line 408).
- Code: `src/ui/overhead/*` (OverheadPage, OverheadMap, TimeRail, OverheadEntry, placeMap, mapRuntime, weatherLayers,
  weatherViewport, recolor, timing, usePlayback + CSS modules), `src/domain/rainNowcast.ts`, `src/domain/rainSentence.ts`,
  `src/data/overhead/*`, tokens in `src/ui/tokens.css`, app-wide rules in `docs/design/SPEC.md`.
- Current stills: `docs/design/qa/overhead-story.png` (dry day, with sentence), `overhead-v4.png`.
- Data limits: RainViewer free tier = past 2 h only (13 frames, 10 min), zoom ≤ 7, no provider nowcast; our own
  nowcast (rainNowcast.ts) extrapolates motion ≤ 90 min. EUMETSAT cloud mask 15 min, ~20–35 min late.

## Problems one reviewer noted (challenge them, don't just accept)
1. Time only as "לפני 93 דק׳"; rail has no end labels; plays once in 3 s with no play/pause — people miss it's a movie.
2. Rings (25/50 km) unlabeled; place dot 5 px, no name / "you are here".
3. Legend tiny (9 px), light-rain wash close to sea colour; clouds have no legend.
4. "ענן: לפני 98 דק׳ · גשם: לפני 93 דק׳" is developer noise.
5. Sentence and map disconnected: rain "230 km north" is off-map with no pointer; approaching rain shows no direction.
6. Title "מבט מלמעלה" doesn't say rain radar.
Ideas floated: clock time first; play/pause loop; end labels; place label; ring labels; bigger legend + clouds swatch;
stale warning instead of ages; motion arrow on map; off-screen edge pointer to nearest rain; a big headline
("גשם בעוד ~25 דק׳") above the sentence; an ⓘ "how to read"; extending the rail into the future with the nowcast.

## Rules for any plan
Files ≤ ~150 lines, no new dependencies unless justified, Hebrew copy, RTL, contrast ≥ 4.5 on light and dark sheet,
44 px targets, visible focus, reduced-motion path, screen-reader path. Pure logic gets vitest tests (node env).
Do NOT edit source code. Only write your own output file.
