// The documents that are made from the source, or that quote it, checked against it.
// Plain JavaScript, so that reading files needs no Node types. `pnpm docs:make` rewrites what is made.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import process from "node:process";

import { describe, expect, it } from "vitest";

import * as kyuubu from "../src/index.ts";

const {
  CUBE_THEMES,
  DEFAULT_COLOURS,
  DEFAULT_PLASTIC,
  FACE_PROPERTIES,
  FULL_SCRAMBLE_LENGTHS,
  MAX_CLI_COUNT,
  MAX_CLI_LENGTH,
  MAX_RECORDS,
  MAX_RECORD_MOVES,
  MAX_RECORD_SEED,
  MAX_RECORD_SIZE,
  MIN_RECORD_SIZE,
  SOLVABLE_SIZES,
  SOLVE_ALGORITHMS,
  STRINGS,
  VERSION,
  countsAsMove,
  cubeSolved,
  encodeCubeMoves,
  fromJSON,
  fromText,
  movesNotation,
  parseMove,
  parseMoves,
  randomScramble,
  runCli,
  seededRandom,
  solveSteps,
  solvedCube,
  stageName,
  stageSays,
  summarize,
  toCSV,
  toJSON,
  toText,
  turnAll,
  undoAll,
} = kyuubu;

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const readme = read("README.md");
const pkg = JSON.parse(read("package.json"));
const cell = (text) => text.replace(/\\\|/g, "|").trim();

/** The rows of the table under a heading: each row's cells. */
function table(heading, nth = 0) {
  const from = readme.indexOf(heading);
  if (from < 0) throw new Error(`the README has no “${heading}”`);
  const tables = [];
  let rows = null;
  for (const line of readme.slice(from).split("\n").slice(1)) {
    if (line.startsWith("|")) (rows ??= []).push(line.split(/(?<!\\)\|/).slice(1, -1).map(cell));
    else if (rows !== null) {
      tables.push(rows.slice(2));
      rows = null;
    }
    if (line.startsWith("## ") || tables.length > nth) break;
  }
  return tables[nth];
}

/** The code blocks of one language under a heading, up to the next heading of the same depth or less. */
function blocks(heading, language) {
  const from = readme.indexOf(heading);
  if (from < 0) throw new Error(`the README has no “${heading}”`);
  const depth = heading.match(/^#+/)[0].length;
  const rest = readme.slice(from + heading.length);
  const end = rest.search(new RegExp(`\\n#{1,${depth}} `));
  return [...(end < 0 ? rest : rest.slice(0, end)).matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))].map((found) => found[1]);
}

const codes = (text) => [...text.matchAll(/`([^`]+)`/g)].map((found) => found[1]);

describe("the README's first examples", () => {
  it("the 30 seconds", () => {
    const scramble = randomScramble(3, 25, seededRandom("club night"));
    expect(movesNotation(scramble, 3).startsWith("B L' S' U' F' R2 B R U2 B' R2 ")).toBe(true);
    expect(readme).toContain(`movesNotation(scramble, 3);                        // "B L' S' U' F' R2 B R U2 B' R2 …"`);
    const cube = turnAll(solvedCube(3), 3, scramble);
    expect(cube).toHaveLength(54);
    const steps = solveSteps(cube, 3);
    expect(steps).toHaveLength(17);
    expect(steps.slice(0, 2).map((step) => step.stage)).toEqual(["hold", "whiteCross"]);
    expect(steps.find((step) => step.stage !== "hold" && step.stage !== "whiteCross").stage).toBe("whiteCorners");
    expect(readme).toContain("// 17 steps: hold, white cross, white corners, …");
    expect(cubeSolved(turnAll(cube, 3, steps.flatMap((step) => step.moves)), 3)).toBe(true);
  });

  it("the line for a terminal", () => {
    const line = readme.match(/npx @johnmorrisdotca\/kyuubu --seed table {3}# (.+)\n/)[1];
    expect(runCli(["--seed", "table"]).out).toBe(`${line}\n`);
  });

  it("the API alone", () => {
    const moves = parseMoves("R U R' U'", 3);
    const cube = turnAll(solvedCube(3), 3, moves);
    expect(readme).toContain(`const cube = turnAll(solvedCube(3), 3, moves);   // "${cube}"`);
    expect(cubeSolved(cube, 3)).toBe(false);
    expect(readme).toContain(`movesNotation(undoAll(moves), 3);                // "${movesNotation(undoAll(moves), 3)}"`);
    expect(cubeSolved(turnAll(cube, 3, undoAll(moves)), 3)).toBe(true);
    expect(parseMoves("R Q", 3)).toBeNull();
  });

  it("who it is for names notation the cube turns", () => {
    const from = readme.indexOf("## Who it is for");
    const found = codes(readme.slice(from, readme.indexOf("## Use it in your project")));
    expect(found).toEqual(['--seed "club night"', "R U R' U'"]);
    expect(parseMoves(found[1], 3)).not.toBeNull();
  });
});

describe("the README's framework examples", () => {
  // The projects the framework check builds, as it writes them.
  const BOX = "width: 300px; height: 300px; position: relative";
  const check = read("scripts/check-frameworks.mjs").replaceAll("${BOX}", BOX).replaceAll("\\`", "`");

  it("are the ones scripts/check-frameworks.mjs builds and turns", () => {
    const [vue] = blocks("### 4. Vue", "vue");
    const [svelte] = blocks("### 5. Svelte and Angular", "svelte");
    const [angular] = blocks("### 5. Svelte and Angular", "ts");
    const [react] = blocks("### 3. React", "tsx");
    for (const [name, block] of Object.entries({ vue, svelte, react })) expect(check, name).toContain(block);
    expect(angular.startsWith("// Angular: a standalone component\n")).toBe(true);
    expect(check).toContain(angular.split("\n").slice(1).join("\n"));
  });

  it("and the plain page is, but for where it finds the files", () => {
    const [html] = blocks("### 2. The view, in plain HTML", "html");
    expect(check).toContain(html.replace("./node_modules/@johnmorrisdotca/kyuubu/dist/index.js", "./kyuubu/dist/index.js").trimEnd());
  });

  it("names the five it proves, and no other", () => {
    expect(check).toMatch(/const projects = \{[\s\S]*\n {2}vue: [\s\S]*\n {2}svelte: [\s\S]*\n {2}angular: [\s\S]*\n {2}react: [\s\S]*\n {2}plain: /);
    expect(pkg.description).toContain("React, Vue, Svelte, Angular or plain HTML");
    expect(readme).not.toMatch(/\b(Solid|Preact|Lit|Qwik|Ember)\b/);
  });
});

describe("the README's notation", () => {
  it("every piece of notation in its table is read on some cube, and written back the same", () => {
    const rows = table("## Notation");
    expect(rows).toHaveLength(6);
    for (const [written] of rows) {
      for (const text of codes(written)) {
        // On a 7×7, where there is a middle layer and a third layer in.
        expect(parseMove(text, 7), text).not.toBeNull();
        expect(movesNotation([parseMove(text, 7)], 7), text).toBe(text);
      }
    }
  });

  it("and what it says is refused, is", () => {
    expect([parseMoves("M", 2), parseMoves("4R", 3), parseMoves("Q", 3), parseMoves("Rw", 4), parseMoves("r", 4)]).toEqual([null, null, null, null, null]);
    expect(parseMove("9R", 9)).not.toBeNull();
    expect(turnAll(solvedCube(4), 4, parseMoves("R 2R", 4))).not.toBe(solvedCube(4));
  });

  it("the moves in The model are as it prints them", () => {
    for (const [text, n] of [["R", 3], ["2R'", 4], ["x", 3]]) {
      const move = parseMove(text, n);
      const shown = `{ axis: ${move.axis}, layer: ${JSON.stringify(move.layer)}, turns: ${move.turns} }`;
      expect(readme).toContain(`parseMove("${text}", ${n});`.padEnd(24) + `// ${shown}`);
    }
    expect(readme).toContain(`// "${encodeCubeMoves(parseMoves("R U2 F'", 3))}"`);
    expect(readme).toContain(`so a solved 2×2 is \`${solvedCube(2)}\``);
  });
});

describe("the README on the solve", () => {
  it("the 2×2 it solves, line for line", () => {
    const cube = turnAll(solvedCube(2), 2, parseMoves("R U2 F'", 2));
    const steps = solveSteps(cube, 2);
    const widest = Math.max(...steps.map((step) => stageName(step.stage).length));
    for (const step of steps) expect(readme).toContain(`// ${stageName(step.stage).padEnd(widest + 2)}${movesNotation(step.moves, 2)}\n`);
    expect(readme).toContain(`stageSays("whiteLayer");          // "${stageSays("whiteLayer")}"`);
    expect(readme).toContain(`stageName("whiteLayer", "ja");    // "${stageName("whiteLayer", "ja")}"`);
  });

  it("the algorithms in its table are the method's", () => {
    const rows = table("## A solve a person can follow");
    expect(rows.map(([name, notation]) => [codes(name)[0], codes(notation)[0]])).toEqual(Object.entries(SOLVE_ALGORITHMS));
  });

  it("a scrambled 3×3 comes to something over a hundred moves, and a state no cube can reach has no solve", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const cube = turnAll(solvedCube(3), 3, randomScramble(3, 25, seededRandom(seed)));
      const count = solveSteps(cube, 3).flatMap((step) => step.moves).filter(countsAsMove).length;
      expect(count).toBeGreaterThan(60);
      expect(count).toBeLessThan(200);
    }
    const solved = solvedCube(3);
    expect(() => solveSteps(`RU${solved.slice(2, 9)}UR${solved.slice(11)}`, 3)).toThrow();
    expect(solveSteps(solvedCube(4), 4)).toBeNull();
    expect(SOLVABLE_SIZES).toEqual([2, 3]);
  });
});

describe("the README on scrambles", () => {
  it("says what they are", () => {
    const scramble = randomScramble(3, 25, seededRandom("club night"));
    expect(movesNotation(scramble.slice(0, 4), 3)).toBe("B L' S' U'");
    expect(readme).toContain("will always begin `B L' S' U'`");
    expect(readme).toContain(`FULL_SCRAMBLE_LENGTHS[4];                               // ${FULL_SCRAMBLE_LENGTHS[4]}`);
    expect(readme).toContain(`\`${JSON.stringify(FULL_SCRAMBLE_LENGTHS).replace(/"/g, "").replace(/([:,])/g, "$1 ").replace("{", "{ ").replace("}", " }")}\``);
    for (let at = 1; at < scramble.length; at += 1) expect(scramble[at].axis).not.toBe(scramble[at - 1].axis);
  });
});

describe("the README on the command line", () => {
  /** Each command shown after a `$`, with what is printed under it up to the next blank line. */
  const shown = [...readme.matchAll(/^\$ kyuubu (.+)\n((?:.+\n)+)/gm)].map((found) => ({ args: found[1], printed: found[2] }));
  const run = (args, surroundings) => runCli(args.match(/"[^"]*"|\S+/g).map((arg) => arg.replace(/^"|"$/g, "")), surroundings);

  it("prints what it shows being printed", () => {
    expect(shown.length).toBeGreaterThanOrEqual(5);
    for (const { args, printed } of shown) {
      const { code, out } = run(args);
      expect(code, args).toBe(0);
      expect(out, args).toBe(printed.replace(/```\n$/, ""));
    }
  });

  it("names every option the help does, and no other", () => {
    const rows = table("## The command line");
    const told = new Set(rows.flatMap(([option]) => codes(option)).flatMap((text) => text.match(/--[a-z-]+/g) ?? []));
    expect(told).toEqual(new Set(STRINGS.en.cliUsage.match(/--[a-z-]+/g)));
  });

  it("the line for another program works, and its limits are the constants", () => {
    expect(readme).toContain(`printf "U'\\nR'\\n" | kyuubu --verify --from "R U" --stdin --json`);
    const { code, out } = run(`--verify --from "R U" --stdin --json`, { stdin: "U'\nR'\n" });
    expect(code).toBe(0);
    expect(JSON.parse(out).solved).toBe(true);
    expect(readme).toContain(`| How many turns a scramble has, 1 to ${MAX_CLI_LENGTH}.`);
    expect(readme).toContain(`| How many scrambles, 1 to ${MAX_CLI_COUNT} |`);
  });
});

describe("the README on export and import", () => {
  const solve = { size: 3, scramble: parseMoves("R U2 F'", 3), moves: parseMoves("F U2 R'", 3), ms: 12340, seed: "club night" };

  it("prints what the three of them write", () => {
    const [shape] = blocks("## Export and import", "json");
    expect(shape).toBe(toJSON(solve));
    expect(readme).toContain("```\n" + toText(solve) + "```");
    const [csv] = blocks("## Export and import", "csv");
    expect(csv).toBe(toCSV([solve]).replace(/\r\n/g, "\n"));
    const summary = summarize(solve);
    expect(readme).toContain(`// { scramble: "${summary.scramble}", moves: "${summary.moves}", solved: ${summary.solved}, count: ${summary.count}, start, state, size }`);
    expect(Object.keys(summary).sort()).toEqual(["count", "moves", "scramble", "size", "solved", "start", "state"]);
  });

  it("and they read back", () => {
    expect(fromJSON(toJSON(solve))).toEqual([solve]);
    expect(fromText(toText(solve))).toEqual(solve);
    expect(fromText("R U R' U'")).toMatchObject({ size: 3 });
    expect(fromText("3×3\nSOLVE: R")).toMatchObject({ size: 3, moves: parseMoves("R", 3) });
  });
});

describe("the README's reference", () => {
  const source = read("src/index.ts");
  const types = [...source.matchAll(/\btype (\w+)/g)].map((found) => found[1]);
  const react = [...read("src/react.tsx").matchAll(/^export (?:function|type) (\w+)/gm)].map((found) => found[1]);

  it("names every export, in code", () => {
    const names = [...Object.keys(kyuubu), ...types, ...react];
    expect(names.length).toBeGreaterThan(80);
    expect(react).toEqual(["KyuubuHandle", "KyuubuProps", "Kyuubu"]);
    for (const name of names) expect(readme, name).toMatch(new RegExp("`[^`\\n]*\\b" + name + "\\b[^`\\n]*`"));
  });

  it("names every option and member of the view", () => {
    const view = read("src/view/view.ts");
    const options = [...view.slice(view.indexOf("export type CubeViewOptions = {"), view.indexOf("const EDGE")).matchAll(/^ {2}(\w+)\??:/gm)].map((found) => found[1]);
    const told = new Set(table("### `new CubeView(element, options)`").flatMap(([option]) => codes(option)));
    expect(new Set(options)).toEqual(told);
    const members = [...view.slice(view.indexOf("export class CubeView")).matchAll(/^ {2}(?:get |readonly )?(\w+)(?:\(|:)/gm)].map((found) => found[1]).filter((name) => name !== "constructor");
    const shown = table("### `new CubeView(element, options)`", 1).flatMap(([member]) => codes(member)).map((text) => text.replace(/\(.*/, ""));
    expect(new Set(members)).toEqual(new Set(shown));
  });

  it("the theming table is the properties, the defaults and the looks there are", () => {
    const rows = table("## Theming");
    const faces = Object.fromEntries(rows.slice(0, 6).map(([property, option, fallback]) => [codes(option)[0].replace("colours.", ""), [codes(property)[0], codes(fallback)[0]]]));
    expect(faces).toEqual(Object.fromEntries(Object.keys(DEFAULT_COLOURS).map((face) => [face, [FACE_PROPERTIES[face], DEFAULT_COLOURS[face]]])));
    expect(codes(rows[6].join(" "))).toEqual(["--kyuubu-plastic", "plastic", DEFAULT_PLASTIC]);
    const view = read("src/view/view.ts");
    for (const [property, , fallback] of rows.slice(6)) expect(view).toContain(`var(${codes(property)[0]}, ${fallback === "`#111`" ? "${DEFAULT_PLASTIC}" : codes(fallback)[0]})`);
    expect(Object.keys(CUBE_THEMES)).toEqual(["standard", "paper", "stickerless"]);
    const [css] = blocks("## Theming", "css");
    for (const face of Object.keys(DEFAULT_COLOURS)) expect(css).toContain(`${FACE_PROPERTIES[face]}: ${CUBE_THEMES.paper.colours[face]};`);
    expect(css).toContain(`--kyuubu-plastic: ${CUBE_THEMES.paper.plastic};`);
  });

  it("the limits are the constants", () => {
    const rows = Object.fromEntries(table("## Limits").map(([limit, value]) => [limit, value]));
    expect(rows["Sizes the package is made and tested for"]).toBe(`${MIN_RECORD_SIZE}×${MIN_RECORD_SIZE} to ${MAX_RECORD_SIZE}×${MAX_RECORD_SIZE}`);
    expect(rows["Turns in one saved solve, scramble and moves each"]).toBe(MAX_RECORD_MOVES.toLocaleString("en"));
    expect(rows["Solves read from one file"]).toBe(MAX_RECORDS.toLocaleString("en"));
    expect(rows["Characters in a saved seed"]).toBe(String(MAX_RECORD_SEED));
    expect(rows["A scramble from the command line"]).toBe(`1 to ${MAX_CLI_LENGTH.toLocaleString("en")} turns`);
    expect(rows["Scrambles from the command line at once"]).toBe(String(MAX_CLI_COUNT));
  });

  it("names the family as each sibling names itself, and the trademark once", () => {
    for (const name of ["Korokoro", "Hitotsu", "Toranpu", "Tane", "Narabe", "Tenka", "Kumimoji"]) expect(readme).toContain(`https://github.com/johnmorrisdotca/${name.toLowerCase()}`);
    expect(readme.match(/is a trademark of its owner/g)).toHaveLength(1);
    expect(readme).toContain("**Japanese: included; not yet reviewed by a native reader.");
  });
});

describe("the list of Japanese strings", () => {
  const line = (text) => text.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
  const lines = [
    "# Kyuubu's words, in English and Japanese",
    "",
    "Made from `src/words.ts` and `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.",
    "",
    "**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please",
    "open a *Fix a translation* issue with the string's name. `{n}` and the other braces are filled in when shown.",
    "",
    "| Name | English | Japanese |",
    "| --- | --- | --- |",
    ...Object.keys(STRINGS.en).map((key) => `| \`${key}\` | ${line(STRINGS.en[key])} | ${line(STRINGS.ja[key])} |`),
    "",
  ];
  const made = lines.join("\n");

  it("is what the source makes: run `pnpm docs:make` after changing a string", () => {
    if (process.env.UPDATE_DOCS === "1") writeFileSync("docs/strings-ja.md", made);
    expect(read("docs/strings-ja.md")).toBe(made);
  });
});

describe("the demo site", () => {
  const sha = (text) => createHash("sha256").update(text).digest("hex");
  // The family's one stylesheet and one template, as every package carries them. A package never edits either.
  const FAMILY_CSS = "c1e392564a7fd94d0bb5cfaefb6d4fedfd147fc3e27f3a7afd8d8dac8c94a227";
  const FAMILY_TEMPLATE = "908afa0484638b817aa8799fdbe02c51af6d310603a5c27793b78fd4b2207b2e";

  it("wears the family's stylesheet, byte for byte", () => {
    const css = read("demo/family.css");
    const [first, ...rest] = css.split("\n");
    expect(first).toBe(`/* sha256 of every line after this one: ${FAMILY_CSS} */`);
    expect(sha(rest.join("\n"))).toBe(FAMILY_CSS);
  });

  it("and uses the family's header and footer, unchanged", () => {
    expect(sha(read("scripts/family-template.mjs"))).toBe(FAMILY_TEMPLATE);
  });

  it("loads the family's stylesheet before its own, and restyles nothing of the family's", () => {
    const page = read("demo/index.html");
    expect(page.indexOf('href="family.css"')).toBeGreaterThan(0);
    expect(page.indexOf('href="site.css"')).toBeGreaterThan(page.indexOf('href="family.css"'));
    for (const name of ["head", "header", "unreviewed", "footer", "script"]) expect(page).toContain(`<!-- family:${name} -->`);
    expect(page).not.toMatch(/<style/);
    // Its own stylesheet styles its own classes, and the two variables the family leaves to a page.
    const own = read("demo/site.css").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of own.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
      const selector = rule[2].trim();
      if (selector === ":root") continue;
      expect(selector, selector).toMatch(/\.cube-|\.more pre/);
    }
  });

  it("has a Japanese line for every English one on the page, with the same places to fill in", async () => {
    const app = read("demo/app.js");
    const tableText = app.slice(app.indexOf("const WORDS = {"), app.indexOf("\n};\n", app.indexOf("const WORDS = {")) + 3);
    const words = new Function(`${tableText}; return WORDS;`)();
    expect(Object.keys(words.ja)).toEqual(Object.keys(words.en));
    const places = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]).sort();
    for (const key of Object.keys(words.en)) expect(places(words.ja[key]), key).toEqual(places(words.en[key]));
    // Every word the page asks for is in the table, or is one the family's template brings.
    const page = read("demo/index.html");
    for (const found of page.matchAll(/data-say(?:-label|-placeholder)?="(\w+)"/g)) expect(Object.keys(words.en), found[1]).toContain(found[1]);
    for (const found of app.matchAll(/say\("(\w+)"/g)) expect(Object.keys(words.en), found[1]).toContain(found[1]);
  });
});

describe("the source", () => {
  it("has a doc comment on every export", () => {
    const files = [...readdirSync("src"), ...readdirSync("src/view").map((name) => `view/${name}`)].filter((name) => /\.tsx?$/.test(name) && name !== "index.ts");
    expect(files.length).toBeGreaterThan(10);
    const bare = [];
    for (const file of files) {
      const lines = read(`src/${file}`).split("\n");
      lines.forEach((text, at) => {
        if (/^export (const|function|type|class) /.test(text) && !lines[at - 1].trim().endsWith("*/")) bare.push(`${file}: ${text}`);
      });
    }
    expect(bare).toEqual([]);
  });

  it("holds no control character and no mention of how it was made", () => {
    for (const file of ["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "demo/app.js", "src/cli.ts"]) {
      // eslint-disable-next-line no-control-regex
      expect(read(file), file).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
    }
  });
});

describe("the version", () => {
  it("is the same in the package, in the code and in the changelog", () => {
    expect(VERSION).toBe(pkg.version);
    expect(read("CHANGELOG.md")).toContain(`## [${VERSION}]`);
    expect(readme).toContain(`"generator": "kyuubu ${VERSION}"`);
  });

  it("the package names built files, a command and what it is", () => {
    for (const entry of Object.values(pkg.exports)) for (const file of Object.values(entry)) expect(file).toMatch(/^\.\/dist\//);
    expect(pkg.publishConfig.exports).toBeUndefined();
    expect(pkg.bin).toEqual({ kyuubu: "bin/kyuubu.mjs" });
    expect(pkg.files).toContain("bin");
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.description.length).toBeLessThanOrEqual(350);
    expect(new Set(pkg.keywords).size).toBe(pkg.keywords.length);
  });
});
