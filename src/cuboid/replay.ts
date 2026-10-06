import { MAX_REPLAY_STEPS, REPLAY_STEP_MS, type ReplayPlan } from "../replay.ts";
import type { SolveMove } from "../reconstruction.ts";

import { cuboidSolved, isCuboidDims, solvedCuboid, turnCuboid, type CuboidDims, type CuboidMove } from "./model.ts";
import { cuboidMoveNotation, readCuboidMoves, type CuboidFault } from "./notation.ts";

/**
 * A SOLVE ON A CUBOID PLAYED BACK: a scramble and the moves that solved it,
 * read, checked and timed, the way `planReplay` does for a cube, and played by
 * the same `Replay` (`replay.ts`), which asks of a puzzle only that it can be
 * set to a state and turned.
 */

/** A cuboid solve ready to be played: a `ReplayPlan` whose `size` is the longest side, with the puzzle's own `dims`. */
export type CuboidReplayPlan = ReplayPlan & {
  /** The puzzle's width, height and depth. */
  dims: CuboidDims;
};

/** What a cuboid replay is made from. */
export type CuboidReplaySource = {
  /** The puzzle's width, height and depth. */
  dims: CuboidDims;
  /** The scramble, as written. */
  scramble: string;
  /** The solve, as written. */
  solution: string;
  /** How long the solve took, in milliseconds, when that is known. */
  timeMs?: number;
  /** How long each step took, in milliseconds, when that is known; one for every step. */
  stepMs?: readonly number[];
};

/** Why a cuboid replay could not be planned: which text would not read, where and why. */
export type CuboidReplayFault = { part: "dims" | "scramble" | "solution" | "length"; token?: string; at?: number; fault?: CuboidFault };

/**
 * A scramble and a solve read, checked and timed. A solve that does not end on
 * a solved puzzle is still planned, with `solved: false`; only text that
 * cannot be read is refused, with the piece and what is wrong with it.
 */
export function planCuboidReplay(source: CuboidReplaySource): { ok: true; plan: CuboidReplayPlan } | { ok: false; fault: CuboidReplayFault } {
  const dims = source.dims;
  if (!isCuboidDims(dims)) return { ok: false, fault: { part: "dims" } };
  const scramble = readCuboidMoves(source.scramble, dims);
  if (!scramble.ok) return { ok: false, fault: { part: "scramble", token: scramble.token, at: scramble.at, fault: scramble.fault } };
  const solution = readCuboidMoves(source.solution, dims);
  if (!solution.ok) return { ok: false, fault: { part: "solution", token: solution.token, at: solution.at, fault: solution.fault } };
  if (scramble.moves.length > MAX_REPLAY_STEPS || solution.moves.length > MAX_REPLAY_STEPS) return { ok: false, fault: { part: "length" } };
  const scrambleStates = [solvedCuboid(dims)];
  for (const move of scramble.moves) scrambleStates.push(turnCuboid(scrambleStates[scrambleStates.length - 1], dims, move));
  const start = scrambleStates[scrambleStates.length - 1];
  const states = [start];
  for (const move of solution.moves) states.push(turnCuboid(states[states.length - 1], dims, move));
  const count = solution.moves.length;
  const given = source.stepMs !== undefined && source.stepMs.length === count && source.stepMs.every((ms) => Number.isFinite(ms) && ms >= 0);
  const timed = source.timeMs !== undefined && Number.isFinite(source.timeMs) && source.timeMs > 0;
  const stepMs = given ? [...source.stepMs!] : new Array<number>(count).fill(timed && count > 0 ? source.timeMs! / count : REPLAY_STEP_MS);
  const written = (list: readonly CuboidMove[]): SolveMove[] => list.map((move, at) => ({ text: cuboidMoveNotation(move, dims), moves: [move], counts: true, at }));
  return {
    ok: true,
    plan: {
      dims,
      size: Math.max(...dims),
      scramble: written(scramble.moves),
      steps: written(solution.moves),
      start,
      scrambleStates,
      states,
      solved: cuboidSolved(states[count], dims),
      stepMs,
      totalMs: stepMs.reduce((sum, ms) => sum + ms, 0),
      pace: given ? "given" : timed ? "spread" : "default",
    },
  };
}
