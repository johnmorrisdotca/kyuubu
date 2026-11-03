import { describe, expect, it } from "vitest";
import {
  CUBOID_PRESETS,
  type CuboidDims,
  type CuboidMove,
  cuboidFaces,
  cuboidMoveLegal,
  cuboidMoveNotation,
  cuboidName,
  cuboidPermutationOf,
  cuboidSlots,
  cuboidSolved,
  cuboidStickerCount,
  halfTurnOnly,
  isCuboidDims,
  isCuboidState,
  legalCuboidMoves,
  legalTurns,
  parseCuboidDims,
  parseCuboidMove,
  parseCuboidMoves,
  randomCuboidScramble,
  readCuboidMove,
  readCuboidMoves,
  sameCuboid,
  solvedCuboid,
  turnAllCuboid,
  turnCuboid,
  undoCuboidMove,
} from "../src/cuboid/index.ts";
import { seededRandom } from "../src/index.ts";
import { dimsOf, NAMED, ORDERS, SHAPES } from "./cuboid.fixture.ts";

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
    for (const text of ["2x3x3", "2×3×3", "2 3 3", "2,3,3", " 2 X 3 x 3 "])
      expect(parseCuboidDims(text)).toEqual([2, 3, 3]);
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
    expect(CUBOID_PRESETS.map((preset) => preset.label)).toEqual([
      "1×2×3",
      "1×3×3",
      "2×2×3",
      "2×3×3",
      "2×3×4",
      "3×3×4",
      "3×3×5",
    ]);
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
      const mixed = turnAllCuboid(
        solvedCuboid(dims),
        dims,
        randomCuboidScramble(dims, 12, seededRandom(`mix ${dims}`)),
      );
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
    expect(turnAllCuboid(solvedCuboid([3, 3, 3]), [3, 3, 3], parseCuboidMoves(line, [3, 3, 3])!)).toBe(
      turnAll(solvedCube(3), 3, parseCubeMoves(line, 3)!),
    );
    const four = "R U2 F' L2 2D 3B' 4R2 D";
    expect(turnAllCuboid(solvedCuboid([4, 4, 4]), [4, 4, 4], parseCuboidMoves(four, [4, 4, 4])!)).toBe(
      turnAll(solvedCube(4), 4, parseCubeMoves(four, 4)!),
    );
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
    for (const text of ["x", "y2", "z'", "Q", "R3", "Rw", "r", "", "R 2", "RR", "R''"])
      expect(readCuboidMove(text, [3, 3, 3]), text).toEqual({ fault: "unknown" });
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
