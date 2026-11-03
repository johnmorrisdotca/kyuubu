import { describe, expect, it } from "vitest";
import {
  CUBOID_RANDOM_STATE_MAX,
  cuboidDragAngle,
  cuboidMoveLegal,
  cuboidMoveName,
  cuboidMoveNotation,
  cuboidName,
  cuboidQuartersForRelease,
  cuboidScrambleLength,
  cuboidSlots,
  cuboidSolved,
  HALF_TURN_COMMIT,
  halfTurnOnly,
  hasRandomStateScramble,
  isCuboidState,
  legalTurns,
  parseCuboidMoves,
  pickCuboidDrag,
  planCuboidReplay,
  randomCuboidScramble,
  readCuboidKey,
  solvedCuboid,
  turnAllCuboid,
  undoCuboidMoves,
} from "../src/cuboid/index.ts";
import { seededRandom } from "../src/index.ts";
import { viewMatrix } from "../src/view/geometry.ts";
import { dimsOf, NAMED, SHAPES } from "./cuboid.fixture.ts";

describe("a scramble", () => {
  it("is made of turns the puzzle can make, ends unsolved, and is undone by its undoing, on every shape", () => {
    for (const dims of [...NAMED, ...SHAPES.filter((_, at) => at % 7 === 0)]) {
      for (const length of [undefined, 1, 5, 30]) {
        const scramble = randomCuboidScramble(dims, length, seededRandom(`${cuboidName(dims)} ${length}`));
        if (length !== undefined) expect(scramble.length).toBeGreaterThanOrEqual(length);
        for (const move of scramble) expect(cuboidMoveLegal(dims, move)).toBe(true);
        const mixed = turnAllCuboid(solvedCuboid(dims), dims, scramble);
        expect(cuboidSolved(mixed, dims), `${cuboidName(dims)} ${length}`).toBe(false);
        expect(isCuboidState(mixed, dims)).toBe(true);
        expect(turnAllCuboid(mixed, dims, undoCuboidMoves(scramble))).toBe(solvedCuboid(dims));
        expect(parseCuboidMoves(scramble.map((move) => cuboidMoveNotation(move, dims)).join(" "), dims)).toEqual(
          scramble,
        );
      }
    }
  });

  it("never turns one layer twice running when it walks, and gives the same scramble for the same seed", () => {
    for (const dims of [dimsOf("2x2x3"), dimsOf("3x3x5"), dimsOf("1x1x3")]) {
      const scramble = randomCuboidScramble(dims, 60, seededRandom("club night"));
      // Sixty turns, and one or two more where the sixty came to solved.
      expect(scramble.length).toBeGreaterThanOrEqual(60);
      expect(scramble.length).toBeLessThanOrEqual(62);
      scramble.slice(1).forEach((move, at) => {
        expect(move.axis !== scramble[at].axis || move.layer !== scramble[at].layer).toBe(true);
      });
      expect(randomCuboidScramble(dims, 60, seededRandom("club night"))).toEqual(scramble);
      expect(randomCuboidScramble(dims, 60, seededRandom("another"))).not.toEqual(scramble);
    }
  });

  it("is the same scramble from the same seed for ever: these are pinned", () => {
    const written = (text: string, length?: number) => {
      const dims = dimsOf(text);
      return randomCuboidScramble(dims, length, seededRandom("club night"))
        .map((move) => cuboidMoveNotation(move, dims))
        .join(" ");
    };
    expect(written("3x3x1")).toMatchInlineSnapshot(`"L2 M2 U2 R2 D2 R2"`);
    expect(written("2x3x3")).toMatchInlineSnapshot(
      `"L R2 L' R F2 E2 U2 L' U2 B2 L2 E2 S2 R' D2 F2 R B2 L R D2 S2 U2 R S2 R2 E2"`,
    );
    expect(written("3x3x4", 12)).toMatchInlineSnapshot(`"2F' L2 E2 B E2 F2 2B2 2F' D2 2B' F' R2"`);
  });

  it("has a length that grows with the layers there are to turn, and a state count that decides how it is made", () => {
    expect(cuboidScrambleLength([3, 3, 3])).toBe(28);
    expect(cuboidScrambleLength([2, 2, 3])).toBeLessThan(cuboidScrambleLength([3, 3, 5]));
    expect(cuboidScrambleLength([7, 7, 7])).toBeLessThanOrEqual(100);
    for (const text of ["1x1x2", "1x2x3", "1x3x3", "1x3x4"])
      expect(hasRandomStateScramble(dimsOf(text)), text).toBe(true);
    for (const text of ["2x2x3", "2x3x3", "2x3x4", "3x3x4", "3x3x5", "1x4x4"])
      expect(hasRandomStateScramble(dimsOf(text)), text).toBe(false);
    expect(CUBOID_RANDOM_STATE_MAX).toBe(20000);
  });

  it("is a state drawn uniformly from all that are not solved, for the puzzles small enough to list, and reaches them all", () => {
    for (const [text, states, solvedWays] of [
      ["1x2x3", 192, 4],
      ["1x3x3", 768, 4],
    ] as const) {
      const dims = dimsOf(text);
      const random = seededRandom(`uniform ${text}`);
      const counts = new Map<string, number>();
      const draws = states * 40;
      for (let at = 0; at < draws; at += 1) {
        const mixed = turnAllCuboid(solvedCuboid(dims), dims, randomCuboidScramble(dims, undefined, random));
        counts.set(mixed, (counts.get(mixed) ?? 0) + 1);
      }
      // Every state but the ones that count as solved, and no more.
      expect(counts.size).toBe(states - solvedWays);
      const mean = draws / counts.size;
      let chi = 0;
      for (const seen of counts.values()) chi += (seen - mean) ** 2 / mean;
      const df = counts.size - 1;
      // A uniform draw has a chi-square about df with a spread of √(2 df); six of those is far past chance, and a walk of one length on these puzzles is far past that.
      expect(chi).toBeLessThan(df + 6 * Math.sqrt(2 * df));
    }
  });

  it("is shortest in the puzzles it lists, so a floppy's is a few turns", () => {
    const dims = dimsOf("3x3x1");
    const lengths = Array.from(
      { length: 300 },
      (_, at) => randomCuboidScramble(dims, undefined, seededRandom(`short ${at}`)).length,
    );
    expect(Math.max(...lengths)).toBeLessThanOrEqual(8);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(1);
  });

  it("refuses a puzzle with nothing to turn", () => {
    expect(() => randomCuboidScramble([1, 1, 1], 5)).toThrow(RangeError);
  });
});

describe("a solve played back", () => {
  it("is read, checked and timed, and ends solved when the moves undo the scramble", () => {
    const dims = dimsOf("2x3x3");
    const scramble = randomCuboidScramble(dims, 10, seededRandom("replay"));
    const written = scramble.map((move) => cuboidMoveNotation(move, dims)).join(" ");
    const solution = undoCuboidMoves(scramble)
      .map((move) => cuboidMoveNotation(move, dims))
      .join(" ");
    const planned = planCuboidReplay({ dims, scramble: written, solution, timeMs: 5000 });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.solved).toBe(true);
    expect(planned.plan.dims).toEqual(dims);
    expect(planned.plan.steps).toHaveLength(10);
    expect(planned.plan.states).toHaveLength(11);
    expect(planned.plan.scrambleStates).toHaveLength(11);
    expect(planned.plan.scrambleStates[0]).toBe(solvedCuboid(dims));
    expect(planned.plan.scrambleStates[10]).toBe(planned.plan.start);
    expect(planned.plan.totalMs).toBeCloseTo(5000);
    expect(planned.plan.pace).toBe("spread");
    expect(planned.plan.steps.map((step) => step.text).join(" ")).toBe(solution);
    expect(cuboidSolved(planned.plan.states[10], dims)).toBe(true);
    const unfinished = planCuboidReplay({ dims, scramble: written, solution: "U2" });
    expect(unfinished.ok && unfinished.plan.solved).toBe(false);
  });

  it("says which piece of the text is wrong, and why, and refuses a cuboid that is not one", () => {
    expect(planCuboidReplay({ dims: [3, 3, 1], scramble: "R2", solution: "U R2" })).toEqual({
      ok: false,
      fault: { part: "solution", token: "U", at: 0, fault: "half-turn-only" },
    });
    expect(planCuboidReplay({ dims: [3, 3, 1], scramble: "R2 F", solution: "" })).toEqual({
      ok: false,
      fault: { part: "scramble", token: "F", at: 3, fault: "whole-puzzle" },
    });
    expect(planCuboidReplay({ dims: [1, 1, 1], scramble: "", solution: "" })).toEqual({
      ok: false,
      fault: { part: "dims" },
    });
    expect(planCuboidReplay({ dims: [3, 3, 1], scramble: "", solution: "R2 ".repeat(2001) })).toEqual({
      ok: false,
      fault: { part: "length" },
    });
  });
});

describe("the words for a cuboid's moves", () => {
  it("names each move a cuboid writes, in both languages, and the half turn of a layer that is not square", () => {
    expect(cuboidMoveName("R2")).toBe("Right face, twice");
    expect(cuboidMoveName("U'")).toBe("Top face, anticlockwise");
    expect(cuboidMoveName("2R")).toBe("Right layer 2, clockwise");
    expect(cuboidMoveName("M2")).toBe("Middle slice, twice");
    expect(cuboidMoveName("R2", "ja")).toBe("右の面、2回");
    for (const dims of NAMED) {
      const scramble = randomCuboidScramble(dims, 30, seededRandom("words"));
      for (const move of scramble) {
        const code = cuboidMoveNotation(move, dims);
        for (const language of ["en", "ja"] as const) {
          const said = cuboidMoveName(code, language);
          expect(said, `${dims.join("x")} ${code}`).toEqual(expect.any(String));
          expect(said, code).not.toMatch(/[{}]/);
        }
      }
    }
  });

  it("is nothing for what a cuboid has no such move as: a wide turn, a rotation, or text that is not a move", () => {
    for (const text of ["", "Rw", "3Uw", "x", "y2", "z'", "R3", "r", "0R", "8R", "R2'"])
      expect(cuboidMoveName(text), text).toBeNull();
  });
});

describe("the hands", () => {
  it("lets go of a layer that only half turns at the middle of the way round, and a flick helps it a little", () => {
    expect(cuboidQuartersForRelease(HALF_TURN_COMMIT - 1, 0, true)).toBe(0);
    expect(cuboidQuartersForRelease(HALF_TURN_COMMIT, 0, true)).toBe(2);
    expect(cuboidQuartersForRelease(-150, 0, true)).toBe(-2);
    expect(cuboidQuartersForRelease(40, 0.3, true)).toBe(2);
    expect(cuboidQuartersForRelease(40, 0.1, true)).toBe(0);
    expect(cuboidQuartersForRelease(40, -0.3, true)).toBe(0);
    // A layer that turns by quarters is the cube's.
    expect(cuboidQuartersForRelease(40, 0, false)).toBe(1);
    expect(cuboidQuartersForRelease(10, 0, false)).toBe(0);
    expect(cuboidQuartersForRelease(130, 0, false)).toBe(2);
  });

  it("follows a half-only layer twice as fast, and never past a half turn", () => {
    const pick = { axis: 1 as const, layer: 0, along: [1, 0] as [number, number], halfOnly: true };
    expect(cuboidDragAngle(pick, 50, 0, 100)).toBeCloseTo(90);
    expect(cuboidDragAngle({ ...pick, halfOnly: false }, 50, 0, 100)).toBeCloseTo(45);
    expect(cuboidDragAngle(pick, 5000, 0, 100)).toBe(180);
    expect(cuboidDragAngle(pick, -5000, 0, 100)).toBe(-180);
  });

  it("picks a layer to drag only among those that can turn", () => {
    const view = viewMatrix(-35, 28);
    for (const dims of NAMED) {
      const { slots } = cuboidSlots(dims);
      slots.forEach((slot) => {
        for (const [dx, dy] of [
          [40, 0],
          [0, 40],
          [30, 30],
          [-30, 30],
        ]) {
          const pick = pickCuboidDrag(slot, dims, view, dx, dy);
          if (pick === null) continue;
          expect(
            legalTurns(dims, pick.axis, pick.layer).length,
            `${cuboidName(dims)} ${pick.axis} ${pick.layer}`,
          ).toBeGreaterThan(0);
          expect(pick.halfOnly).toBe(halfTurnOnly(dims, pick.axis));
        }
      });
    }
    expect(pickCuboidDrag(cuboidSlots([3, 3, 1]).slots[0], [3, 3, 1], view, 2, 2)).toBeNull();
  });

  it("makes a key a half turn where a layer has only that, and nothing where there is no layer", () => {
    expect(readCuboidKey("r", false, [3, 3, 1], 1)).toEqual({ move: { axis: 0, layer: 2, turns: 2 } });
    expect(readCuboidKey("R", true, [3, 3, 1], 1)).toEqual({ move: { axis: 0, layer: 2, turns: 2 } });
    expect(readCuboidKey("u", false, [2, 3, 2], 1)).toEqual({ move: { axis: 1, layer: 2, turns: 3 } });
    expect(readCuboidKey("f", false, [3, 3, 1], 1)).toBeNull();
    expect(readCuboidKey("m", false, [2, 3, 2], 1)).toBeNull();
    expect(readCuboidKey("x", false, [3, 3, 3], 1)).toBeNull();
    expect(readCuboidKey("2", false, [3, 3, 3], 1)).toEqual({ depth: 2 });
    expect(readCuboidKey("r", false, [3, 3, 3], 2)).toEqual({ move: { axis: 0, layer: 1, turns: 3 } });
  });
});
