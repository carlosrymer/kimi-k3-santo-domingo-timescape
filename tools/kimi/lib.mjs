// Shared helpers + the art-direction contract fed to Kimi K3.
// Human-authored (scaffolding + cross-era consistency contract). K3 fills in the art.

import { readFileSync, appendFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..", "..");

export function loadEras() {
  return JSON.parse(readFileSync(join(ROOT, "data", "eras.json"), "utf8"));
}

// The fixed "stage" every era shares so 12 independently-generated scenes line up.
// K3 proposes the look; these coordinates are frozen by the human after the kit call
// so vantage/scale never drift era to era. viewBox is 1600x900.
export const STAGE = {
  W: 1600,
  H: 900,
  skyBottom: 300, // sky band 0..300
  eastBankY: 300, // far (east) bank sits on the horizon ~300..360
  waterTop: 360, // river surface 360..640
  waterBottom: 640,
  // West-bank landmass (the primary subject) rises on the right; the SE tip — where
  // the Fortaleza Ozama sits from Era 3 on — is anchored here so the fort never moves.
  seTipX: 1180, // x of the SE point of the west bank
  cityBaseY: 470, // waterline where the west-bank city meets the river
  foregroundY: 720, // near (viewer-side) shore foreground 720..900
};

// Conventions the app relies on. K3 must honor these class/data hooks.
export const CONVENTIONS = `
SVG OUTPUT CONVENTIONS (the interaction shell depends on these — follow exactly):
- The whole scene is authored for viewBox "0 0 ${STAGE.W} ${STAGE.H}". Do NOT emit the
  outer <svg> tag; return only its inner markup (defs + layer groups).
- Group the scene into these five parallax layers, back-to-front, each a <g> with the
  given class (the app applies parallax + cross-fade to these):
    <g class="pl pl-sky"> ... </g>        (sky/atmosphere, y 0..${STAGE.waterTop})
    <g class="pl pl-far"> ... </g>        (far/east bank on the horizon ~y ${STAGE.eastBankY})
    <g class="pl pl-water"> ... </g>      (river surface y ${STAGE.waterTop}..${STAGE.waterBottom})
    <g class="pl pl-city"> ... </g>       (near/west bank + the SE-tip city, primary subject)
    <g class="pl pl-fore"> ... </g>       (foreground near-shore, y ${STAGE.foregroundY}..${STAGE.H})
- THEMATIC LAYER TOGGLES: tag every element (or wrapping <g>) that belongs to a theme
  with one of these classes so the app can fade a theme in/out across eras:
    theme-vegetation | theme-fauna | theme-hydrology | theme-built | theme-people
  (Sky, water base, and land base need no theme class — they always show.)
- HOTSPOTS: for each hotspot named in the era data, wrap its on-scene marker in a
  <g class="hotspot" data-hotspot="EXACT hotspot name" tabindex="0" role="button"> ... </g>
  positioned over the relevant object. Keep it a small, clearly-clickable focal element.
- AMBIENT MOTION: elements that should gently animate (drifting boat, wading bird,
  rising smoke, flowing water, blinking beacon) get class "ambient" plus a specific
  class like "amb-drift", "amb-bob", "amb-rise", "amb-flow", or "amb-blink". The CSS/JS
  owns the actual animation and disables it under prefers-reduced-motion — you only tag.
- The FIXED STAGE must not drift: keep the horizon at y≈${STAGE.waterTop}, the west-bank
  SE tip near x≈${STAGE.seTipX}, and the waterline near y≈${STAGE.cityBaseY} in every era.
- Style: flat, stylized 2.5D vector (think a refined infographic / David Rumsey-meets-
  Monument-Valley), NOT photorealism. Layered flat shapes, soft gradients allowed in defs,
  gentle depth. Use the era's palette. Self-contained SVG only: no external images, no
  scripts, no <foreignObject>, no web fonts.
`.trim();

export const SYSTEM = `You are Kimi K3, generating production-quality, hand-authored SVG and
front-end code for "Ozama Timescape" — a fixed-vantage "landscape time machine" showing how the
mouth of the Ozama River in Santo Domingo transformed across 600 years. You are the sole author of
the visuals and interaction code; a human handles scaffolding, historical curation, and integration.
Favor clean, correct, self-contained code over commentary. When asked for code, return ONLY the code
in a single fenced block unless told otherwise.`;

const LOG = join(ROOT, "tools", "kimi", "ITERATION_LOG.md");
export function logHeaderOnce() {
  if (!existsSync(LOG)) {
    writeFileSync(
      LOG,
      `# Kimi K3 Iteration Log

Honest, per-component record of the Kimi K3 trial: what K3 was asked, what it produced, and what a
human had to fix. Raw request/response payloads are saved under \`tools/kimi/outputs/\`.

Model: \`kimi-k3\` (Moonshot AI) via \`https://api.moonshot.ai/v1/chat/completions\`.

---
`
    );
  }
}
export function log(md) {
  logHeaderOnce();
  appendFileSync(LOG, "\n" + md.trim() + "\n");
}
