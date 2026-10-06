// The code the demo shows is made from what is chosen on the page, and the cube beside it is made by that code:
// change an option, and read the code and the cube; copy the code, and it is the code that was read.
import { expect, test } from "@playwright/test";

import { CUBE_THEMES } from "../dist/index.js";

import { id, open, panel, serve, tap } from "./page.mjs";

/** The demo is served without a secure address, where there is no clipboard: a stand-in that keeps what is written to it. */
const clipboard = (page) =>
  page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => void (window.__copied = text) } });
  });
const code = (page) => page.locator(id("example-code"));
const preview = (page) => page.locator(`${id("example-preview")} [data-kyuubu]`);

test("the code under the cube follows the size, the theme, the colours, the turn speed and the scramble choice, and the cube beside it is that code's", async ({ page }) => {
  await open(page);
  await expect(code(page)).toHaveText(/import \{ CubeView, CUBE_THEMES \} from "@johnmorrisdotca\/kyuubu";\n\nnew CubeView\(document.getElementById\("cube"\), \{ size: 3, theme: CUBE_THEMES.paper \}\);/);
  await expect(preview(page).locator("[data-slot]")).toHaveCount(54);
  // A size: the code says it, and the cube beside it has that many stickers.
  await tap(page, '#sizes button[data-n="5"]');
  await expect(code(page)).toContainText("size: 5");
  await expect(code(page)).not.toContainText("size: 3");
  await expect(preview(page).locator("[data-slot]")).toHaveCount(150);
  // A theme.
  await panel(page, "look");
  await tap(page, '#themes button[data-theme-name="stickerless"]');
  await expect(code(page)).toContainText("theme: CUBE_THEMES.stickerless");
  const plastic = CUBE_THEMES.stickerless.plastic;
  await expect(preview(page).locator('[data-face="U"] > div').first()).toHaveCSS("background-color", /rgb/);
  expect(plastic).toBeDefined();
  // Colours of the reader's own: the theme is dropped, and the code says every colour.
  await page.locator('#colours input[data-face="U"]').fill("#ff00aa");
  await expect(code(page)).not.toContainText("CUBE_THEMES");
  await expect(code(page)).toContainText('U: "#ff00aa"');
  await expect(code(page)).toContainText("colours:");
  await expect(code(page)).toContainText("plastic:");
  await expect(preview(page).locator('[data-face="U"] > div').first()).toHaveCSS("background-color", "rgb(255, 0, 170)");
  // The turn speed, under Controls; and the scramble.
  await panel(page, "keys");
  await expect(code(page)).not.toContainText("turnMs");
  await page.locator('#speeds button[data-ms="80"]').click();
  await expect(code(page)).toContainText("turnMs: 80");
  await page.locator('#speeds button[data-ms="160"]').click();
  await expect(code(page)).not.toContainText("turnMs");
  await expect(code(page)).not.toContainText("animateScramble");
  await page.getByTestId("animate-scramble").click();
  await expect(code(page)).toContainText("animateScramble: false");
  await page.getByTestId("animate-scramble").click();
  await expect(code(page)).not.toContainText("animateScramble");
  // Turning the cube above does not change the code, which is about how it is made and not what it shows.
  const before = await code(page).textContent();
  await page.getByTestId("scramble").click();
  expect(await code(page).textContent()).toBe(before);
});

test("the code, run as written, makes the cube beside it", async ({ page }) => {
  await open(page);
  await tap(page, '#sizes button[data-n="4"]');
  await panel(page, "keys");
  await page.locator('#speeds button[data-ms="500"]').click();
  const text = await code(page).textContent();
  // The code as the page would run it: its import is the package, here served from the page, and its element a box.
  const made = await page.evaluate(async (source) => {
    const body = source.replace('from "@johnmorrisdotca/kyuubu"', 'from "http://kyuubu.test/dist/index.js"').replace('document.getElementById("cube")', "window.__box");
    const box = document.createElement("div");
    box.style.cssText = "width:160px;height:160px;position:relative";
    document.body.append(box);
    window.__box = box;
    const url = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
    await import(url);
    return { slots: box.querySelectorAll("[data-slot]").length, label: box.querySelector("[data-kyuubu]").getAttribute("aria-label") };
  }, text);
  expect(made).toEqual({ slots: 96, label: "A 4×4 cube" });
  await expect(preview(page).locator("[data-slot]")).toHaveCount(96);
});

test("Copy gives the code that is shown", async ({ page }) => {
  await clipboard(page);
  await open(page);
  await tap(page, '#sizes button[data-n="6"]');
  await tap(page, id("example-copy"));
  await expect(page.getByTestId("example-copied")).toHaveText("Copied.");
  expect(await page.evaluate(() => window.__copied)).toBe(await code(page).textContent());
  expect(await page.evaluate(() => window.__copied)).toContain("size: 6");
});

test("the code is in Japanese's page too, and is the same code", async ({ page }) => {
  await open(page, "?lang=ja");
  await tap(page, '#sizes button[data-n="2"]');
  await expect(code(page)).toContainText("size: 2");
  await expect(page.getByTestId("example-copy")).toHaveText("コピー");
});

test.describe("on the page of turning cubes", () => {
  const tag = (page) => page.getByTestId("embed-tag");
  const frame = (page) => page.getByTestId("embed-frame");
  const goto = async (page) => {
    await serve(page);
    await page.goto("http://kyuubu.test/cubes.html?lang=en");
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  };

  test("the tag and the iframe follow the size picked, the pace and the scale, and the cube and frame beside them are theirs", async ({ page }) => {
    await goto(page);
    await expect(tag(page)).toContainText('<kyuubu-scramble size="3" pace="normal" scale="small" theme="paper"></kyuubu-scramble>');
    await tap(page, '#picker button[data-n="5"]');
    await tap(page, '#paces button[data-pace="slow"]');
    await tap(page, '#embed-scales button[data-scale="medium"]');
    await expect(tag(page)).toContainText('<kyuubu-scramble size="5" pace="slow" scale="medium" theme="paper"></kyuubu-scramble>');
    await expect(frame(page)).toContainText("embed-scramble.html#size=5&amp;pace=slow&amp;scale=medium&amp;theme=paper");
    await expect(frame(page)).toContainText('width="160" height="160"');
    // The cube beside the tag is the tag's, and the frame beside the iframe is the iframe's.
    const cube = page.locator(`${id("embed-tag-preview")} kyuubu-scramble`);
    await expect(cube).toHaveAttribute("size", "5");
    await expect(cube).toHaveAttribute("pace", "slow");
    await expect(cube).toHaveAttribute("scale", "medium");
    await expect(cube.locator("[data-slot]")).toHaveCount(150);
    const inner = page.locator(`${id("embed-frame-preview")} iframe`);
    await expect(inner).toHaveAttribute("src", "embed-scramble.html#size=5&pace=slow&scale=medium&theme=paper");
    await expect(inner).toHaveAttribute("width", "160");
    await expect(page.frameLocator(`${id("embed-frame-preview")} iframe`).locator("[data-slot]")).toHaveCount(150);
    // Each pace, and each scale.
    for (const [scale, side] of [["small", 72], ["large", 300]]) {
      await tap(page, `#embed-scales button[data-scale="${scale}"]`);
      await expect(tag(page)).toContainText(`scale="${scale}"`);
      await expect(inner).toHaveAttribute("width", String(side));
      await expect(page.locator(`${id("embed-frame-preview")}`)).toHaveCSS("width", `${side}px`);
    }
    await tap(page, '#paces button[data-pace="fast"]');
    await expect(tag(page)).toContainText('pace="fast"');
    await expect(frame(page)).toContainText("pace=fast");
  });

  test("the tag as copied rebuilds the cube beside it", async ({ page }) => {
    await clipboard(page);
    await goto(page);
    await tap(page, '#picker button[data-n="4"]');
    await tap(page, '#paces button[data-pace="fast"]');
    await tap(page, id("copy-tag"));
    const copied = await page.evaluate(() => window.__copied);
    expect(copied).toBe(await tag(page).textContent());
    const rebuilt = await page.evaluate((text) => {
      const holder = new DOMParser().parseFromString(text, "text/html");
      const element = holder.querySelector("kyuubu-scramble");
      return Object.fromEntries([...element.attributes].map((attribute) => [attribute.name, attribute.value]));
    }, copied);
    // The element writes its own style on itself; what the code says is the attributes.
    const shown = await page.locator(`${id("embed-tag-preview")} kyuubu-scramble`).evaluate((element) => Object.fromEntries([...element.attributes].filter((attribute) => attribute.name !== "style").map((attribute) => [attribute.name, attribute.value])));
    expect(rebuilt).toEqual(shown);
    expect(rebuilt).toEqual({ size: "4", pace: "fast", scale: "small", theme: "paper" });
  });
});
