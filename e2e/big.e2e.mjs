// The biggest cubes, 6×6 and 7×7, drawn and turned on a phone's processor: Chromium only, since the slowdown is Chromium's to give.
import { expect, test } from "@playwright/test";

import { serve } from "./page.mjs";

/**
 * A 7×7 is 294 stickers, each given its own place on the screen in every frame of a turn. The question is whether a turn
 * still runs smoothly on a processor four times slower than the machine this runs on, which is about what a phone is.
 * The measure is the longest task the page's main thread runs while six animated turns and a dragged layer go by: a frame
 * is 16.7 milliseconds, and the bound is far looser than that, since a loaded runner is slower than a laptop. What it
 * fails on is a change that makes a frame cost several times what it does: the 7×7 measured 21 milliseconds at worst on
 * 2026-10-05 (the 3×3, 9), and README's "Limits" says so.
 */
test.use({ reducedMotion: "no-preference" });

const BARE = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:16px;background:#2f5d4a}#c{width:358px;height:358px;position:relative}</style></head><body><div id="c"></div></body></html>`;

for (const size of [3, 6, 7]) {
  test(`a ${size}×${size} turns on a processor four times slower without a long task`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CPU slowdown is Chromium's");
    await serve(page);
    await page.route("http://kyuubu.test/perf.html", (route) => route.fulfill({ contentType: "text/html", body: BARE }));
    await page.goto("http://kyuubu.test/perf.html");
    await page.evaluate(async (n) => {
      const { CubeView, randomScramble, solvedCube, turnAll } = await import("/dist/index.js");
      const state = turnAll(solvedCube(n), n, randomScramble(n, 30, () => Math.random()));
      const holder = document.getElementById("c");
      window.__view = new CubeView(holder, { size: n, state, interactive: true, turnMs: 160, fill: 0.7 });
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    }, size);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const events = [];
    cdp.on("Tracing.dataCollected", (data) => events.push(...data.value));
    await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
    for (let at = 0; at < 6; at += 1) {
      await page.evaluate(([n, i]) => window.__view.turn({ axis: i % 3, layer: [0, n - 1, Math.floor(n / 2), 1, 2, n - 2][i], turns: 1 + (i % 3) }), [size, at]);
      await page.waitForTimeout(300);
    }
    await cdp.send("Tracing.end");
    await new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
    const tasks = events.filter((event) => event.name === "RunTask" && event.ph === "X" && event.dur).map((event) => event.dur / 1000);
    const longest = Math.max(...tasks);
    expect(tasks.length).toBeGreaterThan(20);
    // Looser than a frame, by far: 120 milliseconds is a hitch a person would see, 21 is what a 7×7 costs.
    expect(longest, `the longest task of six turns of a ${size}×${size} was ${longest.toFixed(0)} ms`).toBeLessThan(120);
  });
}
