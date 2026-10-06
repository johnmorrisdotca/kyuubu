// The builder: a control for every choice the package lists, a live cube that follows them, the code that makes exactly
// that cube in every format, and the choices in the address. The copied code is run, and rebuilds the same cube.
import { expect, test } from "@playwright/test";

import { CUBE_OPTIONS, CUBE_OPTION_GROUPS } from "../dist/index.js";
import { MAKERS } from "../demo/builder-code.js";

import { serve } from "./page.mjs";

const HOST = "http://kyuubu.test/";
const code = (page) => page.getByTestId("bld-code");
const stage = (page) => page.getByTestId("bld-stage");
const tab = (page, format) => page.locator(`#bld-formats [data-format="${format}"]`);

const open = async (page, address = "builder.html?lang=en") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await serve(page);
  await page.goto(`${HOST}${address}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  return errors;
};
const clipboard = (page) =>
  page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => void (window.__copied = text) } });
  });
const maker = (page, name) => page.locator(`#bld-makers [data-maker="${name}"]`).click();
const pick = (page, id, value) => page.locator(`[data-option="${id}"] [data-value="${value}"]`).click();

const applies = (name) => CUBE_OPTIONS.filter((option) => option.names[MAKERS[name].names] !== undefined || (MAKERS[name].element !== undefined && option.names[MAKERS[name].element] !== undefined));

test("there is a control for every choice the package lists, for each way of making a cube, grouped and said in a line each", async ({ page }) => {
  const errors = await open(page);
  for (const name of ["view", "player", "turning"]) {
    await maker(page, name);
    const shown = await page.locator("[data-option]").evaluateAll((all) => all.map((el) => el.dataset.option));
    expect(shown.sort(), name).toEqual(applies(name).map((option) => option.id).sort());
    // Each is in a group that has its name, and has its own plain line.
    const groups = await page.locator(".cube-bld-group").evaluateAll((all) => all.map((el) => [el.dataset.group, el.querySelector("summary").textContent]));
    for (const [group, label] of groups) expect(label).toBe(CUBE_OPTION_GROUPS[group].en);
    expect(groups.length).toBeGreaterThan(2);
    const lines = await page.locator("[data-option]").evaluateAll((all) => all.map((el) => el.querySelector(".fam-fine")?.textContent ?? ""));
    for (const line of lines) expect(line.length).toBeGreaterThan(15);
  }
  expect(errors).toEqual([]);
});

test("choosing a size turns the cube beside it, the code and the address", async ({ page }) => {
  await open(page);
  await expect(stage(page).locator("[data-slot]")).toHaveCount(54);
  await expect(code(page)).toContainText("size: 3");
  await pick(page, "size", 5);
  await expect(stage(page).locator("[data-slot]")).toHaveCount(150);
  await expect(code(page)).toContainText("size: 5");
  expect(await page.evaluate(() => location.hash)).toContain("size=5");
  await pick(page, "theme", "paper");
  await expect(code(page)).toContainText("theme: CUBE_THEMES.paper");
  await expect(code(page)).toContainText("import { CubeView, CUBE_THEMES }");
  // A colour of its own, and taking it back.
  await page.locator("#opt-colour-up").fill("#ff00aa");
  await expect(code(page)).toContainText('colours: { U: "#ff00aa" }');
  await expect(stage(page).locator('[data-face="U"]').first().locator("> div")).toHaveCSS("background-color", "rgb(255, 0, 170)");
  await page.locator('[data-option="colour-up"] button').click();
  await expect(code(page)).not.toContainText("colours");
  // A number typed, a flag, a choice.
  await page.locator("#opt-turn-ms").fill("80");
  await expect(code(page)).toContainText("turnMs: 80");
  await page.locator('[data-option="animate-scramble"] button').click();
  await expect(code(page)).toContainText("animateScramble: false");
  await pick(page, "keyboard", "page");
  await expect(code(page)).toContainText('keyboard: "page"');
  // Back to what the package does, and the code says nothing of it.
  await pick(page, "keyboard", "focus");
  await page.locator('[data-option="animate-scramble"] button').click();
  await page.locator("#opt-turn-ms").fill("");
  await expect(code(page)).not.toContainText("keyboard");
  await expect(code(page)).not.toContainText("animateScramble");
  await expect(code(page)).not.toContainText("turnMs");
});

test("every format is there for every way of making a cube, and each follows the choices", async ({ page }) => {
  await open(page);
  for (const name of ["view", "player", "turning"]) {
    await maker(page, name);
    if (name === "player") {
      await page.locator("#opt-scramble").fill("R U R' U'");
      await page.locator("#opt-solution").fill("U R U' R'");
      await page.locator("#opt-time").fill("3.13");
      await page.locator('[data-option="autoplay"] button').click();
    } else {
      await pick(page, "size", 4);
      await pick(page, "theme", "stickerless");
    }
    const formats = await page.locator("#bld-formats [data-format]").evaluateAll((all) => all.map((el) => el.dataset.format));
    expect(formats, name).toEqual(MAKERS[name].formats);
    for (const format of formats) {
      await tab(page, format).click();
      await expect(tab(page, format)).toHaveAttribute("aria-selected", "true");
      const text = await code(page).textContent();
      if (name === "player") {
        expect(text, `${name} ${format}`).toMatch(format === "module" ? /scramble: "R U R' U'"/ : /R(\+|\s)U(\+|\s)R/);
        expect(text, `${name} ${format}`).toMatch(format === "module" ? /timeMs: 3130/ : /time(=|=")3\.13|time=\{3\.13\}/);
        expect(text, `${name} ${format}`).toMatch(/autoplay/);
      } else {
        expect(text, `${name} ${format}`).toMatch(/\b4\b/);
        expect(text, `${name} ${format}`).toMatch(/stickerless/);
      }
    }
  }
});

test("the keys move along the tabs, and the format chosen is in the address", async ({ page }) => {
  await open(page);
  await tab(page, "react").click();
  expect(await page.evaluate(() => location.hash)).toContain("show=react");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "vue")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tab(page, "angular")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tab(page, "module")).toHaveAttribute("aria-selected", "true");
});

test("Copy gives the code that is shown, and the link gives the cube", async ({ page }) => {
  await clipboard(page);
  await open(page);
  await pick(page, "size", 6);
  await tab(page, "svelte").click();
  await page.getByTestId("bld-copy").click();
  await expect(page.getByTestId("bld-code-copied")).toHaveText("Copied.");
  expect(await page.evaluate(() => window.__copied)).toBe(await code(page).textContent());
  expect(await page.evaluate(() => window.__copied)).toContain("size: 6");
  await page.getByTestId("bld-link").click();
  const link = await page.evaluate(() => window.__copied);
  expect(link).toContain("builder.html");
  expect(link).toContain("size=6");
  expect(link).toContain("show=svelte");
});

test("a link opens the same cube, with the same code", async ({ page, context }) => {
  await open(page);
  await maker(page, "player");
  await page.locator("#opt-scramble").fill("F R U R' U' F'");
  await page.locator("#opt-solution").fill("F R U R' U' F'");
  await pick(page, "theme", "paper");
  await pick(page, "speed", "0.5");
  await page.locator('[data-option="loop"] button').click();
  await tab(page, "element").click();
  await expect(code(page)).toContainText('speed="0.5"');
  const hash = await page.evaluate(() => location.hash);
  const text = await code(page).textContent();
  const here = await stage(page).locator("[data-kyuubu]").getAttribute("data-state");
  const other = await context.newPage();
  await serve(other);
  await other.goto(`${HOST}builder.html${hash}`);
  await expect(other.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(other.locator('#bld-makers [data-maker="player"]')).toHaveAttribute("aria-pressed", "true");
  await expect(other.getByTestId("bld-code")).toHaveText(text);
  await expect(other.getByTestId("bld-stage").locator("[data-kyuubu]")).toHaveAttribute("data-state", here);
  await expect(other.locator('[data-option="speed"] [data-value="0.5"]')).toHaveAttribute("aria-pressed", "true");
  await expect(other.locator("#bld-formats [aria-selected=true]")).toHaveAttribute("data-format", "element");
});

test.describe("the copied code makes the same cube", () => {
  test("the module of a cube to turn", async ({ page }) => {
    await open(page);
    await pick(page, "size", 4);
    await pick(page, "theme", "paper");
    await page.locator("#opt-colour-right").fill("#00aa55");
    await page.locator("#opt-fill").fill("0.8");
    const text = await code(page).textContent();
    const same = await page.evaluate(async (source) => {
      const body = source.replace('"@johnmorrisdotca/kyuubu"', '"http://kyuubu.test/dist/index.js"').replace('document.getElementById("cube")', "window.__box");
      const box = document.createElement("div");
      box.style.cssText = "width:300px;height:300px;position:relative";
      document.body.append(box);
      window.__box = box;
      await import(URL.createObjectURL(new Blob([body], { type: "text/javascript" })));
      const look = (root) => [...root.querySelectorAll("[data-slot]")].map((el) => `${el.dataset.face}:${el.firstElementChild.style.background}`).join("|");
      return { made: look(box), shown: look(document.querySelector("#bld-stage")), count: box.querySelectorAll("[data-slot]").length };
    }, text);
    expect(same.count).toBe(96);
    expect(same.made).toBe(same.shown);
  });

  test("the tag of a solve", async ({ page }) => {
    await open(page);
    await maker(page, "player");
    await page.locator("#opt-scramble").fill("R U R' U' R' F R2 U' R' U' R U R' F'");
    await page.locator("#opt-solution").fill("F R U R' U' R U R' U R2 U' R' U R U2 R'");
    await page.locator("#opt-time").fill("2.5");
    await pick(page, "theme", "stickerless");
    await tab(page, "element").click();
    const text = await code(page).textContent();
    const same = await page.evaluate(async (source) => {
      await import("/dist/element-define.js");
      const holder = document.createElement("div");
      holder.innerHTML = source.slice(source.indexOf("<kyuubu-cube"));
      document.body.append(holder);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const made = holder.querySelector("kyuubu-cube");
      const shown = document.querySelector("#bld-stage");
      const state = (root) => root.querySelector("[data-kyuubu]").dataset.state;
      return { made: state(made), shown: state(shown), tokens: [made.querySelectorAll("[data-kyuubu-moves] button").length, shown.querySelectorAll("[data-kyuubu-moves] button").length], look: [made, shown].map((root) => [...root.querySelectorAll("[data-kyuubu] [data-slot]")].map((el) => el.firstElementChild.style.background).join("|")) };
    }, text);
    expect(same.made).toBe(same.shown);
    expect(same.tokens[0]).toBe(same.tokens[1]);
    expect(same.look[0]).toBe(same.look[1]);
  });

  test("the iframe of a solve, and of a cube that keeps turning, opened in a page of its own", async ({ page, context }) => {
    await open(page);
    await maker(page, "player");
    await page.locator("#opt-scramble").fill("R U R' U' R' F R2 U' R' U' R U R' F'");
    await page.locator("#opt-solution").fill("F R U R' U' R U R' U R2 U' R' U R U2 R'");
    await pick(page, "theme", "paper");
    await tab(page, "iframe").click();
    let src = /src="([^"]+)"/.exec(await code(page).textContent())[1].replaceAll("&amp;", "&").replace("https://johnmorrisdotca.github.io/kyuubu/", HOST);
    const solve = await context.newPage();
    await serve(solve);
    await solve.goto(src);
    await expect(solve.locator("[data-kyuubu-player]")).toBeVisible();
    expect(await solve.locator("[data-kyuubu]").getAttribute("data-state")).toBe(await stage(page).locator("[data-kyuubu]").getAttribute("data-state"));
    expect(await solve.locator("[data-kyuubu] [data-slot]").evaluateAll((all) => all.map((el) => el.firstElementChild.style.background).join("|"))).toBe(await stage(page).locator("[data-kyuubu] [data-slot]").evaluateAll((all) => all.map((el) => el.firstElementChild.style.background).join("|")));

    await maker(page, "turning");
    await pick(page, "size", 5);
    await pick(page, "scale", "small");
    await pick(page, "theme", "paper");
    await page.locator('[data-option="paused"] button').click();
    await tab(page, "iframe").click();
    src = /src="([^"]+)"/.exec(await code(page).textContent())[1].replaceAll("&amp;", "&").replace("https://johnmorrisdotca.github.io/kyuubu/", HOST);
    const turning = await context.newPage();
    await serve(turning);
    await turning.goto(src);
    await expect(turning.locator("[data-kyuubu]")).toBeVisible();
    await expect(turning.locator("[data-kyuubu] [data-slot]")).toHaveCount(150);
    expect(await turning.locator("[data-kyuubu] [data-slot]").evaluateAll(lookOfAll)).toBe(await stage(page).locator("kyuubu-scramble [data-slot]").evaluateAll(lookOfAll));
  });
});

/** A list of stickers as one string of colours. */
function lookOfAll(all) {
  return all.map((el) => `${el.dataset.face}:${el.firstElementChild.style.background}`).join("|");
}

test("the page is in Japanese when asked, and fits a phone, light and dark", async ({ page }) => {
  await open(page, "builder.html?lang=ja");
  await expect(page.locator("#bld-makers [data-maker=view]")).toHaveText("手で回すキューブ");
  await expect(page.locator('[data-option="size"] .fam-fine')).toContainText("キューブの一辺");
  await expect(tab(page, "element")).toHaveCount(0);
  await maker(page, "player");
  await expect(tab(page, "element")).toHaveText("カスタム要素");
  for (const scheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), scheme).toBeLessThanOrEqual(0);
    const small = await page.locator("main button, main input:not([type=hidden]), main summary").evaluateAll((all) => all.filter((el) => { const box = el.getBoundingClientRect(); return box.width > 0 && getComputedStyle(el).visibility !== "hidden" && (box.width < 43.5 || box.height < 43.5); }).map((el) => `${el.tagName}#${el.id} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
    expect(small, scheme).toEqual([]);
  }
});

test("the header links to it from the other pages", async ({ page }) => {
  await serve(page);
  for (const address of ["", "famous.html", "cubes.html"]) {
    await page.goto(`${HOST}${address}?lang=en`);
    await expect(page.locator('a[href="builder.html"]').first()).toHaveText("Builder");
  }
  await page.goto(`${HOST}famous.html?lang=ja`);
  await expect(page.locator('a[href="builder.html"]').first()).toHaveText("ビルダー");
  await page.locator('a[href="builder.html"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page).toHaveURL(/builder\.html/);
});
