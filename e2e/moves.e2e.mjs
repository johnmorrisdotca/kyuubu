// The move just made, in large type and in words; the moves as buttons that follow the replay and take it anywhere;
// the keys; what a screen reader is told; and the slider turning the cube the way it goes.
import { expect, test } from "@playwright/test";

import { FAMOUS_SOLVES } from "../dist/famous.js";
import { moveName, planReplay } from "../dist/index.js";

import { serve } from "./page.mjs";

const solve = FAMOUS_SOLVES.find((one) => one.id === "park-3.13");
const planned = planReplay({ size: solve.size, scramble: solve.scramble, solution: solve.solution, timeMs: solve.timeMs });
if (!planned.ok) throw new Error("the solve should plan");
const plan = planned.plan;
const S = plan.scramble.length;
const T = plan.steps.length;

const player = (page) => page.locator("[data-kyuubu-player]");
const code = (page) => page.locator("[data-kyuubu-code]");
const says = (page) => page.locator("[data-kyuubu-says]");
const token = (page, index) => page.locator(`[data-kyuubu-moves] button[data-index="${index}"]`);
const current = (page) => page.locator('[data-kyuubu-moves] button[aria-current="step"]');
const stateOf = (page) => page.locator("[data-kyuubu-player] [data-kyuubu]").getAttribute("data-state");
const open = async (page, address = "famous.html#solve=park-3.13") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await serve(page);
  await page.goto(`http://kyuubu.test/${address}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  return errors;
};
const still = (page) => expect(page.locator("[data-kyuubu-player] [data-kyuubu]")).toHaveAttribute("data-turning", "false");

test("the move just made is in large type with what it turns in words, and moves with Forward and Back", async ({ page }) => {
  const errors = await open(page);
  // The scrambled cube: the scramble's last move is the one just made, and says so.
  await expect(code(page)).toHaveText(plan.scramble[S - 1].text);
  await expect(page.locator("[data-kyuubu-where]")).toHaveText(`Scramble move ${S} of ${S}`);
  await page.locator('[data-act="on"]').click();
  await expect(code(page)).toHaveText(plan.steps[0].text);
  await expect(says(page)).toHaveText("Whole cube on x, twice");
  await expect(page.locator(".kyuubu-player-at")).toHaveText(`Move 1 of ${T}`);
  await page.locator('[data-act="on"]').click();
  await expect(code(page)).toHaveText("R'");
  await expect(says(page)).toHaveText("Right face, anticlockwise");
  await expect(page.locator("[data-kyuubu-where]")).toHaveText("");
  await page.locator('[data-act="back"]').click();
  await expect(code(page)).toHaveText(plan.steps[0].text);
  // Large: the code is the biggest type in the player.
  const size = await code(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(28);
  expect(errors).toEqual([]);
});

test("every move reads in Japanese too", async ({ page }) => {
  await open(page, "famous.html?lang=ja#solve=park-3.13");
  await page.locator('[data-act="on"]').click();
  await page.locator('[data-act="on"]').click();
  await expect(says(page)).toHaveText("右の面、反時計回り");
  await expect(token(page, S + 1)).toHaveAttribute("aria-label", /^R'：右の面、反時計回り。33手中2手目$/);
});

test("the list has every move of the scramble and the solve as a button, named with its code, its words and where it is", async ({ page }) => {
  await open(page);
  await expect(page.locator("[data-kyuubu-moves] button")).toHaveCount(S + T);
  await expect(page.locator('[data-kyuubu-moves] [role="group"]').first()).toHaveAttribute("aria-label", "Scramble");
  for (const index of [0, S - 1, S, S + 1, S + T - 1]) {
    const step = index < S ? plan.scramble[index] : plan.steps[index - S];
    await expect(token(page, index)).toHaveText(step.text);
    const where = index < S ? `Scramble move ${index + 1} of ${S}` : `Move ${index - S + 1} of ${T}`;
    await expect(token(page, index)).toHaveAttribute("aria-label", `${step.text}: ${moveName(step.text)}. ${where}`);
  }
  // The scramble's last move is the one just made on the scrambled cube.
  await expect(current(page)).toHaveAttribute("data-index", String(S - 1));
});

test("a press on a move takes the replay there, and the cube is the cube after it", async ({ page }) => {
  await open(page);
  await token(page, S + 9).click();
  await expect(player(page)).toHaveAttribute("data-position", "10");
  await still(page);
  expect(await stateOf(page)).toBe(plan.states[10]);
  await expect(current(page)).toHaveAttribute("data-index", String(S + 9));
  await expect(code(page)).toHaveText(plan.steps[9].text);
  // Into the scramble, and the cube is the cube after that many steps of it.
  await token(page, 5).click();
  await still(page);
  expect(await stateOf(page)).toBe(plan.scrambleStates[6]);
  await expect(code(page)).toHaveText(plan.scramble[5].text);
  await expect(page.locator("[data-kyuubu-where]")).toHaveText(`Scramble move 6 of ${S}`);
  await expect(page.locator(".kyuubu-player-at")).toHaveText(`Move 0 of ${T}`);
  // Playing from there turns the rest of the scramble, and the solve.
  await page.locator('[data-act="play"]').click();
  await expect(player(page)).toHaveAttribute("data-ended", "true", { timeout: 9000 });
  await still(page);
  expect(await stateOf(page)).toBe(plan.states[T]);
});

test("the marked move follows the replay as it plays, and the list scrolls to keep it in view without moving the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await player(page).locator('[data-speed="0.25"]').click();
  await page.locator('[data-act="play"]').click();
  const before = await page.evaluate(() => window.scrollY);
  const seen = [];
  for (let at = 0; at < 14; at += 1) {
    const [position, index] = await page.evaluate(() => [Number(document.querySelector("[data-kyuubu-player]").dataset.position), Number(document.querySelector('[data-kyuubu-moves] button[aria-current="step"]')?.dataset.index ?? -1)]);
    seen.push([position, index]);
    await page.waitForTimeout(180);
  }
  await page.locator('[data-act="pause"]').click();
  for (const [position, index] of seen) expect(index, `at ${position}`).toBe(S + position - 1);
  expect(new Set(seen.map(([position]) => position)).size).toBeGreaterThan(3);
  // The marked move is inside the list's own box, which scrolled, and the page did not.
  const inside = await page.evaluate(() => {
    const box = document.querySelector("[data-kyuubu-moves]").getBoundingClientRect();
    const mark = document.querySelector('[data-kyuubu-moves] button[aria-current="step"]').getBoundingClientRect();
    return { visible: mark.top >= box.top - 1 && mark.bottom <= box.bottom + 1, scrolled: document.querySelector("[data-kyuubu-moves]").scrollTop };
  });
  expect(inside.visible).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("the arrow keys step, and Home and End go to the first and last move of the solve", async ({ page }) => {
  await open(page);
  await token(page, S + 3).click();
  await expect(player(page)).toHaveAttribute("data-position", "4");
  await page.keyboard.press("ArrowRight");
  await expect(player(page)).toHaveAttribute("data-position", "5");
  await expect(token(page, S + 4)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(player(page)).toHaveAttribute("data-position", "3");
  await expect(token(page, S + 2)).toBeFocused();
  await page.keyboard.press("End");
  await expect(player(page)).toHaveAttribute("data-position", String(T));
  await expect(token(page, S + T - 1)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(player(page)).toHaveAttribute("data-position", "1");
  await page.keyboard.press("ArrowLeft");
  // Back past the first move is the scrambled cube, and on into the scramble.
  await expect(player(page)).toHaveAttribute("data-position", "0");
  await expect(current(page)).toHaveAttribute("data-index", String(S - 1));
  await page.keyboard.press("ArrowLeft");
  await expect(current(page)).toHaveAttribute("data-index", String(S - 2));
  await still(page);
  expect(await stateOf(page)).toBe(plan.scrambleStates[S - 1]);
  // Tab reaches the list once, at the move just made.
  const stops = await page.locator("[data-kyuubu-moves] button[tabindex='0']").count();
  expect(stops).toBe(1);
  // From another button of the player the same keys work.
  await page.locator('[data-act="on"]').focus();
  await page.keyboard.press("End");
  await expect(player(page)).toHaveAttribute("data-position", String(T));
});

test("a screen reader is told the move as it changes, once the cube has been still a moment, and not for every move of a solve playing", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    window.told = [];
    new MutationObserver(() => window.told.push(document.querySelector("[data-kyuubu-live]").textContent)).observe(document.querySelector("[data-kyuubu-live]"), { childList: true, characterData: true, subtree: true });
  });
  const live = page.locator("[data-kyuubu-live]");
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toHaveAttribute("role", "status");
  // Nothing is said for what was there when the page opened.
  await expect(live).toHaveText("");
  await token(page, S + 9).click();
  await expect(live).toHaveText(`${plan.steps[9].text}: ${moveName(plan.steps[9].text)}. Move 10 of ${T}.`);
  await page.evaluate(() => (window.told.length = 0));
  await page.locator('[data-act="again"]').click();
  await page.locator('[data-act="play"]').click();
  await expect(player(page)).toHaveAttribute("data-ended", "true", { timeout: 9000 });
  await expect(live).toHaveText(new RegExp(`Move ${T} of ${T}\\.$`));
  const told = await page.evaluate(() => window.told.filter((text) => text !== "").length);
  // Thirty-three moves in about three seconds, and a handful of lines.
  expect(told).toBeGreaterThan(0);
  expect(told).toBeLessThan(10);
  // The marked move says where it is to a reader of the page too.
  await expect(current(page)).toHaveAttribute("aria-current", "step");
});

test.describe("the slider turns the cube the way it goes", () => {
  test.use({ reducedMotion: "no-preference" });

  /** Every time the cube says it is turning, and every state it showed: what a drag of the slider made it do. */
  const watch = (page) =>
    page.evaluate(() => {
      const cube = document.querySelector("[data-kyuubu-player] [data-kyuubu]");
      window.turned = { turning: 0, states: [] };
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.attributeName === "data-turning" && cube.dataset.turning === "true") window.turned.turning += 1;
          if (record.attributeName === "data-state") window.turned.states.push(cube.dataset.state);
        }
      }).observe(cube, { attributes: true, attributeFilter: ["data-turning", "data-state"] });
    });

  test("going back turns each move undone, in reverse, and ends on the cube a jump would show", async ({ page }) => {
    await open(page);
    await token(page, S + 11).click();
    await still(page);
    await watch(page);
    await player(page).locator("input[type=range]").fill("8");
    await expect(player(page)).toHaveAttribute("data-position", "8");
    await still(page);
    expect(await stateOf(page)).toBe(plan.states[8]);
    const made = await page.evaluate(() => window.turned);
    // Three moves undone, one after another: it was turning, and the cube went through the cubes between.
    expect(made.turning).toBeGreaterThanOrEqual(1);
    expect(made.states).toContain(plan.states[10]);
    expect(made.states).toContain(plan.states[9]);
    expect(made.states.indexOf(plan.states[10])).toBeLessThan(made.states.indexOf(plan.states[9]));
    expect(made.states.at(-1)).toBe(plan.states[8]);
  });

  test("going on turns each move, and a long jump catches up at once and ends on the same cube", async ({ page }) => {
    await open(page);
    await watch(page);
    await player(page).locator("input[type=range]").fill("3");
    await still(page);
    expect(await stateOf(page)).toBe(plan.states[3]);
    const first = await page.evaluate(() => window.turned);
    expect(first.states).toContain(plan.states[1]);
    expect(first.states).toContain(plan.states[2]);
    await page.evaluate(() => (window.turned.states.length = 0));
    await player(page).locator("input[type=range]").fill("30");
    await still(page);
    expect(await stateOf(page)).toBe(plan.states[30]);
    const long = await page.evaluate(() => window.turned);
    // Not every move between 3 and 30 was shown.
    expect(long.states.length).toBeLessThan(15);
    expect(long.states.at(-1)).toBe(plan.states[30]);
  });

  test("a new drag cancels the catch-up, and the cube ends where the slider does", async ({ page }) => {
    await open(page);
    const range = player(page).locator("input[type=range]");
    await range.fill("20");
    await range.fill("4");
    await range.fill("26");
    await range.fill("11");
    await still(page);
    await expect(player(page)).toHaveAttribute("data-position", "11");
    expect(await stateOf(page)).toBe(plan.states[11]);
    await expect(current(page)).toHaveAttribute("data-index", String(S + 10));
  });

  test("with the choice off the cube jumps, and turns nothing", async ({ page }) => {
    await open(page);
    await page.getByTestId("animate-scrub").click();
    await expect(page.getByTestId("animate-scrub")).toHaveAttribute("aria-pressed", "false");
    await watch(page);
    await player(page).locator("input[type=range]").fill("6");
    await expect(player(page)).toHaveAttribute("data-position", "6");
    expect(await stateOf(page)).toBe(plan.states[6]);
    expect((await page.evaluate(() => window.turned)).turning).toBe(0);
    await page.getByTestId("animate-scrub").click();
    await player(page).locator("input[type=range]").fill("3");
    await still(page);
    expect((await page.evaluate(() => window.turned)).turning).toBeGreaterThan(0);
  });
});

test("the player and the page fit a phone, light and dark", async ({ page }) => {
  for (const scheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), scheme).toBeLessThanOrEqual(0);
    const small = await page.locator("[data-kyuubu-moves] button").evaluateAll((all) => all.filter((el) => el.getBoundingClientRect().width < 43.5 || el.getBoundingClientRect().height < 43.5).length);
    expect(small).toBe(0);
  }
});

test("the element and the embed can leave the readout, the list and the scrub out", async ({ page }) => {
  await open(page);
  const result = await page.evaluate(async () => {
    await import("./dist/element-define.js");
    const make = (attributes) => {
      const el = document.createElement("kyuubu-cube");
      el.setAttribute("scramble", "R U R' U'");
      el.setAttribute("moves", "U R U' R'");
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      document.querySelector("main").append(el);
      return el;
    };
    const plain = make({});
    const bare = make({ readout: "false", movelist: "false", scrub: "false" });
    const off = make({ controls: "false" });
    const asked = make({ controls: "false", readout: "" });
    return {
      plain: [!!plain.querySelector("[data-kyuubu-readout]"), !!plain.querySelector("[data-kyuubu-moves]")],
      bare: [!!bare.querySelector("[data-kyuubu-readout]"), !!bare.querySelector("[data-kyuubu-moves]")],
      off: [!!off.querySelector("[data-kyuubu-readout]"), !!off.querySelector("[data-kyuubu-moves]")],
      asked: [!!asked.querySelector("[data-kyuubu-readout]"), !!asked.querySelector("[data-kyuubu-moves]")],
      defaults: [plain.readout, plain.movelist, plain.scrub, bare.readout, bare.scrub],
    };
  });
  expect(result).toEqual({ plain: [true, true], bare: [false, false], off: [false, false], asked: [true, false], defaults: [true, true, true, false, false] });
});
