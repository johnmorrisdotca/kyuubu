// The Scramble button turns the cube where it can be seen, and the choice to turn it off is the page's.
import { expect, test } from "@playwright/test";

import { applySolve, parseSolve, solvedCube } from "../dist/index.js";

import { id, open, panel, tap } from "./page.mjs";

const stage = (page) => page.locator("#stage [data-kyuubu]");

/** What the cube did: how many times it began to turn, and every state it showed. */
const watch = (page) =>
  page.evaluate(() => {
    const cube = document.querySelector("#stage [data-kyuubu]");
    window.turned = { turning: 0, states: [] };
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === "data-turning" && cube.dataset.turning === "true") window.turned.turning += 1;
        if (record.attributeName === "data-state") window.turned.states.push(cube.dataset.state);
      }
    }).observe(cube, { attributes: true, attributeFilter: ["data-turning", "data-state"] });
  });

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const n of [3, 7]) {
    test(`on a ${n}×${n} the last turns of the scramble are shown, quickly, and the cube ends scrambled`, async ({ page }) => {
      await open(page);
      await tap(page, `#sizes button[data-n="${n}"]`);
      await watch(page);
      await tap(page, id("scramble"));
      await expect(stage(page)).toHaveAttribute("data-turning", "false", { timeout: 4000 });
      const made = await page.evaluate(() => window.turned);
      // Seen turning, and for no more than the last ten turns: the rest were made at once.
      expect(made.turning).toBeGreaterThanOrEqual(1);
      expect(made.states.length).toBeGreaterThanOrEqual(8);
      expect(made.states.length).toBeLessThanOrEqual(13);
      await panel(page, "moves");
      const text = await page.locator(id("scrambled")).textContent();
      const read = parseSolve(text, n);
      expect(read.ok).toBe(true);
      expect(await stage(page).getAttribute("data-state")).toBe(applySolve(solvedCube(n), n, read.steps));
      // A scramble is not the reader's moves.
      await expect(page.locator(id("count"))).toHaveText("0");
    });
  }

  test("with the choice off the cube is scrambled at once and turns nothing", async ({ page }) => {
    await open(page);
    await tap(page, '#sizes button[data-n="5"]');
    await page.getByTestId("animate-scramble").click();
    await expect(page.getByTestId("animate-scramble")).toHaveAttribute("aria-pressed", "false");
    await watch(page);
    await tap(page, id("scramble"));
    await expect(stage(page)).not.toHaveAttribute("data-state", solvedCube(5));
    await page.waitForTimeout(300);
    const made = await page.evaluate(() => window.turned);
    expect(made.turning).toBe(0);
    await panel(page, "moves");
    const read = parseSolve(await page.locator(id("scrambled")).textContent(), 5);
    expect(await stage(page).getAttribute("data-state")).toBe(applySolve(solvedCube(5), 5, read.steps));
    // And the page's code says so.
    await expect(page.getByTestId("example-code")).toContainText("animateScramble: false");
  });
});

test.describe("with reduced motion asked for", () => {
  test.use({ reducedMotion: "reduce" });

  test("the scramble is made at once, as ever, and the cube ends scrambled", async ({ page }) => {
    await open(page);
    await watch(page);
    await tap(page, id("scramble"));
    await expect(stage(page)).not.toHaveAttribute("data-state", solvedCube(3));
    await page.waitForTimeout(300);
    expect((await page.evaluate(() => window.turned)).turning).toBe(0);
  });
});
