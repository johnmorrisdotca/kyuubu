import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CUBE_SCALE_PX, CUBE_SCALES, SCRAMBLE_PACES, SCRAMBLE_SHORTEST, cubeWidthPx, isCubeScale, keepScrambling, nextTurn, paceSeconds, seededRandom, type CubeMove } from "../src/index.ts";

/** A page that can be hidden and shown, and says so to whoever listens. */
function fakePage() {
  const listeners = new Set<() => void>();
  return {
    hidden: false,
    addEventListener: (_: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => void listeners.delete(listener),
    change(hidden: boolean) {
      this.hidden = hidden;
      for (const listener of [...listeners]) listener();
    },
    count: () => listeners.size,
  };
}

function fakeCube(size = 3) {
  const turns: CubeMove[] = [];
  return { size, busy: false, turns, turn: (move: CubeMove) => void turns.push(move) };
}

describe("a cube's scale", () => {
  it("has three, the same names as the cards' sizes, each wider than the one before", () => {
    expect(CUBE_SCALES).toEqual(["small", "medium", "large"]);
    expect(CUBE_SCALE_PX.small).toBeLessThan(CUBE_SCALE_PX.medium);
    expect(CUBE_SCALE_PX.medium).toBeLessThan(CUBE_SCALE_PX.large);
  });

  it("is a width in pixels, and a width given wins over the scale", () => {
    expect(cubeWidthPx("small")).toBe(CUBE_SCALE_PX.small);
    expect(cubeWidthPx("large", 100)).toBe(100);
    expect(cubeWidthPx(undefined, 120.4)).toBe(120);
    expect(cubeWidthPx()).toBeNull();
    expect(cubeWidthPx("medium", -5)).toBe(CUBE_SCALE_PX.medium);
    expect(cubeWidthPx(undefined, Number.NaN)).toBeNull();
  });

  it("knows a scale from anything else", () => {
    expect(isCubeScale("small")).toBe(true);
    expect(isCubeScale("huge")).toBe(false);
    expect(isCubeScale(3)).toBe(false);
  });
});

describe("a pace", () => {
  it("is seconds, or a name, and never faster than the shortest wait", () => {
    expect(paceSeconds("fast")).toBe(SCRAMBLE_PACES.fast);
    expect(paceSeconds("slow")).toBe(4);
    expect(paceSeconds(2)).toBe(2);
    expect(paceSeconds(0.01)).toBe(SCRAMBLE_SHORTEST);
    expect(paceSeconds(undefined)).toBe(1);
    expect(paceSeconds(-1)).toBe(1);
    expect(paceSeconds(Number.NaN)).toBe(1);
  });
});

describe("the next turn", () => {
  it("is about another axis than the last, on a layer the cube has, and never undoes it", () => {
    const random = seededRandom("turns");
    let last: CubeMove | null = null;
    for (let at = 0; at < 300; at++) {
      const move = nextTurn(4, last, random, false);
      expect(move.layer).toBeGreaterThanOrEqual(0);
      expect(move.layer).toBeLessThan(4);
      if (last !== null) expect(move.axis).not.toBe(last.axis);
      last = move;
    }
  });

  it("turns only outer faces when asked", () => {
    const random = seededRandom("faces");
    for (let at = 0; at < 100; at++) expect([0, 4]).toContain(nextTurn(5, null, random, true).layer);
  });
});

describe("a cube that keeps turning", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("turns once each pace and not before", () => {
    const cube = fakeCube();
    keepScrambling(cube, { pace: 1, page: fakePage(), reducedMotion: false });
    vi.advanceTimersByTime(999);
    expect(cube.turns).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(cube.turns).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(cube.turns).toHaveLength(4);
  });

  it("goes faster, and slower, by the name of a pace, and a slow one is slow", () => {
    const fast = fakeCube();
    const slow = fakeCube();
    keepScrambling(fast, { pace: "fast", page: fakePage(), reducedMotion: false });
    keepScrambling(slow, { pace: "slow", page: fakePage(), reducedMotion: false });
    vi.advanceTimersByTime(4000);
    expect(fast.turns).toHaveLength(8);
    expect(slow.turns).toHaveLength(1);
  });

  it("stops on request, starts again, and changes pace at once", () => {
    const cube = fakeCube();
    const loop = keepScrambling(cube, { pace: 1, page: fakePage(), reducedMotion: false });
    vi.advanceTimersByTime(2000);
    loop.stop();
    expect(loop.running).toBe(false);
    vi.advanceTimersByTime(10000);
    expect(cube.turns).toHaveLength(2);
    loop.start();
    loop.setPace(0.5);
    vi.advanceTimersByTime(1000);
    expect(cube.turns).toHaveLength(4);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("does not start by itself when told not to", () => {
    const cube = fakeCube();
    const loop = keepScrambling(cube, { autoplay: false, page: fakePage(), reducedMotion: false });
    vi.advanceTimersByTime(5000);
    expect(cube.turns).toHaveLength(0);
    loop.start();
    vi.advanceTimersByTime(1000);
    expect(cube.turns).toHaveLength(1);
  });

  it("does nothing on a hidden tab, schedules nothing, and carries on when it comes back", () => {
    const cube = fakeCube();
    const page = fakePage();
    const loop = keepScrambling(cube, { pace: 1, page, reducedMotion: false });
    vi.advanceTimersByTime(1000);
    page.change(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(loop.running).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(cube.turns).toHaveLength(1);
    page.change(false);
    expect(loop.running).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(cube.turns).toHaveLength(2);
  });

  it("begun on a hidden tab, waits for the tab", () => {
    const cube = fakeCube();
    const page = fakePage();
    page.hidden = true;
    keepScrambling(cube, { pace: 1, page, reducedMotion: false });
    vi.advanceTimersByTime(5000);
    expect(cube.turns).toHaveLength(0);
    page.change(false);
    vi.advanceTimersByTime(1000);
    expect(cube.turns).toHaveLength(1);
  });

  it("stays still for a device that asks for reduced motion", () => {
    const cube = fakeCube();
    const loop = keepScrambling(cube, { pace: 0.5, page: fakePage(), reducedMotion: true });
    vi.advanceTimersByTime(10000);
    expect(cube.turns).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(loop.running).toBe(false);
  });

  it("never queues a turn behind one that has not finished", () => {
    const cube = fakeCube();
    keepScrambling(cube, { pace: 1, page: fakePage(), reducedMotion: false });
    cube.busy = true;
    vi.advanceTimersByTime(3000);
    expect(cube.turns).toHaveLength(0);
    cube.busy = false;
    vi.advanceTimersByTime(1000);
    expect(cube.turns).toHaveLength(1);
  });

  it("turns the same way from the same seed, and never about one axis twice running", () => {
    const run = () => {
      const cube = fakeCube(4);
      const loop = keepScrambling(cube, { pace: 1, random: seededRandom("loop"), page: fakePage(), reducedMotion: false });
      vi.advanceTimersByTime(30000);
      loop.destroy();
      return [...cube.turns];
    };
    const turns = run();
    expect(turns).toEqual(run());
    expect(turns).toHaveLength(30);
    for (let at = 1; at < turns.length; at++) expect(turns[at].axis).not.toBe(turns[at - 1].axis);
  });

  it("lets go of the page when it is destroyed", () => {
    const page = fakePage();
    const loop = keepScrambling(fakeCube(), { page, reducedMotion: false });
    expect(page.count()).toBe(1);
    loop.destroy();
    expect(page.count()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
