import { cubeSolved, solvedCube } from "./cube.ts";
import { applySolve, parseSolve, type NotationFault, type SolveMove } from "./reconstruction.ts";
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

/** How long a step takes when the solve gives no time of its own, in milliseconds. */
export const REPLAY_STEP_MS = 400;
/** The speeds a replay offers: the solve's own pace, half, a quarter and a tenth of it. */
export const REPLAY_SPEEDS = [1, 0.5, 0.25, 0.1] as const;
/** How long a looped replay rests on the solved cube before it begins again, in milliseconds. */
export const REPLAY_LOOP_REST_MS = 1200;
/** The longest solve a replay takes, in steps. */
export const MAX_REPLAY_STEPS = 2000;

/** A solve ready to be played: read, checked and timed. */
export type ReplayPlan = {
  /** The cube's side. */
  size: number;
  /** The scramble's steps. */
  scramble: SolveMove[];
  /** The solve's steps. */
  steps: SolveMove[];
  /** The cube after the scramble: where a replay starts. */
  start: string;
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

/** What a replay is made from. */
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

/** Why a replay could not be planned: which text would not read, and where. */
export type ReplayFault = { part: "size" | "scramble" | "solution" | "length"; fault?: NotationFault };

/**
 * A scramble and a solve read, checked and timed. A solve that does not end
 * on a solved cube is still planned, with `solved: false`, so that it can be
 * shown and said to be unfinished; only text that cannot be read is refused.
 */
export function planReplay(source: ReplaySource): { ok: true; plan: ReplayPlan } | { ok: false; fault: ReplayFault } {
  const size = source.size ?? 3;
  if (!Number.isInteger(size) || size < 2 || size > 7) return { ok: false, fault: { part: "size" } };
  const scramble = parseSolve(source.scramble, size);
  if (!scramble.ok) return { ok: false, fault: { part: "scramble", fault: scramble.fault } };
  const solution = parseSolve(source.solution, size);
  if (!solution.ok) return { ok: false, fault: { part: "solution", fault: solution.fault } };
  if (scramble.steps.length > MAX_REPLAY_STEPS || solution.steps.length > MAX_REPLAY_STEPS) return { ok: false, fault: { part: "length" } };
  const start = applySolve(solvedCube(size), size, scramble.steps);
  const states = [start];
  for (const step of solution.steps) states.push(applySolve(states[states.length - 1], size, [step]));
  const count = solution.steps.length;
  const given = source.stepMs !== undefined && source.stepMs.length === count && source.stepMs.every((ms) => Number.isFinite(ms) && ms >= 0);
  const timed = source.timeMs !== undefined && Number.isFinite(source.timeMs) && source.timeMs > 0;
  const stepMs = given ? [...source.stepMs!] : new Array<number>(count).fill(timed && count > 0 ? source.timeMs! / count : REPLAY_STEP_MS);
  return {
    ok: true,
    plan: {
      size,
      scramble: scramble.steps,
      steps: solution.steps,
      start,
      states,
      solved: cubeSolved(states[count], size),
      stepMs,
      totalMs: stepMs.reduce((sum, ms) => sum + ms, 0),
      pace: given ? "given" : timed ? "spread" : "default",
    },
  };
}

/** The part of a cube's view a replay needs: `CubeView` is one. */
export type ReplayCube = {
  setState(state: string, size?: number): void;
  turnTogether(moves: readonly CubeMove[], options?: { animate?: boolean; ms?: number }): void;
};

/** The clock a replay runs by; the page's own unless a test gives another. */
export type ReplayClock = { set(run: () => void, ms: number): unknown; clear(handle: unknown): void };

/** What a replay tells whoever is showing it. */
export type ReplayStatus = {
  /** How many steps have been made: 0 on the scrambled cube, `total` at the end. */
  position: number;
  /** How many steps the solve has. */
  total: number;
  /** Whether it is running. */
  playing: boolean;
  /** Whether it has reached the end. */
  ended: boolean;
  /** The speed it runs at: 1 is the solve's own pace. */
  speed: number;
  /** Whether it begins again when it ends. */
  loop: boolean;
  /** The time into the solve at its own pace, in milliseconds. */
  elapsedMs: number;
};

/** How a replay is set up. */
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

const pageClock: ReplayClock = { set: (run, ms) => setTimeout(run, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/**
 * A planned solve played on a cube: play, pause, a step either way, anywhere
 * by `seek`, faster or slower, once or over and over.
 *
 * @example
 * const planned = planReplay({ scramble: "R U R' U'", solution: "U R U' R'", timeMs: 2000 });
 * if (planned.ok) new Replay(view, planned.plan).play();
 */
export class Replay {
  readonly plan: ReplayPlan;
  private readonly cube: ReplayCube;
  private readonly clock: ReplayClock;
  private readonly options: ReplayOptions;
  private at = 0;
  private running = false;
  private pace: number;
  private again: boolean;
  private timer: unknown = null;

  constructor(cube: ReplayCube, plan: ReplayPlan, options: ReplayOptions = {}) {
    this.cube = cube;
    this.plan = plan;
    this.options = options;
    this.clock = options.clock ?? pageClock;
    this.pace = options.speed !== undefined && options.speed > 0 ? options.speed : 1;
    this.again = options.loop === true;
    this.cube.setState(plan.start, plan.size);
  }

  /** Where it is and what it is doing. */
  get status(): ReplayStatus {
    const elapsedMs = this.plan.stepMs.slice(0, this.at).reduce((sum, ms) => sum + ms, 0);
    return { position: this.at, total: this.plan.steps.length, playing: this.running, ended: this.at >= this.plan.steps.length, speed: this.pace, loop: this.again, elapsedMs };
  }

  private tell(): void {
    this.options.onChange?.(this.status);
  }

  private stop(): void {
    if (this.timer !== null) this.clock.clear(this.timer);
    this.timer = null;
  }

  private advance(): void {
    this.timer = null;
    if (!this.running) return;
    if (this.at >= this.plan.steps.length) {
      this.options.onEnd?.();
      if (this.again && this.plan.steps.length > 0) {
        this.timer = this.clock.set(() => {
          this.at = 0;
          this.cube.setState(this.plan.start, this.plan.size);
          this.tell();
          this.timer = this.clock.set(() => this.advance(), REPLAY_LOOP_REST_MS / 2);
        }, REPLAY_LOOP_REST_MS);
        return;
      }
      this.running = false;
      this.tell();
      return;
    }
    const step = this.plan.steps[this.at];
    const ms = this.plan.stepMs[this.at] / this.pace;
    this.cube.turnTogether(step.moves, { ms: ms * 0.9 });
    this.at += 1;
    this.tell();
    this.timer = this.clock.set(() => this.advance(), ms);
  }

  /** Run from where it is; from the beginning when it is at the end. */
  play(): void {
    if (this.running) return;
    if (this.at >= this.plan.steps.length) {
      this.at = 0;
      this.cube.setState(this.plan.start, this.plan.size);
    }
    this.running = true;
    this.tell();
    this.advance();
  }

  /** Stop where it is. */
  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.stop();
    this.cube.setState(this.plan.states[this.at], this.plan.size);
    this.tell();
  }

  /** Back to the scrambled cube, and wait there: the solve as it was before its first move, until it is played. */
  restart(): void {
    this.running = false;
    this.stop();
    this.seek(0);
  }

  /** One step on, or one back, and stop there. A step on is turned; a step back is shown at once. */
  step(by: 1 | -1): void {
    this.running = false;
    this.stop();
    const to = Math.max(0, Math.min(this.plan.steps.length, this.at + by));
    if (by === 1 && to !== this.at) {
      this.cube.setState(this.plan.states[this.at], this.plan.size);
      this.cube.turnTogether(this.plan.steps[this.at].moves);
    } else {
      this.cube.setState(this.plan.states[to], this.plan.size);
    }
    this.at = to;
    this.tell();
  }

  /** Straight to the cube as it was after this many steps; it goes on running if it was. */
  seek(position: number): void {
    const was = this.running;
    this.stop();
    this.at = Math.max(0, Math.min(this.plan.steps.length, Math.round(position)));
    this.cube.setState(this.plan.states[this.at], this.plan.size);
    this.tell();
    if (was) this.advance();
  }

  /** Faster or slower from the next step: 1 is the solve's own pace, 0.5 half of it. */
  setSpeed(speed: number): void {
    if (!(speed > 0)) return;
    this.pace = speed;
    this.tell();
  }

  /** Whether it begins again when it ends. */
  setLoop(loop: boolean): void {
    this.again = loop;
    this.tell();
  }

  /** Stop, and leave the cube as it is. */
  destroy(): void {
    this.running = false;
    this.stop();
  }
}
