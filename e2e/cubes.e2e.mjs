// The turning cubes page and the embed that goes with it, by real presses and a real clock.
import { expect, test } from "@playwright/test";

import { id, sound, tap } from "./page.mjs";
import { serve } from "./page.mjs";

const state = (page, which) => page.locator(`#widget-${which} [data-kyuubu]`).getAttribute("data-state");
const open = async (page, address = "cubes.html?lang=en") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await serve(page);
  await page.goto(`http://kyuubu.test/${address}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  return errors;
};

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a cube keeps turning by itself, and stops and starts on request", async ({ page }) => {
    const errors = await open(page);
    await tap(page, '#paces button[data-pace="fast"]');
    await expect(page.locator("#widget-small")).toHaveAttribute("pace", "fast");
    const first = await state(page, "small");
    await expect.poll(() => state(page, "small"), { timeout: 6000 }).not.toBe(first);
    await tap(page, id("widget-toggle"));
    await expect(page.locator(id("widget-toggle"))).toHaveText("Keep turning");
    await page.waitForTimeout(700);
    const held = await state(page, "small");
    await page.waitForTimeout(1500);
    expect(await state(page, "small")).toBe(held);
    await tap(page, id("widget-toggle"));
    await expect.poll(() => state(page, "small"), { timeout: 6000 }).not.toBe(held);
    await sound(page, errors);
  });

  test("the cubes keep their box while they turn, and are not selectable", async ({ page }) => {
    await open(page);
    const boxes = async () => page.locator(id("cube-row")).evaluate((row) => [...row.querySelectorAll("kyuubu-scramble")].map((el) => { const box = el.getBoundingClientRect(); return `${Math.round(box.width)}×${Math.round(box.height)}`; }));
    const before = await boxes();
    expect(before[2]).toBe("72×72");
    await tap(page, '#paces button[data-pace="fast"]');
    await page.waitForTimeout(1500);
    expect(await boxes()).toEqual(before);
    const selectable = await page.locator("kyuubu-scramble").first().evaluate((el) => getComputedStyle(el.querySelector("[data-kyuubu]")).userSelect);
    expect(selectable).toBe("none");
  });

  test("a hidden tab turns nothing", async ({ page }) => {
    await open(page);
    await tap(page, '#paces button[data-pace="fast"]');
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new window.Event("visibilitychange"));
    });
    await page.waitForTimeout(600);
    const held = await state(page, "small");
    await page.waitForTimeout(1600);
    expect(await state(page, "small")).toBe(held);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new window.Event("visibilitychange"));
    });
    await expect.poll(() => state(page, "small"), { timeout: 6000 }).not.toBe(held);
  });

  test("the embed turns a cube at the pace in its address, and pauses when asked", async ({ page }) => {
    const errors = await open(page, "embed-scramble.html#pace=0.5&scale=small&size=2");
    const first = await page.locator("[data-kyuubu]").getAttribute("data-state");
    await expect.poll(() => page.locator("[data-kyuubu]").getAttribute("data-state"), { timeout: 6000 }).not.toBe(first);
    expect(await page.locator("[data-kyuubu] [data-slot]").count()).toBe(24);
    await page.goto("http://kyuubu.test/embed-scramble.html#paused=1&scale=small&size=2");
    await expect(page.locator("[data-kyuubu]")).toBeVisible();
    const held = await page.locator("[data-kyuubu]").getAttribute("data-state");
    await page.waitForTimeout(1500);
    expect(await page.locator("[data-kyuubu]").getAttribute("data-state")).toBe(held);
    expect(errors).toEqual([]);
  });
});

test.describe("with reduced motion asked for", () => {
  test.use({ reducedMotion: "reduce" });

  test("the cubes stay still", async ({ page }) => {
    const errors = await open(page);
    await tap(page, '#paces button[data-pace="fast"]');
    const held = await state(page, "small");
    await page.waitForTimeout(2000);
    expect(await state(page, "small")).toBe(held);
    await sound(page, errors);
  });
});

test("every size is there small, and a press picks it", async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator("#picker button")).toHaveCount(6);
  for (const n of [2, 5, 7]) {
    await expect(page.locator(`#picker button[data-n="${n}"] [data-slot]`)).toHaveCount(6 * n * n);
    const box = await page.locator(`#picker button[data-n="${n}"] > span`).boundingBox();
    expect(Math.round(box.width)).toBe(72);
  }
  await tap(page, '#picker button[data-n="4"]');
  await expect(page.locator(id("picked"))).toHaveText("You picked 4×4.");
  await sound(page, errors);
});

test("in Japanese, the words change and the page still fits", async ({ page }) => {
  const errors = await open(page, "cubes.html?lang=ja");
  await expect(page.locator("h2#widget-title")).toHaveText("回り続けるキューブ");
  await expect(page.locator(id("widget-toggle"))).toHaveText("回すのをやめる");
  await sound(page, errors);
});
