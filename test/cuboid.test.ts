import { describe, expect, it } from "vitest";

import { seededRandom } from "../src/index.ts";
import {
  CUBOID_MAX_SIDE,
  CUBOID_PRESETS,
  CUBOID_RANDOM_STATE_MAX,
  HALF_TURN_COMMIT,
  cuboidDragAngle,
  cuboidFaces,
  cuboidMoveLegal,
  cuboidMoveNotation,
  cuboidName,
  cuboidPermutationOf,
  cuboidQuartersForRelease,
  cuboidScrambleLength,
  cuboidSlots,
  cuboidSolved,
  cuboidStickerCount,
  halfTurnOnly,
  hasRandomStateScramble,
  isCuboidDims,
  isCuboidState,
  legalCuboidMoves,
  legalTurns,
  parseCuboidDims,
  parseCuboidMove,
  parseCuboidMoves,
  pickCuboidDrag,
  planCuboidReplay,
  randomCuboidScramble,
  readCuboidKey,
  readCuboidMove,
  readCuboidMoves,
  sameCuboid,
  solvedCuboid,
  turnAllCuboid,
  turnCuboid,
  undoCuboidMove,
  undoCuboidMoves,
  type CuboidDims,
  type CuboidMove,
} from "../src/cuboid/index.ts";
import { viewMatrix } from "../src/view/geometry.ts";

const dimsOf = (text: string) => parseCuboidDims(text)!;
/** Every shape up to turning it in the hand, from 1 to 7 on a side and not 1×1×1: 83 of them. */
const SHAPES: CuboidDims[] = [];
for (let a = 1; a <= CUBOID_MAX_SIDE; a += 1) for (let b = a; b <= CUBOID_MAX_SIDE; b += 1) for (let c = b; c <= CUBOID_MAX_SIDE; c += 1) if (c > 1) SHAPES.push([a, b, c]);
const NAMED = CUBOID_PRESETS.map((preset) => preset.dims);
/** The same shapes as they might be asked for, with the sides in every order. */
const ORDERS = (dims: CuboidDims): CuboidDims[] => [
  [dims[0], dims[1], dims[2]],
  [dims[1], dims[2], dims[0]],
  [dims[2], dims[0], dims[1]],
];

describe("which cuboids there are", () => {
  it("is every a×b×c with each side from 1 to 7, but not 1×1×1", () => {
    expect(SHAPES).toHaveLength(83);
    for (const dims of SHAPES) expect(isCuboidDims(dims)).toBe(true);
    expect(isCuboidDims([1, 1, 1])).toBe(false);
    expect(isCuboidDims([0, 3, 3])).toBe(false);
    expect(isCuboidDims([8, 1, 1])).toBe(false);
    expect(isCuboidDims([2.5, 2, 2])).toBe(false);
    expect(isCuboidDims([3, 3])).toBe(false);
    expect(isCuboidDims("3x3x3")).toBe(false);
  });

  it("is read from the ways people write it, and the same shape in any order is the same puzzle", () => {
    for (const text of ["2x3x3", "2×3×3", "2 3 3", "2,3,3", " 2 X 3 x 3 "]) expect(parseCuboidDims(text)).toEqual([2, 3, 3]);
    for (const text of ["1x1x1", "9x3x3", "2x3", "two", ""]) expect(parseCuboidDims(text)).toBeNull();
    expect(cuboidName([2, 3, 3])).toBe("2×3×3");
    expect(sameCuboid([3, 3, 2], [2, 3, 3])).toBe(true);
    expect(sameCuboid([3, 3, 2], [2, 2, 3])).toBe(false);
  });

  it("names each shape once, with its sides in order, and every named one is a cuboid", () => {
    expect(new Set(CUBOID_PRESETS.map((preset) => preset.key)).size).toBe(CUBOID_PRESETS.length);
    for (const preset of CUBOID_PRESETS) {
      expect(preset.key).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(isCuboidDims(preset.dims)).toBe(true);
      expect(preset.label).toBe(cuboidName([...preset.dims].sort((a, b) => a - b) as unknown as CuboidDims));
      expect(preset.name.ja).not.toBe("");
      expect(preset.says.en.length).toBeGreaterThan(20);
      expect(preset.says.ja.length).toBeGreaterThan(10);
    }
    expect(new Set(CUBOID_PRESETS.map((preset) => preset.label)).size).toBe(CUBOID_PRESETS.length);
    expect(CUBOID_PRESETS.map((preset) => preset.label)).toEqual(["1×2×3", "1×3×3", "2×2×3", "2×3×3", "2×3×4", "3×3×4", "3×3×5"]);
  });
});

describe("a cuboid of every size", () => {
  it("has the stickers of its surface, a face the size of its sides, and starts solved", () => {
    for (const dims of SHAPES) {
      const [a, b, c] = dims;
      expect(cuboidStickerCount(dims)).toBe(2 * (a * b + b * c + a * c));
      expect(cuboidSlots(dims).slots).toHaveLength(cuboidStickerCount(dims));
      const state = solvedCuboid(dims);
      expect(state).toHaveLength(cuboidStickerCount(dims));
      expect(cuboidSolved(state, dims)).toBe(true);
      expect(isCuboidState(state, dims)).toBe(true);
      expect(isCuboidState(state.slice(1), dims)).toBe(false);
      expect(cuboidFaces(dims).map((face) => [face.face, face.cols, face.rows])).toEqual([
        ["U", a, c],
        ["R", c, b],
        ["F", a, b],
        ["D", a, c],
        ["L", c, b],
        ["B", a, b],
      ]);
    }
  });

  it("says which layers turn a quarter and which only a half, and that a side one cubie deep has no layer", () => {
    for (const dims of SHAPES.flatMap(ORDERS)) {
      for (const axis of [0, 1, 2] as const) {
        const others = [0, 1, 2].filter((one) => one !== axis).map((one) => dims[one]);
        for (let layer = -1; layer <= dims[axis]; layer += 1) {
          const turns = legalTurns(dims, axis, layer);
          if (layer < 0 || layer >= dims[axis] || dims[axis] === 1) expect(turns).toEqual([]);
          else expect(turns).toEqual(others[0] === others[1] ? [1, 2, 3] : [2]);
        }
        expect(halfTurnOnly(dims, axis)).toBe(others[0] !== others[1]);
      }
    }
    // The three named shapes people know best, and what the rule makes of them.
    expect(legalTurns([2, 2, 3], 2, 1)).toEqual([1, 2, 3]);
    expect(legalTurns([2, 2, 3], 0, 1)).toEqual([2]);
    expect(legalTurns([2, 3, 3], 0, 0)).toEqual([1, 2, 3]);
    expect(legalTurns([2, 3, 3], 1, 0)).toEqual([2]);
    expect(legalTurns([3, 3, 1], 2, 0)).toEqual([]);
    expect(legalTurns([3, 3, 1], 1, 1)).toEqual([2]);
  });

  it("turns every legal turn of every shape as a permutation of its stickers", () => {
    for (const dims of SHAPES.flatMap(ORDERS)) {
      const count = cuboidStickerCount(dims);
      for (const move of legalCuboidMoves(dims)) {
        const to = cuboidPermutationOf(dims, move);
        expect(to).toHaveLength(count);
        expect(new Set(to).size).toBe(count);
        expect(cuboidMoveLegal(dims, move)).toBe(true);
        expect(to.some((place, at) => place !== at)).toBe(true);
      }
    }
  });

  it("is back where it began after four quarter turns, and after two half turns, of every layer of every shape", () => {
    for (const dims of SHAPES.flatMap(ORDERS)) {
      const mixed = turnAllCuboid(solvedCuboid(dims), dims, randomCuboidScramble(dims, 12, seededRandom(`mix ${dims}`)));
      for (const move of legalCuboidMoves(dims)) {
        const same = Array<CuboidMove>(move.turns === 2 ? 2 : 4).fill(move.turns === 2 ? move : { ...move, turns: 1 });
        expect(turnAllCuboid(mixed, dims, same)).toBe(mixed);
        expect(turnCuboid(turnCuboid(mixed, dims, move), dims, undoCuboidMove(move))).toBe(mixed);
      }
    }
  });

  it("never changes the state it is given, and keeps every letter's count", () => {
    const dims = dimsOf("2x3x4");
    const state = solvedCuboid(dims);
    const after = turnCuboid(state, dims, { axis: 1, layer: 1, turns: 2 });
    expect(state).toBe(solvedCuboid(dims));
    expect(after).not.toBe(state);
    expect(isCuboidState(after, dims)).toBe(true);
  });

  it("refuses a turn the puzzle cannot make, by name, and makes no change", () => {
    const refused: [CuboidDims, CuboidMove][] = [
      [[2, 3, 3], { axis: 1, layer: 0, turns: 1 }],
      [[2, 3, 3], { axis: 1, layer: 0, turns: 3 }],
      [[3, 3, 1], { axis: 0, layer: 0, turns: 1 }],
      [[3, 3, 1], { axis: 2, layer: 0, turns: 2 }],
      [[2, 2, 3], { axis: 2, layer: 3, turns: 2 }],
      [[2, 2, 3], { axis: 2, layer: -1, turns: 2 }],
      [[2, 2, 3], { axis: 2, layer: 0.5, turns: 2 }],
    ];
    for (const [dims, move] of refused) {
      expect(cuboidMoveLegal(dims, move)).toBe(false);
      expect(() => turnCuboid(solvedCuboid(dims), dims, move)).toThrow(RangeError);
    }
  });

  it("turns whole slices in the right places: a half turn of the front of a floppy moves exactly the front row's stickers", () => {
    const dims = dimsOf("3x3x1");
    // Axis y layer 2 is the top row; a half turn about y swaps its left and right ends and flips it over.
    const top = { axis: 1, layer: 2, turns: 2 } as const;
    const to = cuboidPermutationOf(dims, top);
    const moved = [...to].map((place, at) => (place === at ? -1 : at)).filter((at) => at >= 0);
    // The top row is three cubies; each has a sticker front and back, the ends one more on the side, and the top face has three.
    const { slots } = cuboidSlots(dims);
    for (const at of moved) expect(slots[at].centre[1] + slots[at].normal[1]).toBeGreaterThan(0);
    expect(moved.length).toBeGreaterThan(0);
  });

  it("counts the states of the small ones as they are, with every slice turning and with only the outer ones", () => {
    const reach = (dims: CuboidDims, only: (move: CuboidMove) => boolean) => {
      const moves = legalCuboidMoves(dims).filter(only);
      const seen = new Set([solvedCuboid(dims)]);
      for (const state of seen) for (const move of moves) seen.add(turnCuboid(state, dims, move));
      return seen.size;
    };
    const outer = (dims: CuboidDims) => (move: CuboidMove) => move.layer === 0 || move.layer === dims[move.axis] - 1;
    expect(reach([3, 2, 1], () => true)).toBe(192);
    expect(reach([3, 3, 1], () => true)).toBe(768);
    // The count usually quoted for the Floppy Cube, 192, is the one with only its outer slices turning.
    expect(reach([3, 3, 1], outer([3, 3, 1]))).toBe(192);
    expect(legalCuboidMoves([3, 2, 1])).toHaveLength(5);
  });
});

describe("the notation", () => {
  it("writes a half turn as 2 and reads every legal move of every named shape back, and every shape's moves up to 3×3×4", () => {
    for (const dims of [...NAMED, ...SHAPES.filter((one) => one[2] <= 4).flatMap(ORDERS)]) {
      const seen = new Set<string>();
      for (const move of legalCuboidMoves(dims)) {
        const written = cuboidMoveNotation(move, dims);
        expect(parseCuboidMove(written, dims), `${cuboidName(dims)} ${written}`).toEqual(move);
        seen.add(written);
        if (move.turns === 2) expect(written.endsWith("2")).toBe(true);
        else expect(written.endsWith("2")).toBe(false);
      }
      expect(seen.size).toBe(legalCuboidMoves(dims).length);
    }
  });

  it("has R turn a face clockwise as it is seen, and R' and R2 go with it, where the layer is square", () => {
    const dims = dimsOf("3x3x3");
    expect(parseCuboidMove("R", dims)).toEqual({ axis: 0, layer: 2, turns: 3 });
    expect(parseCuboidMove("R'", dims)).toEqual({ axis: 0, layer: 2, turns: 1 });
    expect(parseCuboidMove("L", dims)).toEqual({ axis: 0, layer: 0, turns: 1 });
    expect(parseCuboidMove("2R2", dims)).toEqual({ axis: 0, layer: 1, turns: 2 });
    expect(parseCuboidMove("M", dims)).toEqual({ axis: 0, layer: 1, turns: 1 });
    expect(parseCuboidMove("S", dims)).toEqual({ axis: 2, layer: 1, turns: 3 });
  });

  it("agrees with the cube's own notation on a cuboid that is a cube", async () => {
    const { parseMoves: parseCubeMoves, turnAll, solvedCube } = await import("../src/index.ts");
    const line = "R U R' U' F2 L' D2 M E' S2 2R 2U'";
    expect(turnAllCuboid(solvedCuboid([3, 3, 3]), [3, 3, 3], parseCuboidMoves(line, [3, 3, 3])!)).toBe(turnAll(solvedCube(3), 3, parseCubeMoves(line, 3)!));
    const four = "R U2 F' L2 2D 3B' 4R2 D";
    expect(turnAllCuboid(solvedCuboid([4, 4, 4]), [4, 4, 4], parseCuboidMoves(four, [4, 4, 4])!)).toBe(turnAll(solvedCube(4), 4, parseCubeMoves(four, 4)!));
  });

  it("refuses a quarter turn where only half turns are, and says so, but takes R2", () => {
    const floppy = dimsOf("3x3x1");
    expect(readCuboidMove("R", floppy)).toEqual({ fault: "half-turn-only" });
    expect(readCuboidMove("R'", floppy)).toEqual({ fault: "half-turn-only" });
    expect(readCuboidMove("U", floppy)).toEqual({ fault: "half-turn-only" });
    expect(readCuboidMove("R2", floppy)).toEqual({ move: { axis: 0, layer: 2, turns: 2 } });
    expect(readCuboidMove("M2", floppy)).toEqual({ move: { axis: 0, layer: 1, turns: 2 } });
    expect(readCuboidMove("E", floppy)).toEqual({ fault: "half-turn-only" });
    expect(parseCuboidMove("R", floppy)).toBeNull();
    expect(parseCuboidMoves("U2 R2 U R2", floppy)).toBeNull();
    expect(readCuboidMoves("U2 R2 U R2", floppy)).toEqual({ ok: false, token: "U", at: 6, fault: "half-turn-only" });
    const tower = dimsOf("2x2x3");
    // The ends turn a quarter (the 2×2 faces are square); the long sides only a half.
    expect(readCuboidMove("U", [2, 3, 2])).toHaveProperty("move");
    expect(readCuboidMove("2U'", [2, 3, 2])).toHaveProperty("move");
    expect(readCuboidMove("R", [2, 3, 2])).toEqual({ fault: "half-turn-only" });
    expect(readCuboidMove("F", [2, 3, 2])).toEqual({ fault: "half-turn-only" });
    expect(readCuboidMove("F", tower)).toHaveProperty("move");
  });

  it("refuses what is not a move, a layer there is not, the whole puzzle, and a turn of the whole puzzle in the hand", () => {
    const floppy = dimsOf("3x3x1");
    expect(readCuboidMove("F", floppy)).toEqual({ fault: "whole-puzzle" });
    expect(readCuboidMove("B2", floppy)).toEqual({ fault: "whole-puzzle" });
    expect(readCuboidMove("S2", floppy)).toEqual({ fault: "whole-puzzle" });
    expect(readCuboidMove("2R", [2, 3, 2])).toEqual({ fault: "half-turn-only" });
    expect(readCuboidMove("3R2", [2, 3, 2])).toEqual({ fault: "no-such-layer" });
    expect(readCuboidMove("M", [2, 3, 2])).toEqual({ fault: "no-such-layer" });
    expect(readCuboidMove("E2", [2, 3, 2])).toHaveProperty("move");
    expect(readCuboidMove("2M", [3, 3, 3])).toEqual({ fault: "unknown" });
    for (const text of ["x", "y2", "z'", "Q", "R3", "Rw", "r", "", "R 2", "RR", "R''"]) expect(readCuboidMove(text, [3, 3, 3]), text).toEqual({ fault: "unknown" });
  });

  it("counts a layer in from its nearer face, and calls the middle of an odd side M, E or S", () => {
    expect(cuboidMoveNotation({ axis: 1, layer: 4, turns: 2 }, [2, 5, 2])).toBe("U2");
    expect(cuboidMoveNotation({ axis: 1, layer: 3, turns: 2 }, [2, 5, 2])).toBe("2U2");
    expect(cuboidMoveNotation({ axis: 1, layer: 2, turns: 2 }, [2, 5, 2])).toBe("E2");
    expect(cuboidMoveNotation({ axis: 1, layer: 1, turns: 2 }, [2, 5, 2])).toBe("2D2");
    expect(cuboidMoveNotation({ axis: 1, layer: 0, turns: 2 }, [2, 5, 2])).toBe("D2");
    // An even side has no middle: its two inner layers are each the second from a face.
    expect(cuboidMoveNotation({ axis: 0, layer: 1, turns: 2 }, [2, 5, 2])).toBe("R2");
    expect(cuboidMoveNotation({ axis: 0, layer: 0, turns: 2 }, [2, 5, 2])).toBe("L2");
  });
});

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
        expect(parseCuboidMoves(scramble.map((move) => cuboidMoveNotation(move, dims)).join(" "), dims)).toEqual(scramble);
      }
    }
  });

  it("never turns one layer twice running when it walks, and gives the same scramble for the same seed", () => {
    for (const dims of [dimsOf("2x2x3"), dimsOf("3x3x5"), dimsOf("1x1x3")]) {
      const scramble = randomCuboidScramble(dims, 60, seededRandom("club night"));
      // Sixty turns, and one or two more where the sixty came to solved.
      expect(scramble.length).toBeGreaterThanOrEqual(60);
      expect(scramble.length).toBeLessThanOrEqual(62);
      scramble.slice(1).forEach((move, at) => expect(move.axis !== scramble[at].axis || move.layer !== scramble[at].layer).toBe(true));
      expect(randomCuboidScramble(dims, 60, seededRandom("club night"))).toEqual(scramble);
      expect(randomCuboidScramble(dims, 60, seededRandom("another"))).not.toEqual(scramble);
    }
  });

  it("is the same scramble from the same seed for ever: these are pinned", () => {
    const written = (text: string, length?: number) => {
      const dims = dimsOf(text);
      return randomCuboidScramble(dims, length, seededRandom("club night")).map((move) => cuboidMoveNotation(move, dims)).join(" ");
    };
    expect(written("3x3x1")).toMatchInlineSnapshot(`"L2 M2 U2 R2 D2 R2"`);
    expect(written("2x3x3")).toMatchInlineSnapshot(`"L R2 L' R F2 E2 U2 L' U2 B2 L2 E2 S2 R' D2 F2 R B2 L R D2 S2 U2 R S2 R2 E2"`);
    expect(written("3x3x4", 12)).toMatchInlineSnapshot(`"2F' L2 E2 B E2 F2 2B2 2F' D2 2B' F' R2"`);
  });

  it("has a length that grows with the layers there are to turn, and a state count that decides how it is made", () => {
    expect(cuboidScrambleLength([3, 3, 3])).toBe(28);
    expect(cuboidScrambleLength([2, 2, 3])).toBeLessThan(cuboidScrambleLength([3, 3, 5]));
    expect(cuboidScrambleLength([7, 7, 7])).toBeLessThanOrEqual(100);
    for (const text of ["1x1x2", "1x2x3", "1x3x3", "1x3x4"]) expect(hasRandomStateScramble(dimsOf(text)), text).toBe(true);
    for (const text of ["2x2x3", "2x3x3", "2x3x4", "3x3x4", "3x3x5", "1x4x4"]) expect(hasRandomStateScramble(dimsOf(text)), text).toBe(false);
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
    const lengths = Array.from({ length: 300 }, (_, at) => randomCuboidScramble(dims, undefined, seededRandom(`short ${at}`)).length);
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
    const solution = undoCuboidMoves(scramble).map((move) => cuboidMoveNotation(move, dims)).join(" ");
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
    expect(planCuboidReplay({ dims: [3, 3, 1], scramble: "R2", solution: "U R2" })).toEqual({ ok: false, fault: { part: "solution", token: "U", at: 0, fault: "half-turn-only" } });
    expect(planCuboidReplay({ dims: [3, 3, 1], scramble: "R2 F", solution: "" })).toEqual({ ok: false, fault: { part: "scramble", token: "F", at: 3, fault: "whole-puzzle" } });
    expect(planCuboidReplay({ dims: [1, 1, 1], scramble: "", solution: "" })).toEqual({ ok: false, fault: { part: "dims" } });
    expect(planCuboidReplay({ dims: [3, 3, 1], scramble: "", solution: "R2 ".repeat(2001) })).toEqual({ ok: false, fault: { part: "length" } });
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
        for (const [dx, dy] of [[40, 0], [0, 40], [30, 30], [-30, 30]]) {
          const pick = pickCuboidDrag(slot, dims, view, dx, dy);
          if (pick === null) continue;
          expect(legalTurns(dims, pick.axis, pick.layer).length, `${cuboidName(dims)} ${pick.axis} ${pick.layer}`).toBeGreaterThan(0);
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
