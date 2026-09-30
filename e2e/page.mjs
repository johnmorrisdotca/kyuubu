// What every test of the demo starts from: the built page in `_site/`, served
// without a port, and the cube's state read off the page.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const site = join(dirname(fileURLToPath(import.meta.url)), "..", "_site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

/** Open the demo with a query, and collect anything the page complains of. */
export async function open(page, query = "?lang=en") {
  if (!existsSync(join(site, "index.html"))) throw new Error("_site/ is not built: run `pnpm site` first (`pnpm test:site` does)");
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.route("http://kyuubu.test/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const file = join(site, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream" });
  });
  await page.goto(`http://kyuubu.test/${query}`);
  await expect(page.locator("[data-kyuubu]")).toBeVisible();
  return errors;
}

/** Tap, as a finger would where the page is touched and as a mouse where it is not. */
export async function tap(page, selector, options = {}) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  if (test.info().project.use.hasTouch === true) await target.tap(options);
  else await target.click(options);
}

export const id = (name) => `[data-testid="${name}"]`;

/** The cube's stickers, once every turn on its way has been made. */
export async function cube(page) {
  await expect(page.locator("[data-kyuubu]")).toHaveAttribute("data-turning", "false");
  return page.locator("[data-kyuubu]").getAttribute("data-state");
}

/** Open one of the five panels by its tab. */
export async function panel(page, name) {
  await tap(page, `#tab-${name}`);
  await expect(page.locator(`#panel-${name}`)).toBeVisible();
}

/**
 * What must hold after every flow: nothing is wider than the screen, nothing
 * to tap is smaller than 44px either way, and the page complained of nothing.
 */
export async function sound(page, errors) {
  const found = await page.evaluate(() => {
    const seen = (el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const small = [...document.querySelectorAll("button, input, textarea, select, nav a, footer .family a, summary")]
      .filter(seen)
      .map((el) => ({ what: el.id || el.dataset.testid || el.textContent.trim().slice(0, 20), box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 43.5 || box.height < 43.5)
      .map(({ what, box }) => `${what} ${Math.round(box.width)}×${Math.round(box.height)}`);
    const wide = [...document.querySelectorAll("main *")].filter((el) => seen(el) && el.closest("[data-kyuubu], .fam-table-box, pre") === null && el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.tagName + "." + el.className);
    return { over: document.documentElement.scrollWidth - window.innerWidth, small, wide };
  });
  expect(found.over, "the page scrolls sideways").toBeLessThanOrEqual(0);
  expect(found.wide, "something is wider than the screen").toEqual([]);
  expect(found.small, "something to tap is under 44px").toEqual([]);
  expect(errors, "the page complained").toEqual([]);
}

/**
 * A sticker taken hold of with a real pointer, to be dragged by degrees: the
 * middle sticker of the front face's right column, which dragged down turns
 * the right face (R', forwards) and dragged up turns it back (R).
 * `to(angle)` moves the pointer a few pixels at a time until the cube says
 * the layer has reached that angle; `rest()` holds still long enough that
 * letting go is no flick.
 */
export async function hold(page, nth = 5) {
  const root = page.locator("[data-kyuubu]");
  const box = await page.locator('[data-kyuubu] [data-face="F"]').nth(nth).boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let y = from.y;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const angle = async () => Number((await root.getAttribute("data-angle")) ?? 0);
  return {
    from,
    angle,
    async to(target) {
      for (let steps = 0; steps < 400; steps += 1) {
        const now = await angle();
        if (Math.abs(now - target) <= 2) return now;
        y += now < target ? 3 : -3;
        await page.mouse.move(from.x, y);
      }
      throw new Error(`the layer never reached ${target} degrees`);
    },
    /** The pixels that drag the layer a quarter turn, as the cube works them out from its element. */
    quarterPx: async () => {
      const stage = await root.boundingBox();
      return ((Math.min(stage.width, stage.height) * 0.9) / Math.sqrt(3)) * 0.7;
    },
    async by(dx, dy, steps = 3) {
      y += dy;
      await page.mouse.move(from.x + dx, y, { steps });
    },
    rest: () => page.waitForTimeout(160),
    letGo: () => page.mouse.up(),
  };
}
