import { describe, expect, it } from "vitest";
import { FAMILY, familyRepo } from "../scripts/family-template.mjs";
import * as kyuubu from "../src/index.ts";
import {
  blocks,
  CUBE_THEMES,
  codes,
  DEFAULT_COLOURS,
  DEFAULT_PLASTIC,
  FACE_PROPERTIES,
  MAX_CLI_COUNT,
  MAX_CLI_LENGTH,
  MAX_RECORD_MOVES,
  MAX_RECORD_SEED,
  MAX_RECORD_SIZE,
  MAX_RECORDS,
  MIN_RECORD_SIZE,
  read,
  readme,
  table,
} from "./docs.fixture.js";

describe("the README's reference", () => {
  const source = read("src/index.ts");
  const types = [...source.matchAll(/\btype (\w+)/g)].map((found) => found[1]);
  const react = [...read("src/react.tsx").matchAll(/^export (?:function|type) (\w+)/gm)].map((found) => found[1]);

  it("names every export, in code", () => {
    const names = [...Object.keys(kyuubu), ...types, ...react];
    expect(names.length).toBeGreaterThan(80);
    expect(react).toEqual(["KyuubuHandle", "KyuubuProps", "Kyuubu", "KyuubuMovesProps", "KyuubuMoves"]);
    for (const name of names) expect(readme, name).toMatch(new RegExp(`\`[^\`\\n]*\\b${name}\\b[^\`\\n]*\``));
  });

  it("names every option and member of the view", () => {
    const types = read("src/view/view-types.ts");
    const options = [
      ...types
        .slice(types.indexOf("export type CubeViewOptions = {"), types.indexOf("const EDGE"))
        .matchAll(/^ {2}(\w+)\??:/gm),
    ].map((found) => found[1]);
    const told = new Set(table("## `new CubeView(element, options)`").flatMap(([option]) => codes(option)));
    expect(new Set(options)).toEqual(told);
    const cube = read("src/view/view.ts");
    const scene = read("src/view/view-scene.ts");
    const members = [
      ...cube
        .slice(cube.indexOf("export class CubeView"))
        .matchAll(/^ {2}(?!protected )(?:override )?(?:get |readonly )?(\w+)(?:\(|:)/gm),
      ...scene.matchAll(/^ {2}readonly (\w+):/gm),
    ]
      .map((found) => found[1])
      .filter((name) => name !== "constructor");
    const shown = table("## `new CubeView(element, options)`", 1)
      .flatMap(([member]) => codes(member))
      .map((text) => text.replace(/\(.*/, ""));
    expect(new Set(members)).toEqual(new Set(shown));
  });

  it("the theming table is the properties, the defaults and the looks there are", () => {
    const rows = table("## Theming");
    const faces = Object.fromEntries(
      rows
        .slice(0, 6)
        .map(([property, option, fallback]) => [
          codes(option)[0].replace("colours.", ""),
          [codes(property)[0], codes(fallback)[0]],
        ]),
    );
    expect(faces).toEqual(
      Object.fromEntries(
        Object.keys(DEFAULT_COLOURS).map((face) => [face, [FACE_PROPERTIES[face], DEFAULT_COLOURS[face]]]),
      ),
    );
    expect(codes(rows[6].join(" "))).toEqual(["--kyuubu-plastic", "plastic", DEFAULT_PLASTIC]);
    const view = read("src/view/view-scene.ts");
    for (const [property, , fallback] of rows.slice(6))
      expect(view).toContain(
        `var(${codes(property)[0]}, ${fallback === "`#111`" ? "${DEFAULT_PLASTIC}" : codes(fallback)[0]})`,
      );
    expect(Object.keys(CUBE_THEMES)).toEqual(["standard", "paper", "stickerless"]);
    const [css] = blocks("## Theming", "css");
    for (const face of Object.keys(DEFAULT_COLOURS))
      expect(css).toContain(`${FACE_PROPERTIES[face]}: ${CUBE_THEMES.paper.colours[face]};`);
    expect(css).toContain(`--kyuubu-plastic: ${CUBE_THEMES.paper.plastic};`);
  });

  it("the limits are the constants", () => {
    const rows = Object.fromEntries(table("## Limits").map(([limit, value]) => [limit, value]));
    expect(rows["Sizes the package is made and tested for"]).toBe(
      `${MIN_RECORD_SIZE}×${MIN_RECORD_SIZE} to ${MAX_RECORD_SIZE}×${MAX_RECORD_SIZE}`,
    );
    expect(rows["Turns in one saved solve, scramble and moves each"]).toBe(MAX_RECORD_MOVES.toLocaleString("en"));
    expect(rows["Solves read from one file"]).toBe(MAX_RECORDS.toLocaleString("en"));
    expect(rows["Characters in a saved seed"]).toBe(String(MAX_RECORD_SEED));
    expect(rows["A scramble from the command line"]).toBe(`1 to ${MAX_CLI_LENGTH.toLocaleString("en")} turns`);
    expect(rows["Scrambles from the command line at once"]).toBe(String(MAX_CLI_COUNT));
  });

  it("lists every package of the family, once, with its kana, as the demo's footer does, and the trademark once", () => {
    const family = FAMILY;
    const from = readme.indexOf("### The family");
    const block = readme.slice(from, readme.indexOf("\n## ", from));
    expect([...block.matchAll(/^- \[/gm)]).toHaveLength(family.length);
    for (const one of family) expect(block).toContain(`- [${one.name}](${familyRepo(one.id)}) (${one.kana}):`);
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
      "thirteen",
      "fourteen",
      "fifteen",
      "sixteen",
      "seventeen",
      "eighteen",
      "nineteen",
      "twenty",
      "twenty-one",
      "twenty-two",
      "twenty-three",
      "twenty-four",
      "twenty-five",
      "twenty-six",
      "twenty-seven",
      "twenty-eight",
      "twenty-nine",
      "thirty",
      "thirty-one",
      "thirty-two",
    ];
    expect(block).toContain(`Kyuubu is one of ${words[family.length]} packages`);
    expect(block).toContain("**This package is Kyuubu.**");
    expect(family.length).toBeGreaterThanOrEqual(19);
    expect(readme.match(/is a trademark of its owner/g)).toHaveLength(1);
    expect(readme).toContain("**Japanese: included; not yet reviewed by a native reader.");
  });
});
