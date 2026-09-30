import { describe, expect, it } from "vitest";

import {
  Guide,
  cubeSolved,
  movementSays,
  movementText,
  parseMove,
  parseMoves,
  quarterTurn,
  randomScramble,
  readKey,
  rotationKeys,
  seededRandom,
  solveSteps,
  solvedCube,
  turnAll,
  type CubeMove,
  type Vec3,
} from "../src/index.ts";

const m = (text: string, n = 3) => parseMove(text, n)!;
const scrambled = (seed: string, n = 3) => turnAll(solvedCube(n), n, randomScramble(n, 25, seededRandom(seed)));

describe("a guide through a list of moves", () => {
  it("asks for each movement in turn and moves on when it is made", () => {
    const guide = new Guide(solvedCube(3), 3, { moves: "R U R' U'" });
    expect(guide.next).toMatchObject({ text: "R", left: "R", index: 0, total: 4, rotation: false });
    expect(guide.heard(m("R"))).toBe("done");
    expect(guide.next).toMatchObject({ text: "U", index: 1 });
    for (const text of ["U", "R'", "U'"]) expect(guide.heard(m(text))).toBe("done");
    expect(guide.next).toBeNull();
    expect(guide.finished).toBe(true);
    expect(guide.done).toBe(4);
    expect(guide.state).toBe(turnAll(solvedCube(3), 3, parseMoves("R U R' U'", 3)!));
  });

  it("keeps a turn it did not ask for as a detour, and takes it back", () => {
    const guide = new Guide(solvedCube(3), 3, { moves: "R U" });
    expect(guide.heard(m("D"))).toBe("off");
    expect(guide.heard(m("F2"))).toBe("off");
    expect(guide.detours).toEqual([m("D"), m("F2")]);
    // Still asking for R, to come back to.
    expect(guide.next?.text).toBe("R");
    // A right turn now is not R: the cube is not where R was meant for.
    expect(guide.heard(m("R"))).toBe("off");
    expect(guide.takeBack()).toEqual([m("R'"), m("F2"), m("D'")]);
    expect(guide.detours).toEqual([]);
    expect(guide.state).toBe(solvedCube(3));
    expect(guide.heard(m("R"))).toBe("done");
  });

  it("hears a detour turned back by hand", () => {
    const guide = new Guide(solvedCube(3), 3, { moves: "R" });
    expect(guide.heard(m("U"))).toBe("off");
    expect(guide.heard(m("U'"))).toBe("back");
    expect(guide.detours).toEqual([]);
    expect(guide.heard(m("R"))).toBe("done");
  });

  it("takes a half turn as one drag, or as two quarters the same way either way round", () => {
    for (const quarter of ["R", "R'"]) {
      const guide = new Guide(solvedCube(3), 3, { moves: "R2 U" });
      expect(guide.heard(m(quarter))).toBe("part");
      expect(guide.next).toMatchObject({ text: "R2", left: quarter });
      expect(guide.heard(m(quarter))).toBe("done");
      expect(guide.next?.text).toBe("U");
    }
    const once = new Guide(solvedCube(3), 3, { moves: "R2" });
    expect(once.heard(m("R2"))).toBe("done");
    // A quarter turn asked for is not made by a half turn.
    expect(new Guide(solvedCube(3), 3, { moves: "R" }).heard(m("R2"))).toBe("off");
  });

  it("takes a wide turn a layer at a time, in either order", () => {
    for (const first of ["R", "M'"]) {
      const guide = new Guide(solvedCube(3), 3, { moves: "Rw U" });
      expect(guide.next?.text).toBe("Rw");
      expect(new Set(guide.next?.moves.map((move) => move.layer))).toEqual(new Set([1, 2]));
      expect(guide.heard(m(first))).toBe("part");
      expect(guide.next?.left).toBe(first === "R" ? "M'" : "R");
      expect(guide.heard(m(first === "R" ? "M'" : "R"))).toBe("done");
      expect(guide.next?.text).toBe("U");
    }
  });

  it("asks for a turn of the whole cube, and makes it when asked", () => {
    const guide = new Guide(solvedCube(3), 3, { moves: "x R" });
    expect(guide.next).toMatchObject({ text: "x", rotation: true });
    expect(guide.makeNext()).toEqual([m("x")]);
    expect(guide.next?.text).toBe("R");
    // Making it takes a detour back first.
    guide.heard(m("U"));
    expect(guide.makeNext()).toEqual([m("U'"), m("R")]);
    expect(guide.finished).toBe(true);
    expect(guide.state).toBe(turnAll(solvedCube(3), 3, parseMoves("x R", 3)!));
  });

  it("takes moves as moves, as groups and as a solve read from notation", () => {
    const guide = new Guide(solvedCube(4), 4, { moves: [m("R", 4), [m("R", 4), m("2R", 4)]] });
    expect(guide.next?.text).toBe("R");
    guide.heard(m("R", 4));
    expect(guide.next?.text).toBe("Rw");
    expect(() => new Guide(solvedCube(3), 3, { moves: "R Q" })).toThrow(/“Q”/);
  });
});

describe("a guide through the method", () => {
  it("walks the layer-by-layer method, step by step, to a solved cube", () => {
    for (const [seed, n] of [["a", 3], ["b", 3], ["c", 2]] as const) {
      const start = scrambled(seed, n);
      const guide = new Guide(start, n, { method: true });
      const stages: string[] = [];
      for (let guard = 0; guard < 400 && guide.next !== null; guard += 1) {
        const next = guide.next;
        if (next.index === 0) stages.push(next.stage!);
        expect(next.total).toBeGreaterThan(0);
        for (const move of next.moves) guide.heard(move);
      }
      expect(guide.finished).toBe(true);
      expect(cubeSolved(guide.state, n)).toBe(true);
      expect(stages).toEqual(solveSteps(start, n)!.map((step) => step.stage));
    }
  });

  it("works the rest out from where a detour left the cube, once it stays", () => {
    const guide = new Guide(scrambled("d"), 3, { method: true });
    guide.heard(m("E"));
    expect(guide.detours).toHaveLength(1);
    guide.takeBack();
    for (let guard = 0; guard < 400 && guide.next !== null; guard += 1) guide.makeNext();
    expect(cubeSolved(guide.state, 3)).toBe(true);
  });

  it("has nothing to ask on a solved cube, or on a size the method is not written for", () => {
    expect(new Guide(solvedCube(3), 3, { method: true }).next).toBeNull();
    expect(new Guide(scrambled("e", 4), 4, { method: true }).next).toBeNull();
  });
});

describe("a movement in words", () => {
  const says = (text: string, n = 3, language: "en" | "ja" = "en") => movementSays(parseMoves(text, n)!, n, language);

  it("names the layer and the way it goes, as the cube is held", () => {
    expect(says("R")).toBe("Turn the right face away from you.");
    expect(says("R'")).toBe("Turn the right face towards you.");
    expect(says("L")).toBe("Turn the left face towards you.");
    expect(says("U")).toBe("Turn the top face to the left.");
    expect(says("D")).toBe("Turn the bottom face to the right.");
    expect(says("F")).toBe("Turn the front face clockwise, as you look at the front.");
    expect(says("B")).toBe("Turn the back face anticlockwise, as you look at the front.");
    expect(says("M")).toBe("Turn the middle layer between left and right towards you.");
    expect(says("E'")).toBe("Turn the middle layer between top and bottom to the left.");
    expect(says("R2")).toBe("Turn the right face half way round.");
    expect(says("2R", 4)).toBe("Turn layer 2 in from the right away from you.");
    expect(says("3L'", 7)).toBe("Turn layer 3 in from the left away from you.");
    expect(says("R 2R", 4)).toBe("Turn the 2 layers on the right away from you.");
    expect(says("x")).toBe("Turn the whole cube so that the front goes to the top.");
    expect(says("R'", 3, "ja")).toBe("右の面を手前に回します。");
    expect(says("U2", 3, "ja")).toBe("上の面を半回転させます。");
    expect(movementSays([m("R"), m("U")], 3)).toBeNull();
  });

  it("says the way the stickers really go", () => {
    // For each axis, the side a quarter turn by the right-hand rule carries the front's top (or, about z, the top) to.
    const carried = (v: Vec3, axis: 0 | 1 | 2) => quarterTurn(v, axis).join(",");
    expect(carried([0, 1, 0], 0)).toBe("0,0,1"); // the top comes to the front: towards you
    expect(carried([0, 0, 1], 1)).toBe("1,0,0"); // the front goes to the right
    expect(carried([0, 1, 0], 2)).toBe("-1,0,0"); // the top goes left: anticlockwise, from the front
    expect(movementSays([{ axis: 0, layer: 2, turns: 1 }], 3)).toContain("towards you");
    expect(movementSays([{ axis: 1, layer: 2, turns: 1 }], 3)).toContain("to the right");
    expect(movementSays([{ axis: 2, layer: 2, turns: 1 }], 3)).toContain("anticlockwise");
    // The whole cube: x' takes the front to the bottom, y' to the right, z' the top to the left.
    expect(carried([0, 0, 1], 0)).toBe("0,-1,0");
    expect(says("x'")).toContain("front goes to the bottom");
    expect(says("y'")).toContain("front goes to the right");
    expect(says("z'")).toContain("top goes to the left");
  });

  it("writes a movement in notation, wide turns as wide turns", () => {
    const text = (moves: CubeMove[], n: number) => movementText(moves, n);
    expect(text([m("R")], 3)).toBe("R");
    expect(text(parseMoves("R 2R", 4)!, 4)).toBe("Rw");
    expect(text(parseMoves("L' 2L' 3L'", 5)!, 5)).toBe("3Lw'");
    expect(text(parseMoves("R U", 3)!, 3)).toBe("R U");
  });

  it("names the keys for a turn of the whole cube, as the keys read them", () => {
    for (const text of ["x", "x'", "y", "z'"]) {
      const move = m(text);
      const keys = rotationKeys(move);
      const shift = keys.startsWith("Shift+");
      expect(readKey(keys.slice(shift ? 6 : 0).toLowerCase(), shift, 3, 1)).toEqual({ move });
    }
    expect(rotationKeys(m("y2"))).toBe("Y Y");
  });
});
