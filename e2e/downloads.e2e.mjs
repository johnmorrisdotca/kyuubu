import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "@playwright/test";
import { open, panel, tap, id, sound } from "./page.mjs";

test("solve history downloads contain the same rows in Markdown and executable SQL", async ({ page }) => {
  const errors = await open(page);
  await panel(page, "save");
  await page.locator(id("text")).fill("3x3\nscramble: R\nsolve: R'\n");
  await tap(page, id("load"));
  for (const kind of ["md", "sql"]) {
    const [file] = await Promise.all([page.waitForEvent("download"), tap(page, id(kind))]);
    expect(file.suggestedFilename()).toBe(`kyuubu-solves.${kind}`);
    const text = readFileSync(await file.path(), "utf8");
    if (kind === "md") { expect(text).toContain("| time | size | scramble | moves |"); expect(text).toContain("R'"); }
    else {
      const database = new DatabaseSync(":memory:");
      try { database.exec(text); expect(database.prepare('SELECT size, scramble, moves, solved FROM "solves"').all()).toEqual([{ size: 3, scramble: "R", moves: "R'", solved: 1 }]); }
      finally { database.close(); }
    }
  }
  await sound(page, errors);
});
