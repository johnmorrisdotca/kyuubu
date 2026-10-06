import { layerOf } from "../cube.ts";
import type { CubeAxis, CubeMove, CubeTurns, StickerSlot, Vec3 } from "../types.ts";

import { apply, axisOf, axisVector, cross, onScreen, type Mat3 } from "./geometry.ts";

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

/** How near a seam between two layers a touch lands to take both: this share of a sticker's width on each side of the line between them, so that the middle of a sticker, and a little more than half of its width, is still the one layer. */
export const SEAM_BAND = 0.18;

/** The layer a drag has picked: its axis and layer, and the way across the screen (a unit vector, x right and y down) that turns it forwards by the right-hand rule. `also` is the layer beside it that turns with it, where the drag began on the seam between the two. */
export type DragPick = { axis: CubeAxis; layer: number; along: [number, number]; also?: number };

/** A seam a hand has taken hold of: a turn about this axis would carry the layer the sticker is in and the one `beside` it, together. */
export type Seam = { axis: CubeAxis; beside: number };

/** A model point, in the cube's doubled units, as the screen draws it: in pixels from the cube's middle (y down), with the perspective the cube is drawn in. `k` is the pixels in one doubled unit, `lens` the eye's distance in pixels. */
function projected(view: Mat3, v: Vec3, k: number, lens: number): [number, number] {
  const [x, y, z] = apply(view, v).map((value) => value * k) as unknown as Vec3;
  const f = lens / (lens - z);
  return [x * f, -y * f];
}

/**
 * The seams a touch at this place on a sticker is taking hold of, nearest
 * first: where it lands within `SEAM_BAND` of a sticker's width of the line
 * that parts the sticker's layer from the one beside it, along either of the
 * two directions the sticker can be turned across. Each is a turn about an axis that takes
 * both layers, and is made only if the drag that follows goes that way: a drag
 * across the line, or begun anywhere else on the sticker, turns the one layer
 * as ever. `pointer` is in pixels from the cube's middle, y down, as the cube
 * is drawn; none on a 2×2, where both layers are the whole cube.
 */
export function seamsAt(slot: StickerSlot, n: number, view: Mat3, pointer: readonly [number, number], k: number, lens: number, band = SEAM_BAND): Seam[] {
  if (n < 3) return [];
  const face = axisOf(slot.normal);
  const surface = slot.centre.map((value, at) => value + slot.normal[at]) as unknown as Vec3;
  const plus = (a: Vec3, b: Vec3, sign = 1): Vec3 => [a[0] + sign * b[0], a[1] + sign * b[1], a[2] + sign * b[2]];
  const middle = projected(view, surface, k, lens);
  const there = [pointer[0] - middle[0], pointer[1] - middle[1]];
  const half = (axis: CubeAxis): [number, number] => {
    const [forward, back] = [projected(view, plus(surface, axisVector(axis)), k, lens), projected(view, plus(surface, axisVector(axis), -1), k, lens)];
    return [(forward[0] - back[0]) / 2, (forward[1] - back[1]) / 2];
  };
  const found: { seam: Seam; near: number }[] = [];
  for (const axis of [0, 1, 2] as CubeAxis[]) {
    if (axis === face) continue;
    const other = ([0, 1, 2] as CubeAxis[]).find((one) => one !== face && one !== axis)!;
    const [a, b] = [half(axis), half(other)];
    const det = a[0] * b[1] - a[1] * b[0];
    if (Math.abs(det) < 1e-6) continue;
    // Where the touch is on the sticker, in its own units: -1 to 1 across it, along each way.
    const u = (there[0] * b[1] - there[1] * b[0]) / det;
    const v = (a[0] * there[1] - a[1] * there[0]) / det;
    if (Math.abs(v) > 1.3 || Math.abs(u) < 1 - 2 * band || Math.abs(u) > 1.3) continue;
    const layer = layerOf(slot.centre, axis, n);
    const beside = layer + (u > 0 ? 1 : -1);
    if (beside < 0 || beside > n - 1) continue;
    found.push({ seam: { axis, beside }, near: Math.abs(u) });
  }
  return found.sort((x, y) => y.near - x.near).map((one) => one.seam);
}

/**
 * The layer a drag across a sticker means, once it can be told: null while
 * the pointer has not gone far enough, or while the two layers that carry the
 * sticker are too nearly as likely as each other. Past `DRAG_DECIDE_PX` the
 * likelier is picked whatever the odds. A drag that began on a seam
 * (`seamsAt`) and goes the way that turns about the seam's axis picks the
 * layer beside as well (`also`).
 */
export function pickDrag(slot: StickerSlot, n: number, view: Mat3, dx: number, dy: number, seams: readonly Seam[] = []): DragPick | null {
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
  const seam = seams.find((one) => one.axis === best.candidate.axis);
  return { axis: best.candidate.axis, layer: layerOf(slot.centre, best.candidate.axis, n), along: best.along, ...(seam === undefined ? {} : { also: seam.beside }) };
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

/** Every layer a release turns: the picked layer, and the one beside it where the drag took a seam, each by those quarters; none for none. */
export function movesForRelease(pick: DragPick, quarters: number): CubeMove[] {
  const move = moveForRelease(pick, quarters);
  if (move === null) return [];
  return pick.also === undefined ? [move] : [move, { ...move, layer: pick.also }];
}
