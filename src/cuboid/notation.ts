import type { CubeAxis, CubeTurns } from "../types.ts";

import { legalTurns, type CuboidDims, type CuboidMove } from "./model.ts";

/**
 * THE CUBOID'S NOTATION, the cube's own (`notation.ts`): R, L, U, D, F and B
 * turn the outer layer on that face clockwise as the face is seen from
 * outside, `'` is anticlockwise and `2` a half turn; a digit first, `2R`, is
 * the layer that many in from the face; M, E and S are the middle layer of an
 * odd side, the way L, D and F turn. There are no x, y or z: a cuboid turned
 * whole in the hand is another puzzle on its side, not a move.
 *
 * What is new is the rule. A layer whose slice is not square turns by a half
 * turn only, and a half turn is written `R2`: there `R` and `R'` are refused,
 * and say why (`"half-turn-only"`), because a quarter turn of that layer is not
 * a turn the puzzle can make. A layer that is the whole puzzle (a side one
 * cubie deep) is refused too (`"whole-puzzle"`).
 */

/** Why a piece of notation is not a move on this cuboid.
 *
 * @example
 * ```ts
 * import type { CuboidFault } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * 
 * const value: CuboidFault = "half-turn-only";
 * console.log(value);
 * ```
 */
export type CuboidFault =
  /** It is not notation at all. */
  | "unknown"
  /** It names a layer this cuboid does not have, such as `3R` on a side two deep or `M` on an even side. */
  | "no-such-layer"
  /** It is a quarter turn of a layer that only turns by a half turn: write `R2`. */
  | "half-turn-only"
  /** It is the one layer of a side one cubie deep, which is the whole puzzle. */
  | "whole-puzzle";

type Letter = "R" | "L" | "U" | "D" | "F" | "B";

const FACE_AXES: Record<Letter, { axis: CubeAxis; positive: boolean }> = {
  R: { axis: 0, positive: true },
  L: { axis: 0, positive: false },
  U: { axis: 1, positive: true },
  D: { axis: 1, positive: false },
  F: { axis: 2, positive: true },
  B: { axis: 2, positive: false },
};
const POSITIVE_FACE: Record<CubeAxis, Letter> = { 0: "R", 1: "U", 2: "F" };
const NEGATIVE_FACE: Record<CubeAxis, Letter> = { 0: "L", 1: "D", 2: "B" };
const MIDDLE: Record<CubeAxis, { letter: string; followsPositive: boolean }> = {
  0: { letter: "M", followsPositive: false },
  1: { letter: "E", followsPositive: false },
  2: { letter: "S", followsPositive: true },
};

/** Clockwise, half or anticlockwise as quarter turns by the right-hand rule, for a layer read from its positive or negative side. */
function turnsFor(amount: "cw" | "half" | "ccw", positive: boolean): CubeTurns {
  if (amount === "half") return 2;
  const clockwise = positive ? 3 : 1;
  return (amount === "cw" ? clockwise : 4 - clockwise) as CubeTurns;
}

function suffixOf(turns: CubeTurns, positive: boolean): string {
  if (turns === 2) return "2";
  return turns === turnsFor("cw", positive) ? "" : "'";
}

/** A move as a person writes it on this cuboid: `R`, `R'`, `R2`, `2U2`, `M2`. The move should be one the cuboid can make.
 *
 * @param move - The turn to apply, name or invert.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns A move as a person writes it on this cuboid: `R`, `R'`, `R2`, `2U2`, `M2`. The move should be one the cuboid can make.
 *
 * @example
 * ```ts
 * import { cuboidMoveNotation, parseCuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * const cmove = parseCuboidMove("R", dims)!;
 * console.log(cuboidMoveNotation(cmove, dims));
 * ```
 */
export function cuboidMoveNotation(move: CuboidMove, dims: CuboidDims): string {
  const depth = dims[move.axis];
  if (depth % 2 === 1 && depth > 1 && move.layer === (depth - 1) / 2) {
    const middle = MIDDLE[move.axis];
    return `${middle.letter}${suffixOf(move.turns, middle.followsPositive)}`;
  }
  const positive = move.layer > (depth - 1) / 2;
  const fromFace = positive ? depth - move.layer : move.layer + 1;
  const face = positive ? POSITIVE_FACE[move.axis] : NEGATIVE_FACE[move.axis];
  return `${fromFace > 1 ? fromFace : ""}${face}${suffixOf(move.turns, positive)}`;
}

/** Moves as a person writes them, a space between each.
 *
 * @param moves - The turns, in their execution order.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns Moves as a person writes them, a space between each.
 *
 * @example
 * ```ts
 * import { cuboidMovesNotation, parseCuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * const cmove = parseCuboidMove("R", dims)!;
 * console.log(cuboidMovesNotation([cmove], dims));
 * ```
 */
export function cuboidMovesNotation(moves: readonly CuboidMove[], dims: CuboidDims): string {
  return moves.map((move) => cuboidMoveNotation(move, dims)).join(" ");
}

/** What reading one piece of notation gives: the move, or why it is not one.
 *
 * @example
 * ```ts
 * import type { CuboidReading } from "@johnmorrisdotca/kyuubu/cuboid";
 * import { readCuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const value: CuboidReading = readCuboidMove("U", [2, 3, 3]);
 * console.log(value);
 * ```
 */
export type CuboidReading = { move: CuboidMove } | { fault: CuboidFault };

function checked(dims: CuboidDims, move: CuboidMove): CuboidReading {
  if (move.layer < 0 || move.layer >= dims[move.axis]) return { fault: "no-such-layer" };
  if (dims[move.axis] === 1) return { fault: "whole-puzzle" };
  return legalTurns(dims, move.axis, move.layer).includes(move.turns) ? { move } : { fault: "half-turn-only" };
}

/** A face turned, `depth` layers in from it (1 is the face itself), on this cuboid: the move, or why not.
 *
 * @param face - The face letter: U, R, F, D, L or B.
 * @param depth - The layer depth counted from the named face, starting at 1.
 * @param amount - The turn direction: cw, half or ccw.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns A face turned, `depth` layers in from it (1 is the face itself), on this cuboid: the move, or why not.
 *
 * @example
 * ```ts
 * import { cuboidFaceMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * console.log(cuboidFaceMove("R", 1, "cw", dims));
 * ```
 */
export function cuboidFaceMove(face: Letter, depth: number, amount: "cw" | "half" | "ccw", dims: CuboidDims): CuboidReading {
  const { axis, positive } = FACE_AXES[face];
  if (!Number.isInteger(depth) || depth < 1 || depth > dims[axis]) return { fault: "no-such-layer" };
  return checked(dims, { axis, layer: positive ? dims[axis] - depth : depth - 1, turns: turnsFor(amount, positive) });
}

/** The middle layer of an odd side, turned as M, E or S: the move, or why not. An even side has none.
 *
 * @param letter - The slice letter M, E or S; whole-cube turns use x, y or z.
 * @param amount - The turn direction: cw, half or ccw.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns The middle layer of an odd side, turned as M, E or S: the move, or why not. An even side has none.
 *
 * @example
 * ```ts
 * import { cuboidMiddleMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * console.log(cuboidMiddleMove("M", "half", dims));
 * ```
 */
export function cuboidMiddleMove(letter: "M" | "E" | "S", amount: "cw" | "half" | "ccw", dims: CuboidDims): CuboidReading {
  const axis = (letter === "M" ? 0 : letter === "E" ? 1 : 2) as CubeAxis;
  if (dims[axis] % 2 === 0) return { fault: "no-such-layer" };
  return checked(dims, { axis, layer: (dims[axis] - 1) / 2, turns: turnsFor(amount, MIDDLE[axis].followsPositive) });
}

/** One piece of notation read for this cuboid: `R`, `R'`, `R2`, `2R'`, `M2`.
 *
 * @param text - The text to parse or format.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns One piece of notation read for this cuboid: `R`, `R'`, `R2`, `2R'`, `M2`.
 *
 * @example
 * ```ts
 * import { readCuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * console.log(readCuboidMove("U", dims));
 * ```
 */
export function readCuboidMove(text: string, dims: CuboidDims): CuboidReading {
  const found = /^([2-7]?)([RLUDFBMES])(2|'|)$/.exec(text.trim());
  if (found === null) return { fault: "unknown" };
  const amount = found[3] === "2" ? "half" : found[3] === "'" ? "ccw" : "cw";
  const letter = found[2];
  if (letter === "M" || letter === "E" || letter === "S") return found[1] === "" ? cuboidMiddleMove(letter, amount, dims) : { fault: "unknown" };
  return cuboidFaceMove(letter as Letter, found[1] === "" ? 1 : Number(found[1]), amount, dims);
}

/** One piece of notation as a move, or null where it is not one on this cuboid.
 *
 * @param text - The text to parse or format.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns One piece of notation as a move, or null where it is not one on this cuboid.
 *
 * @example
 * ```ts
 * import { parseCuboidMove } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * console.log(parseCuboidMove("R", dims));
 * ```
 */
export function parseCuboidMove(text: string, dims: CuboidDims): CuboidMove | null {
  const read = readCuboidMove(text, dims);
  return "move" in read ? read.move : null;
}

/** A line of notation as moves, or null where any of it is not a move on this cuboid.
 *
 * @param text - The text to parse or format.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns A line of notation as moves, or null where any of it is not a move on this cuboid.
 *
 * @example
 * ```ts
 * import { parseCuboidMoves } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * console.log(parseCuboidMoves("R U2", dims));
 * ```
 */
export function parseCuboidMoves(text: string, dims: CuboidDims): CuboidMove[] | null {
  const read = readCuboidMoves(text, dims);
  return read.ok ? read.moves : null;
}

/** What reading a line gives: its moves, or the first piece that is not one, where it began (counted in characters from 0) and why.
 *
 * @example
 * ```ts
 * import type { CuboidLineReading } from "@johnmorrisdotca/kyuubu/cuboid";
 * import { readCuboidMoves } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const value: CuboidLineReading = readCuboidMoves("R U2", [2, 3, 3]);
 * console.log(value.ok);
 * ```
 */
export type CuboidLineReading = { ok: true; moves: CuboidMove[] } | { ok: false; token: string; at: number; fault: CuboidFault };

/** A line of notation read for this cuboid, saying which piece is wrong and why where one is.
 *
 * @param text - The text to parse or format.
 * @param dims - The cuboid’s x, y and z dimensions, in that order.
 * @returns A line of notation read for this cuboid, saying which piece is wrong and why where one is.
 *
 * @example
 * ```ts
 * import { readCuboidMoves } from "@johnmorrisdotca/kyuubu/cuboid";
 * 
 * const dims = [2, 3, 3] as const;
 * console.log(readCuboidMoves("R U2", dims));
 * ```
 */
export function readCuboidMoves(text: string, dims: CuboidDims): CuboidLineReading {
  const moves: CuboidMove[] = [];
  for (const found of text.matchAll(/\S+/g)) {
    const read = readCuboidMove(found[0], dims);
    if ("fault" in read) return { ok: false, token: found[0], at: found.index, fault: read.fault };
    moves.push(read.move);
  }
  return { ok: true, moves };
}
