import { expect, test } from "@playwright/test";
import { serve, tap } from "./page.mjs";

for (const path of ["/", "/famous.html", "/cubes.html", "/cuboids.html", "/builder.html"]) {
  test(`the Docs link follows the chosen language on ${path}`, async ({ page }) => {
    await serve(page);
    await page.goto(`http://kyuubu.test${path}?lang=ja`);
    const docs = page.locator('[data-say="pageDocs"]');
    await expect(docs).toHaveText("ドキュメント");
    await expect(docs).toHaveAttribute("href", "docs/ja/index.html");
    await tap(page, '[data-lang="en"]');
    await expect(docs).toHaveText("Docs");
    await expect(docs).toHaveAttribute("href", "docs/index.html");
    await tap(page, '[data-lang="ja"]');
    await tap(page, '[data-say="pageDocs"]');
    await expect(page).toHaveURL("http://kyuubu.test/docs/ja/index.html");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("h1")).toContainText("Twisty cube puzzle for the browser");
  });
}
