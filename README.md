# Santo Domingo Timescape

**Try it live: [https://carlosrymer.github.io/kimi-k3-santo-domingo-timescape/](https://carlosrymer.github.io/kimi-k3-santo-domingo-timescape/)**

A **landscape time machine** for **Santo Domingo**, seen from the mouth of the Ozama River. From one fixed
vantage, watch the same framed scene transform across **12 major-change eras — Taíno estuary (1400) to
modern megacity (2026)** — as you drag a snapping time-scrubber. Side panels, a per-frame confidence
badge, sourced hotspots, a compare-wipe, and change-strip sparklines make 600 years of landscape
change legible in a single view.

## What this showcases

**Technology:** Kimi K3 (Moonshot AI) — a 2.8-trillion-parameter open-weight MoE model (released
2026-07-16) that **topped Arena.AI's Frontend Code Arena**, winning 6 of 7 UI domains.

The claim under test: *can Kimi K3 hand-author a rich, interactive, visually convincing frontend — 12
layered procedural scene illustrations **and** a data-driven time-travel UI — from a historical brief,
with minimal human correction?* A landscape time machine sits squarely in K3's strongest lane
(creative + data/analytics UI), so it's a fair, demanding test rather than a flattering toy.

**The honest verdict: K3 delivered on the claim.** Every pixel of the UI is K3's — the 12 scene SVGs,
the entire `index.html` + `styles.css` shell, and the full 844-line `app.js` interaction engine. A
human wrote the API client, the fixed-stage art-direction contract, the curated history, the data
bundling and the Playwright verification — **but wrote no UI code.**

What genuinely surprised us, building with it:

- **The illustration quality is real.** Given only an era's text brief + a palette + a shared stage
  contract, K3 composed detailed, characterful flat-vector scenes — a Taíno estuary with canoes,
  manatee and herons; a walled fortress city with the Fortaleza Ozama correctly anchored on the SE
  tip; a fortress flying four successive colonial flags for the "changing rulers" era. Passing Era 1
  back as a **style-lock reference** kept all 12 scenes on the same camera, scale and rendering style.
- **The interaction code was essentially correct on the first pass.** Cross-fade + parallax (guarded
  for `prefers-reduced-motion` in JS, not just CSS), a scrubber that snaps to the nearest era anchor,
  a compare-wipe with a keyboard-accessible draggable divider, sparklines with accessible tooltips,
  deep-link hashes — our golden-path harness passed **10/10 checks with 0 console errors** with no
  code fixes. The only human edits to K3's output were a favicon (to silence a 404) and cosmetic.
- **The gotcha is `reasoning_effort`, and the PLAN's assumption was wrong.** K3 is a reasoning model.
  At the default/high effort it burned **30k–90k reasoning tokens** on a single scene and either
  truncated or ran ~20 minutes; the win was **`reasoning_effort: "medium"` + a generous `max_tokens`**.
  The API also locks `temperature` to 1 and, being a slow reasoner, must be **streamed** or a client
  timeout kills the request. Full measurements and every prompt are in
  [`tools/kimi/ITERATION_LOG.md`](tools/kimi/ITERATION_LOG.md).

Where it needed a hand: cross-era visual consistency required the style-lock scaffolding (not a
model-native ability), a few structure-heavy eras reasoned so long they needed a regeneration pass,
and — by design — the human owned all historical accuracy and curation. The verdict stands: **for
generative frontend work, K3 lives up to its Frontend Code Arena billing.**

## The use case

Santo Domingo is the oldest continuously-inhabited European city in the Americas, and the mouth of the
Ozama has been the hinge of its story — Taíno villages, Ovando's grid, Drake's sack, shifting empires,
Trujillo's monuments, the 1965 battle at the Duarte Bridge, the Faro a Colón, today's red teleférico
over riverbank barrios and an Ocean Cleanup Interceptor working a plastic-choked river. Most of that
change is invisible on a modern map. A **fixed-vantage time machine** makes it legible frame-to-frame,
and — crucially — is honest about what's documented versus reconstructed (a per-era confidence badge +
sources on every claim). That combination of *creative illustration* and *credibility-first data
presentation* is exactly what K3's benchmark win claims to be good at.

## Docs

- [Architecture](ARCHITECTURE.md) — system design, components, data flow, deployment
- [PRD](PRD.md) — problem statement, scope, success criteria (incl. the K3 trial result)
- [Kimi K3 iteration log](tools/kimi/ITERATION_LOG.md) — per-component prompts, output sizes, human fixes

## Running locally

```bash
# It is a fully static site — any static server works:
python3 -m http.server 8099
# then open http://localhost:8099

# Regenerating the K3-authored assets (needs MOONSHOT_API_KEY) is optional:
npm install                       # dev tooling only (Playwright, for QA)
node tools/kimi/01-scenes.mjs     # regenerate the 12 scenes
node tools/kimi/02-shell.mjs      # regenerate index.html + styles.css
node tools/kimi/03-app.mjs        # regenerate app.js
node tools/build-data.mjs         # bundle eras.json + scenes into data/*.js
node tools/verify.mjs             # Playwright golden-path check
```

## Stack

Vanilla HTML + CSS + JavaScript (no framework, no runtime dependencies). Inline SVG scenes. Data in a
single hand-curated `data/eras.json`. Generation tooling is Node (ESM) talking to the Moonshot API;
QA uses Playwright. The shipped site itself has **zero** third-party runtime code.

## Deployed via

GitHub Pages, serving the repo root of `main` directly (the site is static and lives at the root —
`index.html`, `styles.css`, `app.js`, `data/`, `scenes/`). No AWS, no backend, no build step.

**To publish:** repo **Settings → Pages → Build and deployment → Source: _Deploy from a branch_ →
Branch: `main` / `/root` → Save.** The live URL is then
`https://carlosrymer.github.io/kimi-k3-santo-domingo-timescape/`. A GitHub Actions workflow that does
the same thing is included at [`tools/deploy.yml.staged`](tools/deploy.yml.staged) — move it to
`.github/workflows/deploy.yml` if you'd rather deploy via Actions (that requires a token with the
`workflow` scope).

---
Part of the [AI Frontier Showcase](https://github.com/carlosrymer/ai-frontier-showcase-builds) —
a running log of real-world builds trialing frontier AI models and frameworks as they ship.
