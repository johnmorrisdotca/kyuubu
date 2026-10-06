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

/** Why a piece of notation is not a move on this cuboid. */
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

/** A move as a person writes it on this cuboid: `R`, `R'`, `R2`, `2U2`, `M2`. The move should be one the cuboid can make. */
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

/** Moves as a person writes them, a space between each. */
export function cuboidMovesNotation(moves: readonly CuboidMove[], dims: CuboidDims): string {
  return moves.map((move) => cuboidMoveNotation(move, dims)).join(" ");
}

/** What reading one piece of notation gives: the move, or why it is not one. */
export type CuboidReading = { move: CuboidMove } | { fault: CuboidFault };

function checked(dims: CuboidDims, move: CuboidMove): CuboidReading {
  if (move.layer < 0 || move.layer >= dims[move.axis]) return { fault: "no-such-layer" };
  if (dims[move.axis] === 1) return { fault: "whole-puzzle" };
  return legalTurns(dims, move.axis, move.layer).includes(move.turns) ? { move } : { fault: "half-turn-only" };
}

/** A face turned, `depth` layers in from it (1 is the face itself), on this cuboid: the move, or why not. */
export function cuboidFaceMove(face: Letter, depth: number, amount: "cw" | "half" | "ccw", dims: CuboidDims): CuboidReading {
  const { axis, positive } = FACE_AXES[face];
  if (!Number.isInteger(depth) || depth < 1 || depth > dims[axis]) return { fault: "no-such-layer" };
  return checked(dims, { axis, layer: positive ? dims[axis] - depth : depth - 1, turns: turnsFor(amount, positive) });
}

/** The middle layer of an odd side, turned as M, E or S: the move, or why not. An even side has none. */
export function cuboidMiddleMove(letter: "M" | "E" | "S", amount: "cw" | "half" | "ccw", dims: CuboidDims): CuboidReading {
  const axis = (letter === "M" ? 0 : letter === "E" ? 1 : 2) as CubeAxis;
  if (dims[axis] % 2 === 0) return { fault: "no-such-layer" };
  return checked(dims, { axis, layer: (dims[axis] - 1) / 2, turns: turnsFor(amount, MIDDLE[axis].followsPositive) });
}

/** One piece of notation read for this cuboid: `R`, `R'`, `R2`, `2R'`, `M2`. */
export function readCuboidMove(text: string, dims: CuboidDims): CuboidReading {
  const found = /^([2-7]?)([RLUDFBMES])(2|'|)$/.exec(text.trim());
  if (found === null) return { fault: "unknown" };
  const amount = found[3] === "2" ? "half" : found[3] === "'" ? "ccw" : "cw";
  const letter = found[2];
  if (letter === "M" || letter === "E" || letter === "S") return found[1] === "" ? cuboidMiddleMove(letter, amount, dims) : { fault: "unknown" };
  return cuboidFaceMove(letter as Letter, found[1] === "" ? 1 : Number(found[1]), amount, dims);
}

/** One piece of notation as a move, or null where it is not one on this cuboid. */
export function parseCuboidMove(text: string, dims: CuboidDims): CuboidMove | null {
  const read = readCuboidMove(text, dims);
  return "move" in read ? read.move : null;
}

/** A line of notation as moves, or null where any of it is not a move on this cuboid. */
export function parseCuboidMoves(text: string, dims: CuboidDims): CuboidMove[] | null {
  const read = readCuboidMoves(text, dims);
  return read.ok ? read.moves : null;
}

/** What reading a line gives: its moves, or the first piece that is not one, where it began (counted in characters from 0) and why. */
export type CuboidLineReading = { ok: true; moves: CuboidMove[] } | { ok: false; token: string; at: number; fault: CuboidFault };

/** A line of notation read for this cuboid, saying which piece is wrong and why where one is. */
export function readCuboidMoves(text: string, dims: CuboidDims): CuboidLineReading {
  const moves: CuboidMove[] = [];
  for (const found of text.matchAll(/\S+/g)) {
    const read = readCuboidMove(found[0], dims);
    if ("fault" in read) return { ok: false, token: found[0], at: found.index, fault: read.fault };
    moves.push(read.move);
  }
  return { ok: true, moves };
}
