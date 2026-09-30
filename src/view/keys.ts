import { faceMove, middleMove, wholeMove, type CubeFaceLetter } from "../notation.ts";
import type { CubeMove } from "../types.ts";

/**
 * THE KEYBOARD, in the notation cubers write: R L U D F B turn a face
 * clockwise and Shift turns it back; M E S turn an odd cube's middle layer;
 * x y z turn the whole cube, Shift the other way. A digit first, 2 to 9,
 * reaches that many layers in from the face the next letter names, so on a
 * 4×4 "2" then "R" turns the layer next to R.
 */
/** What a key means: a turn, a depth for the next face letter, or nothing. */
export type KeyReading = { move: CubeMove } | { depth: number } | null;

const FACES = new Set(["R", "L", "U", "D", "F", "B"]);
const MIDDLES = new Set(["M", "E", "S"]);
const WHOLE = new Set(["X", "Y", "Z"]);

/** What a key means on a cube of side `n`, given the depth a digit before it set (1 where none did). */
export function readKey(key: string, shift: boolean, n: number, depth: number): KeyReading {
  if (/^[1-9]$/.test(key)) return { depth: Number(key) };
  // A shifted digit or letter arrives as its capital (or a symbol), so the letter is read by its capital and Shift says the way.
  const letter = key.length === 1 ? key.toUpperCase() : "";
  const amount = shift ? "ccw" : "cw";
  if (FACES.has(letter)) {
    const move = faceMove(letter as CubeFaceLetter, depth, amount, n);
    return move === null ? null : { move };
  }
  if (MIDDLES.has(letter)) {
    const move = middleMove(letter as "M" | "E" | "S", amount, n);
    return move === null ? null : { move };
  }
  if (WHOLE.has(letter)) return { move: wholeMove(letter.toLowerCase() as "x" | "y" | "z", amount) };
  return null;
}
