import { cubeSolved, solvedCube, undoOf } from "./cube.ts";
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
/** How many turns moving the slider shows one by one: a longer jump goes straight to this many steps short of where it is going, and turns the rest. */
export const REPLAY_SCRUB_TURNS = 6;
/** How long each turn made by moving the slider takes, in milliseconds. */
export const REPLAY_SCRUB_MS = 70;
/** How long each turn of the scramble takes when the replay walks through it, in milliseconds. */
export const REPLAY_SCRAMBLE_STEP_MS = 200;

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
  const scrambleStates = [solvedCube(size)];
  for (const step of scramble.steps) scrambleStates.push(applySolve(scrambleStates[scrambleStates.length - 1], size, [step]));
  const start = scrambleStates[scrambleStates.length - 1];
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
      scrambleStates,
      states,
      solved: cubeSolved(states[count], size),
      stepMs,
      totalMs: stepMs.reduce((sum, ms) => sum + ms, 0),
      pace: given ? "given" : timed ? "spread" : "default",
    },
  };
}

/** The turns that take a cube from one position of a solve to another, for a slider that turns the cube as it moves. */
export type ScrubPath = {
  /** The position the cube is shown at to begin with: where it is, or, for a long jump, `REPLAY_SCRUB_TURNS` steps short of where it is going. */
  from: number;
  /** The turns to make from there, one entry for each step, in the order to make them; going back, each step is undone, the last first. */
  turns: CubeMove[][];
};

/**
 * What moving the slider from one position of a solve to another turns: the
 * steps between, forwards when going on and each one undone, last first, when
 * going back. A jump of more than `shown` steps goes straight to `shown`
 * steps short of the end and turns only those, so that a long drag catches up
 * at once and does not play every turn. `steps` is each step's layers.
 *
 * @example
 * scrubPath(plan.steps.map((step) => step.moves), 10, 7); // the last three steps undone, 9th first
 */
export function scrubPath(steps: readonly (readonly CubeMove[])[], from: number, to: number, shown: number = REPLAY_SCRUB_TURNS): ScrubPath {
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

/** The part of a cube's view a replay needs: `CubeView` is one. */
export type ReplayCube = {
  setState(state: string, size?: number): void;
  turnTogether(moves: readonly CubeMove[], options?: { animate?: boolean; ms?: number }): void;
  /** Whether a turn asked for is still on its way; a cube that does not say is taken to be at rest. */
  readonly busy?: boolean;
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
  private scrambleAt: number;
  private scrubbed: -1 | 0 | 1 = 0;
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
    this.scrambleAt = plan.scramble.length;
    this.cube.setState(plan.start, plan.size);
  }

  /** Where it is and what it is doing. */
  get status(): ReplayStatus {
    const elapsedMs = this.plan.stepMs.slice(0, this.at).reduce((sum, ms) => sum + ms, 0);
    return {
      position: this.at,
      total: this.plan.steps.length,
      playing: this.running,
      ended: this.at >= this.plan.steps.length && this.scrambleAt >= this.plan.scramble.length,
      scrambleAt: this.scrambleAt,
      scrambleTotal: this.plan.scramble.length,
      speed: this.pace,
      loop: this.again,
      elapsedMs,
    };
  }

  private tell(): void {
    this.options.onChange?.(this.status);
  }

  private stop(): void {
    if (this.timer !== null) this.clock.clear(this.timer);
    this.timer = null;
  }

  /** The cube drawn as the replay stands: at the step of the scramble it has gone back to, or at the step of the solve. */
  private show(): void {
    const scrambling = this.scrambleAt < this.plan.scramble.length;
    this.cube.setState(scrambling ? this.plan.scrambleStates[this.scrambleAt] : this.plan.states[this.at], this.plan.size);
  }

  private advance(): void {
    this.timer = null;
    if (!this.running) return;
    // Gone back into the scramble, it is turned on to the end first, and the solve follows.
    if (this.scrambleAt < this.plan.scramble.length) {
      this.cube.turnTogether(this.plan.scramble[this.scrambleAt].moves, { ms: REPLAY_SCRAMBLE_STEP_MS * 0.9 });
      this.scrambleAt += 1;
      this.tell();
      this.timer = this.clock.set(() => this.advance(), REPLAY_SCRAMBLE_STEP_MS);
      return;
    }
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
    this.scrubbed = 0;
    const ms = this.plan.stepMs[this.at] / this.pace;
    this.cube.turnTogether(step.moves, { ms: ms * 0.9 });
    this.at += 1;
    this.tell();
    this.timer = this.clock.set(() => this.advance(), ms);
  }

  /** Run from where it is; from the beginning when it is at the end. */
  play(): void {
    if (this.running) return;
    if (this.scrambleAt >= this.plan.scramble.length && this.at >= this.plan.steps.length) {
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
    this.show();
    this.tell();
  }

  /** Back to the scrambled cube, and wait there: the solve as it was before its first move, until it is played. */
  restart(): void {
    this.running = false;
    this.stop();
    this.seek(0);
  }

  /**
   * One step on, or one back, and stop there. A step on is turned; a step back
   * is shown at once. At the scrambled cube a step back stays there (`seekScramble`
   * goes into the scramble); once gone back into the scramble, steps walk it.
   */
  step(by: 1 | -1): void {
    this.running = false;
    this.stop();
    this.scrubbed = 0;
    const scramble = this.plan.scramble.length;
    if (this.scrambleAt < scramble) {
      const to = Math.max(0, Math.min(scramble, this.scrambleAt + by));
      if (by === 1 && to !== this.scrambleAt) {
        this.cube.setState(this.plan.scrambleStates[this.scrambleAt], this.plan.size);
        this.cube.turnTogether(this.plan.scramble[this.scrambleAt].moves);
      } else this.cube.setState(this.plan.scrambleStates[to], this.plan.size);
      this.scrambleAt = to;
      this.tell();
      return;
    }
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

  /**
   * Straight to the cube as it was after this many steps; it goes on running if
   * it was. With `animate`, the turns between where it was and where it goes are
   * shown, forwards going on and each undone going back (`scrubPath`), so a
   * slider turns the cube the right way as it moves; a jump of many steps
   * catches up at once. A solve gone back into the scramble is not animated.
   */
  seek(position: number, { animate = false }: { animate?: boolean } = {}): void {
    const was = this.running;
    this.stop();
    const from = this.at;
    const scrambling = this.scrambleAt < this.plan.scramble.length;
    this.at = Math.max(0, Math.min(this.plan.steps.length, Math.round(position)));
    this.scrambleAt = this.plan.scramble.length;
    if (animate && !scrambling && this.at !== from) {
      const path = scrubPath(
        this.plan.steps.map((step) => step.moves),
        from,
        this.at,
      );
      const way = this.at > from ? 1 : -1;
      // The cube is shown where it is going to start from when that is not where it stands, or when a turn the other way is still on its way.
      if (path.from !== from || (this.cube.busy === true && this.scrubbed !== way)) this.cube.setState(this.plan.states[path.from], this.plan.size);
      for (const turn of path.turns) this.cube.turnTogether(turn, { ms: REPLAY_SCRUB_MS });
      this.scrubbed = way;
    } else {
      this.scrubbed = 0;
      this.show();
    }
    this.tell();
    if (was) this.advance();
  }

  /** Straight to the cube as it was after this many steps of the scramble, the whole of it being the scrambled cube the solve starts from; it goes on running if it was, on through the rest of the scramble and the solve. */
  seekScramble(position: number): void {
    const was = this.running;
    this.stop();
    this.scrubbed = 0;
    this.scrambleAt = Math.max(0, Math.min(this.plan.scramble.length, Math.round(position)));
    this.at = 0;
    this.show();
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
