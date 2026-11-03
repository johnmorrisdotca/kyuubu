import type { CubeMove } from "./types.ts";

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

/** The stages of the method, in the order they are done.
 *
 * @example
 * ```ts
 * import type { SolveStage } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: SolveStage = "whiteCross";
 * console.log(value);
 * ```
 */
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

/** A part of a step: turns to line something up, or one of the method's algorithms.
 *
 * @example
 * ```ts
 * import type { SolvePart } from "@johnmorrisdotca/kyuubu";
 * import { movesNotation, parseMoves } from "@johnmorrisdotca/kyuubu";
 *
 * const value: SolvePart = { moves: parseMoves("R U", 3)! };
 * console.log(movesNotation(value.moves, 3));
 * ```
 */
export type SolvePart = { moves: CubeMove[]; algorithm?: SolveAlgorithm };

/** One step of a solve: its stage, the turns that do it, and the parts they come in.
 *
 * @example
 * ```ts
 * import type { SolveStep } from "@johnmorrisdotca/kyuubu";
 * import { solveSteps, solvedCube } from "@johnmorrisdotca/kyuubu";
 *
 * const value: SolveStep = solveSteps(solvedCube(2), 2)![0]!;
 * console.log(value.stage);
 * ```
 */
export type SolveStep = {
  stage: SolveStage;
  /** The turns, in order, for a cube held as the step before left it, with a turn of a face followed by another of the same face written as one. */
  moves: CubeMove[];
  /** The same turns as they are taught: lining-up turns, and each algorithm whole. */
  parts: SolvePart[];
  /** The algorithms the step turns, in order. */
  algorithms: SolveAlgorithm[];
};

/** The algorithms the method uses, by name. The notation is for white on the bottom.
 *
 * @example
 * ```ts
 * import { SOLVE_ALGORITHMS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(Object.keys(SOLVE_ALGORITHMS).slice(0, 8));
 * ```
 */
export const SOLVE_ALGORITHMS = {
  cornerIn: "R U R' U'",
  edgeRight: "U R U' R' U' F' U F",
  edgeLeft: "U' L' U L U F U' F'",
  yellowCross: "F R U R' U' F'",
  sune: "R U R' U R U2 R'",
  cornerCycle: "R' F R' B2 R F' R' B2 R2",
  edgeCycle: "R U' R U R U R U' R' U' R2",
} as const;
/** The name of one of the method's algorithms: a key of `SOLVE_ALGORITHMS`.
 *
 * @example
 * ```ts
 * import type { SolveAlgorithm } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: SolveAlgorithm = "sune";
 * console.log(value);
 * ```
 */
export type SolveAlgorithm = keyof typeof SOLVE_ALGORITHMS;

/** The sizes the method is written for.
 *
 * @example
 * ```ts
 * import { SOLVABLE_SIZES } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(SOLVABLE_SIZES);
 * ```
 */
export const SOLVABLE_SIZES: readonly number[] = [2, 3];
