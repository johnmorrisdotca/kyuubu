import { cubeSolved, solvedCube, turnAll } from "./cube.ts";
import type { CubeAxis, CubeMove, CubeTurns } from "./types.ts";

/**
 * The lengths official competitions scramble each size to, near enough: what
 * a "full" scramble means here.
 */
export const FULL_SCRAMBLE_LENGTHS: Readonly<Record<number, number>> = { 2: 11, 3: 25, 4: 40, 5: 60, 6: 80, 7: 100 };

/** How a scramble is made. */
export type ScrambleOptions = {
  /** Turn only the six outer faces, never an inner layer: on a 3×3, no M, E or S. Every layer may turn when left out. */
  faces?: boolean;
};

/**
 * A scramble of `length` turns, each of one layer chosen at random, never two
 * in a row about the same axis, so no turn undoes or joins the one before it
 * and the count is the count. Never leaves the cube solved: a turn is added
 * until it is not.
 *
 * `random` is a number in [0, 1), like `Math.random`; pass a seeded one
 * (`seededRandom`) to get the same scramble from the same seed everywhere.
 * With `faces`, only the six outer faces are turned.
 *
 * @example
 * movesNotation(randomScramble(3, 25, seededRandom("club night")), 3);
 */
export function randomScramble(n: number, length: number, random: () => number = Math.random, options: ScrambleOptions = {}): CubeMove[] {
  const moves: CubeMove[] = [];
  let lastAxis: CubeAxis | null = null;
  while (moves.length < length || cubeSolved(turnAll(solvedCube(n), n, moves), n)) {
    const axis = (lastAxis === null ? Math.floor(random() * 3) : (lastAxis + 1 + Math.floor(random() * 2)) % 3) as CubeAxis;
    const layer = options.faces === true ? (random() < 0.5 ? 0 : n - 1) : Math.floor(random() * n);
    const turns = (1 + Math.floor(random() * 3)) as CubeTurns;
    moves.push({ axis, layer, turns });
    lastAxis = axis;
  }
  return moves;
}
