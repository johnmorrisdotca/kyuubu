import { type CubeFace, permutationOf, turnAll } from "./cube.ts";
import { parseMoves, wholeMove } from "./notation.ts";
import type { Cubie, Piece } from "./solve-cubies.ts";
import { cubiesOf, faceAt, faceColours, OPPOSITE, WHITE } from "./solve-cubies.ts";
import type { SolveAlgorithm } from "./solve-types.ts";
import { SOLVE_ALGORITHMS } from "./solve-types.ts";
import type { CubeMove } from "./types.ts";

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/** A turn the search may make: one face, or one of the method's algorithms, with where it sends every sticker. */
export type Step = { moves: CubeMove[]; to: Int32Array; group: string; algorithm?: SolveAlgorithm };

function composed(n: number, moves: readonly CubeMove[]): Int32Array {
  const size = 6 * n * n;
  const to = new Int32Array(size);
  for (let at = 0; at < size; at += 1) to[at] = at;
  for (const move of moves) {
    const next = permutationOf(n, move);
    for (let at = 0; at < size; at += 1) to[at] = next[to[at]];
  }
  return to;
}

export function stepOf(n: number, text: string, group: string, algorithm?: SolveAlgorithm): Step {
  const moves = parseMoves(text, n)!;
  return { moves, to: composed(n, moves), group, algorithm };
}

/** The top turned, to line an algorithm up. */
export const topTurns = (n: number) => ["U", "U'", "U2"].map((text) => stepOf(n, text, "U"));

/** Every face turned, for the steps done a face at a time. */
export function faceTurns(n: number, faces: readonly string[]): Step[] {
  return faces.flatMap((face) => ["", "'", "2"].map((amount) => stepOf(n, `${face}${amount}`, face)));
}

/** An algorithm done from each of the four sides, by turning its letters round the cube. */
export function fromEachSide(n: number, algorithm: SolveAlgorithm): Step[] {
  const round = ["F", "R", "B", "L"];
  return [0, 1, 2, 3].map((side) => {
    const text = SOLVE_ALGORITHMS[algorithm].replace(/[FRBL]/g, (letter) => round[(round.indexOf(letter) + side) % 4]);
    return stepOf(n, text, `${algorithm}${side}`, algorithm);
  });
}

/**
 * The fewest steps, up to `most`, that take every piece in `kept` to where it
 * may end and at least one of `wanted` too (every one, when `all`). Returns
 * the steps and the pieces of `wanted` now done, or null where none was found.
 */
export function searchFor(
  kept: Piece[],
  wanted: Piece[],
  steps: Step[],
  most: number,
  all = false,
): { path: Step[]; done: number[] } | null {
  const pieces = [...kept, ...wanted];
  const stickers = pieces.flatMap((piece) => piece.stickers);
  const ends = pieces.map((piece) => piece.stickers.length);
  const positions = Array.from({ length: most + 1 }, () => new Int32Array(stickers.length));
  stickers.forEach((sticker, at) => {
    positions[0][at] = sticker.from;
  });
  const path: Step[] = [];

  const home = (at: Int32Array, piece: number, offset: number) => {
    for (let k = 0; k < ends[piece]; k += 1) if (!stickers[offset + k].allowed.has(at[offset + k])) return false;
    return true;
  };
  const check = (at: Int32Array): number[] | null => {
    let offset = 0;
    for (let piece = 0; piece < kept.length; piece += 1) {
      if (!home(at, piece, offset)) return null;
      offset += ends[piece];
    }
    const done: number[] = [];
    for (let piece = kept.length; piece < pieces.length; piece += 1) {
      if (home(at, piece, offset)) done.push(piece - kept.length);
      else if (all) return null;
      offset += ends[piece];
    }
    return done.length > 0 || wanted.length === 0 ? done : null;
  };

  const dive = (depth: number, limit: number, last: string): number[] | null => {
    if (depth === limit) return check(positions[depth]);
    for (const step of steps) {
      // One turn of a face, then another of the same face, is one turn written twice; a face and then its opposite are kept in one order.
      if (step.group === last && step.algorithm === undefined) continue;
      if (
        step.algorithm === undefined &&
        last.length === 1 &&
        OPPOSITE[step.group as CubeFace] === last &&
        step.group < last
      )
        continue;
      const from = positions[depth];
      const into = positions[depth + 1];
      for (let k = 0; k < from.length; k += 1) into[k] = step.to[from[k]];
      path.push(step);
      const found = dive(depth + 1, limit, step.group);
      if (found !== null) return found;
      path.pop();
    }
    return null;
  };

  for (let limit = 0; limit <= most; limit += 1) {
    const done = dive(0, limit, "");
    if (done !== null) return { path: [...path], done };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* The method                                                          */
/* ------------------------------------------------------------------ */

/** The whole-cube turns, fewest first, that hold the cube as the method starts: white on the bottom. */
export function holding(state: string, n: number): CubeMove[] {
  const turns = (["x", "y", "z"] as const).flatMap((letter) =>
    (["cw", "half", "ccw"] as const).map((amount) => wholeMove(letter, amount)),
  );
  const ready = (held: string) => {
    if (n % 2 === 1) return faceColours(held, n).D === WHITE;
    // A 2×2 is held by a white sticker on the bottom of its back-left corner, which the first layer is built round.
    const anchor = cubiesOf(n).find((cubie) => cubie.centre.every((value) => value < 0))!;
    return anchor.slots.some((slot) => faceAt(n, slot) === "D" && held[slot] === WHITE);
  };
  let frontier: CubeMove[][] = [[]];
  for (let depth = 0; depth <= 3; depth += 1) {
    for (const moves of frontier) if (ready(turnAll(state, n, moves))) return moves;
    frontier = frontier.flatMap((moves) => turns.map((turn) => [...moves, turn]));
  }
  throw new Error("no way to hold the cube with white on the bottom");
}

type Layer = "top" | "middle" | "bottom";

export function cubiesIn(n: number, layer: Layer, kind: "edge" | "corner"): Cubie[] {
  const y = layer === "top" ? n - 1 : layer === "bottom" ? -(n - 1) : 0;
  return cubiesOf(n).filter((cubie) => cubie.centre[1] === y && cubie.slots.length === (kind === "corner" ? 3 : 2));
}
