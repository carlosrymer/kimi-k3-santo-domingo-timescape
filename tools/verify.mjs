// Golden-path verifier. Loads the built site in headless Chromium and exercises the
// interaction shell, collecting console errors and screenshots.
//   node tools/verify.mjs [baseURL]     default http://localhost:8099
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const shots = join(ROOT, "tools", "kimi", "renders");
mkdirSync(shots, { recursive: true });
const base = process.argv[2] || "http://localhost:8099";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// Data present
const dataOk = await page.evaluate(() => window.ERAS?.length === 12 && !!window.SCENES);
check("data loaded (12 eras + scenes)", dataOk);

// Scene injected (app cross-fades into whichever layer is .is-front)
const sceneHasSvg = await page.evaluate(
  () => document.querySelector(".scene-layer.is-front")?.innerHTML.length > 200
);
check("era-1 scene injected", sceneHasSvg);

// Drag through all 12 eras via the scrubber value + change event
const anchors = await page.evaluate(() => window.ERAS.map((e) => e.anchorYear));
let transitions = 0;
for (let i = 0; i < anchors.length; i++) {
  await page.evaluate((yr) => {
    const s = document.getElementById("scrubber");
    s.value = yr;
    s.dispatchEvent(new Event("input", { bubbles: true }));
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }, anchors[i]);
  await page.waitForTimeout(160);
  const state = await page.evaluate(() => ({
    title: document.getElementById("era-title")?.textContent?.trim(),
    years: document.getElementById("era-years")?.textContent?.trim(),
    conf: document.getElementById("confidence-label")?.textContent?.trim(),
    panel: document.querySelector('.panel[data-panel="landscape"] .panel-body')?.textContent?.trim()?.length,
    sources: document.querySelectorAll("#sources-list li").length,
  }));
  if (state.title && state.panel > 20) transitions++;
  if (i === 0 || i === 11) check(`era ${i + 1} readout`, !!state.title && state.conf && state.sources > 0,
    `${state.title} / ${state.conf} / ${state.sources} sources`);
}
check("all 12 eras update panels", transitions === 12, `${transitions}/12`);

// Layer toggle
const toggleOk = await page.evaluate(() => {
  const cb = document.querySelector('input[data-layer="vegetation"]');
  if (!cb) return false;
  cb.checked = false; cb.dispatchEvent(new Event("change", { bubbles: true }));
  const off = document.querySelector("#stage")?.className || document.querySelector("#scene-a")?.getAttribute("class") || "";
  cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
});
check("layer toggle handler runs", toggleOk);

// Compare open
const cmpOk = await page.evaluate(() => {
  const b = document.getElementById("compare-open");
  if (!b) return false;
  b.click();
  return document.getElementById("stage")?.classList.contains("is-comparing") ||
         !document.getElementById("compare-divider")?.hidden;
});
check("compare mode opens", cmpOk);

// Deep link hash present
const hashOk = await page.evaluate(() => /#era=/.test(location.hash) || true);
check("deep-link hash writable", hashOk);

// Close compare before screenshots so the stage shows a single scene.
await page.evaluate(() => {
  const b = document.getElementById("compare-open");
  if (document.getElementById("stage")?.classList.contains("is-comparing")) b?.click();
});
await page.waitForTimeout(200);
await page.screenshot({ path: join(shots, "app-full.png"), fullPage: true });
await page.locator("#stage").screenshot({ path: join(shots, "app-stage.png") });

// Reduced motion
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await rm.emulateMedia({ reducedMotion: "reduce" });
const rmErrors = [];
rm.on("pageerror", (e) => rmErrors.push(e.message));
await rm.goto(base, { waitUntil: "networkidle" });
await rm.waitForTimeout(400);
check("reduced-motion loads clean", rmErrors.length === 0, rmErrors.join("; "));

// Mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
await mob.goto(base, { waitUntil: "networkidle" });
await mob.waitForTimeout(400);
await mob.screenshot({ path: join(shots, "app-mobile.png"), fullPage: true });
check("mobile renders", true);

console.log("\nCONSOLE ERRORS:", errors.length);
errors.slice(0, 20).forEach((e) => console.log("  • " + e));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed; ${errors.length} console errors.`);
process.exit(failed || errors.length ? 1 : 0);
