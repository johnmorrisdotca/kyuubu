import { describe, expect, it } from "vitest";

import {
  COMMIT_ANGLE,
  DRAG_DECIDE_PX,
  DRAG_START_PX,
  FLICK_SPEED,
  cubeSlots,
  dragAngle,
  moveForRelease,
  moveNotation,
  pastCommit,
  pickDrag,
  quartersForRelease,
  viewMatrix,
} from "../src/index.ts";

const slotAt = (n: number, centre: [number, number, number], normal: [number, number, number]) =>
  cubeSlots(n).slots.find((slot) => slot.centre.every((v, at) => v === centre[at]) && slot.normal.every((v, at) => v === normal[at]))!;

const FRONT_ON = viewMatrix(0, 0);
const USUAL = viewMatrix(-35, 28);
const frontRight = slotAt(3, [2, 0, 2], [0, 0, 1]);

describe("a drag picking its layer", () => {
  it("picks nothing until the pointer has gone far enough to say", () => {
    expect(pickDrag(frontRight, 3, FRONT_ON, 0, DRAG_START_PX - 1)).toBeNull();
    expect(pickDrag(frontRight, 3, FRONT_ON, 0, DRAG_START_PX)).not.toBeNull();
  });

  it("picks the layer that carries the sticker the way the pointer went", () => {
    // Front on, the front's right column goes up and down with the right face, and sideways with the middle row.
    expect(pickDrag(frontRight, 3, FRONT_ON, 0, 20)).toMatchObject({ axis: 0, layer: 2 });
    expect(pickDrag(frontRight, 3, FRONT_ON, 20, 0)).toMatchObject({ axis: 1, layer: 1 });
    expect(pickDrag(frontRight, 3, USUAL, 1, 20)).toMatchObject({ axis: 0, layer: 2 });
  });

  it("waits when the drag could be either layer, and picks the likelier once it has gone far", () => {
    // A diagonal, front on: both layers are as likely as each other.
    expect(pickDrag(frontRight, 3, FRONT_ON, 10, 10)).toBeNull();
    expect(pickDrag(frontRight, 3, FRONT_ON, 12, 10)).toBeNull();
    const far = Math.ceil(DRAG_DECIDE_PX / Math.SQRT2) + 1;
    expect(pickDrag(frontRight, 3, FRONT_ON, far + 2, far)).toMatchObject({ axis: 1 });
    expect(pickDrag(frontRight, 3, FRONT_ON, far, far + 2)).toMatchObject({ axis: 0 });
    // Clearly one way, it is picked at once.
    expect(pickDrag(frontRight, 3, FRONT_ON, 3, 10)).toMatchObject({ axis: 0 });
  });

  it("says which way across the screen turns the layer forwards, as a unit vector", () => {
    const pick = pickDrag(frontRight, 3, FRONT_ON, 0, 20)!;
    expect(Math.hypot(...pick.along)).toBeCloseTo(1, 10);
    // Down the screen carries the front's right column down: R', one quarter turn by the right-hand rule.
    expect(pick.along[1]).toBeCloseTo(1, 10);
    expect(moveNotation(moveForRelease(pick, 1)!, 3)).toBe("R'");
    expect(moveNotation(moveForRelease(pick, -1)!, 3)).toBe("R");
    expect(moveNotation(moveForRelease(pick, 2)!, 3)).toBe("R2");
    expect(moveNotation(moveForRelease(pick, -2)!, 3)).toBe("R2");
    expect(moveForRelease(pick, 0)).toBeNull();
  });
});

describe("the angle a drag has turned its layer to", () => {
  const pick = pickDrag(frontRight, 3, FRONT_ON, 0, 20)!;

  it("follows the pointer, forwards and back, a quarter turn for every `quarterPx`", () => {
    expect(dragAngle(pick, 0, 100, 100)).toBeCloseTo(90, 10);
    expect(dragAngle(pick, 0, 50, 100)).toBeCloseTo(45, 10);
    expect(dragAngle(pick, 0, -50, 100)).toBeCloseTo(-45, 10);
    expect(dragAngle(pick, 0, 0, 100)).toBeCloseTo(0, 10);
  });

  it("counts only the way the layer turns, and stops at a half turn", () => {
    expect(dragAngle(pick, 80, 50, 100)).toBeCloseTo(45, 10);
    expect(dragAngle(pick, 0, 900, 100)).toBe(180);
    expect(dragAngle(pick, 0, -900, 100)).toBe(-180);
  });
});

describe("letting go of a dragged layer", () => {
  it("goes back short of the point of no return, and makes the turn from it on", () => {
    expect(COMMIT_ANGLE).toBe(30);
    expect([0, 10, 29.9, -29.9].map((angle) => quartersForRelease(angle))).toEqual([0, 0, 0, 0]);
    expect([30, 45, 90, 119.9].map((angle) => quartersForRelease(angle))).toEqual([1, 1, 1, 1]);
    expect([-30, -45, -90, -119.9].map((angle) => quartersForRelease(angle))).toEqual([-1, -1, -1, -1]);
  });

  it("makes a half turn when dragged the same distance past a quarter", () => {
    expect([120, 150, 180].map((angle) => quartersForRelease(angle))).toEqual([2, 2, 2]);
    expect([-120, -180].map((angle) => quartersForRelease(angle))).toEqual([-2, -2]);
  });

  it("takes the point of no return it is given", () => {
    expect(quartersForRelease(40, 0, 45)).toBe(0);
    expect(quartersForRelease(45, 0, 45)).toBe(1);
    expect(quartersForRelease(134, 0, 45)).toBe(1);
    expect(quartersForRelease(135, 0, 45)).toBe(2);
    expect(quartersForRelease(12, 0, 10)).toBe(1);
  });

  it("makes the quarter turn for a flick, short of the point: fast, and the way it was dragged", () => {
    expect(quartersForRelease(12, FLICK_SPEED)).toBe(1);
    expect(quartersForRelease(-12, -FLICK_SPEED)).toBe(-1);
    // Slow is not a flick; nor is fast the other way, which is a hand going back; nor is a twitch.
    expect(quartersForRelease(12, FLICK_SPEED / 2)).toBe(0);
    expect(quartersForRelease(12, -FLICK_SPEED * 3)).toBe(0);
    expect(quartersForRelease(2, FLICK_SPEED * 3)).toBe(0);
    // A flick never makes more than the drag itself would.
    expect(quartersForRelease(60, FLICK_SPEED * 10)).toBe(1);
  });

  it("says whether the layer is past the point, which is what the cube shows", () => {
    expect([0, 29, 30, 100, -29, -30].map((angle) => pastCommit(angle))).toEqual([false, false, true, true, false, true]);
    expect(pastCommit(40, 45)).toBe(false);
  });
});
