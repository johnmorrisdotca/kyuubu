import { cubeSlots, faceOfNormal, layerOf, type CubeFace } from "../cube.ts";
import type { CubeAxis, CubeMove, CubeTurns, Vec3 } from "../types.ts";

import { apply, axisVector, cross, onScreen, type Mat3 } from "./geometry.ts";
import { DRAG_DECIDE_PX, DRAG_START_PX, moveForRelease, pickDrag } from "./gestures.ts";

/**
 * WHERE TO DRAG: the sticker to take hold of and the way to drag it that
 * makes a given turn, worked out from the way the cube is looked at now.
 *
 * It is found with the drag's own rules, not beside them: a face is chosen
 * only if `pickDrag`, handed a drag along the arrow from any sticker the
 * arrow crosses, picks exactly the layer to turn, and `moveForRelease` makes
 * of it exactly the turn asked for. So following the arrow is the turn, on
 * every size and from every side the cube can be seen from.
 */

/** How squarely a face must face the viewer for an arrow to be drawn on it: the cosine of its angle to the eye. */
export const HINT_MIN_FACING = 0.2;

/** How closely a drag along the arrow must go the way the layer turns: the cosine between them. The layer turns at least this fast for the pointer's pace. */
export const HINT_MIN_FOLLOW = 0.5;

/** The arrow a hint draws, in the cube's doubled units (a sticker is 2 across), lying on a face. */
export type HintArrow = {
  /** Where it begins: the middle of the sticker to take hold of, on the face (on the slab's middle line, for several layers). */
  from: Vec3;
  /** The way it points, a unit vector in the face: seen from where the viewer is, the way to drag. */
  along: Vec3;
  /** How long it is, in doubled units, kept inside the face. */
  length: number;
  /** How wide the slab it lies across is, in doubled units: 2 a layer. */
  width: number;
  /** The face's outward normal. */
  normal: Vec3;
};

/** What to drag to make a turn of one layer, or of several about one axis as one (a wide turn). */
export type DragHint = {
  /** The turn's axis. */
  axis: CubeAxis;
  /** The layers that turn, counted from the axis's negative side. */
  layers: number[];
  /** How far, by the right-hand rule. */
  turns: CubeTurns;
  /** Whether the turn is of two neighbouring layers on a cube of 3 or more: one drag that begins on the seam between them, at the tail of the arrow, or two fingers at once, turns both together. */
  seam: boolean;
  /** Every sticker those layers carry, as indexes into the state: the stickers to light. */
  slots: number[];
  /** The face the arrow lies on, or null where no side of the layer can be seen well enough from here: look round the cube first. */
  face: CubeFace | null;
  /** The sticker to take hold of, at the arrow's tail, in the first of the layers; null with `face`, and for a turn of the whole cube, which no sticker is taken hold of for. */
  grab: number | null;
  /** The way to drag across the screen (x right, y down), as a unit vector; null with `face`. */
  drag: [number, number] | null;
  /** What a drag along the arrow makes, as `quartersForRelease` counts it: 1 or −1 a quarter turn, 2 a half turn (twice as far, or two quarter turns the same way). */
  quarters: 1 | -1 | 2;
  /** Whether the layer is picked as soon as the drag begins (`DRAG_START_PX`), or only once it has gone `DRAG_DECIDE_PX`: the arrow is right either way. */
  atOnce: boolean;
  /** The arrow to draw; null with `face`. */
  arrow: HintArrow | null;
};

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const times = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

/**
 * The turns of one movement, if they are one: every layer about one axis,
 * each turned as far. Null for the whole cube, for nothing, and for turns
 * about different axes or by different amounts.
 */
function oneMovement(moves: readonly CubeMove[]): { axis: CubeAxis; layers: number[]; turns: CubeTurns } | null {
  if (moves.length === 0) return null;
  const [first] = moves;
  if (moves.some((move) => move.layer === "all" || move.axis !== first.axis || move.turns !== first.turns)) return null;
  const layers = [...new Set(moves.map((move) => move.layer as number))].sort((a, b) => a - b);
  return { axis: first.axis, layers, turns: first.turns };
}

/**
 * The drag that makes this turn, from the way the cube is looked at now
 * (`view`, as `viewMatrix` makes it). Several layers about one axis, turned
 * as far, are one slab and get one arrow across it; each layer is still
 * turned by a drag of its own. Null for a turn of the whole cube, which no
 * drag on a sticker makes, and for turns that are not one movement.
 */
export function dragHint(moves: CubeMove | readonly CubeMove[], n: number, view: Mat3): DragHint | null {
  const movement = oneMovement(Array.isArray(moves) ? moves : [moves as CubeMove]);
  if (movement === null) return null;
  const { axis, layers, turns } = movement;
  const { slots } = cubeSlots(n);
  const lit = slots.flatMap((slot, at) => (layers.includes(layerOf(slot.centre, axis, n)) ? [at] : []));
  const quarters = turns === 2 ? 2 : turns === 1 ? 1 : -1;
  const seam = n >= 3 && layers.length === 2 && layers[1] === layers[0] + 1;
  const across = axisVector(axis);
  const middle = layers.reduce((sum, layer) => sum + 2 * layer - n + 1, 0) / layers.length;
  let best: { score: number; hint: DragHint } | null = null;
  // Any sticker of the first layer on a side that faces the viewer can be taken hold of; the one a drag makes the turn from most surely, with room for the arrow, is.
  for (const at of lit) {
    const slot = slots[at];
    const { normal } = slot;
    if (normal[axis] !== 0 || layerOf(slot.centre, axis, n) !== layers[0]) continue;
    const facing = apply(view, normal)[2];
    if (facing < HINT_MIN_FACING) continue;
    const surface = slot.centre.map((value, k) => value + normal[k]) as unknown as Vec3;
    const way = quarters === -1 ? -1 : 1;
    const tangent = cross(across, normal);
    // Two ways to drag it are tried: straight along the row or column the layer carries the sticker in, which reads best on
    // the cube; and the way the drag's own rules read the layer forwards from this sticker, which they pick soonest.
    const straight = onScreen(view, times(tangent, way));
    const ruled = onScreen(view, times(cross(across, surface), way));
    for (const [seen, bonus] of [
      [straight, 5],
      [ruled, 0],
    ] as const) {
      const size = Math.hypot(...seen);
      if (size < 1e-6) continue;
      const drag: [number, number] = [seen[0] / size, seen[1] / size];
      const makes = (px: number) => {
        const pick = pickDrag(slot, n, view, drag[0] * px, drag[1] * px);
        if (pick === null || pick.axis !== axis || pick.layer !== layerOf(slot.centre, axis, n)) return false;
        const cos = pick.along[0] * drag[0] + pick.along[1] * drag[1];
        // The layer must turn at least half as fast as the pointer goes along the arrow, or following it would take for ever.
        if (Math.abs(cos) < HINT_MIN_FOLLOW) return false;
        const made = moveForRelease(pick, quarters === 2 ? 2 : Math.sign(cos));
        return made !== null && made.turns === turns;
      };
      const atOnce = makes(DRAG_START_PX);
      if (!atOnce && !makes(DRAG_DECIDE_PX + 1)) continue;
      // The arrow lies in the face, along the one way in it that the viewer sees as the drag: the face's two directions, seen on the screen, solved for it.
      const [a, b] = [onScreen(view, across), onScreen(view, tangent)];
      const det = a[0] * b[1] - a[1] * b[0];
      if (Math.abs(det) < 1e-9) continue;
      const alpha = (drag[0] * b[1] - drag[1] * b[0]) / det;
      const beta = (a[0] * drag[1] - a[1] * drag[0]) / det;
      const raw: Vec3 = [0, 0, 0].map((_, k) => across[k] * alpha + tangent[k] * beta) as unknown as Vec3;
      const along = times(raw, 1 / Math.hypot(...raw));
      const from: Vec3 = surface.map((value, k) => value + across[k] * (middle - slot.centre[axis])) as unknown as Vec3;
      // As far as the face's edge allows, and no further than across it.
      const edge = n - 0.3;
      let room = 2 * (n - 1) + 0.7;
      for (const direction of [across, tangent]) {
        const go = dot3(along, direction);
        const now = dot3(slot.centre, direction);
        if (Math.abs(go) > 1e-9) room = Math.min(room, ((go > 0 ? edge : -edge) - now) / go);
      }
      if (room < 1) continue;
      const shown = Math.hypot(...onScreen(view, along));
      // Picked at once first, then straight, then from the end of the row so the arrow runs across it, then the face seen best.
      const score = (atOnce ? 10 : 0) + bonus + (3 * Math.min(room, 2 * (n - 1) + 0.7)) / (2 * n) + facing * shown;
      if (best !== null && best.score >= score) continue;
      best = {
        score,
        hint: {
          axis,
          layers,
          turns,
          seam,
          slots: lit,
          face: faceOfNormal(normal),
          grab: at,
          drag,
          quarters,
          atOnce,
          arrow: { from, along, length: room, width: 2 * layers.length, normal },
        },
      };
    }
  }
  return best?.hint ?? { axis, layers, turns, seam, slots: lit, face: null, grab: null, drag: null, quarters, atOnce: false, arrow: null };
}

/**
 * The turn of the whole cube, if the moves are one: every one a turn of the
 * whole cube, about one axis and as far. Null for anything else.
 */
function oneRotation(moves: readonly CubeMove[]): { axis: CubeAxis; turns: CubeTurns } | null {
  if (moves.length === 0) return null;
  const [first] = moves;
  if (moves.some((move) => move.layer !== "all" || move.axis !== first.axis || move.turns !== first.turns)) return null;
  return { axis: first.axis, turns: first.turns };
}

/**
 * WHICH WAY TO TURN THE WHOLE CUBE: no drag on a sticker makes it (a key or a
 * button does: `x`, `y`, `z`), so there is no sticker to take hold of, but the
 * way it goes can still be drawn. The arrow lies across the middle of the side
 * the axis goes through that is seen best, as long as the side allows, and runs
 * the way every sticker on it travels; two heads for a half turn. The sides
 * the axis comes out of never cross the screen, so none is drawn on.
 *
 * Null for moves that are not one turn of the whole cube; `face` and `arrow`
 * are null where none of the four sides can be seen well enough (look round
 * first).
 */
export function rotationHint(moves: CubeMove | readonly CubeMove[], n: number, view: Mat3): DragHint | null {
  const rotation = oneRotation(Array.isArray(moves) ? (moves as readonly CubeMove[]) : [moves as CubeMove]);
  if (rotation === null) return null;
  const { axis, turns } = rotation;
  const { slots } = cubeSlots(n);
  const layers = Array.from({ length: n }, (_, layer) => layer);
  const quarters = turns === 2 ? 2 : turns === 1 ? 1 : -1;
  const way = quarters === -1 ? -1 : 1;
  const across = axisVector(axis);
  const base = { axis, layers, turns, seam: false, slots: slots.map((_, at) => at), quarters: quarters as 1 | -1 | 2, atOnce: false };
  let best: { score: number; hint: DragHint } | null = null;
  for (const normal of FACE_NORMALS) {
    if (normal[axis] !== 0) continue;
    const facing = apply(view, normal)[2];
    if (facing < HINT_MIN_FACING) continue;
    // Every sticker of the side goes this way, as every layer's turn is read: the axis crossed with the side's own direction.
    const along = times(cross(across, normal), way) as unknown as Vec3;
    const screen = onScreen(view, along);
    const shown = Math.hypot(...screen);
    // An arrow seen end-on says nothing: it must run across the screen.
    if (shown < 0.3) continue;
    const score = facing * shown;
    if (best !== null && best.score >= score) continue;
    // Across the whole side, a little short of its edges, and the arrow's tail at its near end.
    const length = 2 * n - 0.8;
    const centre = times(normal, n);
    const from = centre.map((value, k) => value - (along[k] * length) / 2) as unknown as Vec3;
    best = {
      score,
      hint: { ...base, face: faceOfNormal(normal), grab: null, drag: [screen[0] / shown, screen[1] / shown], arrow: { from, along, length, width: 2 * n, normal } },
    };
  }
  return best?.hint ?? { ...base, face: null, grab: null, drag: null, arrow: null };
}

/** The six outward normals of a cube's sides. */
const FACE_NORMALS: readonly Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
