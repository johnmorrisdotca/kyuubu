// Takes the pictures the README shows, from the built demo in `site/`: `pnpm screenshots:readme` (builds the demo, then runs this).
// The family's standard is in johnmorrisdotca/.github (README-STANDARD.md); the shared part is readme-pictures-lib.mjs.
// The page is served to a browser without a port, never fetched from the live site, and is the same each run: `Math.random` is a seeded
// generator, so every scramble is the same, and motion is reduced. Output: docs/images/<subject>-<desk|phone>-<light|dark>.webp.
import { takePictures } from "./readme-pictures-lib.mjs";

/** `Math.random` as a seeded generator (mulberry32), so a scramble is the same each run. */
const seeded = ({ seed }) => {
  let a = seed;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const at = (id) => `[data-testid="${id}"]`;

/** Scramble the 3×3 and take `steps` steps of its solve, each one named under the cube. */
const solved = (steps) => async (page) => {
  await page.locator(at("scramble")).click();
  for (let step = 0; step < steps; step += 1) await page.locator(at("next")).click();
};

/** A page of the demo, its main part cropped. */
const page = (subject, path, target, prepare, ready = "[data-kyuubu], [data-kyuubu-cuboid]") => ({ subject, views: ["desk"], scale: 1, url: path, init: seeded, state: { seed: 2026 }, ready, target, prepare });

await takePictures({
  shots: [
    // From the top of the page, so the header, the language chooser and the cloth patches show: a scrambled 3×3 part way through its solve.
    // On a phone, in Japanese, scrolled to the cube, with its timer above it.
    {
      subject: "hero",
      views: ["desk", "phone"],
      height: 900,
      url: "/?lang=en",
      init: seeded,
      state: { seed: 2026 },
      ready: "[data-kyuubu]",
      async prepare(page, { view }) {
        if (view === "phone") {
          await page.goto("http://kyuubu.test/?lang=ja");
          await page.locator("[data-kyuubu]").first().waitFor();
          await solved(3)(page);
          await page.locator(at("time")).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 64));
        } else {
          await solved(3)(page);
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      },
    },
    page("the-cube", "/?lang=en", at("stage"), solved(3)),
    page("cubes-of-every-size", "/cubes.html?lang=en", "main", undefined),
    page("builder", "/builder.html?lang=en", "main", undefined, at("bld-stage")),
    page("famous-solves", "/famous.html?lang=en", "main", undefined, at("player")),
    page("cuboid-domino", "/cuboids.html?lang=en", "main", async (page) => { await page.locator(at("pick-domino")).click(); await page.locator(at("scramble")).click(); }),
    page("cuboid-pillar", "/cuboids.html?lang=en", "main", async (page) => { await page.locator(at("pick-pillar")).click(); await page.locator(at("scramble")).click(); }),
  ],
});
