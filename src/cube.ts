import type { CubeAxis, CubeMove, CubeTurns, StickerSlot, Vec3 } from "./types.ts";

/**
 * THE TURNING CUBE, as pure functions over a string: the state is a letter a
 * sticker, and a turn is a fixed shuffle of those letters worked out once per
 * size, axis, layer and turn (`permutationOf`). Every function returns a new
 * string and leaves its input alone.
 *
 * Built from geometry rather than tables of face cycles, so one piece of code
 * turns a 2×2 and a 5×5 alike: each sticker slot knows its cubie's centre and
 * the way it faces, a turn rotates those two vectors about its axis, and the
 * slot they land on is where the sticker goes.
 */

/** The faces in the order a state is written: up, right, front, down, left, back. Each letter is also that face's colour when solved. */
export const CUBE_FACE_ORDER = ["U", "R", "F", "D", "L", "B"] as const;
/** A face's letter: U, R, F, D, L or B. */
export type CubeFace = (typeof CUBE_FACE_ORDER)[number];

/** Which way each face looks, and its rows and columns as the face is seen from outside, in the order above. */
export const FACE_FRAMES: Readonly<Record<CubeFace, { normal: Vec3; right: Vec3; down: Vec3 }>> = {
  U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
};

/** The face whose outward normal this is. */
export function faceOfNormal(normal: Vec3): CubeFace {
  return CUBE_FACE_ORDER.find((face) => FACE_FRAMES[face].normal.every((value, at) => value === normal[at]))!;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const keyOf = (slot: StickerSlot) => `${slot.centre.join(",")}|${slot.normal.join(",")}`;

/** A quarter turn counter-clockwise, seen from the axis's positive end. */
export function quarterTurn(v: Vec3, axis: CubeAxis): Vec3 {
  if (axis === 0) return [v[0], -v[2], v[1]];
  if (axis === 1) return [v[2], v[1], -v[0]];
  return [-v[1], v[0], v[2]];
}

const slotsBySize = new Map<number, { slots: StickerSlot[]; index: Map<string, number> }>();

/** Every sticker slot of a cube of this size, in the order its state is written, and the way back from a slot to its place. */
export function cubeSlots(n: number): { slots: readonly StickerSlot[]; index: ReadonlyMap<string, number> } {
  const known = slotsBySize.get(n);
  if (known !== undefined) return known;
  const slots: StickerSlot[] = [];
  for (const face of CUBE_FACE_ORDER) {
    const frame = FACE_FRAMES[face];
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        const centre = add(add(scale(frame.normal, n - 1), scale(frame.right, 2 * col - (n - 1))), scale(frame.down, 2 * row - (n - 1)));
        slots.push({ centre, normal: frame.normal });
      }
    }
  }
  const index = new Map(slots.map((slot, at) => [keyOf(slot), at]));
  const made = { slots, index };
  slotsBySize.set(n, made);
  return made;
}

/** The layer, 0 to n − 1 from the axis's negative side, that a cubie centre sits in. */
export function layerOf(centre: Vec3, axis: CubeAxis, n: number): number {
  return (centre[axis] + n - 1) / 2;
}

/** The face letter a solved cube shows at this slot. */
export function faceOfSlot(at: number, n: number): CubeFace {
  return CUBE_FACE_ORDER[Math.floor(at / (n * n))];
}

/** A solved cube of this size. */
export function solvedCube(n: number): string {
  return CUBE_FACE_ORDER.map((face) => face.repeat(n * n)).join("");
}

const permutations = new Map<string, Int32Array>();

/**
 * Where every sticker goes under one turn: `to[i]` is the slot the sticker in
 * slot `i` lands on. Worked out once and kept.
 */
export function permutationOf(n: number, move: CubeMove): Int32Array {
  const key = `${n}:${move.axis}:${move.layer}:${move.turns}`;
  const known = permutations.get(key);
  if (known !== undefined) return known;
  const { slots, index } = cubeSlots(n);
  const to = new Int32Array(slots.length);
  slots.forEach((slot, at) => {
    if (move.layer !== "all" && layerOf(slot.centre, move.axis, n) !== move.layer) {
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

/** Whether a move can be made on a cube of this size. */
export function moveFits(n: number, move: CubeMove): boolean {
  return move.layer === "all" || (Number.isInteger(move.layer) && move.layer >= 0 && move.layer < n);
}

/** The state after one turn. */
export function turnCube(state: string, n: number, move: CubeMove): string {
  const to = permutationOf(n, move);
  const out = new Array<string>(state.length);
  for (let at = 0; at < state.length; at += 1) out[to[at]] = state[at];
  return out.join("");
}

/** The state after every turn in order. */
export function turnAll(state: string, n: number, moves: readonly CubeMove[]): string {
  return moves.reduce((at, move) => turnCube(at, n, move), state);
}

/**
 * SOLVED: every face one colour. Which colour does not matter, so a cube
 * solved and then turned whole in the hand is still solved, and a 2×2 or 4×4,
 * which has no fixed centres, is solved in whichever way round it ends.
 */
export function cubeSolved(state: string, n: number): boolean {
  const face = n * n;
  for (let start = 0; start < state.length; start += face) {
    for (let at = start + 1; at < start + face; at += 1) if (state[at] !== state[start]) return false;
  }
  return true;
}

/** The move that takes this one back. */
export function undoOf(move: CubeMove): CubeMove {
  return { ...move, turns: (4 - move.turns) as CubeTurns };
}

/** A list of moves undone, last first. */
export function undoAll(moves: readonly CubeMove[]): CubeMove[] {
  return [...moves].reverse().map(undoOf);
}

/** Whether a move counts towards a solve's moves: a turn of the whole cube in the hand does not. */
export function countsAsMove(move: CubeMove): boolean {
  return move.layer !== "all";
}

/** Whether a string is a state of a cube this size: the right length, and the right number of every colour. */
export function isCubeState(state: string, n: number): boolean {
  if (state.length !== 6 * n * n) return false;
  const counts = new Map<string, number>();
  for (const letter of state) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  return CUBE_FACE_ORDER.every((face) => counts.get(face) === n * n);
}

/*
 * WRITING MOVES DOWN: three characters a move — the axis (x, y, z), the layer
 * (0 to 9, or * for the whole cube), the quarter turns (1 to 3). Plain enough
 * to read in a kept run, and nothing a size needs to know to be decoded.
 */

const AXES = "xyz";

/** Moves written three characters each, such as `x23y02z*1`: compact, and readable without knowing the cube's size. */
export function encodeCubeMoves(moves: readonly CubeMove[]): string {
  return moves.map((move) => `${AXES[move.axis]}${move.layer === "all" ? "*" : move.layer}${move.turns}`).join("");
}

/** The moves written in a code, or null where any of it is not a move. */
export function decodeCubeMoves(code: string): CubeMove[] | null {
  if (code.length % 3 !== 0) return null;
  const moves: CubeMove[] = [];
  for (let at = 0; at < code.length; at += 3) {
    const axis = AXES.indexOf(code[at]);
    const layerChar = code[at + 1];
    const turns = Number(code[at + 2]);
    if (axis < 0 || !(turns === 1 || turns === 2 || turns === 3)) return null;
    if (layerChar !== "*" && !/^[0-9]$/.test(layerChar)) return null;
    moves.push({ axis: axis as CubeAxis, layer: layerChar === "*" ? "all" : Number(layerChar), turns: turns as CubeTurns });
  }
  return moves;
}
