import { solvedCube, turnAll } from "../src/cube.ts";
import { parseMoves } from "../src/notation.ts";
import { applySolve, parseSolve } from "../src/reconstruction.ts";
import type { ReplayClock, ReplayCube } from "../src/replay.ts";
import type { CubeMove } from "../src/types.ts";

export const steps = (text: string, n = 3) => {
  const read = parseSolve(text, n);
  if (!read.ok) throw new Error(`could not read ${text}: ${JSON.stringify(read.fault)}`);
  return read.steps;
};
export const after = (text: string, n = 3) => applySolve(solvedCube(n), n, steps(text, n));
export const plain = (text: string, n = 3) => turnAll(solvedCube(n), n, parseMoves(text, n)!);

/** A cube that only remembers what it was asked, and a clock a test winds by hand. */
export function rig() {
  const asked: string[] = [];
  const cube: ReplayCube = {
    setState: (state) => asked.push(`set:${state.slice(0, 9)}`),
    turnTogether: (moves: readonly CubeMove[], options) =>
      asked.push(`turn:${moves.length}:${options?.ms === undefined ? "own" : Math.round(options.ms)}`),
  };
  let now = 0;
  let next = 1;
  const waiting = new Map<number, { at: number; run: () => void }>();
  const clock: ReplayClock = {
    set: (run, ms) => {
      waiting.set(next, { at: now + ms, run });
      return next++;
    },
    clear: (handle) => void waiting.delete(handle as number),
  };
  const wind = (ms: number) => {
    const until = now + ms;
    for (;;) {
      const due = [...waiting.entries()].filter(([, job]) => job.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (due === undefined) break;
      waiting.delete(due[0]);
      now = due[1].at;
      due[1].run();
    }
    now = until;
  };
  return { asked, cube, clock, wind };
}
