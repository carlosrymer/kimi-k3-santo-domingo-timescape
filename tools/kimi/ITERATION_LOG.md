# Kimi K3 Iteration Log

Honest, per-component record of the Kimi K3 trial: what K3 was asked, what it produced, and what a
human had to fix. Raw request/response payloads are saved under `tools/kimi/outputs/`.

Model: `kimi-k3` (Moonshot AI) via `https://api.moonshot.ai/v1/chat/completions`.

## API wiring notes (human, before any generation)

Getting a usable request out of `kimi-k3` took four corrections, all logged here because they're part
of the honest trial:

1. **Prerequisite check passed.** `MOONSHOT_API_KEY` set; a 1-token `kimi-k3` call returned HTTP 200.
   The network policy allowing `api.moonshot.ai` is in effect.
2. **Temperature is locked to 1.** Any other value returns `HTTP 400: only 1 is allowed for this model`.
3. **It's a reasoning model that must be streamed.** Responses split `reasoning_content` from
   `content`. A large non-streaming call reasons for minutes before emitting a byte, so Node's undici
   ~300s header/body timeout kills it with a bare `fetch failed`. Fix: `stream: true` (deltas flow
   continuously) + a global undici dispatcher with timeouts disabled.
4. **`reasoning_effort` is the make-or-break knob — and the PLAN's "locked to max" assumption was
   wrong.** With it unset (≈"high"), a single era-scene request burned **31,631 reasoning tokens** and
   hit the `max_tokens` cap (`finish=length`) after emitting only ~980 chars of SVG — an unusable
   fragment. Measured on a representative scene prompt:

   | reasoning_effort | reasoning tokens | result |
   |---|---|---|
   | unset / high | ~31,600 (capped) | truncated mid-`<defs>`, `finish=length`; also curl-timeout slow |
   | medium | ~40 | **complete, detailed 9k-char SVG**, `finish=stop`, fast |
   | low | ~6 | complete, slightly plainer |

   **Important nuance:** reasoning length scales with *prompt* complexity, not just the effort label.
   The ~40-token medium figure above was on a toy prompt; on the real scene prompt (full art-direction
   spec + era brief) **medium reasons ~15k tokens**. So the truncation we first saw was really our own
   `max_tokens` cap being too low, not the effort level. Fix: generate at **`reasoning_effort:
   "medium"`** with a **generous `max_tokens` (48k for scenes)** so ~15k reasoning + the full detailed
   SVG both fit (`finish=stop`). Honest finding: kimi-k3's *high/default* reasoning is impractical for
   large generative outputs (30k+ tokens spent thinking, truncation, minutes of latency); **medium +
   headroom** is what actually delivers on the "hand-authors rich frontend" claim. `max_tokens` is a
   request parameter, not a Moonshot-portal or model hard limit (the model is 1M-context).

---

## Scene 1 — Taíno Riverlands
- Prompt: fixed-stage SVG, no reference (this call establishes the visual system).
- K3 output: 26229 chars SVG, finish=stop, completion 34979 tok (reasoning 24326).
- Saved: scenes/taino-riverlands.svg

## Shell — index.html + styles.css
- Prompt: full feature spec + data shape; K3 authors HTML structure and the complete CSS design.
- K3 output: 14862 chars HTML, 26806 chars CSS, finish=stop, completion 15670 tok (reasoning 3388).
- Saved: index.html, styles.css

## Scene 4 — Fortress City & Stagnation
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 37170 chars SVG, finish=stop, completion 22589 tok (reasoning 7344).
- Saved: scenes/fortress-stagnation.svg

## App — app.js (interaction engine)
- Prompt: full feature spec + data shape + K3's own index.html/styles.css as the contract.
- K3 output: 30178 chars JS, finish=stop, completion 12343 tok (reasoning 4289).
- Saved: app.js

## Scene 2 — Contact & Founding
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 35625 chars SVG, finish=stop, completion 29692 tok (reasoning 15173).
- Saved: scenes/contact-founding.svg

## Scene 5 — French Rule & Haitian Unification
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 35243 chars SVG, finish=stop, completion 32859 tok (reasoning 18202).
- Saved: scenes/french-haitian-unification.svg

## Scene 8 — Trujillo's Ciudad Trujillo
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 33043 chars SVG, finish=stop, completion 15402 tok (reasoning 2251).
- Saved: scenes/ciudad-trujillo.svg

## Scene 3 — Ovando's Grid & Sugar Boom
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 40628 chars SVG, finish=stop, completion 46640 tok (reasoning 30187).
- Saved: scenes/ovando-grid-sugar.svg

## Scene 10 — Democracy & Urban Explosion
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 36532 chars SVG, finish=stop, completion 17119 tok (reasoning 2754).
- Saved: scenes/democracy-urban-explosion.svg

## Scene 9 — Upheaval & the Concrete Boom
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 30591 chars SVG, finish=stop, completion 24179 tok (reasoning 11942).
- Saved: scenes/upheaval-concrete-boom.svg

## Scene 7 — Breaking the Walls
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 47158 chars SVG, finish=stop, completion 47441 tok (reasoning 28245).
- Saved: scenes/breaking-the-walls.svg

## Scene 11 — The New Millennium
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 30669 chars SVG, finish=stop, completion 20182 tok (reasoning 7982).
- Saved: scenes/new-millennium.svg

## Scene 6 — The Young Republic
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 33256 chars SVG, finish=length, completion 48000 tok (reasoning 34305).
- Saved: scenes/young-republic.svg

## Scene 12 — Modern Megacity
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 48426 chars SVG, finish=stop, completion 45642 tok (reasoning 26647).
- Saved: scenes/modern-megacity.svg

---

## Human fixes applied to K3 output (the honest tally)

The frontend is K3's; these are the only corrections a human made to what it generated:

1. **`index.html` — added a favicon** (inline SVG data-URI). K3's shell was complete; this only
   silenced a `favicon.ico` 404 in the console. Cosmetic.
2. **Scene 10 (Democracy & Urban Explosion) — one malformed attribute.** K3 emitted
   `transform="translate(1528,353) style"` — a stray ` style` leaked into the transform value,
   throwing a `<use> attribute transform` error in the console. One-line fix to
   `transform="translate(1528,353)"`.
3. **Scene 6 (The Young Republic) — regenerated.** At `reasoning_effort: "medium"` this
   structure-heavy era over-reasoned (~88k reasoning chars) and hit the `max_tokens` cap
   (`finish=length`), truncating the SVG mid-element. Regenerated at **`reasoning_effort: "low"`**
   (273 reasoning chars — no blow-up) for a complete scene. Same fix would apply to any era that
   truncates; only this one did.
4. **Build-step ampersand escaping.** K3 occasionally copied a hotspot name with a bare `&` into an
   attribute (e.g. `data-hotspot="Bohío village & batey"`). Browsers tolerate it; `tools/build-data.mjs`
   escapes stray `&`→`&amp;` so the bundled SVG is valid XML too. Not a fix to K3's intent, just hygiene.

Everything else — all 12 scene compositions, the full `index.html`/`styles.css` shell, and the entire
844-line `app.js` interaction engine — shipped as K3 generated it. The golden-path verifier passed
10/10 with 0 console errors on K3's code (favicon aside). Net human role: API wiring, the fixed-stage
art-direction contract, historical curation, data bundling, deploy, and this log — **no UI code.**

## Scene 6 — The Young Republic
- Prompt: fixed-stage SVG + Era 1 style-lock reference.
- K3 output: 27687 chars SVG, finish=stop, completion 11472 tok (reasoning 81).
- Saved: scenes/young-republic.svg
