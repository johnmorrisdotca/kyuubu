import { describe, expect, it } from "vitest";

import {
  countsAsMove,
  cubeSlots,
  cubeSolved,
  decodeCubeMoves,
  encodeCubeMoves,
  isCubeState,
  moveNotation,
  parseMove,
  parseMoves,
  randomScramble,
  solvedCube,
  turnAll,
  turnCube,
  undoAll,
  type CubeMove,
} from "../src/index.ts";

const SIZES = [2, 3, 4, 5, 6, 7];
const face = (state: string, n: number, letter: string) => {
  const at = "URFDLB".indexOf(letter) * n * n;
  return state.slice(at, at + n * n);
};

describe("a cube of any size", () => {
  it.each(SIZES)("has six faces of %i×%i stickers, solved to start", (n) => {
    expect(cubeSlots(n).slots).toHaveLength(6 * n * n);
    expect(cubeSolved(solvedCube(n), n)).toBe(true);
    expect(isCubeState(solvedCube(n), n)).toBe(true);
  });

  it.each(SIZES)("comes back to solved after any layer is turned four times, on the %i×%i", (n) => {
    for (const axis of [0, 1, 2] as const) {
      for (let layer = 0; layer < n; layer += 1) {
        const quarter: CubeMove = { axis, layer, turns: 1 };
        const once = turnCube(solvedCube(n), n, quarter);
        expect(cubeSolved(once, n)).toBe(false);
        expect(turnAll(once, n, [quarter, quarter, quarter])).toBe(solvedCube(n));
        expect(turnCube(turnCube(solvedCube(n), n, { axis, layer, turns: 2 }), n, { axis, layer, turns: 2 })).toBe(solvedCube(n));
      }
    }
  });

  it("turns R the way a cuber means: the front's right column goes up", () => {
    const after = turnCube(solvedCube(3), 3, parseMove("R", 3)!);
    const up = face(after, 3, "U");
    expect([up[2], up[5], up[8]]).toEqual(["F", "F", "F"]);
    expect([up[0], up[3], up[6]]).toEqual(["U", "U", "U"]);
  });

  it("turns U the way a cuber means: the front's top row comes from the right", () => {
    const after = turnCube(solvedCube(3), 3, parseMove("U", 3)!);
    expect(face(after, 3, "F").slice(0, 3)).toBe("RRR");
    expect(face(after, 3, "R").slice(0, 3)).toBe("BBB");
  });

  it("turns F the way a cuber means: the top's bottom row comes from the left", () => {
    const after = turnCube(solvedCube(3), 3, parseMove("F", 3)!);
    expect(face(after, 3, "U").slice(6, 9)).toBe("LLL");
  });

  it("takes the sexy move six times back to solved, and a scramble undone back to solved", () => {
    const sexy = parseMoves("R U R' U'", 3)!;
    const six = Array.from({ length: 6 }, () => sexy).flat();
    expect(turnAll(solvedCube(3), 3, six)).toBe(solvedCube(3));
    for (const n of SIZES) {
      const scramble = randomScramble(n, 30);
      expect(turnAll(turnAll(solvedCube(n), n, scramble), n, undoAll(scramble))).toBe(solvedCube(n));
    }
  });

  it("calls a cube turned whole in the hand solved, as a person would", () => {
    const turned = turnAll(solvedCube(4), 4, parseMoves("x y2 z'", 4)!);
    expect(turned).not.toBe(solvedCube(4));
    expect(cubeSolved(turned, 4)).toBe(true);
    expect(countsAsMove(parseMove("x", 4)!)).toBe(false);
    expect(countsAsMove(parseMove("R", 4)!)).toBe(true);
  });

  it("refuses a state with the wrong count of a colour", () => {
    expect(isCubeState("U".repeat(54), 3)).toBe(false);
    expect(isCubeState(solvedCube(3).slice(1), 3)).toBe(false);
  });
});

describe("writing turns down", () => {
  it("reads back every move it writes, three characters a move", () => {
    const moves: CubeMove[] = [
      { axis: 0, layer: 2, turns: 3 },
      { axis: 1, layer: 0, turns: 2 },
      { axis: 2, layer: "all", turns: 1 },
    ];
    const code = encodeCubeMoves(moves);
    expect(code).toBe("x23y02z*1");
    expect(decodeCubeMoves(code)).toEqual(moves);
    expect(decodeCubeMoves("x2")).toBeNull();
    expect(decodeCubeMoves("q13")).toBeNull();
    expect(decodeCubeMoves("x14")).toBeNull();
  });

  it.each(SIZES)("names every turn of the %i×%i in cubers' notation, and reads the name back", (n) => {
    for (const axis of [0, 1, 2] as const) {
      for (const layer of [...Array.from({ length: n }, (_, at) => at), "all" as const]) {
        for (const turns of [1, 2, 3] as const) {
          const move: CubeMove = { axis, layer, turns };
          const text = moveNotation(move, n);
          expect(parseMove(text, n), `${text} on the ${n}×${n}`).toEqual(move);
        }
      }
    }
  });

  it("writes the names cubers use", () => {
    expect(moveNotation({ axis: 0, layer: 2, turns: 3 }, 3)).toBe("R");
    expect(moveNotation({ axis: 0, layer: 0, turns: 1 }, 3)).toBe("L");
    expect(moveNotation({ axis: 0, layer: 1, turns: 1 }, 3)).toBe("M");
    expect(moveNotation({ axis: 1, layer: 1, turns: 3 }, 3)).toBe("E'");
    expect(moveNotation({ axis: 2, layer: 1, turns: 3 }, 3)).toBe("S");
    expect(moveNotation({ axis: 0, layer: 2, turns: 3 }, 4)).toBe("2R");
    expect(moveNotation({ axis: 1, layer: 1, turns: 2 }, 4)).toBe("2D2");
    expect(moveNotation({ axis: 0, layer: "all", turns: 1 }, 3)).toBe("x'");
    expect(parseMove("M", 4)).toBeNull();
    expect(parseMove("5R", 4)).toBeNull();
  });
});

describe("scrambles", () => {
  it("are the length asked, never turn one axis twice running, and never leave the cube solved", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (const n of SIZES) {
      const scramble = randomScramble(n, 25, random);
      expect(scramble.length).toBeGreaterThanOrEqual(25);
      for (let at = 1; at < scramble.length; at += 1) expect(scramble[at].axis).not.toBe(scramble[at - 1].axis);
      expect(cubeSolved(turnAll(solvedCube(n), n, scramble), n)).toBe(false);
    }
  });

  it("are the same from the same random numbers", () => {
    const from = (start: number) => {
      let seed = start;
      return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    };
    expect(randomScramble(3, 20, from(42))).toEqual(randomScramble(3, 20, from(42)));
    expect(randomScramble(3, 20, from(42))).not.toEqual(randomScramble(3, 20, from(43)));
  });
});
