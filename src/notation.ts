import type { CubeAxis, CubeMove, CubeTurns } from "./types.ts";

/**
 * THE STANDARD NOTATION, for reading a move out to a person and for the keys
 * that make one: R, L, U, D, F and B turn a face clockwise as that face is
 * seen; a ' after is anticlockwise and a 2 is a half turn. M, E and S turn the
 * middle layer of an odd cube the way L, D and F do; 2R is the layer next in
 * from R on a bigger cube, 3R the one after. x, y and z turn the whole cube
 * the way R, U and F do.
 *
 * Inside the cube a turn is counted by the right-hand rule on its axis
 * (`types.ts`); a face on the positive side turned clockwise is three of
 * those, one on the negative side is one.
 */

export type CubeFaceLetter = "R" | "L" | "U" | "D" | "F" | "B";

const FACE_AXES: Record<CubeFaceLetter, { axis: CubeAxis; positive: boolean }> = {
  R: { axis: 0, positive: true },
  L: { axis: 0, positive: false },
  U: { axis: 1, positive: true },
  D: { axis: 1, positive: false },
  F: { axis: 2, positive: true },
  B: { axis: 2, positive: false },
};

/** Which way a layer is read: the face whose clockwise it follows. */
const POSITIVE_FACE: Record<CubeAxis, CubeFaceLetter> = { 0: "R", 1: "U", 2: "F" };
const NEGATIVE_FACE: Record<CubeAxis, CubeFaceLetter> = { 0: "L", 1: "D", 2: "B" };
const MIDDLE: Record<CubeAxis, { letter: string; followsPositive: boolean }> = {
  0: { letter: "M", followsPositive: false },
  1: { letter: "E", followsPositive: false },
  2: { letter: "S", followsPositive: true },
};
const WHOLE: Record<CubeAxis, string> = { 0: "x", 1: "y", 2: "z" };

/** Clockwise, half, anticlockwise, as quarter turns by the right-hand rule, for a layer read from its positive or negative side. */
function turnsFor(amount: "cw" | "half" | "ccw", positive: boolean): CubeTurns {
  if (amount === "half") return 2;
  const clockwise = positive ? 3 : 1;
  return (amount === "cw" ? clockwise : 4 - clockwise) as CubeTurns;
}

function suffixOf(turns: CubeTurns, positive: boolean): string {
  if (turns === 2) return "2";
  return turns === turnsFor("cw", positive) ? "" : "'";
}

/** A move as a person writes it, for a cube of this size. */
export function moveNotation(move: CubeMove, n: number): string {
  if (move.layer === "all") return `${WHOLE[move.axis]}${suffixOf(move.turns, true)}`;
  const layer = move.layer;
  if (n % 2 === 1 && n > 1 && layer === (n - 1) / 2) {
    const middle = MIDDLE[move.axis];
    return `${middle.letter}${suffixOf(move.turns, middle.followsPositive)}`;
  }
  const positive = layer > (n - 1) / 2;
  const depth = positive ? n - layer : layer + 1;
  const face = positive ? POSITIVE_FACE[move.axis] : NEGATIVE_FACE[move.axis];
  return `${depth > 1 ? depth : ""}${face}${suffixOf(move.turns, positive)}`;
}

/** Moves as a person writes them, a space between each. */
export function movesNotation(moves: readonly CubeMove[], n: number): string {
  return moves.map((move) => moveNotation(move, n)).join(" ");
}

/** A face turned, `depth` layers in from it (1 is the face itself), on a cube of this size; null where the cube has no such layer. */
export function faceMove(face: CubeFaceLetter, depth: number, amount: "cw" | "half" | "ccw", n: number): CubeMove | null {
  if (!Number.isInteger(depth) || depth < 1 || depth > n) return null;
  const { axis, positive } = FACE_AXES[face];
  return { axis, layer: positive ? n - depth : depth - 1, turns: turnsFor(amount, positive) };
}

/** The middle layer of an odd cube, turned as M, E or S; null on an even cube, which has none. */
export function middleMove(letter: "M" | "E" | "S", amount: "cw" | "half" | "ccw", n: number): CubeMove | null {
  if (n % 2 === 0) return null;
  const axis = (letter === "M" ? 0 : letter === "E" ? 1 : 2) as CubeAxis;
  return { axis, layer: (n - 1) / 2, turns: turnsFor(amount, MIDDLE[axis].followsPositive) };
}

/** The whole cube turned in the hand, as x, y or z. */
export function wholeMove(letter: "x" | "y" | "z", amount: "cw" | "half" | "ccw"): CubeMove {
  const axis = (letter === "x" ? 0 : letter === "y" ? 1 : 2) as CubeAxis;
  return { axis, layer: "all", turns: turnsFor(amount, true) };
}

/**
 * One move read back from the notation, for a cube of this size, or null
 * where it is not one: `R`, `R'`, `R2`, `2R'`, `M2`, `x'`.
 */
export function parseMove(text: string, n: number): CubeMove | null {
  const found = /^([2-9]?)([RLUDFBMESxyz])(2|'|)$/.exec(text.trim());
  if (found === null) return null;
  const amount = found[3] === "2" ? "half" : found[3] === "'" ? "ccw" : "cw";
  const letter = found[2];
  if (letter === "x" || letter === "y" || letter === "z") return found[1] === "" ? wholeMove(letter, amount) : null;
  if (letter === "M" || letter === "E" || letter === "S") return found[1] === "" ? middleMove(letter, amount, n) : null;
  return faceMove(letter as CubeFaceLetter, found[1] === "" ? 1 : Number(found[1]), amount, n);
}

/** A line of notation read back, or null where any of it is not a move on this cube. */
export function parseMoves(text: string, n: number): CubeMove[] | null {
  const parts = text.trim().split(/\s+/).filter((part) => part.length > 0);
  const moves = parts.map((part) => parseMove(part, n));
  return moves.every((move) => move !== null) ? (moves as CubeMove[]) : null;
}
