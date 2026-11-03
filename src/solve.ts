import { type CubeFace, turnAll } from "./cube.ts";
import type { Cubie, Piece } from "./solve-cubies.ts";
import { faceColours, pieceHome, yellowUp } from "./solve-cubies.ts";
import type { Step } from "./solve-search.ts";
import { cubiesIn, faceTurns, fromEachSide, holding, searchFor, stepOf, topTurns } from "./solve-search.ts";
import type { SolvePart, SolveStage, SolveStep } from "./solve-types.ts";
import { SOLVABLE_SIZES, SOLVE_ALGORITHMS } from "./solve-types.ts";
import type { CubeMove } from "./types.ts";

/** The vocabulary of a solve, kept beside it in solve-types.ts. */
export type { SolveAlgorithm, SolvePart, SolveStage, SolveStep } from "./solve-types.ts";
export { SOLVABLE_SIZES, SOLVE_ALGORITHMS } from "./solve-types.ts";

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
    now = turnAll(
      now,
      n,
      found.path.flatMap((made) => made.moves),
    );
    const done = found.done.map((at) => left[at]);
    placed.push(...done);
    left = left.filter((home) => !done.includes(home));
  }
  return { state: now, steps: out, placed };
}

/** Turns of one layer in a row written as one, and any that come to nothing left out: "U' U2" is "U", "U' U" is nothing.
 *
 * @param moves - The turns, in their execution order.
 * @returns Turns of one layer in a row written as one, and any that come to nothing left out: "U' U2" is "U", "U' U" is nothing.
 *
 * @example
 * ```ts
 * import { joinTurns, movesNotation, parseMove, undoOf } from "@johnmorrisdotca/kyuubu";
 *
 * const move = parseMove("R", 3)!;
 * console.log(movesNotation(joinTurns([move, undoOf(move)]), 3));
 * ```
 */
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
  return {
    stage,
    moves,
    parts: kept,
    algorithms: kept.flatMap((part) => (part.algorithm === undefined ? [] : [part.algorithm])),
  };
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
  return {
    state: turnAll(
      state,
      n,
      found.path.flatMap((step) => step.moves),
    ),
    step: stepFrom(stage, found.path),
  };
}

/**
 * The layer-by-layer solve of a 2×2 or 3×3 in this state, as steps a person
 * can follow, or null for a size the method is not written for. Turning every
 * step's moves in order, from `state`, leaves the cube solved.
 *
 * @param state - The sticker-state string in the package’s face order.
 * @param n - The cube’s side length.
 * @returns The layer-by-layer solve of a 2×2 or 3×3 in this state, as steps a person can follow, or null for a size the method is not written for. Turning every step's moves in order, from `state`, leaves the cube solved.
 *
 * @example
 * ```ts
 * import { parseMove, solveSteps, solvedCube, turnCube } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(solveSteps(turnCube(solvedCube(2), 2, parseMove("R", 2)!), 2)?.map((step) => step.stage));
 * ```
 */
export function solveSteps(state: string, n: number): SolveStep[] | null {
  if (!SOLVABLE_SIZES.includes(n)) return null;
  const steps: SolveStep[] = [];
  const hold = holding(state, n);
  if (hold.length > 0) steps.push({ stage: "hold", moves: hold, parts: [{ moves: hold }], algorithms: [] });
  let now = turnAll(state, n, hold);
  const top = (kind: "edge" | "corner") => cubiesIn(n, "top", kind);
  const bottom = (kind: "edge" | "corner") => cubiesIn(n, "bottom", kind);
  const all = (homes: Cubie[]) => (colours: Record<CubeFace, string>) =>
    homes.map((home) => pieceHome(now, n, colours, home));
  const push = (step: SolveStep | null) => step !== null && steps.push(step);

  let firstLayer: Cubie[];
  if (n === 2) {
    // The corner at the back left of the bottom is already home: the other three bottom corners, a face at a time, never turning the three faces round it.
    const anchor = bottom("corner").filter((cubie) => cubie.centre.every((value) => value < 0));
    const white = oneByOne(
      now,
      n,
      anchor,
      bottom("corner").filter((cubie) => !anchor.includes(cubie)),
      faceTurns(n, ["U", "R", "F"]),
      9,
      "whiteLayer",
    );
    steps.push(...white.steps);
    now = white.state;
    firstLayer = white.placed;
  } else {
    const cross = oneByOne(now, n, [], bottom("edge"), faceTurns(n, ["U", "D", "R", "L", "F", "B"]), 8, "whiteCross");
    steps.push(...cross.steps);
    const corners = oneByOne(
      cross.state,
      n,
      cross.placed,
      bottom("corner"),
      [...topTurns(n), ...fromEachSide(n, "cornerIn")],
      8,
      "whiteCorners",
    );
    steps.push(...corners.steps);
    const middle = oneByOne(
      corners.state,
      n,
      corners.placed,
      cubiesIn(n, "middle", "edge"),
      [...topTurns(n), ...fromEachSide(n, "edgeRight"), ...fromEachSide(n, "edgeLeft")],
      4,
      "middleLayer",
    );
    steps.push(...middle.steps);
    now = middle.state;
    firstLayer = middle.placed;

    const cross2 = allAtOnce(
      now,
      n,
      all(firstLayer),
      (colours) => top("edge").map((home) => yellowUp(now, n, colours, home)),
      [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.yellowCross, "yellowCross", "yellowCross")],
      5,
      "yellowCross",
    );
    push(cross2.step);
    now = cross2.state;
  }

  const face = allAtOnce(
    now,
    n,
    all(firstLayer),
    (colours) => [...top("edge"), ...top("corner")].map((home) => yellowUp(now, n, colours, home)),
    [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.sune, "sune", "sune")],
    7,
    "yellowFace",
  );
  push(face.step);
  now = face.state;

  const yellowEdgesUp = (colours: Record<CubeFace, string>) =>
    top("edge").map((home) => yellowUp(now, n, colours, home));
  const corners = allAtOnce(
    now,
    n,
    (colours) => [...all(firstLayer)(colours), ...yellowEdgesUp(colours)],
    all(top("corner")),
    [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.cornerCycle, "cornerCycle", "cornerCycle")],
    7,
    "yellowCorners",
  );
  push(corners.step);
  now = corners.state;

  if (n === 3) {
    const edges = allAtOnce(
      now,
      n,
      all([...firstLayer, ...top("corner")]),
      all(top("edge")),
      [...topTurns(n), stepOf(n, SOLVE_ALGORITHMS.edgeCycle, "edgeCycle", "edgeCycle")],
      5,
      "yellowEdges",
    );
    push(edges.step);
  }
  return steps;
}
