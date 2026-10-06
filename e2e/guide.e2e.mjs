// Show me on the cube: the arrow on the cube is followed with a real pointer, and the guide moves on.
import { expect, test } from "@playwright/test";

import { parseMoves, solvedCube, turnAll } from "../dist/index.js";

import { cube, id, open, panel, serve, sound, tap } from "./page.mjs";

const after = (notation) => turnAll(solvedCube(3), 3, parseMoves(notation, 3));
const root = (page) => page.locator(":is(#stage, #player) [data-kyuubu]");
const shown = (page) => page.locator('.kyuubu-guide [data-guide="move"]');

/**
 * Take hold of the sticker the hint marks and drag it the way its arrow
 * points, a few pixels at a time, until the layer has gone a quarter turn
 * (or a half, for a half turn); then let go, at rest.
 */
async function followArrow(page, half = false) {
  await expect(root(page)).toHaveAttribute("data-hint", "drag");
  // The whole cube in the window, so that the drag has room to go.
  await root(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  const [dx, dy] = (await page.locator("[data-hint-arrow]").getAttribute("data-drag")).split(",").map(Number);
  const box = await page.locator(":is(#stage, #player) [data-kyuubu] [data-hint-grab]").boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const want = half ? 150 : 70;
  for (let step = 1; step < 400; step += 1) {
    await page.mouse.move(from.x + dx * step * 3, from.y + dy * step * 3);
    if (Math.abs(Number((await root(page).getAttribute("data-angle")) ?? 0)) >= want) break;
  }
  await page.waitForTimeout(160);
  await page.mouse.up();
  await expect(root(page)).toHaveAttribute("data-turning", "false");
}

async function showTyped(page, notation) {
  await panel(page, "moves");
  await page.locator(id("moves")).fill(notation);
  await tap(page, id("show-typed"));
  await expect(page.locator(id("guide"))).toBeVisible();
}

test("moves typed in are shown on the cube one at a time, and following the arrow makes each", async ({ page }) => {
  const errors = await open(page);
  await showTyped(page, "R U' F2");
  await expect(shown(page)).toHaveText("R");
  await expect(page.locator('[data-guide="says"]')).toHaveText("Turn the right face away from you.");
  // The layer is lit and the rest dimmed: nine on the face and three on each of four sides.
  await expect(page.locator(":is(#stage, #player) [data-kyuubu] [data-hint-lit]")).toHaveCount(21);
  await followArrow(page);
  expect(await cube(page)).toBe(after("R"));
  await expect(shown(page)).toHaveText("U'");
  await followArrow(page);
  expect(await cube(page)).toBe(after("R U'"));
  await expect(shown(page)).toHaveText("F2");
  await expect(page.locator('[data-guide="how"]')).toContainText("twice as far");
  await followArrow(page, true);
  expect(await cube(page)).toBe(after("R U' F2"));
  await expect(page.locator('[data-guide="says"]')).toHaveText("That was the last move.");
  await expect(root(page)).not.toHaveAttribute("data-hint", /./);
  await expect(page.locator(":is(#stage, #player) [data-kyuubu] [data-hint-lit]")).toHaveCount(0);
  await expect(page.locator(id("count"))).toHaveText("3");
  await sound(page, errors);
});

test("a turn that was not asked for is said to be one, and taken back", async ({ page }) => {
  const errors = await open(page);
  await showTyped(page, "R");
  await page.locator("body").click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("u");
  expect(await cube(page)).toBe(after("U"));
  await expect(page.locator('[data-guide="off"]')).toContainText("You turned U, not R.");
  // The arrow now shows the way back.
  await expect(root(page)).toHaveAttribute("data-hint", "drag");
  await tap(page, '[data-act="take-back"]');
  expect(await cube(page)).toBe(solvedCube(3));
  await expect(page.locator('[data-guide="off"]')).toBeHidden();
  await followArrow(page);
  expect(await cube(page)).toBe(after("R"));
  await sound(page, errors);
});

test("the method is shown on the cube, a turn of the whole cube made for you", async ({ page }) => {
  const errors = await open(page);
  await tap(page, id("scramble"));
  await cube(page);
  await panel(page, "solve");
  await tap(page, id("show"));
  await expect(page.locator(id("show"))).toHaveAttribute("aria-pressed", "true");
  const guide = page.locator("[data-kyuubu-guide]");
  for (let made = 0; made < 3; ) {
    const before = Number(await guide.getAttribute("data-done"));
    if ((await root(page).getAttribute("data-hint")) === "whole") {
      await expect(page.locator('[data-guide="how"]')).toContainText("No drag on a sticker does this");
      await tap(page, '[data-act="do-it"]');
    } else {
      await followArrow(page, (await shown(page).textContent()).endsWith("2"));
      made += 1;
    }
    await expect(guide).toHaveAttribute("data-done", String(before + 1));
    await expect(guide).toHaveAttribute("data-state", /on|done/);
  }
  await tap(page, id("show"));
  await expect(page.locator(id("guide"))).toBeHidden();
  await expect(root(page)).not.toHaveAttribute("data-hint", /./);
  await sound(page, errors);
});

test("the hint is in Japanese too, and the cube's corners are rounded", async ({ page }) => {
  const errors = await open(page, "?lang=ja");
  await showTyped(page, "R'");
  await expect(page.locator('[data-guide="says"]')).toHaveText("右の面を手前に回します。");
  const corner = await page.locator(':is(#stage, #player) [data-kyuubu] [data-slot="0"]').evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(parseFloat(corner)).toBeGreaterThan(0);
  const inner = await page.locator(':is(#stage, #player) [data-kyuubu] [data-slot="4"]').evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(parseFloat(inner)).toBe(0);
  await sound(page, errors);
});

test("the player hands the cube over to follow a famous solve by hand", async ({ page }) => {
  await serve(page);
  await page.goto("http://kyuubu.test/famous.html?lang=en");
  const player = page.locator("[data-kyuubu-player]");
  await expect(player).toHaveAttribute("data-position", "0");
  await tap(page, '[data-kyuubu-player] [data-act="follow"]');
  await expect(player).toHaveAttribute("data-following", "true");
  await expect(page.locator("[data-kyuubu-guide]")).toBeVisible();
  // The famous solves begin by holding the cube: made for the viewer, then the first turn by hand.
  for (let guard = 0; guard < 4 && (await root(page).getAttribute("data-hint")) !== "drag"; guard += 1) await tap(page, '[data-act="do-it"]');
  const at = Number(await player.getAttribute("data-position"));
  // The first turn by hand is a wide turn, r': a drag for each of its two layers, the second asked for once the first is made.
  await expect(shown(page)).toHaveText("Rw'");
  await followArrow(page);
  await expect(shown(page)).not.toHaveText("Rw'");
  await expect(player).toHaveAttribute("data-position", String(at));
  await followArrow(page);
  await expect(player).toHaveAttribute("data-position", String(at + 1));
  // Back to being played, at the step reached.
  await tap(page, '[data-kyuubu-player] [data-act="follow"]');
  await expect(player).toHaveAttribute("data-following", "false");
  await expect(player).toHaveAttribute("data-position", String(at + 1));
});
