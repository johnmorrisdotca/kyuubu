import { COMMIT_ANGLE, DRAG_CLEAR_RATIO, DRAG_DECIDE_PX, DRAG_START_PX, FLICK_ANGLE, FLICK_SPEED } from "../view/gestures.ts";
import { axisOf, axisVector, cross, onScreen, type Mat3 } from "../view/geometry.ts";
import type { CubeAxis, CubeTurns, StickerSlot } from "../types.ts";

import { cuboidFaceMove, cuboidMiddleMove } from "./notation.ts";
import { cuboidLayerOf, halfTurnOnly, legalTurns, type CuboidDims, type CuboidMove } from "./model.ts";

/**
 * FROM A HAND TO A TURN on a cuboid: the cube's gestures (`view/gestures.ts`)
 * with the one rule that makes a cuboid different. A sticker sits in three
 * layers, one about each axis; the two that carry it across the screen are
 * the ones a drag can pick, and a layer that cannot turn at all (a side one
 * cubie deep is the whole puzzle) is never picked. A layer whose slice is not
 * square can only be turned by a half turn, so a drag on it is read by a
 * different rule: past the middle of the way round it is a half turn, and
 * short of that, or a flick too gentle to count, it goes back.
 */

/** The layer a drag has picked: its axis and layer, the way across the screen (a unit vector, x right and y down) that turns it forwards by the right-hand rule, and whether it can only be turned by a half turn. */
export type CuboidDragPick = { axis: CubeAxis; layer: number; along: [number, number]; halfOnly: boolean };

const length = ([x, y]: [number, number]) => Math.hypot(x, y) || 1;

/**
 * The layer a drag across a sticker means, once it can be told: null while the
 * pointer has not gone far enough, while the two layers that carry the sticker
 * are too nearly as likely as each other, or where neither can turn. Past
 * `DRAG_DECIDE_PX` the likelier is picked whatever the odds.
 */
export function pickCuboidDrag(slot: StickerSlot, dims: CuboidDims, view: Mat3, dx: number, dy: number): CuboidDragPick | null {
  const far = Math.hypot(dx, dy);
  if (far < DRAG_START_PX) return null;
  const face = axisOf(slot.normal);
  const surface = slot.centre.map((value, at) => value + slot.normal[at]) as unknown as [number, number, number];
  const ranked = ([0, 1, 2] as CubeAxis[])
    .filter((axis) => axis !== face && legalTurns(dims, axis, cuboidLayerOf(slot.centre, axis, dims)).length > 0)
    .map((axis) => {
      const screen = onScreen(view, cross(axisVector(axis), surface));
      const size = length(screen);
      const along: [number, number] = [screen[0] / size, screen[1] / size];
      return { axis, along, went: Math.abs(along[0] * dx + along[1] * dy) };
    })
    .sort((a, b) => b.went - a.went);
  const [best, other] = ranked;
  if (best === undefined) return null;
  if (far < DRAG_DECIDE_PX && other !== undefined && best.went < other.went * DRAG_CLEAR_RATIO) return null;
  return { axis: best.axis, layer: cuboidLayerOf(slot.centre, best.axis, dims), along: best.along, halfOnly: halfTurnOnly(dims, best.axis) };
}

/**
 * The angle, in degrees, a picked layer has been dragged to: forwards is
 * positive, and it stops at a half turn either way. A layer that only half
 * turns follows twice as fast, so that the whole half turn is as far a drag
 * as a quarter of any other. `quarterPx` is the pixels that make a quarter turn.
 */
export function cuboidDragAngle(pick: CuboidDragPick, dx: number, dy: number, quarterPx: number): number {
  const angle = ((pick.along[0] * dx + pick.along[1] * dy) / Math.max(pick.halfOnly ? quarterPx / 2 : quarterPx, 1)) * 90;
  return Math.max(-180, Math.min(180, angle));
}

/** The point of no return of a half turn, in degrees: the middle of the way round. */
export const HALF_TURN_COMMIT = 90;

/**
 * What letting go makes of a dragged layer, as quarter turns from −2 to 2,
 * where 0 is back where it was. A layer that turns by quarters is read as the
 * cube's is (`quartersForRelease`). One that only half turns is a half turn
 * from `HALF_TURN_COMMIT` on, or from a flick (`speed`, in degrees a
 * millisecond, signed like the angle) that has gone at least four times
 * `FLICK_ANGLE` degrees the same way, and otherwise goes back.
 */
export function cuboidQuartersForRelease(angle: number, speed: number, halfOnly: boolean, commitAngle = COMMIT_ANGLE): -2 | -1 | 0 | 1 | 2 {
  const size = Math.abs(angle);
  const way = angle < 0 ? -1 : 1;
  if (!halfOnly) {
    if (size >= 90 + commitAngle) return (2 * way) as -2 | 2;
    if (size >= commitAngle) return way as -1 | 1;
    if (size >= FLICK_ANGLE && speed * way >= FLICK_SPEED) return way as -1 | 1;
    return 0;
  }
  if (size >= HALF_TURN_COMMIT) return (2 * way) as -2 | 2;
  if (size >= FLICK_ANGLE * 4 && speed * way >= FLICK_SPEED) return (2 * way) as -2 | 2;
  return 0;
}

/** Whether a held layer is past its point of no return: letting go now, at rest, makes a move. */
export function cuboidPastCommit(angle: number, halfOnly: boolean, commitAngle = COMMIT_ANGLE): boolean {
  return cuboidQuartersForRelease(angle, 0, halfOnly, commitAngle) !== 0;
}

/** The move a release makes: the picked layer turned by those quarters, or null for none. */
export function cuboidMoveForRelease(pick: CuboidDragPick, quarters: number): CuboidMove | null {
  if (quarters === 0) return null;
  return { axis: pick.axis, layer: pick.layer, turns: (((quarters % 4) + 4) % 4) as CubeTurns };
}

/** What a key means on a cuboid: a turn, a depth for the next face letter, or nothing. */
export type CuboidKeyReading = { move: CuboidMove } | { depth: number } | null;

const FACES = new Set(["R", "L", "U", "D", "F", "B"]);
const MIDDLES = new Set(["M", "E", "S"]);

/**
 * What a key means on a cuboid, given the depth a digit before it set (1 where
 * none did): the cube's keys (`readKey`) without the turns of the whole cube.
 * On a layer that only half turns, the key turns it a half, whichever way
 * Shift says, because that is the only turn it has.
 */
export function readCuboidKey(key: string, shift: boolean, dims: CuboidDims, depth: number): CuboidKeyReading {
  if (/^[1-7]$/.test(key)) return { depth: Number(key) };
  const letter = key.length === 1 ? key.toUpperCase() : "";
  const amount = shift ? "ccw" : "cw";
  if (!FACES.has(letter) && !MIDDLES.has(letter)) return null;
  const turned = (how: "cw" | "half" | "ccw") => (FACES.has(letter) ? cuboidFaceMove(letter as "R", depth, how, dims) : cuboidMiddleMove(letter as "M", how, dims));
  const read = turned(amount);
  if ("move" in read) return { move: read.move };
  if (read.fault !== "half-turn-only") return null;
  const half = turned("half");
  return "move" in half ? { move: half.move } : null;
}
