// The cuboids page, driven as a person drives it: taps, drags, typing, keys. Each flow ends by checking that
// the page still fits the screen, everything to tap is big enough, and nothing was complained of.
import { expect, test } from "@playwright/test";

import { CUBOID_PRESETS, cuboidMoveNotation, cuboidName, cuboidSolved, cuboidStickerCount, parseCuboidMoves, solvedCuboid, turnAllCuboid } from "../dist/cuboid/index.js";

import { id, serve, sound, tap } from "./page.mjs";

const stage = "[data-kyuubu-cuboid]";
const after = (dims, notation) => turnAllCuboid(solvedCuboid(dims), dims, parseCuboidMoves(notation, dims));

async function open(page, address = "cuboids.html?lang=en") {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await serve(page);
  await page.goto(`http://kyuubu.test/${address}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(`#stage ${stage}`)).toBeVisible();
  return errors;
}

/** The stage's puzzle once every turn on its way has been made. */
const settled = async (page) => {
  await expect(page.locator(`#stage ${stage}`)).toHaveAttribute("data-turning", "false");
  return page.locator(`#stage ${stage}`).getAttribute("data-state");
};

/**
 * A sticker taken hold of with a real pointer and dragged the way given (a unit step in x and y), to be let go
 * where the layer has reached an angle: `until(degrees)` moves a few pixels at a time until the puzzle says the
 * held layer is that far round either way.
 */
async function hold(page, face, nth, step) {
  const root = page.locator(`#stage ${stage}`);
  await root.scrollIntoViewIfNeeded();
  const box = await page.locator(`#stage ${stage} [data-face="${face}"]`).nth(nth).boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  let at = 0;
  return {
    angle: async () => Number((await root.getAttribute("data-angle")) ?? 0),
    async until(degrees) {
      for (let steps = 0; steps < 600; steps += 1) {
        const now = Math.abs(Number((await root.getAttribute("data-angle")) ?? 0));
        if (now >= degrees) return now;
        at += 3;
        await page.mouse.move(from.x + step[0] * at, from.y + step[1] * at);
      }
      throw new Error(`the layer never reached ${degrees} degrees`);
    },
    rest: () => page.waitForTimeout(160),
    letGo: () => page.mouse.up(),
    half: () => root.getAttribute("data-half-only"),
  };
}

test("opens on a floppy, solved, and the other pages link to it", async ({ page }) => {
  const errors = await open(page);
  expect(await settled(page)).toBe(solvedCuboid([3, 3, 1]));
  await expect(page.locator(`#stage ${stage}`)).toHaveAttribute("aria-label", "A 3×3×1 cuboid");
  await expect(page.locator(id("name"))).toHaveText("3×3×1");
  await expect(page.locator("footer .family a[aria-current='page']")).toHaveText("Kyuubu");
  await sound(page, errors);
  for (const address of ["", "famous.html", "cubes.html"]) {
    await serve(page);
    await page.goto(`http://kyuubu.test/${address}?lang=en`);
    await expect(page.locator('header a[href="cuboids.html"], nav a[href="cuboids.html"]').first()).toHaveText("Cuboids");
  }
});

test("every named shape is a tap away, with its own stickers and its own line", async ({ page }) => {
  const errors = await open(page);
  for (const one of CUBOID_PRESETS) {
    await tap(page, id(`pick-${one.key}`));
    expect(await settled(page)).toBe(solvedCuboid(one.dims));
    await expect(page.locator(id(`pick-${one.key}`))).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`#stage ${stage} [data-slot]`)).toHaveCount(cuboidStickerCount(one.dims));
    await expect(page.locator(id("says-name"))).toHaveText(`${one.name.en} · ${one.label}`);
    await expect(page.locator(id("says"))).toHaveText(one.says.en);
    await expect(page.locator(id("name"))).toHaveText(cuboidName(one.dims));
  }
  await sound(page, errors);
});

test("any a×b×c from 1 to 7 is made from the three chooser, and 1×1×1 is told it has nothing to turn", async ({ page }) => {
  const errors = await open(page);
  for (const dims of [[2, 5, 3], [7, 1, 2], [1, 1, 7], [4, 4, 4]]) {
    for (const [axis, side] of dims.entries()) await page.locator(id(`side-${axis}`)).selectOption(String(side));
    expect(await settled(page)).toBe(solvedCuboid(dims));
    await expect(page.locator(id("name"))).toHaveText(cuboidName(dims));
    await expect(page.locator(`#stage ${stage} [data-slot]`)).toHaveCount(cuboidStickerCount(dims));
  }
  await page.locator(id("side-0")).selectOption("1");
  await page.locator(id("side-1")).selectOption("1");
  await page.locator(id("side-2")).selectOption("1");
  await expect(page.locator(id("custom-error"))).toHaveText("A cuboid needs one side of 2 or more: 1×1×1 has nothing to turn.");
  await sound(page, errors);
});

test("the list of layers says which turn a quarter and which only a half", async ({ page }) => {
  const errors = await open(page);
  await tap(page, id("pick-domino"));
  // 3×2×3: the two faces of 3×3 are square slices across the height; the others are not.
  await expect(page.locator(`${id("axes")} li[data-axis="1"] span:last-child`)).toHaveText("quarter and half turns");
  await expect(page.locator(`${id("axes")} li[data-axis="0"] span:last-child`)).toHaveText("half turns only");
  await tap(page, id("pick-floppy"));
  await expect(page.locator(`${id("axes")} li[data-axis="2"] span:last-child`)).toHaveText("one cubie deep: the whole puzzle, nothing to turn");
  await sound(page, errors);
});

test("a layer that only half turns follows the pointer to a half turn, goes back from short of the middle, and never makes a quarter", async ({ page }) => {
  const errors = await open(page);
  const dims = [3, 3, 1];
  // Dragged part of the way and let go, it goes back: no move.
  const short = await hold(page, "F", 4, [0, 1]);
  await short.until(40);
  expect(await short.half()).toBe("true");
  await short.rest();
  await short.letGo();
  expect(await settled(page)).toBe(solvedCuboid(dims));
  await expect(page.locator(id("count"))).toHaveText("0");
  // Dragged past the middle, it is a half turn.
  const far = await hold(page, "F", 4, [0, 1]);
  await far.until(100);
  await expect(page.locator(`#stage ${stage}`)).toHaveAttribute("data-committed", "true");
  await far.rest();
  await far.letGo();
  const state = await settled(page);
  expect(state).not.toBe(solvedCuboid(dims));
  await expect(page.locator(id("count"))).toHaveText("1");
  const written = (await page.locator(id("log")).textContent()).trim();
  expect(written).toMatch(/2$/);
  expect(state).toBe(after(dims, written));
  // Undo takes it back.
  await tap(page, id("undo"));
  expect(await settled(page)).toBe(solvedCuboid(dims));
  await sound(page, errors);
});

test("a layer whose slice is square turns a quarter by drag, where the one beside it only halves", async ({ page }) => {
  const errors = await open(page);
  await tap(page, id("pick-domino"));
  const dims = [3, 2, 3];
  // Across the front a drag sideways carries the layer about the up axis: its slice is the 3×3 top, square, so a quarter.
  const across = await hold(page, "F", 1, [1, 0]);
  await across.until(50);
  expect(await across.half()).toBe("false");
  await across.rest();
  await across.letGo();
  const state = await settled(page);
  await expect(page.locator(id("count"))).toHaveText("1");
  const written = (await page.locator(id("log")).textContent()).trim();
  expect(written).toMatch(/^[UED]'?$/);
  expect(state).toBe(after(dims, written));
  // Up and down on the front carries the layer about the long axis: its slice is 2×3, not square, so only a half.
  const up = await hold(page, "F", 1, [0, 1]);
  await up.until(100);
  expect(await up.half()).toBe("true");
  await up.rest();
  await up.letGo();
  await settled(page);
  await expect(page.locator(id("count"))).toHaveText("2");
  expect((await page.locator(id("log")).textContent()).trim()).toMatch(/2$/);
  await sound(page, errors);
});

test("typed notation turns the puzzle, and a quarter turn of a half-turn layer is refused with the way to write it", async ({ page }) => {
  const errors = await open(page);
  await page.locator(id("moves")).fill("R2 U2 M2");
  await tap(page, id("turn"));
  expect(await settled(page)).toBe(after([3, 3, 1], "R2 U2 M2"));
  await expect(page.locator(id("log"))).toHaveText("R2 U2 M2");
  await expect(page.locator(id("count"))).toHaveText("3");
  await page.locator(id("moves")).fill("R");
  await tap(page, id("turn"));
  await expect(page.locator(id("error"))).toContainText("“R” would be a quarter turn");
  await expect(page.locator(id("error"))).toContainText("Write “R2”");
  expect(await settled(page)).toBe(after([3, 3, 1], "R2 U2 M2"));
  await page.locator(id("moves")).fill("F");
  await tap(page, id("turn"));
  await expect(page.locator(id("error"))).toContainText("the whole puzzle");
  await page.locator(id("moves")).fill("Q");
  await tap(page, id("turn"));
  await expect(page.locator(id("error"))).toContainText("“Q” is not a move");
  await tap(page, id("pick-tower"));
  await page.locator(id("moves")).fill("U 2U' R2");
  await tap(page, id("turn"));
  await expect(page.locator(id("error"))).toHaveText("");
  expect(await settled(page)).toBe(after([2, 3, 2], "U 2U' R2"));
  await sound(page, errors);
});

test("a key turns a layer, a half turn where that is all the layer has", async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press("r");
  expect(await settled(page)).toBe(after([3, 3, 1], "R2"));
  await page.keyboard.press("Shift+U");
  expect(await settled(page)).toBe(after([3, 3, 1], "R2 U2"));
  // F is the whole puzzle on a floppy: no move.
  await page.keyboard.press("f");
  expect(await settled(page)).toBe(after([3, 3, 1], "R2 U2"));
  await expect(page.locator(id("count"))).toHaveText("2");
  await tap(page, id("pick-pillar"));
  await page.keyboard.press("u");
  expect(await settled(page)).toBe(after([3, 4, 3], "U"));
  await sound(page, errors);
});

test("a scramble leaves it unsolved with no move of yours counted, and reset brings it home", async ({ page }) => {
  const errors = await open(page);
  for (const key of ["floppy", "domino", "tall-pillar"]) {
    await tap(page, id(`pick-${key}`));
    const dims = CUBOID_PRESETS.find((one) => one.key === key).dims;
    await tap(page, id("scramble"));
    const mixed = await settled(page);
    expect(mixed).not.toBe(solvedCuboid(dims));
    expect(cuboidSolved(mixed, dims)).toBe(false);
    await expect(page.locator(id("count"))).toHaveText("0");
    await expect(page.locator(id("undo"))).toBeDisabled();
    const written = (await page.locator(id("scrambled")).textContent()).trim();
    expect(after(dims, written)).toBe(mixed);
    // Written in the notation, and every piece of it a move this puzzle makes.
    expect(parseCuboidMoves(written, dims)).not.toBeNull();
    expect(written.split(" ").every((piece) => piece.length > 0)).toBe(true);
    await page.keyboard.press("r");
    await settled(page);
    await expect(page.locator(id("count"))).toHaveText("1");
    await expect(page.locator(id("undo"))).toBeEnabled();
    await tap(page, id("undo"));
    expect(await settled(page)).toBe(mixed);
    await tap(page, id("reset"));
    expect(await settled(page)).toBe(solvedCuboid(dims));
    await expect(page.locator(id("scrambled"))).toHaveText("None yet.");
  }
  await sound(page, errors);
});

test("Japanese, and a phone: the page says it in Japanese and nothing is wider than the screen", async ({ page }) => {
  const errors = await open(page, "cuboids.html?lang=ja");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await tap(page, id("pick-floppy"));
  await expect(page.locator(id("says-name"))).toHaveText("フロッピー · 1×3×3");
  await expect(page.locator(`#stage ${stage}`)).toHaveAttribute("aria-label", "3×3×1の直方体パズル");
  await page.locator(id("moves")).fill("R");
  await tap(page, id("turn"));
  await expect(page.locator(id("error"))).toContainText("半回転しかできません");
  await sound(page, errors);
});

test("the tag plays a solve on a cuboid, forward and back", async ({ page }) => {
  const errors = await open(page);
  const element = page.locator("kyuubu-cuboid#embedded");
  await expect(element.locator(stage)).toBeVisible();
  const start = await element.locator(stage).getAttribute("data-state");
  expect(start).toBe(after([3, 3, 1], "U2 R2 M2"));
  await element.locator('button[data-act="on"]').click();
  await expect(element.locator(stage)).toHaveAttribute("data-turning", "false");
  expect(await element.locator(stage).getAttribute("data-state")).toBe(after([3, 3, 1], "U2 R2 M2 M2"));
  await element.locator('button[data-act="again"]').click();
  expect(await element.locator(stage).getAttribute("data-state")).toBe(start);
  // A solve that undoes the scramble ends solved.
  await element.locator('button[data-act="on"]').click();
  await element.locator('button[data-act="on"]').click();
  await element.locator('button[data-act="on"]').click();
  expect(await element.locator(stage).getAttribute("data-state")).toBe(solvedCuboid([3, 3, 1]));
  await expect(element.locator(".kyuubu-cuboid-player-at")).toHaveText("Move 3 of 3");
  expect(cuboidMoveNotation({ axis: 0, layer: 1, turns: 2 }, [3, 3, 1])).toBe("M2");
  await sound(page, errors);
});
