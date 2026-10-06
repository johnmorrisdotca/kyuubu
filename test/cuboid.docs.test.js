// The README's section on cuboids, and its reference page, held to the code.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { seededRandom } from "../src/index.ts";
import { CUBOID_MAX_SIDE, CUBOID_PRESETS, CUBOID_RANDOM_STATE_MAX, cuboidSolved, legalTurns, parseCuboidMoves, randomCuboidScramble, readCuboidMove, solvedCuboid, turnAllCuboid } from "../src/cuboid/index.ts";

describe("the README on cuboids", () => {
  const readme = readFileSync("README.md", "utf8");
  const section = readme.slice(readme.indexOf("\n## Cuboids"), readme.indexOf("\n## Scrambles and seeds"));
  const rows = (heading) => {
    const lines = section.slice(section.indexOf(heading)).split("\n").slice(1);
    const start = lines.findIndex((line) => line.startsWith("|"));
    const table = [];
    for (const line of lines.slice(start)) {
      if (!line.startsWith("|")) break;
      table.push(line);
    }
    return table.slice(2).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  };

  it("lists every named shape, in order, with its name and its line", () => {
    const listed = rows("### The shapes");
    expect(listed.map(([label, name]) => [label, name])).toEqual(CUBOID_PRESETS.map((preset) => [preset.label, preset.name.en]));
    // The line in the README is the one the page shows, but for the clauses it adds.
    for (const [, name, says] of listed) expect(says.split(":")[0].length, name).toBeGreaterThan(5);
  });

  it("gives the legal turns it says, and the refusals it names", () => {
    expect(legalTurns([2, 3, 3], 0, 0)).toEqual([1, 2, 3]);
    expect(legalTurns([2, 3, 3], 1, 0)).toEqual([2]);
    const doc = readFileSync("docs/cuboids.md", "utf8");
    expect(doc).toContain('readCuboidMove("R", floppy);    // { fault: "half-turn-only" }');
    expect(readCuboidMove("R", [3, 3, 1])).toEqual({ fault: "half-turn-only" });
    expect(doc).toContain('readCuboidMove("R2", floppy);   // { move: { axis: 0, layer: 2, turns: 2 } }');
    expect(readCuboidMove("R2", [3, 3, 1])).toEqual({ move: { axis: 0, layer: 2, turns: 2 } });
    expect(readCuboidMove("F", [3, 3, 1])).toEqual({ fault: "whole-puzzle" });
    expect(parseCuboidMoves("R U2 L' D2", [2, 3, 3])).toHaveLength(4);
    for (const fault of ["half-turn-only", "whole-puzzle", "no-such-layer", "unknown"]) expect(doc).toContain(`"${fault}"`);
    const mixed = turnAllCuboid(solvedCuboid([2, 3, 3]), [2, 3, 3], randomCuboidScramble([2, 3, 3], undefined, seededRandom("club night")));
    expect(cuboidSolved(mixed, [2, 3, 3])).toBe(false);
  });

  it("names every entry point the package has for cuboids, and every one is built", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const named = rows("### The entry points").map(([entry]) => entry.replaceAll("`", "").replace("@johnmorrisdotca/kyuubu", "."));
    expect(named).toEqual(Object.keys(pkg.exports).filter((key) => key.startsWith("./cuboid")));
    for (const key of named) expect(pkg.exports[key].default).toMatch(/^\.\/dist\/cuboid\/[\w-]+\.js$/);
    expect(pkg.sideEffects).toContain("./dist/cuboid/element-define.js");
  });

  it("states the limits as the constants", () => {
    const limits = readme.slice(readme.indexOf("## Limits"));
    expect(limits).toContain("| Cuboid sides | 1 to 7 each, and not 1×1×1 |");
    expect(CUBOID_MAX_SIDE).toBe(7);
    expect(CUBOID_RANDOM_STATE_MAX.toLocaleString("en")).toBe("20,000");
    expect(limits).toContain("| Cuboid states a scramble is drawn uniformly from | 20,000 |");
  });

  it("leaves the cube's entry as it was: nothing of the cuboid's is exported from it", async () => {
    const cube = await import("../src/index.ts");
    expect(Object.keys(cube).filter((name) => /cuboid/i.test(name))).toEqual([]);
  });
});
