import { describe, expect, it } from "vitest";

import {
  FULL_SCRAMBLE_LENGTHS,
  applySolve,
  cubeSolved,
  decodeCubeMoves,
  encodeCubeMoves,
  faceMove,
  moveNotation,
  parseMove,
  parseSolve,
  randomScramble,
  readKey,
  seededRandom,
  solvedCube,
  turnAll,
  undoAll,
  type CubeMove,
} from "../src/index.ts";

const BIG = [6, 7] as const;

/** Every turn the cube has: each layer of each axis, a quarter, a half and a quarter back. */
function everyTurn(n: number): CubeMove[] {
  const all: CubeMove[] = [];
  for (const axis of [0, 1, 2] as const) for (let layer = 0; layer < n; layer += 1) for (const turns of [1, 2, 3] as const) all.push({ axis, layer, turns });
  return all;
}

describe("the 6×6 and 7×7", () => {
  it.each(BIG)("write and read back every turn the %i×%i has, layer by layer", (n) => {
    for (const move of everyTurn(n)) {
      const written = moveNotation(move, n);
      expect(parseMove(written, n), written).toEqual(move);
    }
  });

  it("name the layers by their depth from a face, and give the 7×7 a middle one and the 6×6 none", () => {
    // From the right: the face, then 2R, 3R; a 7×7's fourth layer is the middle one, M, and a 6×6's third and fourth are 3R and 3L.
    expect(moveNotation({ axis: 0, layer: 6, turns: 3 }, 7)).toBe("R");
    expect(moveNotation({ axis: 0, layer: 5, turns: 3 }, 7)).toBe("2R");
    expect(moveNotation({ axis: 0, layer: 4, turns: 3 }, 7)).toBe("3R");
    expect(moveNotation({ axis: 0, layer: 3, turns: 1 }, 7)).toBe("M");
    expect(moveNotation({ axis: 0, layer: 2, turns: 1 }, 7)).toBe("3L");
    expect(moveNotation({ axis: 0, layer: 3, turns: 3 }, 6)).toBe("3R");
    expect(moveNotation({ axis: 0, layer: 2, turns: 1 }, 6)).toBe("3L");
    expect(parseMove("M", 6)).toBeNull();
    expect(parseMove("8R", 7)).toBeNull();
    expect(parseMove("7R", 7)).toEqual(faceMove("R", 7, "cw", 7));
  });

  it.each(BIG)("are reached by a digit and a face letter at the keyboard, every layer of the %i×%i", (n) => {
    for (let depth = 1; depth <= n; depth += 1) {
      const read = readKey("l", false, n, depth);
      expect(read, `${depth}L`).toEqual({ move: faceMove("L", depth, "cw", n) });
    }
    expect(readKey("m", false, 6, 1)).toBeNull();
    expect(readKey("m", false, 7, 1)).not.toBeNull();
  });

  it.each(BIG)("scramble to a competition's length, never solved, the same from the same seed, and take back to solved on the %i×%i", (n) => {
    const length = FULL_SCRAMBLE_LENGTHS[n];
    expect(length).toBe(n === 6 ? 80 : 100);
    const scramble = randomScramble(n, length, seededRandom("big cube"));
    expect(scramble).toHaveLength(length);
    expect(scramble).toEqual(randomScramble(n, length, seededRandom("big cube")));
    const scrambled = turnAll(solvedCube(n), n, scramble);
    expect(cubeSolved(scrambled, n)).toBe(false);
    expect(cubeSolved(turnAll(scrambled, n, undoAll(scramble)), n)).toBe(true);
    // Inner layers are turned too, not only the faces.
    expect(scramble.some((move) => move.layer !== 0 && move.layer !== n - 1)).toBe(true);
    expect(decodeCubeMoves(encodeCubeMoves(scramble))).toEqual(scramble);
  });

  it.each(BIG)("are solved whichever way round they end, since a big cube's centres are not fixed: the %i×%i", (n) => {
    const scramble = randomScramble(n, 30, seededRandom(`solved ${n}`));
    const back = turnAll(turnAll(solvedCube(n), n, scramble), n, undoAll(scramble));
    // Turned whole in the hand afterwards, it is still every face one colour.
    expect(cubeSolved(turnAll(back, n, [{ axis: 1, layer: "all", turns: 1 }, { axis: 0, layer: "all", turns: 2 }]), n)).toBe(true);
    // Two layers turned and not put back is not solved.
    expect(cubeSolved(turnAll(solvedCube(n), n, [{ axis: 0, layer: 1, turns: 1 }, { axis: 2, layer: 2, turns: 1 }]), n)).toBe(false);
  });

  it.each(BIG)("turn a wide turn as the layers it names together: %i×%i", (n) => {
    const state = turnAll(solvedCube(n), n, randomScramble(n, 20, seededRandom(`wide ${n}`)));
    const wide = parseSolve("Rw 3Uw' 4Fw2", n);
    expect(wide.ok).toBe(true);
    // A three-layer turn is the face and the two behind it, written out one at a time.
    const byLayers = parseSolve("R 2R U' 2U' 3U' F2 2F2 3F2 4F2", n);
    expect(byLayers.ok).toBe(true);
    if (wide.ok && byLayers.ok) expect(applySolve(state, n, wide.steps)).toBe(applySolve(state, n, byLayers.steps));
  });
});
