import { layerOf } from "../cube.ts";
import type { CubeAxis, CubeMove, CubeTurns, StickerSlot } from "../types.ts";

import { axisOf, axisVector, cross, onScreen, type Mat3 } from "./geometry.ts";

/**
 * FROM A HAND TO A TURN: which layer a drag, a wheel or a key means, worked
 * out from the sticker under the pointer and the way the viewer is looking.
 * Pure, so every gesture can be tested without a screen.
 *
 * A sticker sits in three layers, one about each axis. The one about its own
 * normal is the face it is on; the other two carry it across the screen, and
 * how each would carry it is the velocity of its surface under a turn of that
 * layer — the axis crossed with where the sticker is — seen from the viewer.
 */

type Candidate = { axis: CubeAxis; screen: [number, number] };

function candidates(slot: StickerSlot, view: Mat3): Candidate[] {
  const face = axisOf(slot.normal);
  const surface = slot.centre.map((value, at) => value + slot.normal[at]) as unknown as [number, number, number];
  return ([0, 1, 2] as CubeAxis[])
    .filter((axis) => axis !== face)
    .map((axis) => ({ axis, screen: onScreen(view, cross(axisVector(axis), surface)) }));
}

const length = ([x, y]: [number, number]) => Math.hypot(x, y) || 1;

function turnFor(slot: StickerSlot, n: number, axis: CubeAxis, forward: boolean): CubeMove {
  return { axis, layer: layerOf(slot.centre, axis, n), turns: (forward ? 1 : 3) as CubeTurns };
}

/** The turn a drag across a sticker means: the layer that carries it most nearly the way the pointer went, that way. */
export function moveForDrag(slot: StickerSlot, n: number, view: Mat3, dx: number, dy: number): CubeMove {
  let best: { candidate: Candidate; along: number } | null = null;
  for (const candidate of candidates(slot, view)) {
    const [sx, sy] = candidate.screen;
    const along = (sx * dx + sy * dy) / length(candidate.screen);
    if (best === null || Math.abs(along) > Math.abs(best.along)) best = { candidate, along };
  }
  return turnFor(slot, n, best!.candidate.axis, best!.along > 0);
}

/**
 * The turn the wheel means over a sticker. `across` turns the layer that
 * carries it most nearly sideways, rolling the wheel down carrying it right;
 * `upDown` the layer that carries it most nearly up and down, down carrying it
 * down; `face` turns the face it is on, down turning it clockwise.
 */
export function moveForWheel(slot: StickerSlot, n: number, view: Mat3, way: "across" | "upDown" | "face", down: boolean): CubeMove {
  if (way === "face") {
    const axis = axisOf(slot.normal);
    const positive = slot.normal[axis] > 0;
    // Clockwise seen from outside the face is against the right-hand rule on its outward normal.
    const clockwise = positive ? 3 : 1;
    return { axis, layer: layerOf(slot.centre, axis, n), turns: (down ? clockwise : 4 - clockwise) as CubeTurns };
  }
  const pick = way === "across" ? 0 : 1;
  const best = candidates(slot, view).reduce((a, b) => (Math.abs(b.screen[pick]) / length(b.screen) > Math.abs(a.screen[pick]) / length(a.screen) ? b : a));
  const forward = best.screen[pick] > 0 === down;
  return turnFor(slot, n, best.axis, forward);
}

/*
 * A DRAG THAT THE LAYER FOLLOWS. A drag on a sticker first picks its layer,
 * once the pointer has gone far enough to say which; the layer then turns
 * with the pointer, forwards and back, and nothing is a move until the
 * pointer lets go. These are the rules, as pure functions.
 */

/** How far the pointer goes, in pixels, before a drag picks a layer at all. */
export const DRAG_START_PX = 9;
/** How far it goes before a drag that could be either of two layers picks the likelier anyway. */
export const DRAG_DECIDE_PX = 27;
/** How much more one layer must go the pointer's way than the other to be picked before that. */
export const DRAG_CLEAR_RATIO = 1.4;
/** The point of no return, in degrees, where none is given: let go short of it and the layer goes back. */
export const COMMIT_ANGLE = 30;
/** A flick: the layer still turning this fast the drag's own way, in degrees a millisecond, when the pointer lets go. */
export const FLICK_SPEED = 0.25;
/** The least a flick must have turned the layer, in degrees. */
export const FLICK_ANGLE = 4;

/** The layer a drag has picked: its axis and layer, and the way across the screen (a unit vector, x right and y down) that turns it forwards by the right-hand rule. */
export type DragPick = { axis: CubeAxis; layer: number; along: [number, number] };

/**
 * The layer a drag across a sticker means, once it can be told: null while
 * the pointer has not gone far enough, or while the two layers that carry the
 * sticker are too nearly as likely as each other. Past `DRAG_DECIDE_PX` the
 * likelier is picked whatever the odds.
 */
export function pickDrag(slot: StickerSlot, n: number, view: Mat3, dx: number, dy: number): DragPick | null {
  const far = Math.hypot(dx, dy);
  if (far < DRAG_START_PX) return null;
  const ranked = candidates(slot, view)
    .map((candidate) => {
      const size = length(candidate.screen);
      const along: [number, number] = [candidate.screen[0] / size, candidate.screen[1] / size];
      return { candidate, along, went: Math.abs(along[0] * dx + along[1] * dy) };
    })
    .sort((a, b) => b.went - a.went);
  const [best, other] = ranked;
  if (far < DRAG_DECIDE_PX && other !== undefined && best.went < other.went * DRAG_CLEAR_RATIO) return null;
  return { axis: best.candidate.axis, layer: layerOf(slot.centre, best.candidate.axis, n), along: best.along };
}

/** The angle, in degrees, a picked layer has been dragged to: forwards is positive, and it stops at a half turn either way. `quarterPx` is the pixels that make a quarter turn. */
export function dragAngle(pick: DragPick, dx: number, dy: number, quarterPx: number): number {
  const angle = ((pick.along[0] * dx + pick.along[1] * dy) / Math.max(quarterPx, 1)) * 90;
  return Math.max(-180, Math.min(180, angle));
}

/**
 * What letting go makes of a dragged layer: the quarter turns it snaps to,
 * from −2 to 2, where 0 is back where it was and no move at all.
 *
 * Short of the point of no return (`commitAngle`) it goes back; from there up
 * to the same distance past a quarter turn it is one quarter turn; further
 * is a half turn. A flick, still moving fast the way it was dragged, makes
 * the quarter turn from short of the point. `speed` is in degrees a
 * millisecond, signed like the angle.
 */
export function quartersForRelease(angle: number, speed = 0, commitAngle = COMMIT_ANGLE): -2 | -1 | 0 | 1 | 2 {
  const size = Math.abs(angle);
  const way = angle < 0 ? -1 : 1;
  if (size >= 90 + commitAngle) return (2 * way) as -2 | 2;
  if (size >= commitAngle) return way as -1 | 1;
  if (size >= FLICK_ANGLE && speed * way >= FLICK_SPEED) return way as -1 | 1;
  return 0;
}

/** Whether a dragged layer is past the point of no return: letting go now, at rest, makes a move. */
export function pastCommit(angle: number, commitAngle = COMMIT_ANGLE): boolean {
  return quartersForRelease(angle, 0, commitAngle) !== 0;
}

/** The move a release makes: the picked layer turned by those quarters, or null for none. */
export function moveForRelease(pick: DragPick, quarters: number): CubeMove | null {
  if (quarters === 0) return null;
  return { axis: pick.axis, layer: pick.layer, turns: (((quarters % 4) + 4) % 4) as CubeTurns };
}
