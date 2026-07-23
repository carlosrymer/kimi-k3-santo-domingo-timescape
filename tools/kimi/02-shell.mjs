// Component 2: the interaction shell markup + styling. K3 authors index.html + styles.css
// together so IDs and CSS match. app.js (Component 3) is generated against this HTML.
//
// Usage: node tools/kimi/02-shell.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { callKimi, extractCode } from "./kimi-client.mjs";
import { SYSTEM, ROOT, log } from "./lib.mjs";
import { DATA_SHAPE, FEATURE_SPEC } from "./lib-app-contract.mjs";

const outDir = join(ROOT, "tools", "kimi", "outputs");
mkdirSync(outDir, { recursive: true });

const user = `Author the STATIC SHELL for Ozama Timescape: a complete \`index.html\` and \`styles.css\`.

${FEATURE_SPEC}

${DATA_SHAPE}

Deliverables and how they'll be wired:
- \`index.html\` loads, in order at end of <body>: <script src="data/eras.js"></script> (sets
  window.ERAS/window.META), <script src="data/scenes.js"></script> (sets window.SCENES), then
  <script src="app.js"></script>. Include those three tags. app.js (written separately) will read
  the data and wire all behavior, so give every interactive region a STABLE, CLEARLY-NAMED id or
  data-attribute and lay out ALL 11 features above. Put a short comment block near the top of the
  <body> listing the ids/hooks you exposed so the app author can target them.
- Provide the full visual design in styles.css: the museum/cartographic aesthetic, the scrubber and
  its 12 ticks, panels, badge, drawer, toggles, hotspot card, compare divider, sparkline strip, the
  two-mode layout, responsive stacking, focus states, and a complete
  @media (prefers-reduced-motion: reduce) block that disables ambient + parallax + cross-fade motion.
- System fonts only (no web fonts). No external CSS/JS/CDN. Keep the SVG scene container ready for
  app.js to inject window.SCENES[id] into (e.g. an <svg id="scene" viewBox="0 0 1600 900">).

Return EXACTLY two fenced blocks in this order and nothing else:
\`\`\`html  (the full index.html)
...
\`\`\`
\`\`\`css  (the full styles.css)
...
\`\`\``;

const { content, usage, finish } = await callKimi({
  system: SYSTEM,
  user,
  maxTokens: 60000,
  label: "shell html+css",
  rawPath: join(outDir, "shell.json"),
});

// Split the two fenced blocks.
const htmlM = content.match(/```html\s*\n([\s\S]*?)```/i);
const cssM = content.match(/```css\s*\n([\s\S]*?)```/i);
if (!htmlM || !cssM) {
  console.error("Could not find both html and css blocks. Raw saved to outputs/shell.json");
  process.exit(1);
}
writeFileSync(join(ROOT, "index.html"), htmlM[1].trim() + "\n");
writeFileSync(join(ROOT, "styles.css"), cssM[1].trim() + "\n");

log(
  `## Shell — index.html + styles.css\n` +
    `- Prompt: full feature spec + data shape; K3 authors HTML structure and the complete CSS design.\n` +
    `- K3 output: ${htmlM[1].trim().length} chars HTML, ${cssM[1].trim().length} chars CSS, ` +
    `finish=${finish}, completion ${usage.completion_tokens} tok ` +
    `(reasoning ${usage.completion_tokens_details?.reasoning_tokens}).\n` +
    `- Saved: index.html, styles.css`
);
console.log("Shell generation done.");
