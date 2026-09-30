import { CUBE_FACE_ORDER, cubeSlots, faceOfNormal, permutationOf, turnAll, type CubeFace } from "./cube.ts";
import { parseMoves, wholeMove } from "./notation.ts";
import type { CubeMove, Vec3 } from "./types.ts";

/**
 * A SOLVE A PERSON CAN FOLLOW: the layer-by-layer method most people learn
 * first, worked out for a given cube, step by step. Every step says what it
 * is for and gives the turns that do it. A 3×3 goes white cross, white
 * corners, middle layer, yellow cross, yellow face, yellow corners, yellow
 * edges. A 2×2 goes white layer, yellow face, yellow corners.
 *
 * Each step is found by a short search. Its turns are the ones a beginner is
 * taught (a face at a time for the cross and the 2×2's first layer, and after
 * that the method's few algorithms, with turns of the top to line them up).
 * So what comes out reads like the method, not like a computer's shortest
 * solve.
 *
 * White goes on the bottom, where the method keeps it. The first step turns
 * the whole cube to put it there, and every turn after that is written for a
 * cube held that way.
 */

/** The stages of the method, in the order they are done. */
export type SolveStage =
  | "hold"
  | "whiteCross"
  | "whiteCorners"
  | "whiteLayer"
  | "middleLayer"
  | "yellowCross"
  | "yellowFace"
  | "yellowCorners"
  | "yellowEdges";

/** A part of a step: turns to line something up, or one of the method's algorithms. */
export type SolvePart = { moves: CubeMove[]; algorithm?: SolveAlgorithm };

/** One step of a solve: its stage, the turns that do it, and the parts they come in. */
export type SolveStep = {
  stage: SolveStage;
  /** The turns, in order, for a cube held as the step before left it, with a turn of a face followed by another of the same face written as one. */
  moves: CubeMove[];
  /** The same turns as they are taught: lining-up turns, and each algorithm whole. */
  parts: SolvePart[];
  /** The algorithms the step turns, in order. */
  algorithms: SolveAlgorithm[];
};

/** The algorithms the method uses, by name. The notation is for white on the bottom. */
export const SOLVE_ALGORITHMS = {
  cornerIn: "R U R' U'",
  edgeRight: "U R U' R' U' F' U F",
  edgeLeft: "U' L' U L U F U' F'",
  yellowCross: "F R U R' U' F'",
  sune: "R U R' U R U2 R'",
  cornerCycle: "R' F R' B2 R F' R' B2 R2",
  edgeCycle: "R U' R U R U R U' R' U' R2",
} as const;
export type SolveAlgorithm = keyof typeof SOLVE_ALGORITHMS;

/** The sizes the method is written for. */
export const SOLVABLE_SIZES: readonly number[] = [2, 3];

/** The colour a person calls white: the up face's letter in a solved cube. */
const WHITE: CubeFace = "U";
const OPPOSITE: Record<CubeFace, CubeFace> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

type Cubie = { centre: Vec3; slots: number[] };

const cubiesBySize = new Map<number, Cubie[]>();

/** The pieces of the cube, each with the sticker slots it carries: corners three, edges two. Centres and a big cube's inner pieces are left out. */
function cubiesOf(n: number): Cubie[] {
  const known = cubiesBySize.get(n);
  if (known !== undefined) return known;
  const byCentre = new Map<string, Cubie>();
  cubeSlots(n).slots.forEach((slot, at) => {
    const key = slot.centre.join(",");
    const cubie = byCentre.get(key) ?? { centre: slot.centre, slots: [] };
    cubie.slots.push(at);
    byCentre.set(key, cubie);
  });
  const made = [...byCentre.values()].filter((cubie) => cubie.slots.length >= 2);
  cubiesBySize.set(n, made);
  return made;
}

const faceAt = (n: number, slot: number): CubeFace => faceOfNormal(cubeSlots(n).slots[slot].normal);

/** The colour each face is solved to, as the cube is now held: its centre on a 3×3; on a 2×2, read off the piece at the back left of the bottom, which the 2×2's first step never moves. */
function faceColours(state: string, n: number): Record<CubeFace, string> {
  if (n % 2 === 1) {
    const middle = (n * n - 1) / 2;
    return Object.fromEntries(CUBE_FACE_ORDER.map((face, at) => [face, state[at * n * n + middle]])) as Record<CubeFace, string>;
  }
  const anchor = cubiesOf(n).find((cubie) => cubie.centre.every((value) => value < 0))!;
  const colours = {} as Record<CubeFace, string>;
  for (const slot of anchor.slots) {
    const face = faceAt(n, slot);
    colours[face] = state[slot];
    colours[OPPOSITE[face]] = OPPOSITE[state[slot] as CubeFace];
  }
  return colours;
}

/**
 * A piece's stickers followed through the search: the slot each is in now,
 * and the slots it may end in. For a piece put in its place, the one slot
 * that is its home. For a yellow sticker that only has to face up, any slot
 * on the top.
 */
type Tracked = { from: number; allowed: Set<number> };
type Piece = { stickers: Tracked[] };

/** Where the piece whose home is `home` is now, and the slot each of its stickers belongs in. */
function pieceHome(state: string, n: number, colours: Record<CubeFace, string>, home: Cubie): Piece {
  const wants = home.slots.map((slot) => colours[faceAt(n, slot)]);
  const key = [...wants].sort().join("");
  const now = cubiesOf(n).find((cubie) => cubie.slots.length === home.slots.length && cubie.slots.map((slot) => state[slot]).sort().join("") === key)!;
  return {
    stickers: now.slots.map((from) => ({ from, allowed: new Set([home.slots[wants.indexOf(state[from])]]) })),
  };
}

/** A piece's yellow sticker, which has only to face up. */
function yellowUp(state: string, n: number, colours: Record<CubeFace, string>, home: Cubie): Piece {
  const top = new Set(cubeSlots(n).slots.flatMap((slot, at) => (faceAt(n, at) === "U" ? [at] : [])));
  const wants = home.slots.map((slot) => colours[faceAt(n, slot)]);
  const key = [...wants].sort().join("");
  const now = cubiesOf(n).find((cubie) => cubie.slots.length === home.slots.length && cubie.slots.map((slot) => state[slot]).sort().join("") === key)!;
  const yellow = now.slots.find((slot) => state[slot] === colours.U)!;
  return { stickers: [{ from: yellow, allowed: top }] };
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/** A turn the search may make: one face, or one of the method's algorithms, with where it sends every sticker. */
type Step = { moves: CubeMove[]; to: Int32Array; group: string; algorithm?: SolveAlgorithm };

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

function stepOf(n: number, text: string, group: string, algorithm?: SolveAlgorithm): Step {
  const moves = parseMoves(text, n)!;
  return { moves, to: composed(n, moves), group, algorithm };
}

/** The top turned, to line an algorithm up. */
const topTurns = (n: number) => ["U", "U'", "U2"].map((text) => stepOf(n, text, "U"));

/** Every face turned, for the steps done a face at a time. */
function faceTurns(n: number, faces: readonly string[]): Step[] {
  return faces.flatMap((face) => ["", "'", "2"].map((amount) => stepOf(n, `${face}${amount}`, face)));
}

/** An algorithm done from each of the four sides, by turning its letters round the cube. */
function fromEachSide(n: number, algorithm: SolveAlgorithm): Step[] {
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
function searchFor(kept: Piece[], wanted: Piece[], steps: Step[], most: number, all = false): { path: Step[]; done: number[] } | null {
  const pieces = [...kept, ...wanted];
  const stickers = pieces.flatMap((piece) => piece.stickers);
  const ends = pieces.map((piece) => piece.stickers.length);
  const positions = Array.from({ length: most + 1 }, () => new Int32Array(stickers.length));
  stickers.forEach((sticker, at) => (positions[0][at] = sticker.from));
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
      if (step.algorithm === undefined && last.length === 1 && OPPOSITE[step.group as CubeFace] === last && step.group < last) continue;
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
function holding(state: string, n: number): CubeMove[] {
  const turns = (["x", "y", "z"] as const).flatMap((letter) => (["cw", "half", "ccw"] as const).map((amount) => wholeMove(letter, amount)));
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

function cubiesIn(n: number, layer: Layer, kind: "edge" | "corner"): Cubie[] {
  const y = layer === "top" ? n - 1 : layer === "bottom" ? -(n - 1) : 0;
  return cubiesOf(n).filter((cubie) => cubie.centre[1] === y && cubie.slots.length === (kind === "corner" ? 3 : 2));
}

/**
 * Puts the pieces of `homes` in place one by one, each by the fewest steps
 * that keep every piece before it, as the method does: whichever is quickest
 * next, so the steps stay short.
 */
function oneByOne(
  state: string,
  n: number,
  kept: Cubie[],
  homes: Cubie[],
  steps: Step[],
  most: number,
  stage: SolveStage,
): { state: string; steps: SolveStep[]; placed: Cubie[] } {
  const out: SolveStep[] = [];
  const placed = [...kept];
  let left = [...homes];
  let now = state;
  while (left.length > 0) {
    const colours = faceColours(now, n);
    const found = searchFor(
      placed.map((home) => pieceHome(now, n, colours, home)),
      left.map((home) => pieceHome(now, n, colours, home)),
      steps,
      most,
    );
    if (found === null) throw new Error(`no ${stage} step found`);
    const step = stepFrom(stage, found.path);
    if (step !== null) out.push(step);
    now = turnAll(now, n, found.path.flatMap((made) => made.moves));
    const done = found.done.map((at) => left[at]);
    placed.push(...done);
    left = left.filter((home) => !done.includes(home));
  }
  return { state: now, steps: out, placed };
}

/** Turns of one layer in a row written as one, and any that come to nothing left out: "U' U2" is "U", "U' U" is nothing. */
export function joinTurns(moves: readonly CubeMove[]): CubeMove[] {
  const out: CubeMove[] = [];
  for (const move of moves) {
    const last = out.at(-1);
    if (last !== undefined && last.axis === move.axis && last.layer === move.layer) {
      const turns = (last.turns + move.turns) % 4;
      out.pop();
      if (turns !== 0) out.push({ ...move, turns: turns as CubeMove["turns"] });
    } else out.push(move);
  }
  return out;
}

/** A step made from the path a search found: its lining-up turns gathered between the algorithms. */
function stepFrom(stage: SolveStage, path: readonly Step[]): SolveStep | null {
  const parts: SolvePart[] = [];
  for (const step of path) {
    const last = parts.at(-1);
    if (step.algorithm !== undefined) parts.push({ moves: step.moves, algorithm: step.algorithm });
    else if (last !== undefined && last.algorithm === undefined) last.moves = joinTurns([...last.moves, ...step.moves]);
    else parts.push({ moves: step.moves });
  }
  const kept = parts.filter((part) => part.moves.length > 0);
  const moves = joinTurns(kept.flatMap((part) => part.moves));
  if (moves.length === 0) return null;
  return { stage, moves, parts: kept, algorithms: kept.flatMap((part) => (part.algorithm === undefined ? [] : [part.algorithm])) };
}

/** One stage done in a single search: every piece in `wanted` to where it may end, keeping `kept`. */
function allAtOnce(
  state: string,
  n: number,
  kept: (colours: Record<CubeFace, string>) => Piece[],
  wanted: (colours: Record<CubeFace, string>) => Piece[],
  steps: Step[],
  most: number,
  stage: SolveStage,
): { state: string; step: SolveStep | null } {
  const colours = faceColours(state, n);
  const found = searchFor(kept(colours), wanted(colours), steps, most, true);
  if (found === null) throw new Error(`no ${stage} step found`);
  return { state: turnAll(state, n, found.path.flatMap((step) => step.moves)), step: stepFrom(stage, found.path) };
}

/**
 * The layer-by-layer solve of a 2×2 or 3×3 in this state, as steps a person
 * can follow, or null for a size the method is not written for. Turning every
 * step's moves in order, from `state`, leaves the cube solved.
 */
export function solveSteps(state: string, n: number): SolveStep[] | null {
  if (!SOLVABLE_SIZES.includes(n)) return null;
  const steps: SolveStep[] = [];
  const hold = holding(state, n);
  if (hold.length > 0) steps.push({ stage: "hold", moves: hold, parts: [{ moves: hold }], algorithms: [] });
  let now = turnAll(state, n, hold);
  const top = (kind: "edge" | "corner") => cubiesIn(n, "top", kind);
  const bottom = (kind: "edge" | "corner") => cubiesIn(n, "bottom", kind);
  const all = (homes: Cubie[]) => (colours: Record<CubeFace, string>) => homes.map((home) => pieceHome(now, n, colours, home));
  const push = (step: SolveStep | null) => step !== null && steps.push(step);

  let firstLayer: Cubie[];
  if (n === 2) {
    // The corner at the back left of the bottom is already home: the other three bottom corners, a face at a time, never turning the three faces round it.
    const anchor = bottom("corner").filter((cubie) => cubie.centre.every((value) => value < 0));
    const white = oneByOne(now, n, anchor, bottom("corner").filter((cubie) => !anchor.includes(cubie)), faceTurns(n, ["U", "R", "F"]), 9, "whiteLayer");
    steps.push(...white.steps);
    now = white.state;
    firstLayer = white.placed;
  } else {
    const cross = oneByOne(now, n, [], bottom("edge"), faceTurns(n, ["U", "D", "R", "L", "F", "B"]), 8, "whiteCross");
    steps.push(...cross.steps);
    const corners = oneByOne(cross.state, n, cross.placed, bottom("corner"), [...topTurns(n), ...fromEachSide(n, "cornerIn")], 8, "whiteCorners");
    steps.push(...corners.steps);
    const middle = oneByOne(corners.state, n, corners.placed, cubiesIn(n, "middle", "edge"), [...topTurns(n), ...fromEachSide(n, "edgeRight"), ...fromEachSide(n, "edgeLeft")], 4, "middleLayer");
    steps.push(...middle.steps);
    now = middle.state;
    firstLayer = middle.placed;

    const cross2 = allAtOnce(now, n, all(firstLayer), (colours) => top("edge").map((home) => yellowUp(now, n, colours, home)), [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.yellowCross, "yellowCross", "yellowCross")], 5, "yellowCross");
    push(cross2.step);
    now = cross2.state;
  }

  const face = allAtOnce(now, n, all(firstLayer), (colours) => [...top("edge"), ...top("corner")].map((home) => yellowUp(now, n, colours, home)), [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.sune, "sune", "sune")], 7, "yellowFace");
  push(face.step);
  now = face.state;

  const yellowEdgesUp = (colours: Record<CubeFace, string>) => top("edge").map((home) => yellowUp(now, n, colours, home));
  const corners = allAtOnce(now, n, (colours) => [...all(firstLayer)(colours), ...yellowEdgesUp(colours)], all(top("corner")), [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.cornerCycle, "cornerCycle", "cornerCycle")], 7, "yellowCorners");
  push(corners.step);
  now = corners.state;

  if (n === 3) {
    const edges = allAtOnce(now, n, all([...firstLayer, ...top("corner")]), all(top("edge")), [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.edgeCycle, "edgeCycle", "edgeCycle")], 5, "yellowEdges");
    push(edges.step);
  }
  return steps;
}
