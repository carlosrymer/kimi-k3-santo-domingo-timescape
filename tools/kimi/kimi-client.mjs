// Minimal client for Moonshot AI's Kimi K3 (OpenAI-compatible chat completions).
// Human-authored scaffolding (API wiring). The *generated frontend* is K3's work.
//
// Notes learned while wiring this up:
//  - kimi-k3 is a reasoning model: responses carry `reasoning_content` separately
//    from `content`. We only keep `content`.
//  - Temperature is locked to 1 (any other value -> HTTP 400).
//  - CRITICAL: a big non-streaming generation reasons for minutes before emitting
//    the answer, and Node's undici headers/body timeout (~300s) kills the request
//    with a bare "fetch failed". Fix: stream=true so reasoning + content deltas flow
//    continuously and no timeout trips. We also disable undici timeouts when the
//    module is importable, as a belt-and-suspenders.
//  - Endpoint: https://api.moonshot.ai/v1/chat/completions, model "kimi-k3".

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const API_URL = "https://api.moonshot.ai/v1/chat/completions";
const MODEL = "kimi-k3";
const KEY = process.env.MOONSHOT_API_KEY;

if (!KEY) {
  console.error("MOONSHOT_API_KEY is not set. Aborting.");
  process.exit(1);
}

// Belt-and-suspenders: disable undici read timeouts if we can reach the module.
try {
  const undici = await import("undici");
  undici.setGlobalDispatcher(
    new undici.Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 60_000 })
  );
} catch {
  // undici not importable as a bare module — streaming alone should suffice.
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Call Kimi K3 with streaming. Returns { content, usage, finish }.
 * Retries on network / 5xx / 429 with exponential backoff.
 */
export async function callKimi({
  system,
  user,
  maxTokens = 40000,
  reasoningEffort = "medium",
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
    // reasoning_effort matters a LOT here: unset/"high" makes kimi-k3 burn 30k+ reasoning
    // tokens on a single scene and truncate (finish=length); "medium" reasons ~40 tokens and
    // returns a complete, detailed result. See ITERATION_LOG for the measurements.
    reasoning_effort: reasoningEffort,
    stream: true,
    stream_options: { include_usage: true },
  };

  const backoffs = [3000, 6000, 12000, 24000];
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
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      if (!res.ok) {
        const text = await res.text();
        throw Object.assign(new Error(`HTTP ${res.status}: ${text}`), { fatal: true });
      }

      // Parse the SSE stream.
      let content = "";
      let reasoningChars = 0;
      let usage = {};
      let finish = null;
      let buf = "";
      let lastTick = Date.now();
      const decoder = new TextDecoder();
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          let json;
          try {
            json = JSON.parse(payload);
          } catch {
            continue;
          }
          if (json.usage) usage = json.usage;
          const choice = json.choices?.[0];
          if (!choice) continue;
          const d = choice.delta || {};
          if (d.content) content += d.content;
          if (d.reasoning_content) reasoningChars += d.reasoning_content.length;
          if (choice.finish_reason) finish = choice.finish_reason;
        }
        // Heartbeat so long generations show life.
        if (Date.now() - lastTick > 20000) {
          lastTick = Date.now();
          console.log(
            `[${label}] …streaming (${((Date.now() - t0) / 1000) | 0}s, ` +
              `reasoning ${reasoningChars} chars, content ${content.length} chars)`
          );
        }
      }

      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[${label}] ok in ${secs}s — completion ${usage.completion_tokens ?? "?"} tok ` +
          `(reasoning ${usage.completion_tokens_details?.reasoning_tokens ?? "?"}), ` +
          `finish ${finish}, ${content.length} chars visible`
      );
      if (finish === "length") {
        console.warn(`[${label}] WARNING: finish_reason=length — output truncated; raise maxTokens.`);
      }
      if (rawPath) {
        mkdirSync(dirname(rawPath), { recursive: true });
        writeFileSync(
          rawPath,
          JSON.stringify({ label, request: { ...body, messages: "<omitted>" }, usage, finish, content }, null, 2)
        );
      }
      return { content, usage, finish };
    } catch (err) {
      lastErr = err;
      if (err.fatal) throw err;
      if (attempt < backoffs.length) {
        const wait = backoffs[attempt];
        console.warn(
          `[${label}] attempt ${attempt + 1} failed (${String(err.message).slice(0, 120)}); ` +
            `retrying in ${wait / 1000}s`
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
