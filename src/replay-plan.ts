import { cubeSolved, solvedCube, undoOf } from "./cube.ts";
import { applySolve, parseSolve } from "./reconstruction.ts";
import type { ReplayFault, ReplayPlan, ReplaySource, ScrubPath } from "./replay-types.ts";
import { MAX_REPLAY_STEPS, REPLAY_SCRUB_TURNS, REPLAY_STEP_MS } from "./replay-types.ts";
import type { CubeMove } from "./types.ts";

/**
 * A scramble and a solve read, checked and timed. A solve that does not end
 * on a solved cube is still planned, with `solved: false`, so that it can be
 * shown and said to be unfinished; only text that cannot be read is refused.
 *
 * @param source - The scramble and solution to plan, or the guide’s explicit moves or solving method.
 * @returns A scramble and a solve read, checked and timed. A solve that does not end on a solved cube is still planned, with `solved: false`, so that it can be shown and said to be unfinished; only text that cannot be read is refused.
 *
 * @example
 * ```ts
 * import { planReplay } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(planReplay({ size: 3, scramble: "R U", solution: "U' R'", timeMs: 1000 }));
 * ```
 */
export function planReplay(source: ReplaySource): { ok: true; plan: ReplayPlan } | { ok: false; fault: ReplayFault } {
  const size = source.size ?? 3;
  if (!Number.isInteger(size) || size < 2 || size > 7) return { ok: false, fault: { part: "size" } };
  const scramble = parseSolve(source.scramble, size);
  if (!scramble.ok) return { ok: false, fault: { part: "scramble", fault: scramble.fault } };
  const solution = parseSolve(source.solution, size);
  if (!solution.ok) return { ok: false, fault: { part: "solution", fault: solution.fault } };
  if (scramble.steps.length > MAX_REPLAY_STEPS || solution.steps.length > MAX_REPLAY_STEPS)
    return { ok: false, fault: { part: "length" } };
  const scrambleStates = [solvedCube(size)];
  for (const step of scramble.steps)
    scrambleStates.push(applySolve(scrambleStates[scrambleStates.length - 1], size, [step]));
  const start = scrambleStates[scrambleStates.length - 1];
  const states = [start];
  for (const step of solution.steps) states.push(applySolve(states[states.length - 1], size, [step]));
  const count = solution.steps.length;
  const given =
    source.stepMs !== undefined &&
    source.stepMs.length === count &&
    source.stepMs.every((ms) => Number.isFinite(ms) && ms >= 0);
  const timed = source.timeMs !== undefined && Number.isFinite(source.timeMs) && source.timeMs > 0;
  const stepMs = given
    ? [...source.stepMs!]
    : new Array<number>(count).fill(timed && count > 0 ? source.timeMs! / count : REPLAY_STEP_MS);
  return {
    ok: true,
    plan: {
      size,
      scramble: scramble.steps,
      steps: solution.steps,
      start,
      scrambleStates,
      states,
      solved: cubeSolved(states[count], size),
      stepMs,
      totalMs: stepMs.reduce((sum, ms) => sum + ms, 0),
      pace: given ? "given" : timed ? "spread" : "default",
    },
  };
}

/**
 * What moving the slider from one position of a solve to another turns: the
 * steps between, forwards when going on and each one undone, last first, when
 * going back. A jump of more than `shown` steps goes straight to `shown`
 * steps short of the end and turns only those, so that a long drag catches up
 * at once and does not play every turn. `steps` is each step's layers.
 *
 * @param steps - The ordered steps of the solve.
 * @param from - The starting step position.
 * @param to - The destination step position.
 * @param shown - The maximum number of turns animated during a scrub.
 * @returns What moving the slider from one position of a solve to another turns: the steps between, forwards when going on and each one undone, last first, when going back. A jump of more than `shown` steps goes straight to `shown` steps short of the end and turns only those, so that a long drag catches up at once and does not play every turn. `steps` is each step's layers.
 *
 * @example
 * ```ts
 * import { parseMoves, parseSolve, scrubPath } from "@johnmorrisdotca/kyuubu";
 *
 * const reading = parseSolve("R U", 3);
 * const steps = reading.steps;
 * const moves = parseMoves("R U2", 3)!;
 * console.log(scrubPath(steps.map((step) => step.moves), 0, 2));
 * ```
 */
export function scrubPath(
  steps: readonly (readonly CubeMove[])[],
  from: number,
  to: number,
  shown: number = REPLAY_SCRUB_TURNS,
): ScrubPath {
  const last = steps.length;
  const here = Math.max(0, Math.min(last, Math.round(from)));
  const there = Math.max(0, Math.min(last, Math.round(to)));
  if (there === here) return { from: here, turns: [] };
  const turns: CubeMove[][] = [];
  if (there > here) {
    const start = Math.max(here, there - shown);
    for (let at = start; at < there; at += 1) turns.push([...steps[at]]);
    return { from: start, turns };
  }
  const start = Math.min(here, there + shown);
  for (let at = start - 1; at >= there; at -= 1) turns.push([...steps[at]].reverse().map(undoOf));
  return { from: start, turns };
}
