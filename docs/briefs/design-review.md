# Design brief: full UI/UX + motion review of Shamayim

You are a senior product designer and motion designer. This is a review and plan task only: write the plan file named in your prompt and do not edit source code.

## Product
Shamayim (שמיים) is a Hebrew RTL weather PWA for one place, Shadmot Mehola in the Jordan Valley, 175 m below sea level. It is mobile-first, so design for a 375×812 viewport.
- Its job is to tell a valley resident, in seconds, what the weather will be and what to do about it.
- The owner's bar: it should be impressive and attractive enough that people choose it over other weather apps, and accurate.
- The owner's latest feedback: "every screen needs UI and UX polish. For example, I don't understand why sunrise/sunset takes up so much space."

## Current state
- Screenshots (375 px, 2× scale): `docs/design/current/*.jpg`.
  1. night;
  2. noon, cloudy;
  3. the sheet with the week list;
  4. dusk;
  5. a day expanded;
  6. the forced rain theme.
- Code:
  - `src/App.tsx`, `src/index.css`, `src/ui/**` (CSS modules), `src/theme/skyThemes.ts`, `src/theme/pickTheme.ts`;
  - text engine: `src/text/compose.ts`, `src/text/wear.ts`;
  - data shape: `src/domain/types.ts`.
- Layout today, top to bottom:
  - sky area: place name, refresh pill, depth chip; huge Karantina temperature with condition and ↑max ↓min; Hebrew summary sentence; 24 h hourly strip with a temperature curve; a big dashed sun arc with sunrise/sunset labels; an SVG ridge silhouette;
  - a paper "sheet": what-to-wear card; 7-day list with range bars (tap expands hourly strip, tiles and model-confidence meter); attribution.
- There are 8 sky themes (dawn, clearDay, heat, cloudy, rain, dust, dusk, night) with animated stars, clouds, rain and dust layers. Fonts: Karantina (digits), Frank Ruhl Libre (serif), Assistant (sans).
- Data available:
  - current temperature, feels-like, code, cloud cover, wind and gusts;
  - hourly temperature, rain probability and mm, code, cloud cover, wind;
  - daily max/min, rain probability and sum, gusts, sunrise/sunset, confidence and model spread;
  - air: PM10, dust and UV hourly for 2 days.
  - There is no humidity or pressure yet; they can be added if you justify them.

## What I need
A concrete, buildable plan. Be opinionated and specific: give values (px, ms, easing, hex), not adjectives.
1. **Critique.** List the 10–15 most important problems in hierarchy, layout, density, consistency, RTL, copy, touch targets and accessibility, ranked by impact. Reference the screenshots.
2. **Information architecture.** What belongs above the fold at 812 px, and in what order? What gets demoted, merged or removed? Answer the sun-arc question directly. Give a revised layout as an ASCII wireframe of the first screen and of the sheet.
3. **Signature moment.** Choose ONE memorable, subject-specific visual idea; do not scatter effects. Describe it precisely.
4. **Motion system.**
   - The page-load sequence (one orchestrated sequence), theme transitions, the expand/collapse of a day, hourly-strip interactions, pull-to-refresh or refresh feedback, and reduced-motion fallbacks.
   - Give durations, easings and what animates.
   - Prefer CSS and Web Animations; no heavy libraries unless justified.
5. **Visual system tweaks.** A type scale and spacing scale; how the sheet, cards, tiles and dividers should differ by hierarchy; and colour fixes per theme where needed.
6. **Micro-copy fixes.** Hebrew wording for labels, empty and error states, and the update pill.
7. **A prioritised build list.** Small and independent work items, each with the files it touches, so two engineers can work in parallel without touching the same files.

Avoid generic AI-design tells:
- cream background with a terracotta accent;
- identical rounded cards with the same shadow everywhere;
- ALL-CAPS eyebrows;
- a separator dot (·) used everywhere;
- fade-and-slide-up on every section.

Keep the existing "valley sky + ridge + paper sheet" identity unless you argue for changing it.
