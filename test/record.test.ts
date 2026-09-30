import { describe, expect, it } from "vitest";

import {
  MAX_RECORD_MOVES,
  RECORD_FORMAT,
  VERSION,
  fromJSON,
  fromText,
  parseMoves,
  randomScramble,
  seededRandom,
  solveSteps,
  solvedCube,
  summarize,
  toCSV,
  toJSON,
  toText,
  turnAll,
  undoAll,
  type SolveRecord,
} from "../src/index.ts";

const moves = (text: string, n = 3) => parseMoves(text, n)!;
const solve: SolveRecord = { size: 3, scramble: moves("R U2 F'"), moves: moves("F U2 R'"), ms: 12340, at: Date.UTC(2026, 8, 30, 12), seed: "club night" };

describe("what a solve comes to", () => {
  it("is worked out from its turns", () => {
    expect(summarize(solve)).toEqual({
      size: 3,
      scramble: "R U2 F'",
      moves: "F U2 R'",
      start: turnAll(solvedCube(3), 3, solve.scramble),
      state: solvedCube(3),
      solved: true,
      count: 3,
    });
  });

  it("does not count a turn of the whole cube as a move", () => {
    const held = summarize({ size: 3, scramble: moves("R"), moves: moves("y R' x") });
    expect(held.count).toBe(1);
    expect(held.solved).toBe(false);
    expect(summarize({ size: 3, scramble: moves("R"), moves: moves("R' x") }).solved).toBe(true);
  });
});

describe("a solve as JSON", () => {
  it("goes out and comes back the same, one or many, at every size", () => {
    expect(fromJSON(toJSON(solve))).toEqual([solve]);
    const many: SolveRecord[] = [2, 3, 4, 5, 6, 7].map((size) => {
      const scramble = randomScramble(size, 30, seededRandom(`size ${size}`));
      return { size, scramble, moves: undoAll(scramble) };
    });
    expect(fromJSON(toJSON(many))).toEqual(many);
    for (const one of many) expect(summarize(one).solved).toBe(true);
  });

  it("carries a version, what made it, and what the turns come to", () => {
    const data = JSON.parse(toJSON(solve));
    expect(data.format).toBe(RECORD_FORMAT);
    expect(data.generator).toBe(`kyuubu ${VERSION}`);
    expect(data.solves[0]).toEqual({ size: 3, scramble: "R U2 F'", moves: "F U2 R'", state: solvedCube(3), solved: true, count: 3, ms: 12340, at: "2026-09-30T12:00:00.000Z", seed: "club night" });
  });

  it("carries a whole layer-by-layer solve, and it still solves when read back", () => {
    const scramble = randomScramble(3, 25, seededRandom("club night"));
    const mixed = turnAll(solvedCube(3), 3, scramble);
    const [back] = fromJSON(toJSON({ size: 3, scramble, moves: solveSteps(mixed, 3)!.flatMap((step) => step.moves) }))!;
    expect(summarize(back).solved).toBe(true);
  });

  it("trusts nothing it reads: what the file says the turns come to is ignored", () => {
    const lie = JSON.stringify({ format: 1, solves: [{ size: 3, scramble: "R", moves: "U", state: solvedCube(3), solved: true, count: 99 }] });
    const [read] = fromJSON(lie)!;
    expect(read).toEqual({ size: 3, scramble: moves("R"), moves: moves("U") });
    expect(summarize(read)).toMatchObject({ solved: false, count: 1 });
  });

  it("is null for what is not an export", () => {
    for (const text of ["", "not json", "null", "[]", "42", '"text"', '{"format":2,"solves":[]}', '{"format":1}', '{"format":1,"solves":{}}', '{"solves":[]}']) expect(fromJSON(text), text).toBeNull();
  });

  it("leaves out a solve it cannot rebuild, and keeps the rest", () => {
    const entries = [
      { size: 3, scramble: "R", moves: "R'" },
      { size: 3, scramble: "R Q", moves: "" },
      { size: 8, scramble: "R", moves: "" },
      { size: 1, scramble: "", moves: "" },
      { size: 2.5, scramble: "R", moves: "" },
      { size: "3", scramble: "R", moves: "" },
      { size: 2, scramble: "M", moves: "" },
      { size: 3, scramble: ["R"], moves: "" },
      { size: 3, scramble: "R", moves: Array.from({ length: MAX_RECORD_MOVES + 1 }, () => "U").join(" ") },
      null,
      "R U",
      { size: 4, scramble: "2R", moves: "2R'" },
    ];
    expect(fromJSON(JSON.stringify({ format: 1, solves: entries }))).toEqual([
      { size: 3, scramble: moves("R"), moves: moves("R'") },
      { size: 4, scramble: moves("2R", 4), moves: moves("2R'", 4) },
    ]);
  });

  it("drops a time, a date or a seed that is not one, and keeps the solve", () => {
    const odd = { size: 3, scramble: "R", moves: "R'", ms: -5, at: "yesterday", seed: 7 };
    expect(fromJSON(JSON.stringify({ format: 1, solves: [odd] }))).toEqual([{ size: 3, scramble: moves("R"), moves: moves("R'") }]);
    const long = { size: 3, scramble: "R", moves: "", ms: Infinity, seed: "s".repeat(201) };
    expect(fromJSON(JSON.stringify({ format: 1, solves: [long] }))).toEqual([{ size: 3, scramble: moves("R"), moves: [] }]);
  });
});

describe("a solve as plain text", () => {
  it("is a few lines a person can read", () => {
    expect(toText(solve)).toBe("3x3\nscramble: R U2 F'\nsolve: F U2 R'\ntime: 12.34\nseed: club night\n");
    expect(toText({ size: 4, scramble: [], moves: moves("2R U", 4) })).toBe("4x4\nsolve: 2R U\n");
  });

  it("goes out and comes back the same, but for the date, which the text does not carry", () => {
    const { at, ...rest } = solve;
    expect(at).toBeDefined();
    expect(fromText(toText(solve))).toEqual(rest);
    for (const size of [2, 3, 4, 5, 6, 7]) {
      const scramble = randomScramble(size, 20, seededRandom(`text ${size}`));
      const record = { size, scramble, moves: undoAll(scramble) };
      expect(fromText(toText(record))).toEqual(record);
    }
  });

  it("reads a bare line of notation, a × for the x, either case, and Windows line endings", () => {
    expect(fromText("R U R' U'")).toEqual({ size: 3, scramble: [], moves: moves("R U R' U'") });
    expect(fromText("2×2\r\nSCRAMBLE: R U\r\nSolve: U'\r\nR'\r\nTime: 3.5 s\r\n")).toEqual({ size: 2, scramble: moves("R U", 2), moves: moves("U' R'", 2), ms: 3500 });
    expect(fromText("4 x 4\nmoves: 2R")).toEqual({ size: 4, scramble: [], moves: moves("2R", 4) });
  });

  it("is null for what is not a solve", () => {
    for (const text of ["", "   \n", "hello", "3x4\nR", "8x8\nR", "1x1\nR", "3x3", "3x3\n2x2\nR", "2x2\nsolve: M", "scramble: R Q", "solve: R\ntime: soon", "solve: R\ntime:"]) expect(fromText(text), text).toBeNull();
  });
});

describe("solves as CSV", () => {
  it("is a header and a row a solve, ended CRLF", () => {
    expect(toCSV([solve, { size: 2, scramble: moves("R", 2), moves: [] }])).toBe(
      "time,size,scramble,moves,count,solved,seconds,seed\r\n2026-09-30T12:00:00.000Z,3,R U2 F',F U2 R',3,true,12.34,club night\r\n,2,R,,0,false,,\r\n",
    );
    expect(toCSV([])).toBe("time,size,scramble,moves,count,solved,seconds,seed\r\n");
  });

  it("quotes a cell that needs it, and never writes one a spreadsheet would run", () => {
    const rows = toCSV([
      { size: 3, scramble: [], moves: [], seed: 'a "b", c' },
      { size: 3, scramble: [], moves: [], seed: "=SUM(A1)" },
      { size: 3, scramble: [], moves: [], seed: "@home" },
    ]).split("\r\n");
    expect(rows[1].endsWith(',"a ""b"", c"')).toBe(true);
    expect(rows[2].endsWith(",'=SUM(A1)")).toBe(true);
    expect(rows[3].endsWith(",'@home")).toBe(true);
  });
});
