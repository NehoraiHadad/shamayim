# Radar page UX review — Fable (design advisor), 2026-11-18

Scope: felt experience and visual design of the page now called "מבט מלמעלה". Read: `docs/briefs/radar-ux.md`,
`overhead-brief.md`, `src/ui/overhead/*`, `rainNowcast.ts`, `rainSentence.ts`, tokens, stills `overhead-story.png` and
`overhead-v4.png`. All contrast figures below are computed (WCAG relative luminance, washes composited over their
backdrop). No fresh stills: the forecast API rate-limits this sandbox, so the sheet never rendered and the page could
not be opened. Dark-map statements therefore come from the code and the arithmetic, not from a picture.

## 0. The one question

A farmer in the Jordan Valley, a parent before a walk, an older user: all three open this page with **"will it rain on
me soon, and when?"** Nobody comes to read a radar. So the page is a **verdict with evidence**: words answer, the map
proves. Today the page is built the other way round (a map with a caption), and the map's furniture (rings, dot, rail,
ages) is unexplained. My original brief caused part of this: "always show the data age" produced the developer line,
and "plays once in 3 s" is too fast to register. Both are corrected here.

## 1. Hierarchy, top to bottom (375 x 812)

| # | Element | Spec |
|---|---|---|
| 1 | Header row, 48 px | Eyebrow `מפת גשם ועננים` 13 px/600 sans, `--sheet-muted`, at the start. Close `✕` 44 x 44 at the end. |
| 2 | **Headline** (the `h2`, first thing the eye hits) | Serif 500, 28 px/1.2, `--sheet-ink`, max 2 lines, gutter 20 px. |
| 3 | Detail sentence | Sans 400, 15 px/1.45, `--sheet-ink`, max 2 lines, 4 px under the headline. |
| 4 | Basis line (only when the headline predicts a time) | 13 px, `--sheet-muted`: `הערכה לפי תנועת הגשם בחצי השעה האחרונה`. 12 px gap to the map. |
| 5 | Map (second thing the eye hits: the labelled place) | Grid row `minmax(240px, 1fr)`; about 400 px tall at 812. |
| 6 | Time block (third) | Readout 28 px, rail 44 px, end labels 18 px. |
| 7 | Legend | One row, 13 px, `--sheet-ink`, 14 px swatches, 8 px above and below. |
| 8 | Problem line | 13 px, only when something failed; no reserved empty row except while loading. |
| 9 | Attribution | Unchanged. |

Rename: the title `מבט מלמעלה` becomes the eyebrow `מפת גשם ועננים` everywhere (page, the quiet link at the sheet's
end, and the entry row's second line, which becomes `למפת הגשם ‹`). The poetic name tells an older user nothing about
what is behind the link. The dialog is labelled by the headline, not the eyebrow.

### Copy for every state

`X` = `about()` from `rainSentence.ts` ("כמה דקות", "כ־25 דקות", "כשעה", "כשעה וחצי"). `HH:MM` = `clockIn`.
"Kind" = גשם קל / גשם / גשם חזק. Headline never carries a clock time and a duration together: one number per line.

| State (condition) | Headline | Detail | Basis line |
|---|---|---|---|
| Raining now, end known (`now>0`, `lastsFor` number) | `יורד עכשיו גשם קל` / `יורד עכשיו גשם` / `יורד עכשיו גשם חזק` | `צפוי להיפסק בעוד X, בסביבות HH:MM.` | shown |
| Raining now, long (`lastsFor='longer'`) | same | `נראה שיימשך עוד יותר משעה וחצי.` | shown |
| Raining now, motion unknown | same | `לא ברור עדיין מתי ייפסק.` | hidden |
| Approaching (`arrivesIn` set) | `גשם בעוד X` (band 3: `גשם חזק בעוד X`) | `מגיע ממערב, בסביבות HH:MM, ויימשך X.` / `…, ונראה שיימשך זמן רב.` | shown |
| Near, not coming (nearest <= 80 km, moving) | `גשם קרוב, אבל לא בדרך אליך` | `כ־30 ק״מ צפונית לך, נע מזרחה. לא צפוי להגיע בשעה וחצי הקרובה.` | shown |
| Near, standing (`kmh < 4`) | `גשם קרוב, כמעט לא זז` | `כ־30 ק״מ צפונית לך.` | shown |
| Near, motion unknown | `גשם כ־30 ק״מ ממך` | `צפונית לך. לא ברור עדיין לאן הוא נע.` | hidden |
| Dry, model expects rain within 3 h | `אין גשם כרגע` | `התחזית צופה גשם בסביבות HH:MM.` | hidden |
| Dry, far rain | `לא נראה גשם בדרך אליך` | `הגשם הקרוב כ־230 ק״מ צפונית לך.` | hidden |
| Dry, nothing in range | `לא נראה גשם בדרך אליך` | `אין גשם במכ״ם בכל הסביבה.` | hidden |
| Loading (outlook null, online, < 8 s) | `בודקים איפה הגשם…` in `--sheet-muted` | empty | hidden |
| Stale (newest radar frame > 45 min old) | `אין תמונת מכ״ם עדכנית` | `התמונה האחרונה מ־13:20, לפני שעה וחצי. אי אפשר לדעת ממנה מה קורה עכשיו.` | hidden |
| Radar failed | `אין כרגע תמונת מכ״ם` | `העננים מוצגים כרגיל.` plus, if the model has it, ` לפי התחזית: גשם בסביבות HH:MM.` | hidden |
| Offline | `אין חיבור לרשת` | `אי אפשר להציג את מפת הגשם בלי חיבור. התחזית בדף הראשי נשמרה מהעדכון האחרון.` | hidden |

Why "לא נראה גשם בדרך אליך" and not "יבש": the radar misses light rain in the Jordan Valley. "נראה" is plain Hebrew and
still honest. The rule "never 'אין גשם' alone" stays; `אין גשם כרגע` is allowed only next to the model's time.

Other strings:

- Problem line, satellite failed: `תמונת העננים לא נטענה. הגשם מוצג כרגיל.` (the clouds swatch leaves the legend).
- Problem line, basemap failed: `המפה לא נטענה. הגשם והעננים מוצגים בלי קווי חוף.`
- Problem line, loading tiles: `טוען תמונות…`
- Cloud layer stale but radar fresh: `תמונת העננים מ־13:45 (ישנה).` in the warning colour.
- Legend with echoes: `עננים` · `גשם קל` · `בינוני` · `חזק`. Legend with none in view: `עננים` · `אין גשם במכ״ם באזור המפה`.
- Rail ends: `לפני שעתיים` (start, right) and `עכשיו` (end, left).
- Reduced motion: same strings; see section 3. Dark sheet: same strings; colours in section 2.

## 2. Map

**Marker.** Today 5 px yellow with a faint ring: invisible to an older eye and lost on white cloud. New: 10 px disc in
`--sheet-ink` with a 3 px ring in `--sheet` (16 px overall) and a 1 px outer line at 25 % ink. Dark sheet: the same
tokens invert by themselves. No pulse.

**Place label.** The place's name, not "אתה כאן" (gendered, and the name is what people recognise): 14 px/600, map
text colour, 2 px halo in the land colour, centred 10 px above the disc, always drawn (it wins collisions; a town
label that collides is dropped; if the place is one of the eight towns, its town label is removed).

**Rings.** Keep 25 and 50 km: they are the only scale on the map and they tie to the sentence's "כ־30 ק״מ". Line 1.25 px,
dash 3/4, opacity 1. Labels `25 ק״מ` and `50 ק״מ`, 11 px/600, at the southern point of each ring (rain arrives from
the west and north-west, the name sits to the north, so south is the free side), halo 1.5 px.

| Map ink | Light sheets | Contrast | Dark sheets | Contrast |
|---|---|---|---|---|
| Land | `#E2DDD2` | | `--sheet` (`#12162B` night, `#211A33` dusk) | |
| Sea | `#C8D8E2` | | `#334760` | |
| Ring line, coast | `#4F6578` (was `#718A9C`, 2.67 on land: too weak) | 4.48 land, 4.15 sea | `#9DB0C4` | 8.03 land, 4.27 sea |
| Labels (towns, place, rings) | `#28374A` | 8.93 land, 8.28 sea, 11.68 cloud | `#F0F3F8` | 16.06 land, 8.54 sea, 5.37 cloud |
| Cloud | `#FCFBF6` at 0.95 + shadow copy | 1.31 land, 1.41 sea (the shadow carries it) | `#8E97AD` at 0.60, no shadow → `#5C6379` | 2.99 land, 2.10 sea |

**Rain colours.** Two real faults today. Light theme: light rain (`105,132,156` at 0.48) is 1.54:1 on the sea and
1.76:1 on cloud, and its hue is the sea's hue. Dark theme: the ladder gets darker as rain gets heavier, on a dark
map: heavy rain on dark water computes to **1.05:1**, moderate 1.20:1. Invisible exactly when it matters.
New: two ladders. Light map: heavier = darker. Dark map: heavier = brighter. Hue path is the same in both
(blue → indigo/violet → plum/pink), so the legend reads the same.

| Step | Light map (RGB, alpha) | on land / sea / cloud | Dark map (RGB, alpha) | on land / sea / cloud |
|---|---|---|---|---|
| קל | `#2F7FC4`, 0.78 | 2.40 / 2.25 / 2.90 | `#4A9AD8`, 0.85 | 4.58 / 2.69 / 1.79 |
| בינוני | `#3848A8`, 0.86 | 4.41 / 4.15 / 5.44 | `#B0A4FF`, 0.92 | 7.10 / 3.95 / 2.55 |
| חזק | `#6A0F5E`, 0.95 | 7.71 / 7.18 / 9.88 | `#FFB4E6`, 0.97 | 10.38 / 5.62 / 3.57 |

Adjacent steps differ by 1.87 and 1.82 (light) and 1.43 and 1.40 (dark) in luminance, plus hue, so the ladder
survives colour-blindness. Light rain is the weak point (2.25 on sea); it is acceptable because rain almost always
sits on cloud (2.90) and the hue is far more saturated than the sea. Must be checked on a real rainy frame.

**How the three stay apart.** Sea: flat, pale, with a coast hairline, never moves. Cloud: the lightest thing on a light
map (white with a shadow), a grey veil on a dark map; soft edges; moves. Rain: the only saturated colour on the page;
nothing else on the map may use blue-to-plum. The legend names clouds, so white is no longer a riddle.

**Legend.** Swatches 14 x 14 px, radius 3, 1 px border at 30 % ink, painted as the wash **over the cloud colour**
(what people actually see): light `#5C9ACF`, `#5361B3`, `#711B66`; dark `#4D92CA`, `#A99FF4`, `#FAB2E3`. Clouds
swatch: `#FCFBF6` (dark: `#5C6379`). Text 13 px `--sheet-ink` (12.8:1 or better), not muted. Grey when stale.

**Motion arrow: keep, one arrow.** Shown only in "approaching" and "near, not coming", when speed >= 4 km/h and the
nearest echo is inside the view. Tail at the nearest echo (the outlook's `nearest` bearing and distance), pointing
along `motion.heading`; length = the distance covered in 30 min, clamped to 24–64 px. Stroke 2.5 px in the label
colour with a 2 px halo in the land colour, open chevron head 9 px. No text on it, no animation. It makes the
sentence's "מגיע ממערב" / "נע מזרחה" visible, which is the link between words and map that is missing today.

**Off-screen pointer: keep, small, P2.** Only when no echo is in view and the nearest echo is <= 300 km away. A pill
at the map edge on the bearing from the place, inset 10 px: 28 px high, `--sheet` at 92 %, 1 px border at 20 % ink,
13 px/600 `--sheet-ink`: `גשם · כ־230 ק״מ` with a 10 px chevron pointing outward. Not a button, hidden from screen
readers (the detail sentence says the same). Beyond 300 km: nothing.

**Stale look.** Keep the grey layers (> 45 min), and say it in words (headline row above). Warning colour for the
stale strings: `#8A3B12` on light sheets (6.75–7.08 on every light paper), `#FFB98A` on dark (10.68 night, 9.97 dusk).

## 3. Time

**Readout: clock first, relative second.** `14:40` in serif 500 20 px `--sheet-ink`, then `· לפני 20 דק׳` in 13 px
`--sheet-muted` (5.9:1 or better on every paper). A clock is what an older user checks against the wall; the
relative part is the convenience. Relative text: under 5 min `עכשיו`; 5–54 min `לפני N דק׳` rounded to 5; then
`לפני שעה`, `לפני שעה ורבע`, `לפני שעה וחצי`, `לפני שעתיים`. No "93 דק׳" ever. The line
`ענן: … · גשם: …` is deleted: the readout is the radar's time, and the cloud's age appears only when it is a problem.

**Rail.** Direction stays right-to-left (past on the right, now on the left) like the rest of the page; the end
labels `לפני שעתיים` / `עכשיו` (13 px muted, under the rail ends) remove the doubt. Track 2 px at 65 % muted, ticks
6 px tall every frame, the played part (from the right end to the thumb) in `--sheet-accent`. Thumb 24 px
(was 16), `--sheet-accent` with a 2 px `--sheet` border; hit height stays 44 px; a tap anywhere on the rail jumps.

**Play / pause.** A 44 x 44 round button at the rail's start (the past end), standard `▶` / `❚❚` glyphs, not
mirrored, 1 px border at 25 % ink. On open: wait until tiles are ready, then play once through the 13 frames at
400 ms a frame (5.2 s, was 3 s: at 230 ms nobody sees a movie), hold 1.2 s on the newest and rest there. The resting
state is always the newest frame: it is the truth. Pressing play loops from the oldest, 400 ms a frame, 1.2 s hold
at the end, and stops by itself after 3 loops (battery). Any drag, tap on the rail or arrow key pauses.

**Reduced motion.** No autoplay; opens on the newest frame. The rail and the play button stay (dragging is the
user's own motion). Play then runs once, 800 ms a frame, no loop. The separate previous/next buttons are removed:
one control set for everyone, and the slider already steps with the arrow keys. The page's rise animation stays off.

**The future: not on the rail, not as pictures.** The nowcast is one straight-line shift of the last frame. Drawing
shifted radar frames past "now" would make a guess look like a measurement, cells would neither grow nor die, and
a rail that is half data and half guess needs an explanation that this audience will not read. A rail with a part
the thumb cannot enter is worse. The future is shown in exactly three honest places: the headline's "כ־" and
"בסביבות", the basis line (`הערכה לפי תנועת הגשם בחצי השעה האחרונה`), and the arrow. The rail ends at `עכשיו`.

## 4. Accessibility

- **Narrative.** The dialog is labelled by the headline. On open, focus goes to the headline (`tabindex="-1"`), not
  the close button, so a screen reader starts with: "גשם בעוד כ־25 דקות. מגיע ממערב, בסביבות 15:40, ויימשך כ־40
  דקות." Headline + detail sit in one `aria-live="polite"`, `aria-atomic` region; they change at most every 5 min.
- **Map equivalent.** One visually hidden sentence after the detail, built from the outlook:
  `במפה: שדמות מחולה במרכז, טבעות ב־25 וב־50 ק״מ. הגשם הקרוב כ־30 ק״מ צפון־מערבית, נע מזרחה.` The canvas keeps a
  label: `מפה סביב שדמות מחולה. החיצים מזיזים, פלוס ומינוס מקרבים ומרחיקים.` Marker, arrow, edge pill: `aria-hidden`.
- **Focus order.** Close → (headline, programmatic only) → map → play → time slider → attribution links. Escape, Back
  and swipe-down close; focus returns to the entry (already done).
- **Slider.** `aria-label="זמן התמונה"`, `aria-valuetext="14:40, לפני 20 דקות"` (full word, no abbreviation). Left
  arrow = 10 min later, Right = earlier, Home = oldest, End = newest. Readout `aria-live="off"`; nothing is announced
  during playback. Play button: `aria-label="הפעלת שעתיים אחרונות"` / `"עצירה"`, `aria-pressed`.
- **Legend** is a list of four items with text; swatches `aria-hidden`.
- **Targets.** Close 44, play 44, rail 44 high with a 24 px thumb, attribution links 44 high.
- **Focus ring.** 2 px `--sheet-ink`, offset 2 px (map canvas: inset 4 px). Never colour alone.
- **Text.** Nothing that informs is under 13 px (ring labels 11 px/600 at 8.9:1 are the one exception; attribution is
  legal text). Headline and detail must survive 200 % text zoom at 320 px: the map row gives way down to 240 px,
  then the panel scrolls.
- **Colour.** No state is signalled by colour alone: stale = grey + words; rain strength = lightness + hue + legend.

## 5. What to cut, and what I reject

Cut from the page:
- The line `ענן: לפני 98 דק׳ · גשם: לפני 93 דק׳`. It answers a question only we ask. Replaced by the clock readout
  and by words when the data is old. (This reverses my own "always show the data age".)
- The reduced-motion previous/next buttons (the rail serves everyone).
- The 5 px village dot and the yellow accent on the map.
- `מבט מלמעלה` as the title.
- The always-reserved empty status row (reserve it only while loading, to stop the layout jumping).

Rejected ideas:
- **ⓘ "how to read".** If the page needs a manual, the page failed. Labelled place, labelled rings, a legend that
  names clouds and a headline in words do the work. An ⓘ is one more target that an older user will not press.
- **Extending the rail into the future with nowcast frames.** See section 3: a guess dressed as a measurement.
- **"אתה כאן" on the marker.** The place name is more recognisable and has no gender problem.
- **Endless loop.** A map that never rests cannot be read, drains the battery, and hides which frame is "now".
- **Stale warning *instead of* any time.** The clock stays always; the warning is added on top when needed.
- **Relative time first.** "לפני 93 דק׳" forces arithmetic; a clock does not.

Accepted from the list, with changes: big headline (as the page's main element, not an extra above the sentence:
the sentence is split into headline + detail, not repeated), clock first, play/pause, end labels, place label,
ring labels, bigger legend with clouds, motion arrow (one, static), off-screen pointer (small, last).

Reviewer's points, challenged: (1) right, and the cause is speed as much as the missing button. (2) right. (3) right,
and the worse fault is in the dark theme, which nobody had seen. (4) right. (5) half right: far rain off the map is
consistent with "no rain here"; the real disconnect is direction, which the arrow fixes. (6) right.

## 6. Priorities and acceptance criteria

**P0 — the page answers the question**

1. *Verdict block and rename.* Headline + detail + basis line replace the single sentence; eyebrow, sheet link and
   entry row use the new names. Accept: a pure function returns `{ headline, detail, basis }` for all 14 rows of the
   state table, with a vitest case per row matching the copy above exactly; headline is the `h2` that labels the
   dialog; at 375 px no headline exceeds 2 lines; at 320 px and 200 % zoom nothing is clipped.
2. *Clock readout, end labels, no ages line.* Accept: readout shows `HH:MM · לפני N דק׳` per the rounding rules
   (vitest: 3, 7, 22, 58, 76, 93, 118 min → `עכשיו`, `לפני 5 דק׳`, `לפני 20 דק׳`, `לפני שעה`, `לפני שעה ורבע`,
   `לפני שעה וחצי`, `לפני שעתיים`); the two end labels are visible; the string "ענן:" is gone from the page.
3. *Stale, failed, offline, loading states.* Accept: newest radar > 45 min → stale headline, grey layers, warning
   colour `#8A3B12` / `#FFB98A`; radar fetch failure, satellite failure, basemap failure and offline each show the
   copy in section 1 and never an empty page; loading shows the marker and rings before any weather tile arrives.
4. *Marker, place name, ring labels.* Accept: disc 10 px + 3 px ring; the place name is always visible at the opening
   zoom and after one zoom step, never overlapped by a town label; `25 ק״מ` / `50 ק״מ` readable; ring line `#4F6578`
   (light) / `#9DB0C4` (dark).
5. *Legend and light-map rain colours.* Accept: `RADAR_WASH` is the light ladder in section 2; swatches 14 px
   painted over the cloud colour; legend text 13 px in `--sheet-ink`; clouds swatch present; a contrast test (extend
   `src/theme/contrast.test.ts` or a sibling) asserts light rain >= 2.2:1 on sea, every step >= 2.4:1 on land, and
   adjacent steps >= 1.8:1 over cloud.
6. *Play / pause and slower playback.* Accept: autoplay 400 ms a frame, 1.2 s hold, rests on the newest frame; the
   button toggles; 3 loops then stop; any rail interaction pauses; thumb 24 px; with reduced motion there is no
   autoplay and play runs once at 800 ms a frame.

**P1 — it holds at night and for everyone**

7. *Dark map.* Accept: on `.dark-sheet` the dark ladder and the slate cloud (`#8E97AD` at 0.60, shadow layer at 0)
   are used; the contrast test asserts heavy rain >= 5:1 on dark sea and light rain >= 1.7:1 on dark cloud; a
   headless still with `?theme=night` and with `?theme=dusk` is saved to `docs/design/qa/radar-ux-night.png` /
   `-dusk.png`; switching theme while open repaints rain and cloud, not only the basemap.
8. *Motion arrow.* Accept: appears only in the two states named in section 2 with speed >= 4 km/h and the nearest
   echo in view; direction equals `motion.heading` within 1°; length clamped 24–64 px; pure geometry (bearing and
   distance → screen vector) has vitest cases for the 8 octants.
9. *Screen reader path.* Accept: focus lands on the headline on open; VoiceOver and TalkBack read headline, detail,
   map sentence in that order; slider announces `14:40, לפני 20 דקות`; nothing is announced during playback; tab
   order matches section 4.

**P2 — polish**

10. *Off-screen pill.* Accept: shown only with no echo in view and nearest <= 300 km; sits on the correct edge for
    the 8 octants; never covers the place label or the ring labels (it yields by sliding along the edge).
11. *Rainy-day verification.* Accept: stills on a real rainy day in both themes
    (`docs/design/qa/radar-ux-rain-light.png`, `-dark.png`); light rain over the sea is visibly not sea; the three
    steps can be told apart by a person who was not told the order. Tune alphas only, keep the hues.
12. *Entry row.* Accept: the sheet's entry row shows the headline alone (one line, serif 18 px) with `למפת הגשם ‹`
    under it; the detail lives only on the page.

Not verified by me: any rendering (no stills possible here), a real rainy frame, dark sheet on a device, a phone.
