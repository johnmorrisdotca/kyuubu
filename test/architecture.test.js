import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The Architecture tree (docs/ARCHITECTURE.md, linked from the README) names every source file, and nothing that is not one, so it cannot fall behind the code. */
describe("the Architecture tree", () => {
  it("names exactly the files under src/", () => {
    const section = readFileSync("docs/ARCHITECTURE.md", "utf8");
    const tree = section.slice(section.indexOf("```text"), section.indexOf("```", section.indexOf("```text") + 7));
    const named = [...tree.matchAll(/[├└]── ([\w.-]+\.(?:ts|tsx|js|mjs))\b/g)].map((match) => match[1]).sort();
    const files = readdirSync("src", { recursive: true })
      .filter((path) => /\.(ts|tsx|js|mjs)$/.test(path) && !/\.(test|fixture)\./.test(path))
      .map((path) => path.split(/[\\/]/).at(-1))
      .sort();
    expect(named).toEqual(files);
  });
});
