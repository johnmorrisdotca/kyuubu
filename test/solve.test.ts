import { describe, expect, it } from "vitest";

import { SOLVE_ALGORITHMS, countsAsMove, cubeSolved, joinTurns, movesNotation, parseMoves, randomScramble, solveSteps, solvedCube, turnAll, type SolveStep } from "../src/index.ts";

/** A seeded random source, so a failure names a scramble that can be run again. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const played = (state: string, n: number, steps: SolveStep[]) => turnAll(state, n, steps.flatMap((step) => step.moves));

describe("the layer-by-layer solve", () => {
  it("answers nothing for a size the method is not written for", () => {
    expect(solveSteps(solvedCube(4), 4)).toBeNull();
  });

  it("has nothing to do for a solved cube held white down", () => {
    const held = turnAll(solvedCube(3), 3, parseMoves("x2", 3)!);
    expect(solveSteps(held, 3)).toEqual([]);
  });

  for (const n of [2, 3]) {
    it(`solves a hundred scrambled ${n}×${n} cubes, in the method's order`, () => {
      const order = ["hold", "whiteCross", "whiteCorners", "whiteLayer", "middleLayer", "yellowCross", "yellowFace", "yellowCorners", "yellowEdges"];
      for (let seed = 1; seed <= 100; seed += 1) {
        const scramble = randomScramble(n, n === 2 ? 11 : 25, seeded(seed));
        const state = turnAll(solvedCube(n), n, scramble);
        const steps = solveSteps(state, n)!;
        expect(cubeSolved(played(state, n, steps), n), `${n}×${n} ${movesNotation(scramble, n)}`).toBe(true);
        const stages = steps.map((step) => order.indexOf(step.stage));
        expect(stages, movesNotation(scramble, n)).toEqual([...stages].sort((a, b) => a - b));
        // Only the first step turns the whole cube: everything after is for a cube held still.
        expect(steps.slice(1).every((step) => step.moves.every(countsAsMove))).toBe(true);
      }
    });
  }

  it("keeps every step short enough to follow", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const state = turnAll(solvedCube(3), 3, randomScramble(3, 25, seeded(1000 + seed)));
      for (const step of solveSteps(state, 3)!) expect(step.moves.length, step.stage).toBeLessThanOrEqual(30);
    }
  });

  it("names the algorithm a step turns", () => {
    // A cube one Sune away from solved, held white down: the yellow face is its only step, and it says Sune.
    const state = turnAll(solvedCube(3), 3, parseMoves("x2 R U2 R' U' R U' R'", 3)!);
    const steps = solveSteps(state, 3)!;
    expect(steps.map((step) => step.stage)).toEqual(["yellowFace"]);
    expect(steps[0].algorithms).toEqual(["sune"]);
    expect(movesNotation(steps[0].moves, 3)).toBe("R U R' U R U2 R'");
  });
});

describe("a step as it is taught", () => {
  it("writes turns of one layer in a row as one", () => {
    expect(movesNotation(joinTurns(parseMoves("U' U2 R R' F", 3)!), 3)).toBe("U F");
  });

  it("keeps each algorithm whole among its parts, and its moves are the parts' joined", () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const state = turnAll(solvedCube(3), 3, randomScramble(3, 25, seeded(500 + seed)));
      for (const step of solveSteps(state, 3)!) {
        // An algorithm is turned whole, from whichever side it is done: as many turns as it is written with.
        for (const part of step.parts) if (part.algorithm !== undefined) expect(part.moves.length).toBe(SOLVE_ALGORITHMS[part.algorithm].split(" ").length);
        expect(turnAll(solvedCube(3), 3, step.moves)).toBe(turnAll(solvedCube(3), 3, step.parts.flatMap((part) => part.moves)));
      }
    }
  });
});
