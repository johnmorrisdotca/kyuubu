// The layer follows the drag: driven by a real pointer, a few pixels at a time,
// and let go on either side of the point of no return.
import { expect, test } from "@playwright/test";

import { parseMoves, solvedCube, turnAll } from "../dist/index.js";

import { cube, hold, id, open, panel, sound } from "./page.mjs";

const after = (notation) => turnAll(solvedCube(3), 3, parseMoves(notation, 3));
const root = (page) => page.locator("[data-kyuubu]");
const lit = (page) => page.locator('[data-kyuubu] [data-slot] > div[style*="filter"]');

/** Nothing was made a move: the cube is as it was, the count is nought and nothing is written down. */
async function nothingRecorded(page) {
  expect(await cube(page)).toBe(solvedCube(3));
  await expect(page.locator(id("count"))).toHaveText("0");
  await panel(page, "moves");
  await expect(page.locator(id("log"))).toHaveText("Nothing yet.");
}

test("a slow drag short of the point, let go, goes back and records nothing", async ({ page }) => {
  const errors = await open(page);
  const held = await hold(page);
  await held.to(22);
  // The layer is turned and held: not a move, and not yet past the point.
  await expect(root(page)).toHaveAttribute("data-dragging", "true");
  await expect(root(page)).toHaveAttribute("data-committed", "false");
  await expect(root(page)).toHaveAttribute("data-state", solvedCube(3));
  await expect(page.locator(id("count"))).toHaveText("0");
  await expect(lit(page)).toHaveCount(0);
  await held.rest();
  await held.letGo();
  await expect(root(page)).toHaveAttribute("data-dragging", "false");
  await nothingRecorded(page);
  await sound(page, errors);
});

test("a slow drag there and all the way back records nothing", async ({ page }) => {
  const errors = await open(page);
  const held = await hold(page);
  await held.to(70);
  await expect(root(page)).toHaveAttribute("data-committed", "true");
  await held.to(8);
  await expect(root(page)).toHaveAttribute("data-committed", "false");
  await held.rest();
  await held.letGo();
  await nothingRecorded(page);
  await sound(page, errors);
});

test("a slow drag past the point shows it, and let go records exactly one move", async ({ page }) => {
  const errors = await open(page);
  const held = await hold(page);
  await held.to(38);
  await expect(root(page)).toHaveAttribute("data-committed", "true");
  // The nine stickers round the right face's edge, and its own nine, brighten: the layer says it will go.
  await expect(lit(page)).toHaveCount(21);
  await expect(root(page)).toHaveAttribute("data-state", solvedCube(3));
  await expect(page.locator(id("count"))).toHaveText("0");
  await held.rest();
  await held.letGo();
  expect(await cube(page)).toBe(after("R'"));
  await expect(lit(page)).toHaveCount(0);
  await expect(root(page)).toHaveAttribute("data-committed", "false");
  await expect(page.locator(id("count"))).toHaveText("1");
  await panel(page, "moves");
  await expect(page.locator(id("log"))).toHaveText("R'");
  await sound(page, errors);
});

test("dragged one way, then back past where it began to the other side, records the inverse", async ({ page }) => {
  const errors = await open(page);
  const held = await hold(page);
  await held.to(50);
  await held.to(-50);
  await held.rest();
  await held.letGo();
  expect(await cube(page)).toBe(after("R"));
  await expect(page.locator(id("count"))).toHaveText("1");
  await panel(page, "moves");
  await expect(page.locator(id("log"))).toHaveText("R");
  await sound(page, errors);
});

test("dragged past a quarter turn and on, it is one half turn", async ({ page }) => {
  const errors = await open(page);
  const held = await hold(page, 2);
  await held.to(135);
  await held.rest();
  await held.letGo();
  expect(await cube(page)).toBe(after("R2"));
  await expect(page.locator(id("count"))).toHaveText("1");
  await panel(page, "moves");
  await expect(page.locator(id("log"))).toHaveText("R2");
  await sound(page, errors);
});

test.describe("a flick", () => {
  // A flick is a matter of milliseconds, and an emulated phone sometimes holds a pointer event back a tenth of a second,
  // which makes it no flick at all. The rule itself is tested exactly in test/drag.test.ts; here it may try again.
  test.describe.configure({ retries: 3 });

  test("a flick, short and fast, still makes the quarter turn", async ({ page }) => {
    const errors = await open(page);
    const held = await hold(page);
    // Under thirty degrees' worth of pointer, well short of the point, in one quick movement: a second would come late, since an emulated phone holds pointer moves back.
    await held.by(0, Math.round((await held.quarterPx()) * 0.3), 1);
    await held.letGo();
    expect(await cube(page)).toBe(after("R'"));
    await expect(page.locator(id("count"))).toHaveText("1");
    await sound(page, errors);
  });
});

test("Escape, a cancelled pointer and a drag off the cube each put the layer back and record nothing", async ({ page }) => {
  const errors = await open(page);
  let held = await hold(page);
  await held.to(60);
  await page.keyboard.press("Escape");
  await expect(root(page)).toHaveAttribute("data-dragging", "false");
  // The pointer is still down: moving on and letting go does nothing more.
  await held.by(0, 30);
  await held.letGo();
  await nothingRecorded(page);

  await panel(page, "solve");
  held = await hold(page);
  await held.to(60);
  await root(page).dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
  await expect(root(page)).toHaveAttribute("data-dragging", "false");
  await held.letGo();
  await nothingRecorded(page);

  await panel(page, "solve");
  // The cube in the middle of the window, so that there is somewhere off it to go.
  await root(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  held = await hold(page);
  await held.to(-40);
  const box = await root(page).boundingBox();
  // Up and off the cube's element, past the room a long drag is allowed.
  const off = box.y - Math.max(32, Math.min(box.width, box.height) * 0.25) - 12;
  expect(off).toBeGreaterThan(0);
  await page.mouse.move(held.from.x, off, { steps: 6 });
  await expect(root(page)).toHaveAttribute("data-dragging", "false");
  await held.letGo();
  await nothingRecorded(page);
  await sound(page, errors);
});

test("a drag that could be either layer waits, then keeps the layer it picked", async ({ page }) => {
  const errors = await open(page);
  const held = await hold(page);
  // Straight down the right column, then well off to the side: the right face stays the one held.
  await held.to(40);
  await held.by(70, 0);
  await expect(root(page)).toHaveAttribute("data-dragging", "true");
  await held.rest();
  await held.letGo();
  const state = await cube(page);
  expect([after("R'"), after("R2"), solvedCube(3), after("R")]).toContain(state);
  await panel(page, "moves");
  await expect(page.locator(id("log"))).toHaveText(/^(R'|R2|R|Nothing yet\.)$/);
  await sound(page, errors);
});

test("the speed of turns made by keys and notation is chosen under Controls", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "keys");
  await expect(page.locator(`${id("speeds")} button[aria-pressed="true"]`)).toHaveText("Normal");
  await page.locator(`${id("speeds")} button[data-ms="500"]`).click();
  await expect(page.locator(`${id("speeds")} button[aria-pressed="true"]`)).toHaveText("Slow");
  await page.keyboard.press("r");
  expect(await cube(page)).toBe(after("R"));
  await sound(page, errors);
});

// Safari on a phone once drew the cube as one flat face after letting go of its 3D layers. The cube asks for none now:
// every sticker carries its own place on the screen, so even a browser that draws everything flat, as the WebKit these
// tests run does, shows three whole faces.
test("draws three whole faces with no 3D context to lose", async ({ page }) => {
  await open(page);
  const nested = await page.locator("[data-kyuubu], [data-kyuubu] *").evaluateAll((all) => all.filter((element) => getComputedStyle(element).transformStyle === "preserve-3d").length);
  expect(nested).toBe(0);
  await expect(page.locator("[data-kyuubu] [data-slot]:visible")).toHaveCount(27);
  const faces = await page.locator("[data-kyuubu] [data-slot]:visible").evaluateAll((all) => [...new Set(all.map((element) => element.dataset.face))].sort().join(""));
  expect(faces).toBe("FRU");
  // Stickers side by side, not piled on one another: 27 of them cover 27 different places.
  const places = await page.locator("[data-kyuubu] [data-slot]:visible").evaluateAll((all) => new Set(all.map((element) => { const box = element.getBoundingClientRect(); return `${Math.round(box.x / 4)},${Math.round(box.y / 4)}`; })).size);
  expect(places).toBe(27);
});

// A touch that begins on the cube turns it and never scrolls or zooms the page; one beside the cube is the page's.
test("keeps a touch that begins on the cube from scrolling or zooming the page", async ({ page }) => {
  await open(page);
  const refused = await page.evaluate(() => {
    const touch = (target) => {
      const event = new window.Event("touchstart", { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    return { cube: touch(document.querySelector("[data-kyuubu] [data-slot]")), page: touch(document.querySelector("h1") ?? document.body) };
  });
  expect(refused).toEqual({ cube: true, page: false });
});
