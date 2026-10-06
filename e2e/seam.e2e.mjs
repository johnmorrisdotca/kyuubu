// A drag that begins on the seam between two layers turns both, like a real cube; one that begins anywhere else on a
// sticker turns the one; two fingers on two neighbouring layers turn both. Measured with real touches (Chromium's own
// touch input), as a phone sends them, so that the band that counts as the seam is what a finger can hit and no more.
import { expect, test } from "@playwright/test";

import { applySolve, parseSolve, solvedCube } from "../dist/index.js";

import { cube, id, open, panel, sound, tap } from "./page.mjs";

const root = (page) => page.locator(":is(#stage, #player) [data-kyuubu]");
const wide = (text) => applySolve(solvedCube(3), 3, parseSolve(text, 3).steps);
const lit = (page) => page.locator(":is(#stage, #player) [data-kyuubu] [data-seam-lit]");

/** The middle of the front face's centre sticker and of the one to its right, and the way down the cube: where fingers go. */
async function front(page) {
  await root(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  const boxes = await Promise.all([4, 5].map((nth) => page.locator(':is(#stage, #player) [data-kyuubu] [data-face="F"]').nth(nth).boundingBox()));
  const [centre, right] = boxes.map((box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }));
  const stage = await root(page).boundingBox();
  const quarter = ((Math.min(stage.width, stage.height) * 0.9) / Math.sqrt(3)) * 0.7;
  /** A point this share of the way from the right sticker's middle to the centre one's: 0.5 is on the seam between them. */
  const toward = (share) => ({ x: right.x + (centre.x - right.x) * share, y: right.y + (centre.y - right.y) * share });
  return { centre, right, quarter, toward };
}

/** A touch, or several, driven through Chromium's own input. */
async function fingers(page) {
  const client = await page.context().newCDPSession(page);
  const send = (type, points) => client.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((point, index) => ({ x: point.x, y: point.y, id: index + 1 })) });
  return {
    down: (points) => send("touchStart", points),
    move: (points) => send("touchMove", points),
    up: () => send("touchEnd", []),
    /** Down, a drag straight down by this many pixels in small steps, a pause so that it is no flick, and up. */
    async drag(points, pixels, { before } = {}) {
      await send("touchStart", points);
      if (before !== undefined) await before();
      for (let at = 6; at <= pixels; at += 6) await send("touchMove", points.map((point) => ({ x: point.x, y: point.y + at })));
      await page.waitForTimeout(170);
      await send("touchEnd", []);
      await expect(root(page)).toHaveAttribute("data-turning", "false");
    },
  };
}

test.describe("on a phone, with real touches", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "the touches are Chromium's own");
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("a drag that begins in the middle of a sticker, or well off the seam, turns one layer", async ({ page }) => {
    const errors = await open(page);
    const touch = await fingers(page);
    const { right, centre, quarter, toward } = await front(page);
    // From the middle of the right-hand sticker out to a third of the way to the seam, and the other way, off the edge of the cube.
    const places = [right, toward(0.1), toward(0.2), toward(0.28), { x: right.x - (centre.x - right.x) * 0.45, y: right.y - (centre.y - right.y) * 0.45 }];
    for (const place of places) {
      await page.locator(id("reset")).click();
      await touch.drag([place], quarter * 0.7, { before: async () => expect(await lit(page).count()).toBe(0) });
      await expect(page.locator(id("count"))).toHaveText("1");
      expect(await cube(page)).toBe(applySolve(solvedCube(3), 3, parseSolve("R'", 3).steps));
    }
    await sound(page, errors);
  });

  test("a drag that begins on the seam shows the two layers, then turns both together as a wide turn", async ({ page }) => {
    const errors = await open(page);
    const touch = await fingers(page);
    const { quarter, toward } = await front(page);
    for (const share of [0.5, 0.45, 0.42]) {
      await page.locator(id("reset")).click();
      await touch.drag([toward(share)], quarter * 0.7, {
        before: async () => {
          // Before it has moved at all: the two layers are ringed, so the reader sees what will turn.
          await expect(root(page)).toHaveAttribute("data-seam", "near");
          expect(await lit(page).count()).toBe(33);
        },
      });
      await expect(page.locator(id("count"))).toHaveText("2");
      expect(await cube(page), `at ${share}`).toBe(wide("Rw'"));
      await expect(lit(page)).toHaveCount(0);
      await expect(root(page)).not.toHaveAttribute("data-seam", /./);
    }
    await sound(page, errors);
  });

  test("the band is narrow: from 0.3 of the way to the seam it is one layer, from 0.34, two", async ({ page }) => {
    await open(page);
    const touch = await fingers(page);
    const { quarter, toward } = await front(page);
    const counted = [];
    for (const share of [0.3, 0.34, 0.38, 0.42, 0.46]) {
      await page.locator(id("reset")).click();
      await touch.drag([toward(share)], quarter * 0.7);
      counted.push([share, await page.locator(id("count")).textContent()]);
    }
    // One layer up to 0.3 of the way from a sticker's middle to the seam, two from 0.34: a band of about a fifth of a sticker each side of the line.
    expect(counted.map(([, count]) => count)).toEqual(["1", "2", "2", "2", "2"]);
  });

  test("a drag along the seam's other way, across it, is one layer as ever", async ({ page }) => {
    await open(page);
    const touch = await fingers(page);
    const { toward } = await front(page);
    const start = toward(0.5);
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start.x, y: start.y, id: 1 }] });
    // Straight across the cube, the way the seam lies across: the middle row turns, and not both columns.
    for (let at = 6; at <= 80; at += 6) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + at, y: start.y, id: 1 }] });
    await page.waitForTimeout(170);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(root(page)).toHaveAttribute("data-turning", "false");
    await expect(page.locator(id("count"))).toHaveText("1");
    expect(touch).toBeDefined();
  });

  test("two fingers on two neighbouring layers, dragged together, turn both", async ({ page }) => {
    const errors = await open(page);
    const touch = await fingers(page);
    const { centre, right, quarter } = await front(page);
    await touch.drag([centre, right], quarter * 0.7);
    await expect(page.locator(id("count"))).toHaveText("2");
    expect(await cube(page)).toBe(wide("Rw'"));
    // Two fingers on layers that are not neighbours turn the one the first is on.
    await page.locator(id("reset")).click();
    const boxes = await Promise.all([3, 5].map((nth) => page.locator(':is(#stage, #player) [data-kyuubu] [data-face="F"]').nth(nth).boundingBox()));
    const [left, far] = boxes.map((box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }));
    await touch.drag([left, far], quarter * 0.7);
    await expect(page.locator(id("count"))).toHaveText("1");
    await sound(page, errors);
  });
});

test("with a mouse too: a press on the seam turns two layers, and on the sticker one", async ({ page }) => {
  await open(page);
  const { quarter, toward } = await front(page);
  for (const [share, count] of [[0.5, "2"], [0.1, "1"]]) {
    await page.locator(id("reset")).click();
    const from = toward(share);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let at = 3; at <= quarter * 0.7; at += 3) await page.mouse.move(from.x, from.y + at);
    await page.waitForTimeout(170);
    await page.mouse.up();
    await expect(root(page)).toHaveAttribute("data-turning", "false");
    await expect(page.locator(id("count"))).toHaveText(count);
  }
});

test("the guide's arrow for a wide turn is made by one drag from the dot at its tail, on the seam", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "moves");
  await page.locator(id("moves")).fill("Rw' U");
  await tap(page, id("show-typed"));
  await expect(page.locator('[data-guide="how"]')).toContainText("line between them");
  await expect(root(page)).toHaveAttribute("data-hint", "drag");
  await root(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  const [dx, dy] = (await page.locator("[data-hint-arrow]").getAttribute("data-drag")).split(",").map(Number);
  const dot = await page.locator("[data-hint-arrow] circle").first().boundingBox();
  const from = { x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step < 400; step += 1) {
    await page.mouse.move(from.x + dx * step * 3, from.y + dy * step * 3);
    if (Math.abs(Number((await root(page).getAttribute("data-angle")) ?? 0)) >= 70) break;
  }
  await page.waitForTimeout(170);
  await page.mouse.up();
  await expect(root(page)).toHaveAttribute("data-turning", "false");
  expect(await cube(page)).toBe(wide("Rw'"));
  // Both layers were heard, so the guide has moved on to the next move.
  await expect(page.locator('.kyuubu-guide [data-guide="move"]')).toHaveText("U");
  await sound(page, errors);
});
