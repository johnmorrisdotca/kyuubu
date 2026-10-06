import { CUBE_FACE_ORDER, FACE_FRAMES, quarterTurn, type CubeFace } from "../cube.ts";
import type { CubeAxis, CubeTurns, StickerSlot, Vec3 } from "../types.ts";

/**
 * THE CUBOID: a turning puzzle shaped like a box, `a × b × c` cubies with each
 * side from 1 to 7, as pure functions over a string, the way `cube.ts` does a
 * cube. The state is one letter a sticker, faces in the order up, right,
 * front, down, left, back, each read in rows as it is seen from outside; the
 * letter is the colour of the face it belongs on when solved.
 *
 * `dims` is `[x, y, z]`: the width (left to right), the height (up) and the
 * depth (towards the reader) of the puzzle as it sits before it is turned in
 * the hand. A layer is a slice of it across one axis, counted from that axis's
 * negative side. What differs from a cube is one rule: a layer may turn a
 * quarter only if its slice is square, because a quarter turn of a slice that
 * is not square would push its corners out of the box. Every layer may turn a
 * half turn. A slice that is the whole puzzle (an axis only one cubie deep) is
 * not a layer: turning it moves nothing relative to the rest.
 */

/** The width, height and depth of a cuboid, in cubies: each a whole number from 1 to 7. */
export type CuboidDims = readonly [number, number, number];

/** One turn of a layer: its axis, its layer from the axis's negative side (0 to the axis's depth − 1), and one, two or three quarter turns by the right-hand rule. A two is a half turn, the only turn of a layer whose slice is not square. */
export type CuboidMove = { axis: CubeAxis; layer: number; turns: CubeTurns };

/** The least a side of a cuboid can be. */
export const CUBOID_MIN_SIDE = 1;
/** The most a side of a cuboid can be. */
export const CUBOID_MAX_SIDE = 7;

/** Whether this is a cuboid the package makes: three whole numbers from 1 to 7, and not 1×1×1, which has nothing to turn. */
export function isCuboidDims(dims: unknown): dims is CuboidDims {
  return (
    Array.isArray(dims) &&
    dims.length === 3 &&
    dims.every((side) => Number.isInteger(side) && side >= CUBOID_MIN_SIDE && side <= CUBOID_MAX_SIDE) &&
    dims.some((side) => side > 1)
  );
}

/** A cuboid's name as it is written: `2×3×3`. */
export function cuboidName(dims: CuboidDims): string {
  return dims.join("×");
}

/** A cuboid read from `2x3x3`, `2×3×3`, `2 3 3` or `2,3,3`: its dims, or null where it is not one the package makes. */
export function parseCuboidDims(text: string): CuboidDims | null {
  const found = /^\s*(\d)\s*[x×*,\s]\s*(\d)\s*[x×*,\s]\s*(\d)\s*$/i.exec(text);
  if (found === null) return null;
  const dims = [Number(found[1]), Number(found[2]), Number(found[3])];
  return isCuboidDims(dims) ? (dims as unknown as CuboidDims) : null;
}

/** Whether two cuboids are the same puzzle turned about in the hand: the same three sides in any order. */
export function sameCuboid(a: CuboidDims, b: CuboidDims): boolean {
  const sorted = (dims: CuboidDims) => [...dims].sort((x, y) => x - y).join(",");
  return sorted(a) === sorted(b);
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const axisOfVector = (v: Vec3): CubeAxis => (v[0] !== 0 ? 0 : v[1] !== 0 ? 1 : 2);
const keyOf = (slot: StickerSlot) => `${slot.centre.join(",")}|${slot.normal.join(",")}`;

/** One face of a cuboid: how many columns and rows of stickers it has as it is seen from outside, and where its stickers begin in the state. */
export type CuboidFace = { face: CubeFace; cols: number; rows: number; start: number };

const facesBySize = new Map<string, readonly CuboidFace[]>();

/** The six faces of a cuboid, in the order the state is written, with their size and where each begins. */
export function cuboidFaces(dims: CuboidDims): readonly CuboidFace[] {
  const key = dims.join(",");
  const known = facesBySize.get(key);
  if (known !== undefined) return known;
  let start = 0;
  const made = CUBE_FACE_ORDER.map((face) => {
    const frame = FACE_FRAMES[face];
    const cols = dims[axisOfVector(frame.right)];
    const rows = dims[axisOfVector(frame.down)];
    const one = { face, cols, rows, start };
    start += cols * rows;
    return one;
  });
  facesBySize.set(key, made);
  return made;
}

/** How many stickers a cuboid has: the area of its surface. */
export function cuboidStickerCount(dims: CuboidDims): number {
  return 2 * (dims[0] * dims[1] + dims[1] * dims[2] + dims[0] * dims[2]);
}

const slotsBySize = new Map<string, { slots: StickerSlot[]; index: Map<string, number> }>();

/** Every sticker slot of a cuboid, in the order its state is written, and the way back from a slot to its place. A slot's centre is in doubled coordinates, so a cubie's is a whole step from the middle along each axis. */
export function cuboidSlots(dims: CuboidDims): { slots: readonly StickerSlot[]; index: ReadonlyMap<string, number> } {
  const key = dims.join(",");
  const known = slotsBySize.get(key);
  if (known !== undefined) return known;
  const slots: StickerSlot[] = [];
  for (const { face, cols, rows } of cuboidFaces(dims)) {
    const frame = FACE_FRAMES[face];
    const depth = dims[axisOfVector(frame.normal)];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const centre = add(add(scale(frame.normal, depth - 1), scale(frame.right, 2 * col - (cols - 1))), scale(frame.down, 2 * row - (rows - 1)));
        slots.push({ centre, normal: frame.normal });
      }
    }
  }
  const made = { slots, index: new Map(slots.map((slot, at) => [keyOf(slot), at])) };
  slotsBySize.set(key, made);
  return made;
}

/** The layer, 0 to the axis's depth − 1 from its negative side, that a cubie centre sits in. */
export function cuboidLayerOf(centre: Vec3, axis: CubeAxis, dims: CuboidDims): number {
  return (centre[axis] + dims[axis] - 1) / 2;
}

/** The two axes a layer across `axis` is a slice of, and so what its slice measures: the other two sides. */
export function sliceOf(dims: CuboidDims, axis: CubeAxis): [number, number] {
  const others = ([0, 1, 2] as CubeAxis[]).filter((one) => one !== axis);
  return [dims[others[0]], dims[others[1]]];
}

/**
 * The turns a layer can make: `[1, 2, 3]` where its slice is square, `[2]`
 * where it is not, and none where there is no such layer or the layer is the
 * whole puzzle.
 */
export function legalTurns(dims: CuboidDims, axis: CubeAxis, layer: number): readonly CubeTurns[] {
  if (!Number.isInteger(layer) || layer < 0 || layer >= dims[axis] || dims[axis] === 1) return [];
  const [a, b] = sliceOf(dims, axis);
  return a === b ? [1, 2, 3] : [2];
}

/** Whether a layer turns only by a half turn: it has a slice that is not square. */
export function halfTurnOnly(dims: CuboidDims, axis: CubeAxis): boolean {
  const [a, b] = sliceOf(dims, axis);
  return a !== b;
}

/** Whether a move can be made on this cuboid: its layer exists, is not the whole puzzle, and its turn is one that layer may make. */
export function cuboidMoveLegal(dims: CuboidDims, move: CuboidMove): boolean {
  return legalTurns(dims, move.axis, move.layer).includes(move.turns);
}

/** Every move a cuboid can make, by axis, layer and turn. */
export function legalCuboidMoves(dims: CuboidDims): CuboidMove[] {
  const moves: CuboidMove[] = [];
  for (const axis of [0, 1, 2] as CubeAxis[]) {
    for (let layer = 0; layer < dims[axis]; layer += 1) for (const turns of legalTurns(dims, axis, layer)) moves.push({ axis, layer, turns });
  }
  return moves;
}

/** A solved cuboid: each face one letter. */
export function solvedCuboid(dims: CuboidDims): string {
  return cuboidFaces(dims)
    .map(({ face, cols, rows }) => face.repeat(cols * rows))
    .join("");
}

const permutations = new Map<string, Int32Array>();

/** Where every sticker goes under a legal turn: `to[i]` is the slot the sticker in slot `i` lands on. Worked out once and kept; an illegal move throws a `RangeError`. */
export function cuboidPermutationOf(dims: CuboidDims, move: CuboidMove): Int32Array {
  if (!cuboidMoveLegal(dims, move)) throw new RangeError(`The ${cuboidName(dims)} cuboid cannot make that turn: axis ${move.axis}, layer ${move.layer}, ${move.turns} quarter turns`);
  const key = `${dims.join(",")}:${move.axis}:${move.layer}:${move.turns}`;
  const known = permutations.get(key);
  if (known !== undefined) return known;
  const { slots, index } = cuboidSlots(dims);
  const to = new Int32Array(slots.length);
  slots.forEach((slot, at) => {
    if (cuboidLayerOf(slot.centre, move.axis, dims) !== move.layer) {
      to[at] = at;
      return;
    }
    let centre = slot.centre;
    let normal = slot.normal;
    for (let q = 0; q < move.turns; q += 1) {
      centre = quarterTurn(centre, move.axis);
      normal = quarterTurn(normal, move.axis);
    }
    to[at] = index.get(keyOf({ centre, normal }))!;
  });
  permutations.set(key, to);
  return to;
}

/** The state after one turn; an illegal turn throws a `RangeError`. The state passed in is never changed. */
export function turnCuboid(state: string, dims: CuboidDims, move: CuboidMove): string {
  const to = cuboidPermutationOf(dims, move);
  const out = new Array<string>(state.length);
  for (let at = 0; at < state.length; at += 1) out[to[at]] = state[at];
  return out.join("");
}

/** The state after every turn in order. */
export function turnAllCuboid(state: string, dims: CuboidDims, moves: readonly CuboidMove[]): string {
  return moves.reduce((at, move) => turnCuboid(at, dims, move), state);
}

/** SOLVED: every face one colour, whichever colour it is, so a cuboid solved and then turned whole in the hand is still solved. One pass over the stickers. */
export function cuboidSolved(state: string, dims: CuboidDims): boolean {
  for (const { cols, rows, start } of cuboidFaces(dims)) {
    for (let at = start + 1; at < start + cols * rows; at += 1) if (state[at] !== state[start]) return false;
  }
  return true;
}

/** Whether a string is a state of a cuboid this size: the right length, and each face's letter as many times as the face has stickers. It does not say the state can be reached by turning. */
export function isCuboidState(state: string, dims: CuboidDims): boolean {
  if (state.length !== cuboidStickerCount(dims)) return false;
  const counts = new Map<string, number>();
  for (const letter of state) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  return cuboidFaces(dims).every(({ face, cols, rows }) => counts.get(face) === cols * rows) && counts.size === 6;
}

/** The turn that takes one back. */
export function undoCuboidMove(move: CuboidMove): CuboidMove {
  return { ...move, turns: (4 - move.turns) as CubeTurns };
}

/** A list of moves undone, last first. */
export function undoCuboidMoves(moves: readonly CuboidMove[]): CuboidMove[] {
  return [...moves].reverse().map(undoCuboidMove);
}
