# Brief: life on calm days (v5-B) — design note request

Shamayim (Hebrew RTL weather PWA, Shadmot Mehola, Jordan Valley, −175 m) now has a live atmosphere:
`docs/design/ATMOSPHERE.md` (read it first; it is the contract) and code in `src/atmo/`
(`mapAir` pure mapping → `AirState`; WebGL1 renderer with a ⅓-res air shader and stateless particles in
one static buffer; `AirMotion` easing; loop stops on calm days). Today a calm day is a still picture.

The user wants calm days to feel alive too: "גם ביום רגוע אפשר לעשות דברים מעניינים כמו ציפורים".
Candidates (yours to cut, change or add to):
- Bird flocks crossing the sky now and then. The valley is a major migration flyway: cranes and storks
  (autumn Sep–Nov, spring Feb–Apr, V/loose skeins, high, slow, soaring), swifts in summer evenings
  (fast, low, darting), a single raptor circling on thermals around midday in heat.
- Morning mist lying on the valley floor when humidity is high, wind low, just after sunrise.
- Night: rare shooting star; gentle star twinkle.
- A lone cloud drifting slowly on a clear day.

## What I need from you (design, not code)
Write `docs/design/CALM-LIFE.md`, ≤ 120 lines, that an implementer can build from:
1. Which elements make the cut and why (each must come from data: date, hour, sun elevation, wind,
   humidity, cloud, temperature — never decoration). At most one "event" on screen at a time.
2. For each: trigger rule (exact numbers), frequency (e.g. one pass every 40–90 s), duration, path,
   size in CSS px at 375 px width, count, speed, colour per theme/night, how it is drawn (WebGL
   particles vs SVG vs CSS — weigh battery: the loop currently stops on calm days; propose how the
   loop wakes for an event and sleeps after), reduced-motion behaviour (likely: nothing moves).
3. How birds are drawn so they read as birds at 6–14 px (silhouette, wingbeat cycle, soaring glide),
   and how a flock is shaped (V for cranes, loose for storks, scatter for swifts).
4. New `AirInput` fields needed (e.g. humidity, month) and where they come from (Open-Meteo has
   `relative_humidity_2m`).
5. Test cases for the pure part (which inputs give which event schedule).
Keep it compatible with: max two moving systems (a calm day has zero, so one event is fine), text-band
legibility (events avoid or dim over the text band), and the priority list in ATMOSPHERE.md.
