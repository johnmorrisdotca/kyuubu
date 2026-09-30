import { describe, expect, it } from "vitest";

import {
  DRAG_DECIDE_PX,
  DRAG_START_PX,
  HINT_MIN_FACING,
  HINT_MIN_FOLLOW,
  cubeSlots,
  dragAngle,
  dragHint,
  layerOf,
  moveForRelease,
  moveNotation,
  parseMove,
  parseSolve,
  pickDrag,
  quartersForRelease,
  viewMatrix,
  type CubeAxis,
  type CubeMove,
  type CubeTurns,
  type Mat3,
} from "../src/index.ts";
import { apply, onScreen } from "../src/view/geometry.ts";

/** The ways round a person looks at a cube: the usual, from below, from behind, steep from above, and from the side. */
const VIEWS: [number, number][] = [
  [-35, 28],
  [-35, -28],
  [145, 28],
  [60, 40],
  [-120, -50],
  [20, 70],
  [-60, 15],
];
const QUARTER_PX = 100;

/** Every turn of one layer on a cube of side n. */
function everyTurn(n: number): CubeMove[] {
  const moves: CubeMove[] = [];
  for (const axis of [0, 1, 2] as CubeAxis[]) for (let layer = 0; layer < n; layer += 1) for (const turns of [1, 2, 3] as CubeTurns[]) moves.push({ axis, layer, turns });
  return moves;
}

/**
 * The proof that an arrow means what it says: from the sticker at its tail,
 * a drag along it is read by the cube's own rules (`pickDrag`, `dragAngle`,
 * `quartersForRelease`, `moveForRelease`) as exactly the turn asked for.
 */
function follow(moves: readonly CubeMove[], n: number, view: Mat3) {
  const hint = dragHint(moves, n, view)!;
  expect(hint).not.toBeNull();
  if (hint.face === null) return hint;
  const slot = cubeSlots(n).slots[hint.grab!];
  const [dx, dy] = hint.drag!;
  expect(Math.hypot(dx, dy)).toBeCloseTo(1, 9);
  // The sticker is on the face the arrow lies on, faces the viewer, and is in the first layer to turn.
  expect(slot.normal).toEqual(hint.arrow!.normal);
  expect(slot.normal[hint.axis]).toBe(0);
  expect(apply(view, slot.normal)[2]).toBeGreaterThanOrEqual(HINT_MIN_FACING);
  expect(layerOf(slot.centre, hint.axis, n)).toBe(hint.layers[0]);
  // The arrow is drawn the way the drag goes, as the viewer sees it.
  const seen = onScreen(view, hint.arrow!.along);
  const size = Math.hypot(...seen);
  expect(seen[0] / size).toBeCloseTo(dx, 9);
  expect(seen[1] / size).toBeCloseTo(dy, 9);
  // Dragged along it: the layer is picked, from the first pixels it is picked at to well on.
  const want: CubeMove = { axis: hint.axis, layer: hint.layers[0], turns: hint.turns };
  for (const px of [hint.atOnce ? DRAG_START_PX : DRAG_DECIDE_PX + 1, 40, 90]) {
    const pick = pickDrag(slot, n, view, dx * px, dy * px);
    expect(pick, `${moveNotation(want, n)} at ${px}px`).toMatchObject({ axis: want.axis, layer: want.layer });
  }
  // And let go a quarter (or, for a half turn, a half) on, it is the turn.
  const pick = pickDrag(slot, n, view, dx * 40, dy * 40)!;
  // The arrow goes the layer's way closely enough that the drag turns it at least half as fast as the pointer goes: a quarter turn by the time the pointer has gone two quarters' worth.
  const cos = pick.along[0] * dx + pick.along[1] * dy;
  expect(Math.abs(cos)).toBeGreaterThanOrEqual(HINT_MIN_FOLLOW);
  const far = (QUARTER_PX * (hint.quarters === 2 ? 2 : 1)) / Math.abs(cos);
  const angle = dragAngle(pick, dx * far, dy * far, QUARTER_PX);
  expect(quartersForRelease(angle)).toBe(hint.quarters);
  expect(moveForRelease(pick, quartersForRelease(angle)), moveNotation(want, n)).toEqual(want);
  return hint;
}

describe("the arrow for a turn", () => {
  it("makes exactly that turn when followed: every face, slice and way, sizes 2 to 5, from every side", () => {
    let arrows = 0;
    for (const n of [2, 3, 4, 5]) {
      for (const [yaw, pitch] of VIEWS) {
        const view = viewMatrix(yaw, pitch);
        for (const move of everyTurn(n)) {
          const hint = follow([move], n, view);
          // Seen from these seven sides, every layer shows a side to drag.
          expect(hint.face, `${moveNotation(move, n)} on ${n}×${n} from ${yaw}, ${pitch}`).not.toBeNull();
          arrows += 1;
        }
      }
    }
    expect(arrows).toBe(7 * 3 * 3 * (2 + 3 + 4 + 5));
  });

  it("also on a 6×6 and a 7×7, from the usual side", () => {
    for (const n of [6, 7]) for (const move of everyTurn(n)) expect(follow([move], n, viewMatrix(-35, 28)).face).not.toBeNull();
  });

  it("is picked as soon as the drag begins for nearly every turn from the usual side, and the rest a little later", () => {
    const moves = [2, 3, 4, 5].flatMap((n) => everyTurn(n).map((move) => dragHint(move, n, viewMatrix(-35, 28))!));
    // Where the two layers a sticker could turn go nearly the same way on the screen, the drag's rules wait `DRAG_DECIDE_PX` to be sure; `follow` proves the arrow is right then too.
    expect(moves.filter((hint) => hint.atOnce).length / moves.length).toBeGreaterThan(0.85);
  });

  it("lies across the whole slab of a wide turn, and each layer of it is dragged along it", () => {
    for (const [text, n] of [["Rw", 3], ["Rw'", 4], ["3Uw2", 5], ["Lw", 4], ["Fw'", 5], ["Bw", 4], ["Dw2", 3]] as const) {
      const read = parseSolve(text, n);
      expect(read.ok, text).toBe(true);
      const [step] = read.steps;
      for (const [yaw, pitch] of VIEWS) {
        const view = viewMatrix(yaw, pitch);
        const hint = follow(step.moves, n, view);
        expect(hint.layers).toHaveLength(step.moves.length);
        expect(hint.arrow?.width).toBe(2 * step.moves.length);
        // Once one layer is made, the arrow for the rest still makes the rest.
        for (const move of step.moves) follow(step.moves.filter((other) => other !== move), n, view);
      }
    }
  });

  it("lights every sticker the layers carry, and only those", () => {
    for (const n of [2, 3, 5]) {
      const outer = dragHint(parseMove("R", n)!, n, viewMatrix(-35, 28))!;
      expect(outer.slots).toHaveLength(n * n + 4 * n);
      if (n > 2) expect(dragHint(parseMove("2U", n)!, n, viewMatrix(-35, 28))!.slots).toHaveLength(4 * n);
    }
  });

  it("says to look round when no side of the layer can be seen, and lights it anyway", () => {
    const hint = dragHint(parseMove("F", 3)!, 3, viewMatrix(0, 0))!;
    expect(hint.face).toBeNull();
    expect(hint.arrow).toBeNull();
    expect(hint.grab).toBeNull();
    expect(hint.slots).toHaveLength(21);
    // A face-on look still shows how to turn the right face: down its column on the front.
    expect(follow([parseMove("R'", 3)!], 3, viewMatrix(0, 0)).face).toBe("F");
  });

  it("draws no arrow for the whole cube, or for turns that are not one movement", () => {
    expect(dragHint(parseMove("x", 3)!, 3, viewMatrix(-35, 28))).toBeNull();
    expect(dragHint([parseMove("R", 3)!, parseMove("U", 3)!], 3, viewMatrix(-35, 28))).toBeNull();
    expect(dragHint([parseMove("R", 3)!, parseMove("L", 3)!], 3, viewMatrix(-35, 28))).toBeNull();
    expect(dragHint([], 3, viewMatrix(-35, 28))).toBeNull();
  });

  it("keeps the arrow inside its face", () => {
    for (const n of [2, 3, 4, 7]) {
      for (const move of everyTurn(n)) {
        const hint = dragHint(move, n, viewMatrix(-35, 28))!;
        const { from, along, length } = hint.arrow!;
        const tip = from.map((value, k) => value + along[k] * length);
        for (const k of [0, 1, 2]) expect(Math.abs(tip[k])).toBeLessThanOrEqual(n + 1e-9);
        expect(length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
