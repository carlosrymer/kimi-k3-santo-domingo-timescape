// The DOM + data contract the interaction shell is generated against.
// Human-authored scaffolding so K3's index.html, styles.css and app.js interlock.

import { loadEras, STAGE } from "./lib.mjs";

export const DATA_SHAPE = `
DATA AVAILABLE AT RUNTIME (both inlined as globals before app.js loads):

window.ERAS  — array of 12 era objects, in chronological order, each:
  { id, index (1..12), label, yearStart, yearEnd, anchorYear, isNew (bool),
    confidence ("high"|"moderate"|"low"), confidenceReason,
    summary,
    palette: { colors:[hex...], mood },
    layers: { sky, water, eastBank, westBank, vegetation:[], fauna:[], structures:[],
              humanActivity:[], ambient:[] },
    hotspots: [ { name, detail, confidence } ],
    panels: { landscape, fauna, hydrology, built, people },   // sourced prose per theme
    metrics: { treeCover, builtArea, population },             // normalized 0..100, RELATIVE only
    sources: [ { title, url } ] }

window.SCENES — object keyed by era id → a string of inner SVG markup for that era's scene
  (defs + five <g class="pl pl-sky|pl-far|pl-water|pl-city|pl-fore"> parallax layers).
  Elements carry theme classes (theme-vegetation|fauna|hydrology|built|people),
  hotspot wrappers (<g class="hotspot" data-hotspot="NAME" tabindex="0" role="button">),
  and ambient-motion classes (ambient + amb-drift|amb-bob|amb-rise|amb-flow|amb-blink).

window.META — { place, vantage, metricsNote, confidenceLevels } from the dataset (for footnotes).

The scene SVG is authored for viewBox "0 0 ${STAGE.W} ${STAGE.H}".
`.trim();

export const FEATURE_SPEC = `
THE PRODUCT — "Ozama Timescape", a fixed-vantage landscape time machine. A single framed scene at
the mouth of the Ozama River transforms across 12 eras (1400→2026) as the user moves through time.
Fully static (no backend, no build step, no external libraries or web fonts — vanilla HTML/CSS/JS).

REQUIRED FEATURES (all driven from window.ERAS / window.SCENES):

1. THE SCENE STAGE — a large SVG (viewBox 0 0 ${STAGE.W} ${STAGE.H}) showing the current era's scene.
   Changing era CROSS-FADES between scenes (no hard cut). Subtle PARALLAX: the pl-sky/pl-far/pl-water/
   pl-city/pl-fore layers shift slightly on pointer-move (and scroll) for depth. Ambient elements
   animate gently (see amb-* classes) — ALL ambient + parallax motion must stop under
   @media (prefers-reduced-motion: reduce).

2. TIME SCRUBBER (primary control) — a horizontal timeline 1400→2026 with 12 labeled era ticks that
   SNAPS to the nearest era stop on release. Also drivable by ← / → keys, Prev/Next buttons, and it
   stays in sync with everything else. Show the current year/era prominently.

3. TWO MODES (one toggle): "Guided Tour" and "Free Explore".
   - Guided Tour: advancing (scroll or Next) steps era-by-era with a short narration caption fading in
     for each era (use the era summary). A cinematic first pass.
   - Free Explore: user freely scrubs, toggles layers, opens hotspots and the compare tool.

4. INFO PANELS — the five thematic panels for the current era: Landscape, Fauna, Hydrology, Built,
   People (from era.panels). Plus era title, year range, and one-line summary.

5. CONFIDENCE BADGE (every era) — shows Documented / Partly documented / Reconstructed (map from
   era.confidence high|moderate|low) with era.confidenceReason as the tooltip/subtext. This honesty
   layer is a core requirement — make it visible, not buried.

6. SOURCES DRAWER — lists era.sources (title → url) for the current era; collapsible.

7. THEMATIC LAYER TOGGLES — five toggles (Vegetation, Fauna, Hydrology, Built, People) that fade the
   matching theme-* elements in/out across whatever era is shown (so you can e.g. watch vegetation
   recede era to era). Default all on.

8. HOTSPOTS — clicking/entering a .hotspot in the scene opens a small card with that hotspot's
   name, detail and its own confidence chip (match data-hotspot to era.hotspots[].name).

9. COMPARE-WIPE — let the user pick two eras and drag a vertical divider to wipe between the two
   scenes at the same vantage (David-Rumsey style). Works with keyboard too.

10. CHANGE-STRIP SPARKLINES — three small sparklines across all 12 eras for treeCover (↓),
    builtArea (↑) and population (↑), with the current era's point highlighted. Label them clearly as
    normalized relative estimates (window.META.metricsNote), NOT precise figures.

11. DEEP LINKS — reflect the current era in the URL hash (#era=<id>) and restore it on load.

CRAFT — responsive (on narrow screens the layout stacks and vertical scroll can drive time);
keyboard-navigable; accessible (aria labels, focus states, prefers-reduced-motion honored);
fast (inline SVG/CSS/JS only). Visual design should feel like a polished museum/data-journalism piece:
a warm, cartographic, credible aesthetic — not a default-browser look.
`.trim();

export function inlineData() {
  const d = loadEras();
  return { eras: d.eras, meta: {
    place: d.place, vantage: d.vantage, metricsNote: d.metricsNote,
    confidenceLevels: d.confidenceLevels,
  }};
}
