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
