// Minimal client for Moonshot AI's Kimi K3 (OpenAI-compatible chat completions).
// Human-authored scaffolding (API wiring). The *generated frontend* is K3's work.
//
// Notes learned while wiring this up:
//  - kimi-k3 is a reasoning model: responses carry `reasoning_content` separately
//    from `content`. We only keep `content`. `max_tokens` caps reasoning+visible
//    combined, so it must be set generously or the visible answer gets truncated
//    (finish_reason: "length").
//  - Endpoint: https://api.moonshot.ai/v1/chat/completions, model "kimi-k3".
//  - kimi-k3 rejects any temperature other than 1 (HTTP 400). It's locked to 1.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const API_URL = "https://api.moonshot.ai/v1/chat/completions";
const MODEL = "kimi-k3";
const KEY = process.env.MOONSHOT_API_KEY;

if (!KEY) {
  console.error("MOONSHOT_API_KEY is not set. Aborting.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Call Kimi K3. Returns { content, usage, raw }.
 * Retries on network / 5xx / 429 with exponential backoff.
 */
export async function callKimi({
  system,
  user,
  maxTokens = 40000,
  label = "call",
  rawPath = null,
}) {
  const body = {
    model: MODEL,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: user },
    ],
    max_tokens: maxTokens,
    temperature: 1, // kimi-k3 only accepts temperature=1
  };

  const backoffs = [2000, 4000, 8000, 16000];
  let lastErr;
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      if (!res.ok) {
        // 4xx other than 429 — not retryable, surface it.
        const text = await res.text();
        throw Object.assign(new Error(`HTTP ${res.status}: ${text}`), {
          fatal: true,
        });
      }
      const json = await res.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? "";
      const usage = json.usage ?? {};
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[${label}] ok in ${secs}s — prompt ${usage.prompt_tokens}, ` +
          `completion ${usage.completion_tokens} ` +
          `(reasoning ${usage.completion_tokens_details?.reasoning_tokens ?? "?"}), ` +
          `finish ${choice?.finish_reason}, ${content.length} chars`
      );
      if (choice?.finish_reason === "length") {
        console.warn(
          `[${label}] WARNING: finish_reason=length — output likely truncated; raise maxTokens.`
        );
      }
      if (rawPath) {
        mkdirSync(dirname(rawPath), { recursive: true });
        writeFileSync(
          rawPath,
          JSON.stringify(
            { label, request: body, response: json },
            null,
            2
          )
        );
      }
      return { content, usage, raw: json, finish: choice?.finish_reason };
    } catch (err) {
      lastErr = err;
      if (err.fatal) throw err;
      if (attempt < backoffs.length) {
        const wait = backoffs[attempt];
        console.warn(
          `[${label}] attempt ${attempt + 1} failed (${err.message.slice(
            0,
            120
          )}); retrying in ${wait / 1000}s`
        );
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

/** Extract a fenced code block of a given language (or the first block) from K3 output. */
export function extractCode(text, lang = null) {
  const fence = lang
    ? new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "i")
    : /```[a-z]*\s*\n([\s\S]*?)```/i;
  const m = text.match(fence);
  return m ? m[1].trim() : text.trim();
}
