// The famous solves page, the player's controls and the embed page, by real presses.
import { expect, test } from "@playwright/test";

import { serve } from "./page.mjs";

const player = (page) => page.locator("[data-kyuubu-player]");
const open = async (page, address = "famous.html") => {
  await serve(page);
  await page.goto(`http://kyuubu.test/${address}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
};

test("a famous solve plays from its scramble to a solved cube, at its own pace", async ({ page }) => {
  await open(page);
  const solves = page.getByTestId("solve");
  expect(await solves.count()).toBeGreaterThanOrEqual(12);
  await solves.filter({ hasText: "Max Park" }).click();
  await expect(page.getByTestId("watch-title")).toContainText("3.13");
  await expect(player(page)).toHaveAttribute("data-playing", "true");
  await expect(player(page)).toHaveAttribute("data-ended", "true", { timeout: 8000 });
  await expect(player(page).locator("[data-kyuubu]")).toHaveAttribute("data-state", /^(.)\1{8}(.)\2{8}(.)\3{8}(.)\4{8}(.)\5{8}(.)\6{8}$/);
  await expect(page.getByTestId("facts")).toContainText("Pride in Long Beach 2023");
  await expect(page).toHaveURL(/#solve=park-3\.13$/);
});

test("pause, a step either way, restart, the scrubber, the speed and repeat", async ({ page }) => {
  await open(page, "famous.html#solve=pons-11.75");
  const act = (name) => player(page).locator(`[data-act="${name}"]`);
  await expect(player(page)).toHaveAttribute("data-position", "0");
  await act("on").click();
  await expect(player(page)).toHaveAttribute("data-position", "1");
  await act("on").click();
  await act("back").click();
  await expect(player(page)).toHaveAttribute("data-position", "1");
  await act("play").click();
  await expect(player(page)).toHaveAttribute("data-playing", "true");
  await act("pause").click();
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  const held = Number(await player(page).getAttribute("data-position"));
  expect(held).toBeGreaterThan(1);
  await player(page).locator('[data-speed="0.25"]').click();
  await expect(player(page).locator('[data-speed="0.25"]')).toHaveAttribute("aria-pressed", "true");
  await act("loop").click();
  await expect(act("loop")).toHaveAttribute("aria-pressed", "true");
  await player(page).locator("input[type=range]").fill("5");
  await expect(player(page)).toHaveAttribute("data-position", "5");
  // Restart goes back to the scrambled cube and waits there.
  await act("play").click();
  await act("again").click();
  await expect(player(page)).toHaveAttribute("data-playing", "false");
  await expect(player(page)).toHaveAttribute("data-position", "0");
  await expect(player(page).locator("[data-kyuubu]")).not.toHaveAttribute("data-state", /^(.)\1{8}/);
});

test("a pasted solve with comments and wide turns plays; a bad one says which piece; an unsolved one says so", async ({ page }) => {
  await open(page);
  await page.locator("#tab-paste").click();
  await page.getByTestId("p-scramble").fill("L B R2 B' R2 U2 F D R2 U R2 F2 D2 R U B L2");
  await page.getByTestId("p-moves").fill("x' // inspection\nr' U F U' r U' r' U2 r' U r // xxxcross\nR U2' R2' U' R U R U2' R' // 4th pair\nU' F' r U R' U' r' F R // ZBLL");
  await page.getByTestId("p-time").fill("2.76");
  await page.getByTestId("p-play").click();
  await expect(player(page)).toHaveAttribute("data-ended", "true", { timeout: 8000 });
  await expect(player(page).locator(".kyuubu-player-note")).toContainText("2.76");
  await page.getByTestId("p-moves").fill("R U Q2");
  await page.getByTestId("p-play").click();
  await expect(player(page).locator(".kyuubu-player-note")).toContainText("Q2");
  await page.getByTestId("p-moves").fill("R U");
  await page.getByTestId("p-play").click();
  await expect(player(page).locator(".kyuubu-player-note")).toContainText("do not end on a solved cube");
});

test("a link to alg.cubing.net pasted in is the whole solve", async ({ page }) => {
  await open(page);
  await page.locator("#tab-paste").click();
  await page.getByTestId("p-moves").fill("https://alg.cubing.net/?setup=R_U_R-_U-&alg=U_R_U-_R-_%2F%2F_back_again");
  await page.getByTestId("p-play").click();
  await expect(page.getByTestId("p-scramble")).toHaveValue("R U R' U'");
  await expect(player(page)).toHaveAttribute("data-ended", "true", { timeout: 8000 });
});

test("the embed code is written for what is showing, and the embed page plays it", async ({ page }) => {
  await open(page, "famous.html#solve=du-3.47");
  await page.locator("#tab-embed").click();
  const frame = await page.getByTestId("e-frame").inputValue();
  expect(frame).toMatch(/^<iframe src="[^"]+embed\.html#/);
  expect(await page.getByTestId("e-tag").inputValue()).toContain("<kyuubu-cube");
  expect(await page.getByTestId("e-link").inputValue()).toMatch(/famous\.html#solve=du-3\.47$/);
  const src = /src="([^"]+)"/.exec(frame)[1].replace(/&amp;/g, "&");
  await page.setViewportSize({ width: 360, height: 600 });
  await page.goto(`http://kyuubu.test/${new URL(src).pathname.split("/").pop()}${new URL(src).hash}&autoplay=1`);
  await expect(player(page)).toHaveAttribute("data-ended", "true", { timeout: 8000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("the page is in Japanese when asked, and fits", async ({ page }) => {
  await open(page, "famous.html?lang=ja");
  await expect(page.locator("#tab-list")).toHaveText("有名なソルブ");
  await expect(player(page).locator('[data-act="play"]')).toHaveText("再生");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("the custom element draws a solve from its attributes and tells the page as it goes", async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    await import("./dist/element-define.js");
    const el = document.createElement("kyuubu-cube");
    el.id = "made";
    el.setAttribute("scramble", "R U R' U'");
    el.setAttribute("moves", "U R U' R'");
    el.setAttribute("time", "1");
    el.setAttribute("autoplay", "");
    window.heard = [];
    el.addEventListener("kyuubu-end", () => window.heard.push("end"));
    document.querySelector("main").append(el);
  });
  const made = page.locator("#made [data-kyuubu-player]");
  await expect(made).toHaveAttribute("data-ended", "true", { timeout: 8000 });
  // The end is told a step's time after the last step is made.
  await expect.poll(() => page.evaluate(() => window.heard)).toEqual(["end"]);
  expect(await page.evaluate(() => document.getElementById("made").status.position)).toBe(4);
});

test("on the cube's own page a pasted solve with comments is turned, and a big cube can always be taken back", async ({ page }) => {
  await serve(page);
  await page.goto("http://kyuubu.test/?lang=en");
  await expect(page.locator("#stage [data-kyuubu]")).toBeVisible();
  await page.locator("#tab-moves").click();
  await page.getByTestId("moves").fill("x' // inspection\nr' U F // cross");
  await page.getByTestId("turn").click();
  await expect(page.getByTestId("error")).toHaveText("");
  await expect(page.getByTestId("log")).not.toHaveText("Nothing yet.");
  await page.getByTestId("moves").fill("R U Q");
  await page.getByTestId("turn").click();
  await expect(page.getByTestId("error")).toContainText("Q");
  await page.getByTestId("sizes").locator('button[data-n="4"]').click();
  await page.locator("#tab-solve").click();
  await expect(page.getByTestId("all")).toBeDisabled();
  await page.getByTestId("scramble").click();
  await expect(page.getByTestId("all")).toBeEnabled();
  await page.getByTestId("all").click();
  await expect(page.locator("#stage [data-kyuubu]")).toHaveAttribute("data-state", /^U{16}R{16}F{16}D{16}L{16}B{16}$/, { timeout: 30000 });
});
