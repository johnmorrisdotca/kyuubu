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
