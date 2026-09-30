import { describe, expect, it } from "vitest";

import { cubeSolved, solvedCube, turnAll } from "../src/cube.ts";
import { FAMOUS_SOLVES, famousSolve } from "../src/famous.ts";
import { parseMoves } from "../src/notation.ts";
import { applySolve, countSolveMoves, parseSolve, parseSolveMove, solveMoves, solveText } from "../src/reconstruction.ts";
import { planReplay, Replay, REPLAY_LOOP_REST_MS, REPLAY_STEP_MS, type ReplayClock, type ReplayCube } from "../src/replay.ts";
import type { CubeMove } from "../src/types.ts";

const steps = (text: string, n = 3) => {
  const read = parseSolve(text, n);
  if (!read.ok) throw new Error(`could not read ${text}: ${JSON.stringify(read.fault)}`);
  return read.steps;
};
const after = (text: string, n = 3) => applySolve(solvedCube(n), n, steps(text, n));
const plain = (text: string, n = 3) => turnAll(solvedCube(n), n, parseMoves(text, n)!);

describe("a solve as it is written down", () => {
  it("reads a wide turn as the face and the layers behind it, turned as one step", () => {
    expect(after("Rw")).toBe(plain("R 2R"));
    expect(after("Rw'")).toBe(plain("R' 2R'"));
    expect(after("Lw2")).toBe(plain("L2 2L2"));
    expect(after("3Uw", 5)).toBe(plain("U 2U 3U", 5));
    expect(steps("Rw")[0].moves).toHaveLength(2);
    expect(steps("3Uw", 5)[0].moves).toHaveLength(3);
  });

  it("reads the lower-case letter reconstructions write for a wide turn", () => {
    for (const face of ["r", "l", "u", "d", "f", "b"]) expect(after(`${face} ${face}2 ${face}'`)).toBe(after(`${face.toUpperCase()}w ${face.toUpperCase()}w2 ${face.toUpperCase()}w'`));
    expect(steps("r")[0].text).toBe("Rw");
  });

  it("a wide turn is the opposite face and a turn of the whole cube", () => {
    expect(cubeSolved(after("Rw L' x'"), 3)).toBe(true);
    expect(after("Rw")).toBe(plain("L x"));
    expect(after("Uw")).toBe(plain("D y"));
    expect(after("Fw")).toBe(plain("B z"));
  });

  it("reads rotations in both spellings, and the whole-cube turn that follows the other face", () => {
    expect(after("[r]")).toBe(plain("x"));
    expect(after("[l]")).toBe(plain("x'"));
    expect(after("[u]")).toBe(plain("y"));
    expect(after("[d]")).toBe(plain("y'"));
    expect(after("[f] [b]")).toBe(plain("z z'"));
    expect(after("[u2]")).toBe(plain("y2"));
  });

  it("reads R2' as R2 and R3 as R'", () => {
    expect(after("R2' U'2")).toBe(plain("R2 U2"));
    expect(after("R3 U3'")).toBe(plain("R' U"));
  });

  it("skips comments, brackets and commas, and repeats a group with a number after it", () => {
    expect(solveText(steps("x' // inspection\n(R U R' U') Rw2, U"))).toBe("x' R U R' U' Rw2 U");
    expect(solveText(steps("d (U R' U' R)2 F"))).toBe("Dw U R' U' R U R' U' R F");
    expect(solveText(steps("R’ U` R′"))).toBe("R' U' R'");
  });

  it("reads moves run together with no spaces", () => {
    expect(solveText(steps("y'xU'R2x'UR'u"))).toBe("y' x U' R2 x' U R' Uw");
    expect(solveText(steps("RUR'U'"))).toBe("R U R' U'");
  });

  it("counts every turn and no turn of the whole cube", () => {
    expect(countSolveMoves(steps("x2 R U Rw y' M2 [u]"))).toBe(4);
    expect(solveMoves(steps("Rw U"))).toHaveLength(3);
  });

  it("says what it could not read, and where", () => {
    const read = parseSolve("R U\nQ2 F", 3);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.fault).toEqual({ token: "Q2", at: 4, line: 2, column: 1, reason: "unknown" });
      expect(solveText(read.steps)).toBe("R U");
    }
    const layer = parseSolve("R 4R", 3);
    expect(!layer.ok && layer.fault.reason).toBe("no-such-layer");
    expect(parseSolveMove("Rw", 2)).toBe("no-such-layer");
    expect(parseSolveMove("M", 4)).toBe("no-such-layer");
    expect(parseSolveMove("3Rw", 3)).toBe("no-such-layer");
    expect(parseSolveMove("hello", 3)).toBe("unknown");
  });
});

describe("the famous solves", () => {
  it("each plays from its scramble to a solved cube", () => {
    expect(FAMOUS_SOLVES.length).toBeGreaterThanOrEqual(12);
    for (const solve of FAMOUS_SOLVES) {
      const planned = planReplay({ size: solve.size, scramble: solve.scramble, solution: solve.solution, timeMs: solve.timeMs });
      expect(planned.ok, solve.id).toBe(true);
      if (planned.ok) {
        expect(planned.plan.solved, solve.id).toBe(true);
        expect(planned.plan.pace, solve.id).toBe("spread");
        expect(Math.round(planned.plan.totalMs), solve.id).toBe(solve.timeMs);
      }
    }
  });

  it("each says who, where, when and where it was published, and nothing else about anyone", () => {
    const ids = new Set<string>();
    for (const solve of FAMOUS_SOLVES) {
      expect(ids.has(solve.id)).toBe(false);
      ids.add(solve.id);
      expect(Object.keys(solve).filter((key) => !["id", "size", "timeMs", "solver", "country", "competition", "competitionId", "from", "to", "record", "scramble", "solution", "reconstructedBy", "source", "checked"].includes(key))).toEqual([]);
      for (const day of [solve.from, solve.to, solve.checked]) expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(solve.from <= solve.to).toBe(true);
      expect(solve.source).toMatch(/^https?:\/\//);
      expect(solve.solution).not.toContain("//");
    }
    expect(famousSolve("park-3.13")?.solver).toBe("Max Park");
    expect(famousSolve("nobody")).toBeUndefined();
  });

  it("are in order of time, the fastest first", () => {
    const times = FAMOUS_SOLVES.map((solve) => solve.timeMs);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

/** A cube that only remembers what it was asked, and a clock a test winds by hand. */
function rig() {
  const asked: string[] = [];
  const cube: ReplayCube = {
    setState: (state) => asked.push(`set:${state.slice(0, 9)}`),
    turnTogether: (moves: readonly CubeMove[], options) => asked.push(`turn:${moves.length}:${options?.ms === undefined ? "own" : Math.round(options.ms)}`),
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

describe("a replay", () => {
  const planned = planReplay({ scramble: "R U R' U'", solution: "U R U' R'", timeMs: 2000 });
  if (!planned.ok) throw new Error("the plan should read");
  const plan = planned.plan;

  it("plans a solve: where it starts, the cube after every step, and its pace", () => {
    expect(plan.steps).toHaveLength(4);
    expect(plan.states).toHaveLength(5);
    expect(plan.states[0]).toBe(plan.start);
    expect(plan.solved).toBe(true);
    expect(plan.stepMs).toEqual([500, 500, 500, 500]);
    expect(plan.pace).toBe("spread");
    const steady = planReplay({ scramble: "R", solution: "R'" });
    expect(steady.ok && steady.plan.pace).toBe("default");
    expect(steady.ok && steady.plan.stepMs).toEqual([REPLAY_STEP_MS]);
    const given = planReplay({ scramble: "R", solution: "U R'", stepMs: [100, 300] });
    expect(given.ok && given.plan.pace).toBe("given");
    expect(given.ok && given.plan.totalMs).toBe(400);
  });

  it("plans a solve that does not end solved, and says so; refuses only what it cannot read", () => {
    const unfinished = planReplay({ scramble: "R U", solution: "U'" });
    expect(unfinished.ok && unfinished.plan.solved).toBe(false);
    const bad = planReplay({ scramble: "R U", solution: "U' Q" });
    expect(!bad.ok && bad.fault.part).toBe("solution");
    expect(!bad.ok && bad.fault.fault?.token).toBe("Q");
    const scramble = planReplay({ scramble: "nope", solution: "U" });
    expect(!scramble.ok && scramble.fault.part).toBe("scramble");
    const size = planReplay({ size: 9, scramble: "R", solution: "R'" });
    expect(!size.ok && size.fault.part).toBe("size");
  });

  it("plays at the solve's own pace, a step at a time, and stops at the end", () => {
    const { asked, cube, clock, wind } = rig();
    const seen: number[] = [];
    let ended = 0;
    const replay = new Replay(cube, plan, { clock, onChange: (status) => seen.push(status.position), onEnd: () => (ended += 1) });
    expect(asked).toEqual([`set:${plan.start.slice(0, 9)}`]);
    replay.play();
    expect(replay.status).toMatchObject({ position: 1, playing: true, ended: false });
    wind(499);
    expect(replay.status.position).toBe(1);
    wind(1);
    expect(replay.status.position).toBe(2);
    wind(1500);
    expect(replay.status).toMatchObject({ position: 4, playing: false, ended: true, elapsedMs: 2000 });
    expect(ended).toBe(1);
    expect(asked.filter((line) => line.startsWith("turn"))).toEqual(["turn:1:450", "turn:1:450", "turn:1:450", "turn:1:450"]);
    expect(seen).toContain(4);
  });

  it("plays slower when asked, and from the start again when played at the end", () => {
    const { asked, cube, clock, wind } = rig();
    const replay = new Replay(cube, plan, { clock, speed: 0.5 });
    replay.play();
    wind(999);
    expect(replay.status.position).toBe(1);
    wind(1);
    expect(replay.status.position).toBe(2);
    replay.setSpeed(1);
    wind(3000);
    expect(replay.status.ended).toBe(true);
    asked.length = 0;
    replay.play();
    expect(asked[0]).toBe(`set:${plan.start.slice(0, 9)}`);
    expect(replay.status.position).toBe(1);
    replay.setSpeed(0);
    expect(replay.status.speed).toBe(1);
  });

  it("pauses, steps either way and goes anywhere", () => {
    const { asked, cube, clock, wind } = rig();
    const replay = new Replay(cube, plan, { clock });
    replay.play();
    wind(600);
    replay.pause();
    expect(replay.status).toMatchObject({ position: 2, playing: false });
    wind(5000);
    expect(replay.status.position).toBe(2);
    replay.step(1);
    expect(replay.status.position).toBe(3);
    expect(asked.at(-1)).toBe("turn:1:own");
    replay.step(-1);
    expect(replay.status.position).toBe(2);
    expect(asked.at(-1)).toBe(`set:${plan.states[2].slice(0, 9)}`);
    replay.seek(99);
    expect(replay.status).toMatchObject({ position: 4, ended: true });
    replay.seek(-3);
    expect(replay.status.position).toBe(0);
    replay.step(-1);
    expect(replay.status.position).toBe(0);
    replay.restart();
    expect(replay.status).toMatchObject({ position: 1, playing: true });
    replay.destroy();
    wind(5000);
    expect(replay.status.position).toBe(1);
  });

  it("repeats when asked: rests on the solved cube, then begins again", () => {
    const { cube, clock, wind } = rig();
    let ended = 0;
    const replay = new Replay(cube, plan, { clock, loop: true, onEnd: () => (ended += 1) });
    replay.play();
    wind(2000);
    expect(replay.status).toMatchObject({ position: 4, playing: true });
    expect(ended).toBe(1);
    wind(REPLAY_LOOP_REST_MS);
    expect(replay.status.position).toBe(0);
    wind(REPLAY_LOOP_REST_MS / 2);
    expect(replay.status.position).toBe(1);
    replay.setLoop(false);
    wind(10_000);
    expect(replay.status).toMatchObject({ position: 4, playing: false });
    expect(ended).toBe(2);
  });
});

describe("the custom element, where there is no browser", () => {
  it("can be imported and defined, and does nothing", async () => {
    const { defineCube, CUBE_ELEMENT_ATTRIBUTES, CUBE_ELEMENT_NAME } = await import("../src/element.ts");
    expect(() => defineCube()).not.toThrow();
    await expect(import("../src/element-define.ts")).resolves.toBeDefined();
    expect(CUBE_ELEMENT_NAME).toBe("kyuubu-cube");
    expect(CUBE_ELEMENT_ATTRIBUTES).toContain("moves");
  });
});
