import { describe, expect, it } from "vitest";

import { MAX_CLI_COUNT, MAX_CLI_LENGTH, STRINGS, VERSION, cubeNet, cubeSolved, isCubeState, parseMoves, runCli, solvedCube, turnAll } from "../src/index.ts";

const run = (args: string[], surroundings = {}) => runCli(args, surroundings);
const SOLVED = solvedCube(3);

describe("the command line's scrambles", () => {
  it("prints one for the 3×3 when asked nothing, at the usual length", () => {
    const { code, out, err } = run([]);
    expect([code, err]).toEqual([0, ""]);
    const moves = parseMoves(out, 3)!;
    expect(moves).toHaveLength(25);
    expect(cubeSolved(turnAll(SOLVED, 3, moves), 3)).toBe(false);
  });

  it("gives the same scramble for the same seed, and says --scramble is what it does anyway", () => {
    expect(run(["--seed", "club night"]).out).toBe("B L' S' U' F' R2 B R U2 B' R2 D' F2 R U M2 B R2 S R F2 L' B' E2 B2\n");
    expect(run(["--scramble", "-s", "club night"]).out).toBe(run(["--seed=club night"]).out);
  });

  it("takes a size, a length and a count, and one seed serves them all in order", () => {
    const three = run(["-n", "2", "-c", "3", "--seed", "table"]).out.split("\n");
    expect(three).toHaveLength(4);
    expect(three[0]).toBe("D' R2 U' F2 L' B' L F' R D' B'");
    expect(new Set(three.slice(0, 3)).size).toBe(3);
    expect(run(["--size", "4x4", "--length", "7", "--seed", "x"]).out.trim().split(" ")).toHaveLength(7);
    expect(parseMoves(run(["-n", "7"]).out, 7)).toHaveLength(100);
  });

  it("turns only the outer faces with --faces", () => {
    expect(run(["--seed", "club night", "--faces"]).out).toBe("B L' F' U' F' R2 B R U2 B' R2 D' F2 R U L2 B R2 B' R F2 L' B' D2 B2\n");
  });

  it("uses the random source it is handed when there is no seed", () => {
    const fixed = () => 0;
    expect(run(["--length", "3"], { random: fixed }).out).toBe(run(["--length", "3"], { random: fixed }).out);
  });

  it("prints JSON that says what each scramble leaves", () => {
    const data = JSON.parse(run(["--seed", "table", "-n", "2", "--json"]).out);
    expect(data).toMatchObject({ format: 1, generator: `kyuubu ${VERSION}` });
    expect(data.scrambles).toHaveLength(1);
    expect(data.scrambles[0]).toMatchObject({ size: 2, scramble: "D' R2 U' F2 L' B' L F' R D' B'", seed: "table" });
    expect(data.scrambles[0].state).toBe(turnAll(solvedCube(2), 2, parseMoves(data.scrambles[0].scramble, 2)!));
  });

  it("refuses a size, a length or a count out of range, with exit code 2", () => {
    expect(run(["-n", "8"])).toEqual({ code: 2, out: "", err: "kyuubu: “8”: a cube is 2 to 7 on a side\n" });
    expect(run(["-n", "3x4"]).code).toBe(2);
    expect(run(["-l", "0"]).err).toBe("kyuubu: “0”: a scramble is 1 to 1000 turns\n");
    expect(run(["-l", String(MAX_CLI_LENGTH + 1)]).code).toBe(2);
    expect(run(["-c", String(MAX_CLI_COUNT + 1)]).err).toBe("kyuubu: “101”: 1 to 100 scrambles at a time\n");
    expect(run(["-c", "two"]).code).toBe(2);
  });
});

describe("the command line's turns", () => {
  it("applies them and draws the cube, unfolded", () => {
    const { code, out } = run(["--apply", "R U R' U'"]);
    expect(code).toBe(0);
    expect(out).toBe(
      [
        "      U U L",
        "      U U F",
        "      U U F",
        "B L L F F D R R U B R R",
        "L L L F F U B R R B B B",
        "L L L F F F U R R B B B",
        "      D D R",
        "      D D D",
        "      D D D",
        "state: UULUUFUUFRRUBRRURRFFDFFUFFFDDRDDDDDDBLLLLLLLLBRRBBBBBB",
        "Not solved",
        "",
      ].join("\n"),
    );
  });

  it("takes the turns as one argument or many, and from standard input", () => {
    const one = run(["--apply", "R U R' U'"]).out;
    expect(run(["--apply", "R", "U", "R'", "U'"]).out).toBe(one);
    expect(run(["--apply", "--stdin"], { stdin: "R U\r\nR' U'\r\n" }).out).toBe(one);
    expect(run(["--apply", "--stdin"], { stdin: "" }).out).toContain("Solved\n");
  });

  it("starts from a scramble or from a state", () => {
    expect(run(["--apply", "--from", "R U", "U' R'"]).out).toContain(`state: ${SOLVED}\nSolved\n`);
    const mixed = turnAll(SOLVED, 3, parseMoves("R U", 3)!);
    expect(run(["--apply", "--state", mixed, "U' R'"]).out).toContain("Solved\n");
    expect(run(["--apply", "--state", "UUU"])).toEqual({ code: 1, out: "", err: "kyuubu: that is not a 3×3 cube: it takes 54 letters, 9 each of U, R, F, D, L and B\n" });
  });

  it("says by name which turn the cube cannot make, with exit code 1", () => {
    expect(run(["--apply", "R Q U"])).toEqual({ code: 1, out: "", err: "kyuubu: “Q” is not a turn a 3×3 cube can make\n" });
    expect(run(["-n", "2", "--apply", "M"]).err).toBe("kyuubu: “M” is not a turn a 2×2 cube can make\n");
    expect(run(["--apply", "--from", "R X", "R"]).code).toBe(1);
  });

  it("colours the cube only on a terminal that shows colour, and never in JSON", () => {
    const escape = String.fromCharCode(27);
    expect(run(["--apply", "R"], { colour: true }).out).toContain(`${escape}[48;2;`);
    expect(run(["--apply", "R"], { colour: false }).out).not.toContain(escape);
    expect(run(["--apply", "R"], { colour: true, env: { NO_COLOR: "1" } }).out).not.toContain(escape);
    expect(run(["--apply", "R", "--no-color"], { colour: true }).out).not.toContain(escape);
    expect(run(["--apply", "R", "--json"], { colour: true }).out).not.toContain(escape);
    expect(JSON.parse(run(["--apply", "R", "--json"]).out)).toMatchObject({ format: 1, size: 3, moves: "R", count: 1, solved: false });
  });
});

describe("the command line's check of a solve", () => {
  it("is exit code 0 when the turns solve the cube and 1 when they do not", () => {
    expect(run(["--verify", "--from", "R U", "U' R'"])).toEqual({ code: 0, out: "Solved. Moves: 2\n", err: "" });
    expect(run(["--verify", "--from", "R U", "U'"])).toEqual({ code: 1, out: "Not solved. Moves: 1\n", err: "" });
    expect(run(["--verify", "--from", "R", "x R'"]).out).toBe("Solved. Moves: 1\n");
    expect(JSON.parse(run(["--verify", "--from", "R U", "U'", "--json"]).out).solved).toBe(false);
    expect(run(["--verify", "--from", "R U", "U'", "--json"]).code).toBe(1);
  });

  it("needs a cube to start from", () => {
    expect(run(["--verify", "R"])).toEqual({ code: 2, out: "", err: 'kyuubu: --verify needs the cube it starts from: --from "<scramble>" or --state <state>\n' });
  });
});

describe("the command line's solve", () => {
  it("prints the layer-by-layer steps, and they solve the cube", () => {
    const { code, out } = run(["--solve", "R U2 F' L"]);
    expect(code).toBe(0);
    const lines = out.trim().split("\n");
    expect(lines[0]).toBe("Hold it         x2");
    expect(lines.at(-1)).toMatch(/^Steps: \d+\. Moves: \d+$/);
    const turns = lines.slice(0, -1).map((line) => line.replace(/^.+? {2,}/, "")).join(" ");
    expect(cubeSolved(turnAll(turnAll(SOLVED, 3, parseMoves("R U2 F' L", 3)!), 3, parseMoves(turns, 3)!), 3)).toBe(true);
  });

  it("solves a 2×2, says when there is nothing to do, and says which sizes it is for", () => {
    expect(run(["-n", "2", "--solve", "R U2 F'"]).out).toBe("Hold it      x'\nWhite layer  F'\nWhite layer  F U F'\nWhite layer  F R2 F'\nSteps: 4. Moves: 7\n");
    expect(run(["--solve"]).out).toBe("Already solved\n");
    expect(run(["-n", "4", "--solve", "R"])).toEqual({ code: 1, out: "", err: "kyuubu: the step-by-step solve is for the 2×2 and the 3×3\n" });
  });

  it("says so when a cube cannot be solved by turning it", () => {
    const twisted = `RU${SOLVED.slice(2, 9)}UR${SOLVED.slice(11)}`;
    expect(isCubeState(twisted, 3)).toBe(true);
    expect(run(["--solve", "--state", twisted])).toEqual({ code: 1, out: "", err: "kyuubu: this cube cannot be solved by turning it: a piece has been twisted or swapped\n" });
  });

  it("prints JSON with each step's name and its algorithms", () => {
    const data = JSON.parse(run(["--solve", "R U2 F' L", "--json"]).out);
    expect(data.steps[0]).toEqual({ stage: "hold", name: "Hold it", moves: "x2", algorithms: [] });
    expect(data.steps.at(-1).algorithms[0]).toEqual({ name: "edgeCycle", moves: "R U' R U R U R U' R' U' R2" });
    expect(data.count).toBe(data.steps.reduce((sum: number, step: { moves: string }) => sum + step.moves.split(" ").filter((move) => !/^[xyz]/.test(move)).length, 0));
  });
});

describe("the command line itself", () => {
  it("prints its version and its help", () => {
    expect(run(["--version"])).toEqual({ code: 0, out: `${VERSION}\n`, err: "" });
    expect(run(["-v"]).out).toBe(`${VERSION}\n`);
    expect(run(["--help"]).out).toBe(STRINGS.en.cliUsage);
    expect(run(["-h"]).out.startsWith("Usage: kyuubu")).toBe(true);
  });

  it("refuses an option it does not know, one without its value, and two things at once, with exit code 2", () => {
    expect(run(["--bogus"])).toEqual({ code: 2, out: "", err: "kyuubu: unknown option --bogus\n" });
    expect(run(["-x"]).code).toBe(2);
    expect(run(["--seed"])).toEqual({ code: 2, out: "", err: "kyuubu: --seed needs a value\n" });
    expect(run(["--apply", "--solve", "R"])).toEqual({ code: 2, out: "", err: "kyuubu: choose one of --scramble, --apply, --verify and --solve\n" });
    expect(run(["--lang", "fr"]).err).toBe("kyuubu: “fr”: the languages are en and ja\n");
  });

  it("speaks Japanese by flag, by LC_ALL, LC_MESSAGES or LANG in that order, and by the system's language where none is set", () => {
    expect(run(["--help", "--lang", "ja"]).out).toBe(STRINGS.ja.cliUsage);
    expect(run(["--help"], { env: { LANG: "ja_JP.UTF-8" } }).out.startsWith("使い方: kyuubu")).toBe(true);
    expect(run(["--help"], { env: { LC_ALL: "en_US.UTF-8", LANG: "ja_JP.UTF-8" } }).out.startsWith("Usage")).toBe(true);
    expect(run(["--help"], { env: { LC_MESSAGES: "ja_JP", LANG: "en_US" } }).out.startsWith("使い方")).toBe(true);
    expect(run(["--help"], { locale: "ja-JP" }).out.startsWith("使い方")).toBe(true);
    expect(run(["--help", "--lang", "en"], { env: { LANG: "ja_JP.UTF-8" } }).out.startsWith("Usage")).toBe(true);
    expect(run(["--apply", "Q", "--lang", "ja"]).err).toBe("kyuubu: 「Q」は3×3のキューブでは回せません\n");
    expect(run(["-n", "2", "--solve", "R U2 F'", "--lang", "ja"]).out).toBe("持ち方  x'\n白の面  F'\n白の面  F U F'\n白の面  F R2 F'\nステップ数: 4、手数: 7\n");
  });

  it("names every option in its help, in both languages", () => {
    const flags = (text: string) => [...text.matchAll(/--[a-z-]+/g)].map((found) => found[0]).sort();
    expect(new Set(flags(STRINGS.ja.cliUsage))).toEqual(new Set(flags(STRINGS.en.cliUsage)));
    for (const flag of ["--scramble", "--apply", "--verify", "--solve", "--size", "--length", "--count", "--seed", "--faces", "--from", "--state", "--stdin", "--json", "--lang", "--no-color", "--help", "--version"]) expect(STRINGS.en.cliUsage, flag).toContain(flag);
  });
});

describe("the cube unfolded", () => {
  it("is drawn for any size, letters apart or blocks of colour", () => {
    expect(cubeNet(solvedCube(2), 2)).toBe("    U U\n    U U\nL L F F R R B B\nL L F F R R B B\n    D D\n    D D\n");
    const coloured = cubeNet(solvedCube(2), 2, true).split("\n");
    expect(coloured).toHaveLength(7);
    expect(coloured[0].startsWith("     ")).toBe(true);
    expect(cubeNet(solvedCube(7), 7).split("\n")[7]).toHaveLength(4 * 13 + 3);
  });
});
