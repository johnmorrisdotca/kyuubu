import { describe, expect, it } from "vitest";

import { cubeSlots, moveForDrag, moveForWheel, moveNotation, readKey, viewMatrix } from "../src/index.ts";

/** The slot of a sticker, by the direction it faces and its cubie's centre in doubled steps. */
const slotAt = (n: number, centre: [number, number, number], normal: [number, number, number]) =>
  cubeSlots(n).slots.find((slot) => slot.centre.every((v, at) => v === centre[at]) && slot.normal.every((v, at) => v === normal[at]))!;

const FRONT_ON = viewMatrix(0, 0);
const USUAL = viewMatrix(-35, 28);

describe("a drag across a sticker", () => {
  it("turns the front's middle row right when dragged right, as the hand pushed it", () => {
    // E turns the way D does, which carries the front to the right.
    const middle = slotAt(3, [0, 0, 2], [0, 0, 1]);
    expect(moveNotation(moveForDrag(middle, 3, FRONT_ON, 40, 2), 3)).toBe("E");
    expect(moveNotation(moveForDrag(middle, 3, USUAL, 40, 2), 3)).toBe("E");
  });

  it("turns the right column down when the front's right column is dragged down", () => {
    const right = slotAt(3, [2, 0, 2], [0, 0, 1]);
    expect(moveNotation(moveForDrag(right, 3, USUAL, 1, 40), 3)).toBe("R'");
    expect(moveNotation(moveForDrag(right, 3, USUAL, -1, -40), 3)).toBe("R");
  });

  it("turns the layer across a face when a sticker on its edge is dragged along the edge", () => {
    // A sticker on the top's front edge is in the front layer: dragged right, the front turns clockwise.
    const topFront = slotAt(3, [0, 2, 2], [0, 1, 0]);
    expect(moveNotation(moveForDrag(topFront, 3, USUAL, 40, -5), 3)).toBe("F");
  });
});

describe("the wheel over a sticker", () => {
  const right = slotAt(3, [2, 2, 2], [0, 0, 1]);

  it("turns the layer that carries it sideways, and Ctrl the one across it", () => {
    expect(moveNotation(moveForWheel(right, 3, FRONT_ON, "across", true), 3)).toBe("U'");
    expect(moveNotation(moveForWheel(right, 3, FRONT_ON, "across", false), 3)).toBe("U");
    expect(moveNotation(moveForWheel(right, 3, FRONT_ON, "upDown", true), 3)).toBe("R'");
    expect(moveNotation(moveForWheel(right, 3, FRONT_ON, "upDown", false), 3)).toBe("R");
  });

  it("turns the face itself with Shift, rolling down turning it clockwise", () => {
    expect(moveNotation(moveForWheel(right, 3, FRONT_ON, "face", true), 3)).toBe("F");
    expect(moveNotation(moveForWheel(slotAt(3, [0, 0, -2], [0, 0, -1]), 3, FRONT_ON, "face", true), 3)).toBe("B");
  });
});

describe("the keys", () => {
  it("turn a face, Shift turning it back", () => {
    expect(readKey("r", false, 3, 1)).toEqual({ move: { axis: 0, layer: 2, turns: 3 } });
    expect(readKey("R", true, 3, 1)).toEqual({ move: { axis: 0, layer: 2, turns: 1 } });
  });

  it("reach a layer inside with a number first", () => {
    expect(readKey("2", false, 4, 1)).toEqual({ depth: 2 });
    const inner = readKey("r", false, 4, 2);
    expect(inner !== null && "move" in inner ? moveNotation(inner.move, 4) : null).toBe("2R");
    expect(readKey("r", false, 3, 5)).toBeNull();
  });

  it("turn the middle and the whole cube, and nothing else", () => {
    expect(readKey("m", false, 3, 1)).toEqual({ move: { axis: 0, layer: 1, turns: 1 } });
    expect(readKey("m", false, 4, 1)).toBeNull();
    expect(readKey("x", false, 3, 1)).toEqual({ move: { axis: 0, layer: "all", turns: 3 } });
    expect(readKey("q", false, 3, 1)).toBeNull();
  });
});
