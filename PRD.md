# PRD — Ozama Timescape

## Problem statement

Six hundred years of dramatic landscape change at the mouth of the Ozama River — the birthplace of
colonial Santo Domingo — are almost entirely invisible on a modern map or photograph. Estuary became
grid city became walled fortress became sprawling megacity with a polluted river; most viewers have no
way to *see* that transformation, or to tell which parts of the deep past are documented versus
reconstructed. Separately, this repo needs a **fair, demanding test of Kimi K3's Frontend Code Arena
claim** — a build that exercises both creative illustration and data-driven UI.

## Target user

The curious public, students, and anyone interested in Santo Domingo / Caribbean history — plus, for
the showcase, readers evaluating whether Kimi K3 can hand-author production-plausible frontend.

## Goals

- Make 600 years of landscape change at one place **legible from a single fixed vantage**.
- Be **credibility-first**: every on-screen claim carries a source and a per-era confidence rating.
- Ship a **fully static, fast, accessible** site (GitHub Pages, no backend).
- Have **Kimi K3 author the entire frontend** (scenes + shell + interaction code) and report honestly
  where it delivered and where it needed a human assist.

## Non-goals

- No photorealism, no 3D/VR, no GIS pan/zoom map (deliberately out of scope — stylized 2.5D vector).
- No backend, accounts, or analytics.
- Not a rigorous paleoecological reconstruction of the pre-1500 river mouth (it is labeled inference).

## Scope (MVP)

A single page with: a fixed-vantage SVG scene that transforms across **12 eras (1400–2026)**; a
**snapping time-scrubber** (+ prev/next, arrow keys, deep links); **Guided Tour** and **Free Explore**
modes; five **thematic info panels**; a **confidence badge** + **sources drawer** per era; five
**thematic layer toggles**; **hotspot** cards; a **compare-wipe** between any two eras; a
**change-strip** of three sparklines (tree cover, built area, population). Responsive, keyboard-
navigable, `prefers-reduced-motion`-honoring.

## User stories

- As a curious visitor, I want to drag through time and watch the same view transform, so that I can
  *feel* 600 years of change instead of reading about it.
- As a student, I want each era's landscape/fauna/hydrology/built/people summarized with sources, so
  that I can trust and cite what I'm seeing.
- As a skeptical reader, I want a confidence badge that tells me when a scene is documented versus
  reconstructed, so that the beautiful illustration doesn't mislead me.
- As someone evaluating Kimi K3, I want an honest per-component log of what the model produced and
  what a human fixed, so that I can judge the Frontend Code Arena claim for myself.

## Success criteria

**Product:** the golden path works on the live URL — drag through all 12 eras (scene transforms;
panels, badge and sources update), toggle layers, open a hotspot, run the compare-wipe; responsive on
mobile; `prefers-reduced-motion` honored; **no console errors**. (Automated verifier: 10/10 checks,
0 console errors.)

**The Kimi K3 trial (the reason this exists) — did it deliver on "generates production-plausible
frontend with minimal iteration"? Yes, with one caveat:**

- ✅ **Scenes:** K3 produced detailed, on-brief, palette-correct flat-vector scenes for all 12 eras
  from text alone; a style-lock reference kept them visually consistent across the set.
- ✅ **Shell + interaction engine:** K3 authored a semantic, accessible `index.html`, a polished
  cartographic `styles.css`, and a correct 844-line `app.js` implementing every feature — passing the
  golden-path harness with **no logic fixes** (only a human-added favicon and integration glue).
- ✅ **Fair test, real strengths:** the build leaned on exactly the creative + data/analytics UI
  abilities the benchmark highlights, and K3 held up.
- ⚠️ **The caveat is operational, not quality:** at default/high `reasoning_effort` K3 spends tens of
  thousands of reasoning tokens per call and truncates or stalls; you must run it at
  `reasoning_effort: "medium"` with a generous `max_tokens`, stream the response, and pin
  `temperature: 1`. A few structure-heavy eras still reasoned ~20 minutes and needed a regeneration
  pass. The PLAN's assumption that reasoning is "locked to max" was wrong — it's the key tunable.

Net: **for generative frontend work, Kimi K3 lives up to its Frontend Code Arena billing** — the human
role collapses to scaffolding, curation, and integration. Full evidence:
[`tools/kimi/ITERATION_LOG.md`](tools/kimi/ITERATION_LOG.md).

## Risks / open questions

- **Historical honesty for deep time.** Pre-1500 ecology is inference; mitigated by the confidence
  badge + sources and explicit "Reconstructed" labeling.
- **Cross-era consistency** depends on the human-authored stage contract + style-lock, not a model-
  native guarantee; verified by rendering all 12 and re-generating outliers.
- **Reproducibility of generation** varies with `reasoning_effort` and prompt size; documented so a
  re-run is predictable.

## Timeline

Single build session: prerequisites verified → repo + templates → K3 generation (scenes, shell, app)
with an honest iteration log → data bundling → GitHub Pages deploy → live golden-path verification →
write-up + hub index update.
