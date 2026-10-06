// A framework sets a PROPERTY, not an attribute, on a custom element that has one of the name (React 19, Vue 3 and
// Svelte 5 do: `<kyuubu-cube size={4}>` is `cube.size = 4`). Every observed attribute of both elements must then reach
// the attribute, which is what draws the element, and a flag must read as a boolean.
import { expect, test } from "@playwright/test";

import { serve } from "./page.mjs";

/** A page with nothing on it but the two elements' definitions, and everything it complains of. */
async function bare(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await serve(page);
  await page.goto("http://kyuubu.test/api.html");
  await page.evaluate(() => import("/dist/element-define.js"));
  return errors;
}

test("setting each observed attribute as a property sets the attribute, on both elements", async ({ page }) => {
  const errors = await bare(page);
  const seen = await page.evaluate(() => {
    const out = {};
    for (const tag of ["kyuubu-cube", "kyuubu-scramble"]) {
      const element = document.createElement(tag);
      out[tag] = [];
      for (const name of window.customElements.get(tag).observedAttributes) {
        if (name === "lang") continue;
        element[name] = 7;
        out[tag].push([name, element.getAttribute(name)]);
      }
    }
    return out;
  });
  // Every one of them, as the text of what was set.
  expect(seen["kyuubu-cube"].map(([name]) => name)).toEqual(["size", "scramble", "moves", "time", "autoplay", "controls", "loop", "speed", "theme", "guide", "readout", "movelist", "scrub"]);
  expect(seen["kyuubu-scramble"].map(([name]) => name)).toEqual(["size", "pace", "paused", "scale", "width", "theme", "faces", "interactive", "seed"]);
  for (const rows of Object.values(seen)) for (const [name, value] of rows) expect(value, name).toBe("7");
  expect(errors).toEqual([]);
});

test("a flag reads as a boolean and takes the attribute away when set to false, and controls, which is on unless it says otherwise, says it", async ({ page }) => {
  const errors = await bare(page);
  const [cube, scramble] = await page.evaluate(() => {
    const cube = document.createElement("kyuubu-cube");
    const scramble = document.createElement("kyuubu-scramble");
    const steps = [];
    steps.push(["autoplay at first", cube.autoplay, cube.controls, scramble.paused]);
    cube.autoplay = true;
    cube.loop = "";
    cube.controls = false;
    scramble.paused = true;
    scramble.faces = true;
    steps.push(["set", cube.autoplay, cube.loop, cube.controls, cube.getAttribute("controls"), scramble.paused, scramble.faces]);
    cube.autoplay = false;
    cube.controls = true;
    scramble.paused = false;
    steps.push(["unset", cube.autoplay, cube.hasAttribute("autoplay"), cube.controls, scramble.paused, scramble.hasAttribute("paused")]);
    cube.controls = null;
    steps.push(["controls null", cube.controls, cube.hasAttribute("controls")]);
    return [steps, null];
  });
  expect(cube).toEqual([
    ["autoplay at first", false, true, false],
    ["set", true, true, false, "false", true, true],
    ["unset", false, false, true, false, false],
    ["controls null", true, false],
  ]);
  expect(scramble).toBeNull();
  expect(errors).toEqual([]);
});

test("a property set before the element is on the page, as a framework does, is what it is drawn from", async ({ page }) => {
  const errors = await bare(page);
  await page.evaluate(() => {
    const cube = document.createElement("kyuubu-cube");
    cube.size = 4;
    cube.scramble = "R U R' U'";
    cube.controls = false;
    cube.id = "c";
    const spinner = document.createElement("kyuubu-scramble");
    spinner.size = 2;
    spinner.paused = true;
    spinner.seed = 5;
    spinner.id = "s";
    document.body.append(cube, spinner);
  });
  // A 4×4 has ninety-six stickers, a 2×2 twenty-four; the player's controls are left out.
  await expect(page.locator("#c [data-kyuubu] [data-slot]")).toHaveCount(96);
  await expect(page.locator("#s [data-kyuubu] [data-slot]")).toHaveCount(24);
  await expect(page.locator("#c")).toHaveAttribute("size", "4");
  await expect(page.locator("#s")).toHaveAttribute("seed", "5");
  await expect(page.locator("#c button")).toHaveCount(0);
  // And a later change redraws it, as the attribute does.
  await page.evaluate(() => {
    document.getElementById("c").size = 3;
  });
  await expect(page.locator("#c [data-kyuubu] [data-slot]")).toHaveCount(54);
  expect(await page.evaluate(() => document.getElementById("s").running)).toBe(false);
  expect(errors).toEqual([]);
});

test("the methods go on working, and a name the browser gives every element is left to it", async ({ page }) => {
  const errors = await bare(page);
  const kinds = await page.evaluate(() => {
    const cube = document.createElement("kyuubu-cube");
    const scramble = document.createElement("kyuubu-scramble");
    cube.lang = "ja";
    return [cube.getAttribute("lang"), ["play", "pause", "step", "seek", "restart"].map((name) => typeof cube[name]), ["play", "pause"].map((name) => typeof scramble[name]), Object.getOwnPropertyDescriptor(Object.getPrototypeOf(cube), "lang") === undefined];
  });
  expect(kinds).toEqual(["ja", Array(5).fill("function"), ["function", "function"], true]);
  expect(errors).toEqual([]);
});
