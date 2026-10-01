import type { CubeAxis, CubeMove, CubeTurns } from "./types.ts";

/**
 * A CUBE THAT KEEPS TURNING BY ITSELF, at a pace you choose, for a
 * background, a banner or a widget. It turns one random layer, waits, and
 * turns another.
 *
 * It is made to cost nothing nobody can see:
 * - a hidden tab is left alone, and it carries on when the tab comes back;
 * - a device that asks for reduced motion gets a cube that stays still;
 * - it never queues turns up behind one that has not finished.
 */

/** How often it turns, in seconds, by name. */
export const SCRAMBLE_PACES = { fast: 0.5, normal: 1, slow: 4 } as const;

/** One of those names. */
export type ScramblePace = keyof typeof SCRAMBLE_PACES;

/** The shortest wait it allows, in seconds: faster is a blur, and a page that asks for it gets this. */
export const SCRAMBLE_SHORTEST = 0.2;

/** The pace when none is given: one turn a second. */
export const SCRAMBLE_DEFAULT_PACE = SCRAMBLE_PACES.normal;

/** What the loop turns: the cube on the screen has all of it. */
export type Scrambled = {
  readonly size: number;
  readonly busy: boolean;
  turn(move: CubeMove, options?: { animate?: boolean }): void;
};

/** The part of a page the loop listens to: a `Document` is one. */
export type ScramblePage = {
  readonly hidden: boolean;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

/** How it is run. */
export type KeepScramblingOptions = {
  /** Seconds between turns, or a pace's name: one when left out, never under 0.2. */
  pace?: number | ScramblePace;
  /** Turn only the six outer faces, never an inner layer. */
  faces?: boolean;
  /** A number in [0, 1), like `Math.random`; seeded, the same cube turns the same way. */
  random?: () => number;
  /** Start by itself: true when left out. */
  autoplay?: boolean;
  /** The page, to ask whether it is hidden and to hear it change: the browser's own when left out. */
  page?: ScramblePage;
  /** Whether the device asks for reduced motion, which keeps the cube still: read from the browser when left out. */
  reducedMotion?: boolean;
};

/** What a running loop can be told. */
export type KeepScramblingHandle = {
  /** Carry on, or begin. Does nothing while the page is hidden or motion is reduced; it starts when they allow it. */
  start(): void;
  /** Stop turning. The cube stays as it is. */
  stop(): void;
  /** Change how often it turns, at once. */
  setPace(pace: number | ScramblePace): void;
  /** Whether it has been asked to run and nothing is holding it back. */
  readonly running: boolean;
  /** Stop for good and let go of the page. */
  destroy(): void;
};

/** Seconds for a pace given as a number or a name; the default for anything else. */
export function paceSeconds(pace: number | ScramblePace | undefined): number {
  const seconds = typeof pace === "string" ? SCRAMBLE_PACES[pace as ScramblePace] : pace;
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return SCRAMBLE_DEFAULT_PACE;
  return Math.max(SCRAMBLE_SHORTEST, seconds);
}

/** One random layer, a quarter or a half turn either way, never about the axis the last one used, so it never undoes or joins it. */
export function nextTurn(n: number, last: CubeMove | null, random: () => number, faces: boolean): CubeMove {
  const axis = (last === null ? Math.floor(random() * 3) : (last.axis + 1 + Math.floor(random() * 2)) % 3) as CubeAxis;
  const layer = faces ? (random() < 0.5 ? 0 : n - 1) : Math.floor(random() * n);
  return { axis, layer, turns: (1 + Math.floor(random() * 3)) as CubeTurns };
}

/** Whether this device asks for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Keep a cube turning. Starts at once unless `autoplay` is false.
 *
 * @example
 * const loop = keepScrambling(view, { pace: "slow" });
 * loop.stop();
 */
export function keepScrambling(cube: Scrambled, options: KeepScramblingOptions = {}): KeepScramblingHandle {
  const page = options.page ?? (typeof document === "undefined" ? undefined : document);
  const random = options.random ?? Math.random;
  const still = options.reducedMotion ?? prefersReducedMotion();
  let seconds = paceSeconds(options.pace);
  let wanted = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let last: CubeMove | null = null;

  const held = () => still || page?.hidden === true;
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    clear();
    if (!wanted || held()) return;
    timer = setTimeout(tick, seconds * 1000);
  };
  const tick = () => {
    timer = null;
    if (!wanted || held()) return;
    if (!cube.busy) {
      const move = nextTurn(cube.size, last, random, options.faces === true);
      last = move;
      cube.turn(move, { animate: true });
    }
    schedule();
  };
  const onVisibility = () => {
    if (held()) clear();
    else if (wanted && timer === null) schedule();
  };
  page?.addEventListener("visibilitychange", onVisibility);

  const handle: KeepScramblingHandle = {
    start() {
      wanted = true;
      if (timer === null) schedule();
    },
    stop() {
      wanted = false;
      clear();
    },
    setPace(pace) {
      seconds = paceSeconds(pace);
      if (wanted && timer !== null) schedule();
    },
    get running() {
      return wanted && !held();
    },
    destroy() {
      wanted = false;
      clear();
      page?.removeEventListener("visibilitychange", onVisibility);
    },
  };
  if (options.autoplay !== false) handle.start();
  return handle;
}
