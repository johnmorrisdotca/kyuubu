import { undoOf } from "./cube.ts";
import { scrubPath } from "./replay-plan.ts";
import type { ReplayClock, ReplayCube, ReplayOptions, ReplayPlan, ReplayStatus } from "./replay-types.ts";
import { REPLAY_LOOP_REST_MS, REPLAY_SCRAMBLE_STEP_MS, REPLAY_SCRUB_MS } from "./replay-types.ts";

export { planReplay, scrubPath } from "./replay-plan.ts";
export type {
  ReplayClock,
  ReplayCube,
  ReplayFault,
  ReplayOptions,
  ReplayPlan,
  ReplaySource,
  ReplayStatus,
  ScrubPath,
} from "./replay-types.ts";
export {
  MAX_REPLAY_STEPS,
  REPLAY_LOOP_REST_MS,
  REPLAY_SCRAMBLE_STEP_MS,
  REPLAY_SCRUB_MS,
  REPLAY_SCRUB_TURNS,
  REPLAY_SPEEDS,
  REPLAY_STEP_MS,
} from "./replay-types.ts";

const pageClock: ReplayClock = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * A planned solve played on a cube: play, pause, a step either way, anywhere
 * by `seek`, faster or slower, once or over and over.
 *
 *
 * @example
 * ```ts
 * import { Replay, cubeSolved, planReplay, turnAll } from "@johnmorrisdotca/kyuubu";
 *
 * const result = planReplay({ scramble: "R", solution: "R'" });
 * if (result.ok) {
 *   let state = result.plan.start;
 *   const replay = new Replay({ setState: (next) => { state = next; }, turnTogether: (moves) => { state = turnAll(state, 3, moves); } }, result.plan);
 *   replay.seek(result.plan.steps.length);
 *   console.log(cubeSolved(state, 3));
 *   replay.destroy();
 * }
 * ```
 * @param cube - The host’s cube state and turning interface.
 * @param plan - The validated replay plan.
 * @param options - View or replay options.
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
    this.cube.setState(
      scrambling ? this.plan.scrambleStates[this.scrambleAt] : this.plan.states[this.at],
      this.plan.size,
    );
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
   * One step on, or one back, and stop there. A step on is turned, and a step
   * back is turned the other way, each as long as the other: the cube shows
   * the move being made and taken back, never a jump. At the scrambled cube a
   * step back stays there (`seekScramble` goes into the scramble); once gone
   * back into the scramble, steps walk it.
   */
  step(by: 1 | -1): void {
    this.running = false;
    this.stop();
    this.scrubbed = 0;
    const scramble = this.plan.scramble.length;
    if (this.scrambleAt < scramble) {
      const to = Math.max(0, Math.min(scramble, this.scrambleAt + by));
      if (to !== this.scrambleAt) {
        const made = by === 1 ? this.plan.scramble[this.scrambleAt] : this.plan.scramble[to];
        this.cube.setState(this.plan.scrambleStates[this.scrambleAt], this.plan.size);
        this.cube.turnTogether(by === 1 ? made.moves : made.moves.map(undoOf));
      } else this.cube.setState(this.plan.scrambleStates[to], this.plan.size);
      this.scrambleAt = to;
      this.tell();
      return;
    }
    const to = Math.max(0, Math.min(this.plan.steps.length, this.at + by));
    if (to !== this.at) {
      const made = by === 1 ? this.plan.steps[this.at] : this.plan.steps[to];
      this.cube.setState(this.plan.states[this.at], this.plan.size);
      this.cube.turnTogether(by === 1 ? made.moves : made.moves.map(undoOf));
    } else {
      this.cube.setState(this.plan.states[to], this.plan.size);
    }
    this.at = to;
    this.tell();
  }

  /**
   * One move on or back along the scramble and the solve together, turned: `step`, except that a step back from
   * the scrambled cube turns the scramble's last move undone, so that Back can go on into the scramble.
   */
  walk(by: 1 | -1): void {
    const scramble = this.plan.scramble.length;
    if (by === -1 && scramble > 0 && this.scrambleAt >= scramble && this.at === 0) {
      this.running = false;
      this.stop();
      this.scrubbed = 0;
      this.scrambleAt = scramble - 1;
      this.cube.setState(this.plan.scrambleStates[scramble], this.plan.size);
      this.cube.turnTogether(this.plan.scramble[scramble - 1].moves.map(undoOf));
      this.tell();
      return;
    }
    this.step(by);
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
      if (path.from !== from || (this.cube.busy === true && this.scrubbed !== way))
        this.cube.setState(this.plan.states[path.from], this.plan.size);
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
