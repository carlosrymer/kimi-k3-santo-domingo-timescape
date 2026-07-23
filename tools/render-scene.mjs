// Dev tool: render a scene SVG fragment (or several) to PNG for visual QA.
// Injects the fragment exactly as the app does (innerHTML into an <svg>), so what we
// screenshot is what the browser will show.
//   node tools/render-scene.mjs taino-riverlands [more-ids...]   (no args = all in scenes/)

import { chromium } from "playwright";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const outDir = join(ROOT, "tools", "kimi", "renders");
mkdirSync(outDir, { recursive: true });

let ids = process.argv.slice(2);
if (!ids.length) {
  ids = readdirSync(join(ROOT, "scenes"))
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(/\.svg$/, ""));
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

for (const id of ids) {
  const frag = readFileSync(join(ROOT, "scenes", `${id}.svg`), "utf8");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#111}svg{display:block;width:1600px;height:900px}</style></head>
    <body><svg id="s" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"></svg>
    <script>document.getElementById('s').innerHTML=${JSON.stringify(frag)};</script></body></html>`;
  await page.setContent(html, { waitUntil: "networkidle" });
  const out = join(outDir, `${id}.png`);
  await page.locator("#s").screenshot({ path: out });
  console.log(`rendered ${id} -> ${out}`);
}
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
await browser.close();
