import { describe, expect, it } from "vitest";
import * as kyuubu from "../src/index.ts";
import {
  blocks,
  codes,
  countsAsMove,
  cubeSolved,
  encodeCubeMoves,
  FULL_SCRAMBLE_LENGTHS,
  fromJSON,
  fromText,
  MAX_CLI_COUNT,
  MAX_CLI_LENGTH,
  movesNotation,
  parseMove,
  parseMoves,
  pkg,
  randomScramble,
  read,
  readme,
  runCli,
  SOLVABLE_SIZES,
  SOLVE_ALGORITHMS,
  STRINGS,
  seededRandom,
  solvedCube,
  solveSteps,
  stageName,
  stageSays,
  summarize,
  table,
  toCSV,
  toJSON,
  toText,
  turnAll,
  undoAll,
} from "./docs.fixture.js";

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
    expect(
      cubeSolved(
        turnAll(
          cube,
          3,
          steps.flatMap((step) => step.moves),
        ),
        3,
      ),
    ).toBe(true);
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
    expect(readme).toContain(
      `movesNotation(undoAll(moves), 3);                // "${movesNotation(undoAll(moves), 3)}"`,
    );
    expect(cubeSolved(turnAll(cube, 3, undoAll(moves)), 3)).toBe(true);
    expect(parseMoves("R Q", 3)).toBeNull();
  });

  it("who it is for names notation the cube turns", () => {
    const from = readme.indexOf("## Who it is for");
    const found = codes(readme.slice(from, readme.indexOf("## Features")));
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
    expect(check).toContain(
      html.replace("./node_modules/@johnmorrisdotca/kyuubu/dist/index.js", "./kyuubu/dist/index.js").trimEnd(),
    );
  });

  it("names the five it proves, and no other", () => {
    expect(check).toMatch(
      /const projects = \{[\s\S]*\n {2}vue: [\s\S]*\n {2}svelte: [\s\S]*\n {2}angular: [\s\S]*\n {2}react: [\s\S]*\n {2}plain: /,
    );
    expect(pkg.description).toContain("React, Vue, Svelte, Angular or plain HTML");
    expect(readme).not.toMatch(/\b(Solid|Preact|Lit|Qwik|Ember)\b/);
  });
});

describe("the README's notation", () => {
  it("every piece of notation in its table is read on some cube, and written back the same", () => {
    const rows = table("## Notation\n");
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
    expect([
      parseMoves("M", 2),
      parseMoves("4R", 3),
      parseMoves("Q", 3),
      parseMoves("Rw", 4),
      parseMoves("r", 4),
    ]).toEqual([null, null, null, null, null]);
    expect(parseMove("9R", 9)).not.toBeNull();
    expect(turnAll(solvedCube(4), 4, parseMoves("R 2R", 4))).not.toBe(solvedCube(4));
  });

  it("the moves in The model are as it prints them", () => {
    for (const [text, n] of [
      ["R", 3],
      ["2R'", 4],
      ["x", 3],
    ]) {
      const move = parseMove(text, n);
      const shown = `{ axis: ${move.axis}, layer: ${JSON.stringify(move.layer)}, turns: ${move.turns} }`;
      expect(readme).toContain(`${`parseMove("${text}", ${n});`.padEnd(24)}// ${shown}`);
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
    for (const step of steps)
      expect(readme).toContain(`// ${stageName(step.stage).padEnd(widest + 2)}${movesNotation(step.moves, 2)}\n`);
    expect(readme).toContain(`stageSays("whiteLayer");          // "${stageSays("whiteLayer")}"`);
    expect(readme).toContain(`stageName("whiteLayer", "ja");    // "${stageName("whiteLayer", "ja")}"`);
  });

  it("the algorithms in its table are the method's", () => {
    const rows = table("## A solve a person can follow");
    expect(rows.map(([name, notation]) => [codes(name)[0], codes(notation)[0]])).toEqual(
      Object.entries(SOLVE_ALGORITHMS),
    );
  });

  it("a scrambled 3×3 comes to something over a hundred moves, and a state no cube can reach has no solve", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const cube = turnAll(solvedCube(3), 3, randomScramble(3, 25, seededRandom(seed)));
      const count = solveSteps(cube, 3)
        .flatMap((step) => step.moves)
        .filter(countsAsMove).length;
      expect(count).toBeGreaterThan(60);
      expect(count).toBeLessThan(200);
    }
    const solved = solvedCube(3);
    expect(() => solveSteps(`RU${solved.slice(2, 9)}UR${solved.slice(11)}`, 3)).toThrow();
    expect(solveSteps(solvedCube(4), 4)).toBeNull();
    expect(SOLVABLE_SIZES).toEqual([2, 3]);
  });
});

describe("the README on dragging a layer", () => {
  it("the releases it lists come to what it says", () => {
    const { quartersForRelease, COMMIT_ANGLE, FLICK_SPEED } = kyuubu;
    const shown = [...readme.matchAll(/^quartersForRelease\(([^)]*)\);\s+\/\/ (-?\d):/gm)];
    expect(shown).toHaveLength(6);
    for (const [, args, result] of shown)
      expect(quartersForRelease(...args.split(",").map(Number)), args).toBe(Number(result));
    expect(readme).toContain(`**There is a point of no return**, ${COMMIT_ANGLE} degrees unless`);
    expect(FLICK_SPEED).toBeLessThan(0.4);
    const view = ["src/view/view-types.ts", "src/view/view-scene.ts", "src/view/view-hands.ts", "src/view/view.ts"]
      .map(read)
      .join("\n");
    expect(readme).toContain("`--kyuubu-commit-filter` (`brightness(1.14)` unless");
    expect(view).toContain('const COMMIT_FILTER = "brightness(1.14)";');
    for (const name of ["data-dragging", "data-committed", "data-angle"])
      expect(view).toContain(`dataset.${name.slice(5)}`);
  });

  it("the demo's hint and controls say it in both languages", () => {
    const app = read("demo/app-words.js");
    expect(app).toContain("let go early and it goes back");
    expect(app).toContain("途中で離すと元に戻ります");
  });
});

describe("the README on scrambles", () => {
  it("says what they are", () => {
    const scramble = randomScramble(3, 25, seededRandom("club night"));
    expect(movesNotation(scramble.slice(0, 4), 3)).toBe("B L' S' U'");
    expect(readme).toContain("will always begin `B L' S' U'`");
    expect(readme).toContain(`FULL_SCRAMBLE_LENGTHS[4];                               // ${FULL_SCRAMBLE_LENGTHS[4]}`);
    expect(readme).toContain(
      `\`${JSON.stringify(FULL_SCRAMBLE_LENGTHS)
        .replace(/"/g, "")
        .replace(/([:,])/g, "$1 ")
        .replace("{", "{ ")
        .replace("}", " }")}\``,
    );
    for (let at = 1; at < scramble.length; at += 1) expect(scramble[at].axis).not.toBe(scramble[at - 1].axis);
  });
});

describe("the README on the command line", () => {
  /** Each command shown after a `$`, with what is printed under it up to the next blank line. */
  const shown = [...readme.matchAll(/^\$ kyuubu (.+)\n((?:.+\n)+)/gm)].map((found) => ({
    args: found[1],
    printed: found[2],
  }));
  const run = (args, surroundings) =>
    runCli(
      args.match(/"[^"]*"|\S+/g).map((arg) => arg.replace(/^"|"$/g, "")),
      surroundings,
    );

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
  const solve = {
    size: 3,
    scramble: parseMoves("R U2 F'", 3),
    moves: parseMoves("F U2 R'", 3),
    ms: 12340,
    seed: "club night",
  };

  it("prints what the three of them write", () => {
    const [shape] = blocks("## Export and import", "json");
    expect(shape).toBe(toJSON(solve));
    expect(readme).toContain(`\`\`\`text\n${toText(solve)}\`\`\``);
    const [, csv] = blocks("## Export and import", "text"); // the text sample, then the CSV
    expect(csv).toBe(toCSV([solve]).replace(/\r\n/g, "\n"));
    const summary = summarize(solve);
    expect(readme).toContain(
      `// { scramble: "${summary.scramble}", moves: "${summary.moves}", solved: ${summary.solved}, count: ${summary.count}, start, state, size }`,
    );
    expect(Object.keys(summary).sort()).toEqual(["count", "moves", "scramble", "size", "solved", "start", "state"]);
  });

  it("and they read back", () => {
    expect(fromJSON(toJSON(solve))).toEqual([solve]);
    expect(fromText(toText(solve))).toEqual(solve);
    expect(fromText("R U R' U'")).toMatchObject({ size: 3 });
    expect(fromText("3×3\nSOLVE: R")).toMatchObject({ size: 3, moves: parseMoves("R", 3) });
  });
});
