// Component 1: the 12 era scenes. K3 authors each as a self-contained SVG fragment.
// Consistency across 12 independent generations = frozen STAGE contract in every prompt
// + Era 1 passed as a visual style-lock reference to Eras 2..12.
//
// Usage: node tools/kimi/01-scenes.mjs [eraIndex]   (no arg = all 12)

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { callKimi, extractCode } from "./kimi-client.mjs";
import { loadEras, STAGE, CONVENTIONS, SYSTEM, ROOT, log } from "./lib.mjs";

const data = loadEras();
const eras = data.eras;
const only = process.argv[2] ? parseInt(process.argv[2], 10) : null;

const scenesDir = join(ROOT, "scenes");
mkdirSync(scenesDir, { recursive: true });
const outDir = join(ROOT, "tools", "kimi", "outputs");

function eraBrief(era) {
  return `ERA ${era.index}/12 — "${era.label}" (${era.yearStart}–${era.yearEnd}, anchor ${era.anchorYear})
Confidence: ${era.confidence} (${era.confidenceReason})
Summary: ${era.summary}
Palette (use these): ${era.palette.colors.join(", ")}
Palette mood: ${era.palette.mood}
Scene layers:
  sky: ${era.layers.sky}
  water: ${era.layers.water}
  far/east bank: ${era.layers.eastBank}
  near/west bank + city: ${era.layers.westBank}
  vegetation: ${(era.layers.vegetation || []).join(", ") || "—"}
  fauna: ${(era.layers.fauna || []).join(", ") || "—"}
  structures: ${(era.layers.structures || []).map((s) => (typeof s === "string" ? s : s.name)).join(", ") || "—"}
  human activity: ${(era.layers.humanActivity || []).join(", ") || "—"}
  ambient motion cues: ${(era.layers.ambient || []).join(", ") || "—"}
Hotspots (wrap each on-scene with data-hotspot="NAME"):
${era.hotspots.map((h) => `  - ${h.name}`).join("\n")}`;
}

async function genEra(era, referenceSvg) {
  const refBlock = referenceSvg
    ? `\n\nSTYLE-LOCK REFERENCE — here is the Era 1 scene already authored for this exact stage.
Match its vantage, horizon line, river geometry, west-bank SE-tip position, stroke weight,
flat-vector rendering style, and overall craft. Evolve the CONTENT for this era (buildings,
vegetation, boats, people, palette) but keep the camera and stage identical:\n\`\`\`svg\n${referenceSvg}\n\`\`\``
    : "";

  const user = `Author the SVG scene for this era of Ozama Timescape.

${CONVENTIONS}

${eraBrief(era)}${refBlock}

Return ONE fenced \`\`\`svg block containing ONLY the inner SVG markup (defs + the five
<g class="pl pl-*"> parallax layers). Rich but performant — aim for a detailed, characterful
scene a viewer would find beautiful and legible, not a rough sketch. No outer <svg>, no scripts.`;

  const rawPath = join(outDir, `scene-${era.index}-${era.id}.json`);
  const { content, usage, finish } = await callKimi({
    system: SYSTEM,
    user,
    maxTokens: 50000,
    label: `scene ${era.index} ${era.id}`,
    rawPath,
  });
  const svg = extractCode(content, "svg");
  const outPath = join(scenesDir, `${era.id}.svg`);
  writeFileSync(outPath, svg + "\n");
  return { svg, usage, finish, outPath };
}

let referenceSvg = null;
// Load an existing Era 1 scene as reference if present (so re-runs of single eras stay locked).
const era1Path = join(scenesDir, `${eras[0].id}.svg`);
if (existsSync(era1Path)) referenceSvg = readFileSync(era1Path, "utf8");

for (const era of eras) {
  if (only && era.index !== only) continue;
  if (era.index === 1) {
    const r = await genEra(era, null);
    referenceSvg = r.svg;
    log(
      `## Scene ${era.index} — ${era.label}\n` +
        `- Prompt: fixed-stage SVG, no reference (this call establishes the visual system).\n` +
        `- K3 output: ${r.svg.length} chars SVG, finish=${r.finish}, ` +
        `completion ${r.usage.completion_tokens} tok (reasoning ${r.usage.completion_tokens_details?.reasoning_tokens}).\n` +
        `- Saved: scenes/${era.id}.svg`
    );
  } else {
    if (!referenceSvg) {
      console.error("No Era 1 reference available; generate era 1 first.");
      process.exit(1);
    }
    const r = await genEra(era, referenceSvg);
    log(
      `## Scene ${era.index} — ${era.label}\n` +
        `- Prompt: fixed-stage SVG + Era 1 style-lock reference.\n` +
        `- K3 output: ${r.svg.length} chars SVG, finish=${r.finish}, ` +
        `completion ${r.usage.completion_tokens} tok (reasoning ${r.usage.completion_tokens_details?.reasoning_tokens}).\n` +
        `- Saved: scenes/${era.id}.svg`
    );
  }
}
console.log("Scene generation done.");
