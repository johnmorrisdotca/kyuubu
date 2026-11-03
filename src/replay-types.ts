import type { NotationFault, SolveMove } from "./reconstruction.ts";
import type { CubeMove } from "./types.ts";

/**
 * A SOLVE PLAYED BACK: a scramble and the moves that solved it, shown on a
 * cube at the pace they were made.
 *
 * A reconstruction almost never says when each move was made, only how long
 * the whole solve took, so the moves are spread evenly across that time: a
 * solve of 3.13 seconds takes 3.13 seconds here, which is the honest part,
 * and each move is given the same share of it, which is an approximation and
 * is said to be one wherever this is shown. Times for each step can be given
 * where they are known (`stepMs`).
 */

/** How long a step takes when the solve gives no time of its own, in milliseconds.
 *
 * @example
 * ```ts
 * import { REPLAY_STEP_MS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(REPLAY_STEP_MS);
 * ```
 */
export const REPLAY_STEP_MS = 400;
/** The speeds a replay offers: the solve's own pace, half, a quarter and a tenth of it.
 *
 * @example
 * ```ts
 * import { REPLAY_SPEEDS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(REPLAY_SPEEDS);
 * ```
 */
export const REPLAY_SPEEDS = [1, 0.5, 0.25, 0.1] as const;
/** How long a looped replay rests on the solved cube before it begins again, in milliseconds.
 *
 * @example
 * ```ts
 * import { REPLAY_LOOP_REST_MS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(REPLAY_LOOP_REST_MS);
 * ```
 */
export const REPLAY_LOOP_REST_MS = 1200;
/** The longest solve a replay takes, in steps.
 *
 * @example
 * ```ts
 * import { MAX_REPLAY_STEPS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(MAX_REPLAY_STEPS);
 * ```
 */
export const MAX_REPLAY_STEPS = 2000;
/** How many turns moving the slider shows one by one: a longer jump goes straight to this many steps short of where it is going, and turns the rest.
 *
 * @example
 * ```ts
 * import { REPLAY_SCRUB_TURNS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(REPLAY_SCRUB_TURNS);
 * ```
 */
export const REPLAY_SCRUB_TURNS = 6;
/** How long each turn made by moving the slider takes, in milliseconds.
 *
 * @example
 * ```ts
 * import { REPLAY_SCRUB_MS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(REPLAY_SCRUB_MS);
 * ```
 */
export const REPLAY_SCRUB_MS = 70;
/** How long each turn of the scramble takes when the replay walks through it, in milliseconds.
 *
 * @example
 * ```ts
 * import { REPLAY_SCRAMBLE_STEP_MS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(REPLAY_SCRAMBLE_STEP_MS);
 * ```
 */
export const REPLAY_SCRAMBLE_STEP_MS = 200;

/** A solve ready to be played: read, checked and timed.
 *
 * @example
 * ```ts
 * import type { ReplayPlan } from "@johnmorrisdotca/kyuubu";
 * import { planReplay } from "@johnmorrisdotca/kyuubu";
 *
 * function requirePlan() {
 *   const result = planReplay({ scramble: "R", solution: "R'" });
 *   if (!result.ok) throw new Error("Invalid replay");
 *   return result.plan;
 * }
 *
 * const value: ReplayPlan = requirePlan();
 * console.log(value.solved);
 * ```
 */
export type ReplayPlan = {
  /** The cube's side. */
  size: number;
  /** The scramble's steps. */
  scramble: SolveMove[];
  /** The solve's steps. */
  steps: SolveMove[];
  /** The cube after the scramble: where a replay starts. */
  start: string;
  /** The cube after every step of the scramble, `scrambleStates[k]` being the cube after `k` of them: `scrambleStates[0]` is the solved cube and the last is `start`. */
  scrambleStates: string[];
  /** The cube after every step, `states[k]` being the cube after `k` steps; `states[0]` is `start`. */
  states: string[];
  /** Whether the last of them is a solved cube, whichever way up. */
  solved: boolean;
  /** How long each step takes at the solve's own pace, in milliseconds. */
  stepMs: number[];
  /** The whole time at the solve's own pace, in milliseconds. */
  totalMs: number;
  /** Whether the pace is the solve's own recorded time spread evenly, a time given for each step, or only a steady default. */
  pace: "spread" | "given" | "default";
};

/** What a replay is made from.
 *
 * @example
 * ```ts
 * import type { ReplaySource } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: ReplaySource = { size: 3, scramble: "R", solution: "R'", timeMs: 1000 };
 * console.log(value.timeMs);
 * ```
 */
export type ReplaySource = {
  /** The cube's side: 3 when left out. */
  size?: number;
  /** The scramble, as written. */
  scramble: string;
  /** The solve, as written; comments and brackets are skipped. */
  solution: string;
  /** How long the solve took, in milliseconds, when that is known. */
  timeMs?: number;
  /** How long each step of the solution took, in milliseconds, when that is known; one for every step. */
  stepMs?: readonly number[];
};

/** Why a replay could not be planned: which text would not read, and where.
 *
 * @example
 * ```ts
 * import type { ReplayFault } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: ReplayFault = { part: "solution", fault: { token: "oops", at: 0, line: 1, column: 1, reason: "unknown" } };
 * console.log(value.part);
 * ```
 */
export type ReplayFault = { part: "size" | "scramble" | "solution" | "length"; fault?: NotationFault };

/** The turns that take a cube from one position of a solve to another, for a slider that turns the cube as it moves.
 *
 * @example
 * ```ts
 * import type { ScrubPath } from "@johnmorrisdotca/kyuubu";
 * import { parseSolve, scrubPath } from "@johnmorrisdotca/kyuubu";
 *
 * const value: ScrubPath = scrubPath(parseSolve("R U", 3).steps.map((step) => step.moves), 0, 2);
 * console.log(value.turns.length);
 * ```
 */
export type ScrubPath = {
  /** The position the cube is shown at to begin with: where it is, or, for a long jump, `REPLAY_SCRUB_TURNS` steps short of where it is going. */
  from: number;
  /** The turns to make from there, one entry for each step, in the order to make them; going back, each step is undone, the last first. */
  turns: CubeMove[][];
};

/** The part of a cube's view a replay needs: `CubeView` is one.
 *
 * @example
 * ```ts
 * import type { ReplayCube } from "@johnmorrisdotca/kyuubu";
 * import { movesNotation } from "@johnmorrisdotca/kyuubu";
 *
 * const value: ReplayCube = { setState: (state) => console.log(state), turnTogether: (moves) => console.log(movesNotation(moves, 3)) };
 * console.log(typeof value.turnTogether);
 * ```
 */
export type ReplayCube = {
  setState(state: string, size?: number): void;
  turnTogether(moves: readonly CubeMove[], options?: { animate?: boolean; ms?: number }): void;
  /** Whether a turn asked for is still on its way; a cube that does not say is taken to be at rest. */
  readonly busy?: boolean;
};

/** The clock a replay runs by; the page's own unless a test gives another.
 *
 * @example
 * ```ts
 * import type { ReplayClock } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: ReplayClock = { set: (run, ms) => setTimeout(run, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };
 * console.log(typeof value.set);
 * ```
 */
export type ReplayClock = { set(run: () => void, ms: number): unknown; clear(handle: unknown): void };

/** What a replay tells whoever is showing it.
 *
 * @example
 * ```ts
 * import type { ReplayStatus } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: ReplayStatus = { position: 0, total: 2, playing: false, ended: false, scrambleAt: 1, scrambleTotal: 1, speed: 1, loop: false, elapsedMs: 0 };
 * console.log(value.position);
 * ```
 */
export type ReplayStatus = {
  /** How many steps have been made: 0 on the scrambled cube, `total` at the end. */
  position: number;
  /** How many steps the solve has. */
  total: number;
  /** Whether it is running. */
  playing: boolean;
  /** Whether it has reached the end. */
  ended: boolean;
  /** How many steps of the scramble have been made: all of them (`scrambleTotal`) unless the viewer has gone back into it. */
  scrambleAt: number;
  /** How many steps the scramble has. */
  scrambleTotal: number;
  /** The speed it runs at: 1 is the solve's own pace. */
  speed: number;
  /** Whether it begins again when it ends. */
  loop: boolean;
  /** The time into the solve at its own pace, in milliseconds. */
  elapsedMs: number;
};

/** How a replay is set up.
 *
 * @example
 * ```ts
 * import type { ReplayOptions } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: ReplayOptions = { speed: 2, loop: false, onEnd: () => console.log("Finished") };
 * console.log(value.speed);
 * ```
 */
export type ReplayOptions = {
  /** The speed it starts at: 1, the solve's own pace, when left out. */
  speed?: number;
  /** Whether it begins again when it ends. */
  loop?: boolean;
  /** Called whenever anything in `status` changes. */
  onChange?: (status: ReplayStatus) => void;
  /** Called once each time the end is reached. */
  onEnd?: () => void;
  /** The clock to run by. */
  clock?: ReplayClock;
};
