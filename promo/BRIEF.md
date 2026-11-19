# שמיים: סרטון לרשתות (בריף)

Status: draft, waiting on the owner's approval together with the first look still.
Owner's words are marked (owner); my decisions are marked (mine) so each can be vetoed in one line.

## The piece
- Kind: launch/product film, social (owner: "רשתות").
- Medium: drawn-in-code engine, **clean register** (mine, owner: "זורם איתך"): the product's real UI is the star;
  a quiet navy canvas, ONE accent (the app's own gold, `#FFD241`, the colour of the degree mark), type set in
  the app's own faces.
- Shape: 9x16, 1080x1920, 30 fps (mine; social). Text kept out of the top 14 %, bottom 25 %, right 14 %.
- Length: 15-17 s (mine; target 16 s, max 20 s).
- Sound: a score, warm calm lo-fi electronic building to the landing (owner: "זורם איתך" on my lo-fi pick);
  one cue on the landing. No narration. Reads fully with the sound off.
- Characters: none. A thumb (drawn) shows the drag.

## The sentence the film proves
השמיים באפליקציה הם השמיים של המקום שלך, לא תחזית כללית.

## Story in three sentences
1. Same moment, three places: Haifa, Tel Aviv, Jerusalem, each with its own sky over its own real skyline.
2. A thumb drags the day forward and the sun goes down in each place at its own time: first in lower Haifa,
   behind the Carmel, then Jerusalem, last Tel Aviv; then night, the moon, the lights.
3. One phone: the line in Hebrew and the clothesline answer "what to wear"; the last sun lands as the degree
   mark of the end card, "שמיים°", "השמיים שלך", sky.nehoraihadad.com.

Token (motif): the sun. It travels in every band, and the last one becomes the gold ° of the end card.

## Board (one action per row)
| s | action | carries in from the row before |
|---|---|---|
| 0-2 | three skies appear stacked, a shared clock reads the moment | (opening: the thumbnail frame) |
| 2-9 | the thumb drags; the clock runs; each band's sun sinks; a gold time stamps each place as its sun goes | the clock and the three suns |
| 9-12 | night: the moon rises, the lights come on; the bands fold into one phone | the drag |
| 12-16 | the phone's clothesline + sentence; the gold ° lifts off, lands on "שמיים°"; URL held 3 s | the sun as the ° |

## Product footage
Captured from the live site (https://sky.nehoraihadad.com/, the owner's own product) with Playwright at
3x density, by dragging the valley scrubber (no faked clock: a faked clock showed a false "נכון ל־07:52"
stale pill). Every image used is listed with its sha256 in `assets/shots/MANIFEST.md`.
Must re-capture after the sunset-wording fix (separate session) lands, so the film matches the app.

## Fonts
The app's own, from @fontsource (SIL OFL 1.1): Karantina 700 (numbers), Frank Ruhl Libre 500 (lines),
Assistant 600 (labels). Hebrew + Latin subsets in `assets/fonts/`.

## Claims (see facts.json)
Approved: only what the live app shows on the capture date (19.11.2026), quoted with that date.
Banned: "sunset at 15:48" in Haifa (it is the sun going behind the Carmel for lower Haifa; flat sunset 16:37);
any accuracy %, "the most accurate", any comparison with other apps; "download from the store" (it is a web app).
