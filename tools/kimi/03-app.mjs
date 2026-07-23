// Component 3: the interaction engine app.js. Generated against K3's own index.html so the
// ids/hooks match. K3 owns all behavior.
//
// Usage: node tools/kimi/03-app.mjs

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { callKimi, extractCode } from "./kimi-client.mjs";
import { SYSTEM, ROOT, log } from "./lib.mjs";
import { DATA_SHAPE, FEATURE_SPEC } from "./lib-app-contract.mjs";

const outDir = join(ROOT, "tools", "kimi", "outputs");
mkdirSync(outDir, { recursive: true });

const indexHtml = readFileSync(join(ROOT, "index.html"), "utf8");
const stylesCss = readFileSync(join(ROOT, "styles.css"), "utf8");

const user = `Write \`app.js\` — the complete vanilla-JS interaction engine for Ozama Timescape.
It runs against the EXACT index.html and styles.css below (which you authored). Read them and target
the ids/hooks they expose. No frameworks, no imports, no external libs — plain ES2020 in one file.

${FEATURE_SPEC}

${DATA_SHAPE}

Implement, fully wired and working, every one of the 11 features: scene injection + CROSS-FADE on era
change, pointer/scroll PARALLAX on the pl-* layers, the snapping 12-stop scrubber (+ ← → keys, Prev/
Next), Guided-Tour vs Free-Explore modes with per-era narration, the five info panels + title/years/
summary, the confidence badge (high→"Documented", moderate→"Partly documented", low→"Reconstructed"),
the sources drawer, the five thematic layer toggles (fade theme-* elements), hotspot cards from
data-hotspot, the compare-wipe with a draggable divider between two chosen eras, the three change-strip
sparklines (build them from era.metrics across all 12 eras, current era highlighted, labeled as
normalized estimates), and #era=<id> deep links (write on change, restore on load). Respect
prefers-reduced-motion (guard all JS-driven animation with a matchMedia check, not just CSS).
Be robust: guard for missing elements, don't throw if a hotspot has no marker, and keep it performant.

CURRENT index.html:
\`\`\`html
${indexHtml}
\`\`\`

CURRENT styles.css (for reference — class names, transition hooks):
\`\`\`css
${stylesCss}
\`\`\`

Return ONLY one fenced \`\`\`js block containing the full app.js.`;

const { content, usage, finish } = await callKimi({
  system: SYSTEM,
  user,
  maxTokens: 70000,
  label: "app.js",
  rawPath: join(outDir, "app.json"),
});

const js = extractCode(content, "js");
writeFileSync(join(ROOT, "app.js"), js + "\n");

log(
  `## App — app.js (interaction engine)\n` +
    `- Prompt: full feature spec + data shape + K3's own index.html/styles.css as the contract.\n` +
    `- K3 output: ${js.length} chars JS, finish=${finish}, completion ${usage.completion_tokens} tok ` +
    `(reasoning ${usage.completion_tokens_details?.reasoning_tokens}).\n` +
    `- Saved: app.js`
);
console.log("App generation done. finish=" + finish);
