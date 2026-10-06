import { describe, expect, it } from "vitest";

import { SEAM_BAND, applySolve, cubeSlots, dragHint, movesForRelease, parseSolve, pickDrag, seamsAt, solvedCube, turnAll, viewMatrix } from "../src/index.ts";

const slotAt = (n: number, centre: [number, number, number], normal: [number, number, number]) =>
  cubeSlots(n).slots.find((slot) => slot.centre.every((v, at) => v === centre[at]) && slot.normal.every((v, at) => v === normal[at]))!;

const FRONT_ON = viewMatrix(0, 0);
/** Pixels in one of the cube's doubled units, and the eye's distance, as a cube 340 across is drawn. */
const K = 340 / (2 * 3 * Math.sqrt(3)) * 0.9 * 1.0;
const LENS = 1088;
const frontRight = slotAt(3, [2, 0, 2], [0, 0, 1]);
const frontMiddle = slotAt(3, [0, 0, 2], [0, 0, 1]);
/** Where a sticker's middle is on the screen, front on: its surface point in pixels, the way the cube is drawn. */
const middleOf = (slot: { centre: readonly number[]; normal: readonly number[] }): [number, number] => {
  const z = (slot.centre[2] + slot.normal[2]) * K;
  const f = LENS / (LENS - z);
  return [(slot.centre[0] + slot.normal[0]) * K * f, -(slot.centre[1] + slot.normal[1]) * K * f];
};
/** A touch this far across a sticker (-1 to 1 along x, and along y) from its middle. */
const touch = (slot: Parameters<typeof middleOf>[0], u: number, v = 0): [number, number] => {
  const [x, y] = middleOf(slot);
  const f = LENS / (LENS - (slot.centre[2] + slot.normal[2]) * K);
  return [x + u * K * f, y - v * K * f];
};

describe("taking hold of the seam between two layers", () => {
  it("finds the seam only within a narrow band of a sticker's edge, and the middle of a sticker is none", () => {
    const edge = 1 - 2 * SEAM_BAND;
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, 0), K, LENS)).toEqual([]);
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, edge - 0.04), K, LENS)).toEqual([]);
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, -(edge - 0.04)), K, LENS)).toEqual([]);
    // A touch on the plastic between two stickers is on a seam from either side of it.
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, edge + 0.04), K, LENS)).toEqual([{ axis: 0, beside: 2 }]);
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, 1), K, LENS)).toEqual([{ axis: 0, beside: 2 }]);
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, -1), K, LENS)).toEqual([{ axis: 0, beside: 0 }]);
    // The same across the sticker the other way, where it is the layers about the other axis that are neighbours.
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, 0, 0.97), K, LENS)).toEqual([{ axis: 1, beside: 2 }]);
    expect(seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, 0, -0.97), K, LENS)).toEqual([{ axis: 1, beside: 0 }]);
  });

  it("leaves the outside of the cube alone: no layer is beside the edge of it", () => {
    expect(seamsAt(frontRight, 3, FRONT_ON, touch(frontRight, 1), K, LENS)).toEqual([]);
    expect(seamsAt(frontRight, 3, FRONT_ON, touch(frontRight, -1), K, LENS)).toEqual([{ axis: 0, beside: 1 }]);
  });

  it("is none on a 2×2, where both layers are the whole cube", () => {
    const slot = slotAt(2, [-1, -1, 1], [0, 0, 1]);
    for (const u of [0.9, 1, -1]) expect(seamsAt(slot, 2, FRONT_ON, touch(slot, u), K, LENS)).toEqual([]);
  });

  it("names both seams at a corner of a sticker, the nearer first", () => {
    const found = seamsAt(frontMiddle, 3, FRONT_ON, touch(frontMiddle, 0.95, 0.9), K, LENS);
    expect(found.map((seam) => seam.axis)).toEqual([0, 1]);
  });

  it("works from the way the cube is looked at, on a big cube, and on every face", () => {
    const view = viewMatrix(-35, 28);
    let seen = 0;
    for (const slot of cubeSlots(5).slots) {
      // Where its own right-hand edge is on the screen: the seam is found there, and not at the middle.
      const mid = slot.centre.map((value, at) => value + slot.normal[at]) as [number, number, number];
      const point = (offset: [number, number, number]): [number, number] => {
        const moved = view.map((row) => row[0] * (mid[0] + offset[0]) + row[1] * (mid[1] + offset[1]) + row[2] * (mid[2] + offset[2]));
        const z = moved[2] * K;
        const f = LENS / (LENS - z);
        return [moved[0] * K * f, -moved[1] * K * f];
      };
      const facing = view.map((row) => row[0] * slot.normal[0] + row[1] * slot.normal[1] + row[2] * slot.normal[2])[2];
      if (facing < 0.5) continue;
      expect(seamsAt(slot, 5, view, point([0, 0, 0]), K, LENS)).toEqual([]);
      const axes = [0, 1, 2].filter((axis) => slot.normal[axis] === 0);
      for (const axis of axes) {
        const edge: [number, number, number] = [0, 0, 0];
        edge[axis] = 0.99;
        const there = seamsAt(slot, 5, view, point(edge), K, LENS);
        const layer = (slot.centre[axis] + 4) / 2;
        if (layer < 4) {
          expect(there.some((seam) => seam.axis === axis && seam.beside === layer + 1), `${slot.centre} ${slot.normal} ${axis}`).toBe(true);
          seen += 1;
        }
      }
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe("a drag that begins on a seam", () => {
  const seam = [{ axis: 0 as const, beside: 1 }];

  it("takes both layers when it goes along the seam, and one when it goes across it", () => {
    expect(pickDrag(frontRight, 3, FRONT_ON, 0, 20, seam)).toMatchObject({ axis: 0, layer: 2, also: 1 });
    // Across the seam is a turn about the other axis, which the seam is not about.
    const across = pickDrag(frontRight, 3, FRONT_ON, 20, 0, seam);
    expect(across).toMatchObject({ axis: 1, layer: 1 });
    expect(across?.also).toBeUndefined();
  });

  it("takes one layer when it began anywhere else on the sticker", () => {
    expect(pickDrag(frontRight, 3, FRONT_ON, 0, 20)?.also).toBeUndefined();
    expect(pickDrag(frontRight, 3, FRONT_ON, 0, 20, [])?.also).toBeUndefined();
  });

  it("makes the wide turn: both layers turned the same way, as the notation writes it", () => {
    const pick = pickDrag(frontRight, 3, FRONT_ON, 0, 20, seam)!;
    const solved = solvedCube(3);
    const wide = (text: string) => applySolve(solved, 3, parseSolve(text, 3).steps);
    expect(turnAll(solved, 3, movesForRelease(pick, 1))).toBe(wide("Rw'"));
    expect(turnAll(solved, 3, movesForRelease(pick, -1))).toBe(wide("Rw"));
    expect(turnAll(solved, 3, movesForRelease(pick, 2))).toBe(wide("Rw2"));
    expect(movesForRelease(pick, 0)).toEqual([]);
    expect(movesForRelease({ ...pick, also: undefined }, 1)).toHaveLength(1);
  });

  it("makes two layers on a big cube, any two that are neighbours", () => {
    const slot = slotAt(5, [2, 0, 4], [0, 0, 1]);
    const pick = pickDrag(slot, 5, FRONT_ON, 0, 20, [{ axis: 0, beside: 2 }])!;
    expect(movesForRelease(pick, 1).map((move) => move.layer)).toEqual([3, 2]);
    expect(turnAll(solvedCube(5), 5, movesForRelease(pick, 1))).not.toBe(solvedCube(5));
  });
});

describe("the arrow for a wide turn", () => {
  it("says whether one drag from the seam makes it: two neighbouring layers, on a cube of 3 or more", () => {
    const view = viewMatrix(-35, 28);
    const wide = (text: string, n = 3) => parseSolve(text, n).steps[0].moves;
    expect(dragHint(wide("Rw"), 3, view)?.seam).toBe(true);
    expect(dragHint(wide("Lw'"), 3, view)?.seam).toBe(true);
    expect(dragHint(wide("R"), 3, view)?.seam).toBe(false);
    expect(dragHint(wide("3Rw", 5), 5, view)?.seam).toBe(false);
    expect(dragHint(wide("Rw", 5), 5, view)?.seam).toBe(true);
    expect(dragHint(wide("Rw", 4), 4, view)?.seam).toBe(true);
  });
});
