import { turnCube } from "./cube.ts";
import { faceMove, middleMove, wholeMove, type CubeFaceLetter } from "./notation.ts";
import type { CubeMove } from "./types.ts";

/**
 * A SOLVE AS IT IS WRITTEN DOWN: the notation competitors and the people who
 * reconstruct their solves use, which is wider than the one a key makes.
 *
 * On top of `parseMoves` it reads the outer block ("wide") turns of the World
 * Cube Association's regulations, article 12a: `Rw` is the right face and the
 * layer behind it turned as one, `3Rw` three layers; the lower-case `r` that
 * reconstructions write for the same thing; the rotations `x`, `y`, `z` and
 * their bracketed spelling `[r]`, `[u]`, `[f]`; `R2'`, which is `R2`; and the
 * furniture of a reconstruction: a comment from `//` to the end of its line,
 * commas, and the different apostrophes a web page turns `'` into are
 * skipped; brackets round a trigger are skipped too, and a number after the
 * closing one repeats it, `(U R' U' R)2` being the four turns made twice.
 * `R3` is read as `R'`.
 *
 * A wide turn is one step of several layers, so it is kept as a step and not
 * flattened: a replay turns those layers together, as the hand does.
 */

/** One thing a solver did: a turn, a wide turn or a turn of the whole cube. */
export type SolveMove = {
  /** The step as it is written in standard form: `R`, `Rw'`, `3Uw2`, `x`. */
  text: string;
  /** The layers it turns, each as a move of its own; more than one for a wide turn. */
  moves: CubeMove[];
  /** Whether it counts as a move: a turn of the whole cube does not. */
  counts: boolean;
  /** Where it began in the text it was read from, counted in characters from 0. */
  at: number;
};

/** Why a line of notation could not be read, and where. */
export type NotationFault = {
  /** The piece of text that is not a move on this cube. */
  token: string;
  /** Where it begins, counted in characters from 0. */
  at: number;
  /** Its line, from 1. */
  line: number;
  /** Its place in that line, from 1. */
  column: number;
  /** What is wrong with it: not notation at all, or a layer this cube does not have. */
  reason: "unknown" | "no-such-layer";
};

/** What reading a solve gives: its steps, or the first thing that could not be read. */
export type SolveReading = { ok: true; steps: SolveMove[] } | { ok: false; steps: SolveMove[]; fault: NotationFault };

const BRACKETED: Record<string, "x" | "y" | "z"> = { r: "x", l: "x", u: "y", d: "y", f: "z", b: "z" };
const TOKEN = /^(\d?)([RLUDFB])(w?)(2'|'2|2|3'|3|'|)$|^(\d?)([rludfb])(2'|'2|2|3'|3|'|)$|^([MESxyz])(2'|'2|2|3'|3|'|)$|^\[([rludfb])(2'|'2|2|3'|3|'|)\]$/;

/** One move at the head of a run written with no spaces between: a letter, a `w` and how far, and never a number in front. */
const RUN = /[RLUDFBrludfbMESxyz]w?(?:2'|'2|2|3'|3|'|’)?/y;

function amountOf(suffix: string): "cw" | "half" | "ccw" {
  if (suffix.includes("2")) return "half";
  // R3 is three quarter turns, which is R'; R3' is R.
  return suffix === "'" || suffix === "3" ? "ccw" : "cw";
}
const suffixText = (amount: "cw" | "half" | "ccw") => (amount === "half" ? "2" : amount === "ccw" ? "'" : "");
const other = (amount: "cw" | "half" | "ccw") => (amount === "cw" ? "ccw" : amount === "ccw" ? "cw" : "half");

/** One written step read for a cube of this size, or why it is not one. */
export function parseSolveMove(token: string, n: number): Omit<SolveMove, "at"> | "unknown" | "no-such-layer" {
  const clean = token.replace(/[’‘`´′]/g, "'");
  const found = TOKEN.exec(clean);
  if (found === null) return "unknown";
  if (found[2] !== undefined || found[6] !== undefined) {
    const lower = found[6] !== undefined;
    const face = (lower ? found[6].toUpperCase() : found[2]) as CubeFaceLetter;
    const count = lower ? found[5] : found[1];
    const wide = lower || found[3] === "w";
    const amount = amountOf(lower ? found[7] : found[4]);
    if (!wide) {
      const move = faceMove(face, count === "" ? 1 : Number(count), amount, n);
      return move === null ? "no-such-layer" : { text: `${count}${face}${suffixText(amount)}`, moves: [move], counts: true };
    }
    const depth = count === "" ? 2 : Number(count);
    if (depth < 2 || depth >= n) return "no-such-layer";
    const moves: CubeMove[] = [];
    for (let layer = 1; layer <= depth; layer += 1) moves.push(faceMove(face, layer, amount, n)!);
    return { text: `${depth > 2 ? depth : ""}${face}w${suffixText(amount)}`, moves, counts: true };
  }
  if (found[8] !== undefined) {
    const letter = found[8];
    const amount = amountOf(found[9]);
    if (letter === "x" || letter === "y" || letter === "z") return { text: `${letter}${suffixText(amount)}`, moves: [wholeMove(letter, amount)], counts: false };
    const move = middleMove(letter as "M" | "E" | "S", amount, n);
    return move === null ? "no-such-layer" : { text: `${letter}${suffixText(amount)}`, moves: [move], counts: true };
  }
  const face = found[10];
  const axis = BRACKETED[face];
  // [l], [d] and [b] turn the whole cube the way that face turns, which is the other way from x, y and z.
  const amount = face === "l" || face === "d" || face === "b" ? other(amountOf(found[11])) : amountOf(found[11]);
  return { text: `${axis}${suffixText(amount)}`, moves: [wholeMove(axis, amount)], counts: false };
}

/**
 * A solve, or a scramble, read from the way it is written, for a cube of
 * this size. Everything it could read comes back even when it stops at a
 * fault, so a page can show how far it got.
 *
 * @example
 * parseSolve("x' // inspection\n(R U R' U') Rw2", 3);
 * // → { ok: true, steps: [x', R, U, R', U', Rw2] }
 */
export function parseSolve(text: string, n: number): SolveReading {
  const steps: SolveMove[] = [];
  const groups: number[] = [];
  let line = 1;
  let lineStart = 0;
  let at = 0;
  while (at < text.length) {
    const char = text[at];
    if (char === "\n") {
      line += 1;
      lineStart = at + 1;
      at += 1;
      continue;
    }
    if (text.startsWith("//", at)) {
      const end = text.indexOf("\n", at);
      at = end === -1 ? text.length : end;
      continue;
    }
    if (char === "(") {
      groups.push(steps.length);
      at += 1;
      continue;
    }
    if (char === ")") {
      const from = groups.pop();
      at += 1;
      const times = /^\d+/.exec(text.slice(at));
      if (times !== null) {
        at += times[0].length;
        const group = from === undefined ? [] : steps.slice(from);
        for (let again = 1; again < Math.min(Number(times[0]), 20); again += 1) steps.push(...group);
      }
      continue;
    }
    if (/[\s,.;:·]/.test(char)) {
      at += 1;
      continue;
    }
    let end = at;
    if (char === "[") {
      const close = text.indexOf("]", at);
      end = close === -1 ? text.length : close + 1;
    } else {
      while (end < text.length && !/[\s(),;:·[]/.test(text[end]) && !text.startsWith("//", end)) end += 1;
    }
    const token = text.slice(at, end);
    const read = parseSolveMove(token, n);
    if (typeof read !== "string") {
      steps.push({ ...read, at });
      at = end;
      continue;
    }
    // Older reconstructions run their moves together, "RUR'U'": read it as the moves it is made of, or not at all.
    const run: SolveMove[] = [];
    let inside = 0;
    while (inside < token.length) {
      RUN.lastIndex = inside;
      const piece = RUN.exec(token);
      const one = piece === null ? "unknown" : parseSolveMove(piece[0], n);
      if (piece === null || typeof one === "string") return { ok: false, steps, fault: { token, at, line, column: at - lineStart + 1, reason: typeof one === "string" && piece !== null ? one : read } };
      run.push({ ...one, at: at + inside });
      inside += piece[0].length;
    }
    steps.push(...run);
    at = end;
  }
  return { ok: true, steps };
}

/** Every layer a list of steps turns, in order: what `turnAll` takes. */
export function solveMoves(steps: readonly SolveMove[]): CubeMove[] {
  return steps.flatMap((step) => step.moves);
}

/** A cube after these steps. */
export function applySolve(state: string, n: number, steps: readonly SolveMove[]): string {
  let now = state;
  for (const move of solveMoves(steps)) now = turnCube(now, n, move);
  return now;
}

/** The steps written out in standard form, a space between each. */
export function solveText(steps: readonly SolveMove[]): string {
  return steps.map((step) => step.text).join(" ");
}

/** How many of the steps count as moves: every turn, and no turn of the whole cube. */
export function countSolveMoves(steps: readonly SolveMove[]): number {
  return steps.filter((step) => step.counts).length;
}

/** A solve as a link carries it: its scramble, its moves, and its title where it has one. */
export type SolveLink = { scramble: string; solution: string; title?: string };

/**
 * A solve read out of a link to alg.cubing.net, the page most reconstructions
 * are shared by, so that a person can paste the address and not copy two
 * boxes by hand. In such a link a space is written `_`, a `'` is written `-`
 * and a new line `%0A`; the scramble is its `setup` and the solve its `alg`.
 * Null for anything that is not such a link.
 *
 * @example
 * readSolveLink("https://alg.cubing.net/?setup=R_U&alg=U-_R-_%2F%2F_done");
 * // → { scramble: "R U", solution: "U' R' // done" }
 */
export function readSolveLink(text: string): SolveLink | null {
  const found = /https?:\/\/alg\.cubing\.net\/?\?[^\s"'<>]+/.exec(text);
  if (found === null) return null;
  const part = (name: string): string | undefined => {
    const raw = new RegExp(`[?&]${name}=([^&#]*)`).exec(found[0]);
    if (raw === null) return undefined;
    let plain = raw[1];
    try {
      plain = decodeURIComponent(raw[1]);
    } catch {
      // A link cut short in the copying: read what is there as it stands.
    }
    return plain.replace(/&#(x?)([0-9a-f]+);/gi, (whole, hex: string, digits: string) => String.fromCodePoint(parseInt(digits, hex === "" ? 10 : 16)));
  };
  const moves = (raw: string | undefined) =>
    (raw ?? "")
      .split("\n")
      .map((line) => {
        // Only the moves are in the link's own spelling; a comment's hyphens and underscores are words.
        const cut = line.indexOf("//");
        const head = cut < 0 ? line : line.slice(0, cut);
        const tail = cut < 0 ? "" : line.slice(cut).replace(/_/g, " ");
        return (head.replace(/_/g, " ").replace(/-/g, "'") + tail).trim();
      })
      .join("\n")
      .trim();
  const alg = part("alg");
  const setup = part("setup");
  if (alg === undefined && setup === undefined) return null;
  const title = part("title")?.trim();
  return { scramble: moves(setup), solution: moves(alg), ...(title === undefined || title === "" ? {} : { title }) };
}
