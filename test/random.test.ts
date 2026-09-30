import { describe, expect, it } from "vitest";

import { cubeSolved, movesNotation, randomScramble, seededRandom, solvedCube, turnAll } from "../src/index.ts";

describe("a seeded random source", () => {
  it("gives the same numbers for the same seed, for ever: these are pinned", () => {
    const random = seededRandom("club night");
    expect([random(), random(), random()]).toEqual([0.7159224494826049, 0.06651424104347825, 0.21267713862471282]);
  });

  it("gives numbers from 0 up to, never reaching, 1, and different ones for a different seed", () => {
    const random = seededRandom("");
    for (let at = 0; at < 2000; at += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(seededRandom("a")()).not.toBe(seededRandom("b")());
  });

  it("makes a scramble anybody can make again: this one is pinned", () => {
    const scramble = randomScramble(3, 25, seededRandom("club night"));
    expect(movesNotation(scramble, 3)).toBe("B L' S' U' F' R2 B R U2 B' R2 D' F2 R U M2 B R2 S R F2 L' B' E2 B2");
    expect(movesNotation(randomScramble(2, 11, seededRandom("table")), 2)).toBe("D' R2 U' F2 L' B' L F' R D' B'");
  });
});

describe("a scramble of the outer faces only", () => {
  it.each([3, 4, 5, 7])("never turns an inner layer of the %i×%i, and never leaves it solved", (n) => {
    const scramble = randomScramble(n, 60, seededRandom(`faces ${n}`), { faces: true });
    expect(scramble).toHaveLength(60);
    for (const move of scramble) expect([0, n - 1]).toContain(move.layer);
    expect(movesNotation(scramble, n)).toMatch(/^([RLUDFB](2|'|) ?)+$/);
    expect(cubeSolved(turnAll(solvedCube(n), n, scramble), n)).toBe(false);
  });

  it("is the scramble it always was when every layer may turn", () => {
    expect(randomScramble(3, 25, seededRandom("club night"), {})).toEqual(randomScramble(3, 25, seededRandom("club night")));
  });
});
