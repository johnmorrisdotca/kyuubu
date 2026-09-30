// The demo, driven as a person drives it: taps, drags, typing. Each flow ends by
// checking that the page still fits the screen, everything to tap is big enough,
// and nothing was complained of.
import { expect, test } from "@playwright/test";

import { CUBE_THEMES, cubeSolved, parseMoves, solvedCube, turnAll } from "../dist/index.js";

import { cube, id, open, panel, sound, tap } from "./page.mjs";

const after = (n, notation) => turnAll(solvedCube(n), n, parseMoves(notation, n));

test("opens with a solved 3×3 on the felt, in the family's look", async ({ page }) => {
  const errors = await open(page);
  expect(await cube(page)).toBe(solvedCube(3));
  await expect(page.locator("h1")).toHaveText("Kyuubuキューブ");
  await expect(page.locator("footer .family a[aria-current='page']")).toHaveText("Kyuubu");
  await expect(page.locator("footer code")).toHaveText("npm install @johnmorrisdotca/kyuubu");
  await expect(page.locator("[data-kyuubu]")).toHaveAttribute("aria-label", "A 3×3 cube");
  // The paper of the family's stylesheet, in light and in dark.
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(244, 239, 228)");
  await sound(page, errors);
});

test("every size from 2×2 to 7×7 is a tap away", async ({ page }) => {
  const errors = await open(page);
  for (const n of [2, 4, 5, 6, 7, 3]) {
    await tap(page, `${id("sizes")} button[data-n="${n}"]`);
    expect(await cube(page)).toBe(solvedCube(n));
    await expect(page.locator(`${id("sizes")} button[data-n="${n}"]`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-kyuubu] [data-slot]")).toHaveCount(6 * n * n);
  }
  await sound(page, errors);
});

test("a sticker dragged turns its layer, and Undo takes it back", async ({ page }) => {
  const errors = await open(page);
  // The middle sticker of the front face's right column, dragged down: the right face turns.
  const sticker = page.locator('[data-kyuubu] [data-face="F"]').nth(5);
  const box = await sticker.boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 20, { steps: 4 });
  await page.mouse.move(from.x, from.y + 60, { steps: 4 });
  await page.mouse.up();
  expect(await cube(page)).toBe(after(3, "R'"));
  await expect(page.locator(id("count"))).toHaveText("1");
  await panel(page, "moves");
  await expect(page.locator(id("log"))).toHaveText("R'");
  await tap(page, id("undo"));
  expect(await cube(page)).toBe(solvedCube(3));
  await expect(page.locator(id("count"))).toHaveText("0");
  await sound(page, errors);
});

test("typed notation turns the cube, and what cannot be turned is refused", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "moves");
  await page.locator(id("moves")).fill("R U R' U'");
  await tap(page, id("turn"));
  expect(await cube(page)).toBe(after(3, "R U R' U'"));
  await expect(page.locator(id("log"))).toHaveText("R U R' U'");
  await expect(page.locator(id("count"))).toHaveText("4");
  await page.locator(id("moves")).fill("R Q");
  await page.locator(id("moves")).press("Enter");
  await expect(page.locator(id("error"))).toHaveText("That is not notation this cube can turn.");
  expect(await cube(page)).toBe(after(3, "R U R' U'"));
  await sound(page, errors);
});

test("the keys turn it, in cubers' notation", async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press("r");
  await page.keyboard.press("Shift+U");
  expect(await cube(page)).toBe(after(3, "R U'"));
  await sound(page, errors);
});

for (const n of [3, 2]) {
  test(`a scrambled ${n}×${n} is solved one step at a time, each step named`, async ({ page }) => {
    const errors = await open(page);
    await tap(page, `${id("sizes")} button[data-n="${n}"]`);
    await tap(page, id("scramble"));
    const scrambled = await cube(page);
    expect(cubeSolved(scrambled, n)).toBe(false);
    await panel(page, "moves");
    await expect(page.locator(id("scrambled"))).not.toHaveText("Nothing yet.");
    await panel(page, "solve");
    await tap(page, id("next"));
    await expect(page.locator(`${id("step")} b`)).toHaveText(/Hold it|White cross|White layer|White corners|Yellow/);
    await expect(page.locator(`${id("done")} li`)).toHaveCount(1);
    for (let taps = 0; taps < 40 && !cubeSolved(await cube(page), n); taps += 1) await tap(page, id("next"));
    expect(cubeSolved(await cube(page), n)).toBe(true);
    // One more tap finds nothing left to do, and says so.
    await tap(page, id("next"));
    await expect(page.locator(id("step"))).toHaveText("It is solved.");
    await sound(page, errors);
  });
}

test("Solve it all solves it, and a cube with no method says which have one", async ({ page }) => {
  const errors = await open(page);
  await tap(page, id("scramble"));
  await tap(page, id("all"));
  expect(cubeSolved(await cube(page), 3)).toBe(true);
  await tap(page, `${id("sizes")} button[data-n="4"]`);
  await expect(page.locator(id("next"))).toBeDisabled();
  await expect(page.locator(id("step"))).toHaveText("Steps are shown for the 2×2 and the 3×3.");
  await sound(page, errors);
});

test("a solve by hand is timed, cheered and kept on the device", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "save");
  await expect(page.locator(id("solves"))).toHaveText("Scramble the cube and solve it, and it is listed here.");
  // A scramble of our own, loaded as text, so that the turns that undo it are known.
  await page.locator(id("text")).fill("2x2\nscramble: R U");
  await tap(page, id("load"));
  await expect(page.locator(id("saved"))).toHaveText("Loaded.");
  expect(await cube(page)).toBe(after(2, "R U"));
  await tap(page, id("scramble"));
  const scramble = (await page.locator(id("text")).inputValue()).match(/scramble: (.+)/)[1];
  const undo = scramble.split(" ").reverse().map((move) => (move.endsWith("2") ? move : move.endsWith("'") ? move.slice(0, -1) : `${move}'`)).join(" ");
  await panel(page, "moves");
  await page.locator(id("moves")).fill(undo);
  await tap(page, id("turn"));
  expect(cubeSolved(await cube(page), 2)).toBe(true);
  await expect(page.locator(id("hint"))).toHaveText(/^Solved: \d+\.\d\d s, 11 moves$/);
  await panel(page, "save");
  await expect(page.locator(`${id("solves")} tbody tr`)).toHaveCount(1);
  await expect(page.locator(`${id("solves")} tbody tr td`).first()).toHaveText("2×2");
  // Still there after the page is opened again, and gone when cleared.
  await page.reload();
  await panel(page, "save");
  await expect(page.locator(`${id("solves")} tbody tr`)).toHaveCount(1);
  await tap(page, id("clear"));
  await expect(page.locator(`${id("solves")} tbody tr`)).toHaveCount(0);
  await sound(page, errors);
});

test("a solve is written as text, and text or JSON is read back", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "moves");
  await page.locator(id("moves")).fill("R U2 F'");
  await tap(page, id("turn"));
  await panel(page, "save");
  await expect(page.locator(id("text"))).toHaveValue("3x3\nsolve: R U2 F'\n");
  await page.locator(id("text")).fill(JSON.stringify({ format: 1, solves: [{ size: 4, scramble: "2R U", moves: "U' 2R'", solved: false }] }));
  await tap(page, id("load"));
  expect(await cube(page)).toBe(solvedCube(4));
  await expect(page.locator(id("text"))).toHaveValue("4x4\nscramble: 2R U\nsolve: U' 2R'\n");
  await page.locator(id("text")).fill("not a solve");
  await tap(page, id("load"));
  await expect(page.locator(id("saved"))).toHaveText("That is not a solve this page can read.");
  const [file] = await Promise.all([page.waitForEvent("download"), tap(page, id("csv"))]);
  expect(file.suggestedFilename()).toBe("kyuubu-solves.csv");
  await sound(page, errors);
});

test("the look changes by theme and by colour, without losing the cube", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "moves");
  await page.locator(id("moves")).fill("R");
  await tap(page, id("turn"));
  const before = await cube(page);
  const up = page.locator('[data-kyuubu] [data-face="U"] > div').first();
  const rgb = (hex) => `rgb(${[1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(", ")})`;
  await expect(up).toHaveCSS("background-color", rgb(CUBE_THEMES.paper.colours.U));
  await panel(page, "look");
  await tap(page, `${id("themes")} button[data-theme-name="standard"]`);
  await expect(up).toHaveCSS("background-color", rgb(CUBE_THEMES.standard.colours.U));
  await page.locator(id("colour-U")).fill("#123456");
  await expect(up).toHaveCSS("background-color", "rgb(18, 52, 86)");
  await expect(page.locator(`${id("themes")} button[aria-pressed="true"]`)).toHaveCount(0);
  expect(await cube(page)).toBe(before);
  await sound(page, errors);
});

test("the language is chosen by a tap, remembered, and overruled by the address", async ({ page }) => {
  const errors = await open(page, "");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#unreviewed")).toBeHidden();
  await tap(page, '[data-lang="ja"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator(id("scramble"))).toHaveText("スクランブル");
  await expect(page.locator("[data-kyuubu]")).toHaveAttribute("aria-label", "3×3のキューブ");
  await expect(page.locator("#unreviewed")).toBeVisible();
  await tap(page, id("scramble"));
  await tap(page, id("next"));
  await expect(page.locator(`${id("step")} b`)).toHaveText(/持ち方|白のクロス/);
  await sound(page, errors);
  await page.reload();
  await expect(page.locator(id("scramble"))).toHaveText("スクランブル");
  await page.goto("http://kyuubu.test/?lang=en");
  await expect(page.locator(id("scramble"))).toHaveText("Scramble");
  await panel(page, "keys");
  await expect(page.locator("#panel-keys tbody tr")).toHaveCount(8);
  await sound(page, errors);
});

test("a browser set to Japanese is answered in Japanese", async ({ browser }) => {
  const context = await browser.newContext({ locale: "ja-JP", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = await open(page, "");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator(id("hint"))).toHaveText(/ステッカーをドラッグ/);
  await sound(page, errors);
  await context.close();
});
