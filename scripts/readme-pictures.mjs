// Takes the pictures the README shows, from the built demo in `site/`: `pnpm pictures` (builds the demo, then runs this).
// The page is served to a browser without a port, never fetched from the live site, and the same each run:
// `Math.random` is a seeded generator, so the scramble is the same, and motion is reduced.
// Output: docs/desktop.jpg (1280 wide, light, English) and docs/phone.jpg (390 by 844, dark, Japanese), and the cuboids page's docs/cuboids.jpg (light, English, a scrambled Domino) and docs/cuboids-phone.jpg (dark, Japanese, a scrambled Pillar).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const docs = join(root, "docs");
const host = "http://kyuubu.test";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const QUALITY = 76;

if (!existsSync(join(site, "index.html"))) throw new Error("site/ is not built: run `pnpm pictures` (it builds the demo first)");
const browser = await chromium.launch();

/** Scramble a 3×3 and take `steps` steps of its solve, each one named under the cube. */
async function shot({ width, height, colorScheme, lang, steps, path, scrollTo }) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.addInitScript(() => {
    let seed = 2026;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto(`${host}/?lang=${lang}`);
  await page.locator("[data-kyuubu]").waitFor();
  await page.locator('[data-testid="scramble"]').click();
  for (let step = 0; step < steps; step += 1) await page.locator('[data-testid="next"]').click();
  await page.waitForTimeout(400);
  if (scrollTo) await page.locator(scrollTo).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 64));
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}

// From the top of the page, so the header, the language chooser and the cloth patches show: a scrambled 3×3 part way through its solve.
await shot({ width: 1280, height: 900, colorScheme: "light", lang: "en", steps: 3, path: join(docs, "desktop.jpg") });
// The phone is scrolled to the cube, with its timer above it.
await shot({ width: 390, height: 844, colorScheme: "dark", lang: "ja", steps: 3, path: join(docs, "phone.jpg"), scrollTo: '[data-testid="time"]' });
/** The cuboids page with a named shape put on the felt and scrambled. */
async function shotCuboids({ width, height, colorScheme, lang, preset, path }) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: "reduce", locale: "en-US", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(`${host}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.addInitScript(() => {
    let seed = 7;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto(`${host}/cuboids.html?lang=${lang}`);
  await page.locator("[data-kyuubu-cuboid]").first().waitFor();
  await page.locator(`[data-testid="pick-${preset}"]`).click();
  await page.locator('[data-testid="scramble"]').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({ path, type: "jpeg", quality: QUALITY });
  await context.close();
}
await shotCuboids({ width: 1280, height: 900, colorScheme: "light", lang: "en", preset: "domino", path: join(docs, "cuboids.jpg") });
await shotCuboids({ width: 390, height: 844, colorScheme: "dark", lang: "ja", preset: "pillar", path: join(docs, "cuboids-phone.jpg") });
await browser.close();
