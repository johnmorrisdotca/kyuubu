import { describe, expect, it } from "vitest";

import { cubeSolved, solvedCube, turnAll } from "../src/cube.ts";
import { FAMOUS_SOLVES, famousSolve } from "../src/famous.ts";
import { parseMoves } from "../src/notation.ts";
import { applySolve, countSolveMoves, parseSolve, parseSolveMove, solveMoves, solveText } from "../src/reconstruction.ts";
import { planReplay, Replay, REPLAY_LOOP_REST_MS, REPLAY_SCRAMBLE_STEP_MS, REPLAY_SCRUB_TURNS, REPLAY_STEP_MS, scrubPath, type ReplayClock, type ReplayCube } from "../src/replay.ts";
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
    // A step back is turned the other way, as a step on is turned: the cube is shown where it was, and the move undone.
    expect(asked.slice(-2)).toEqual([`set:${plan.states[3].slice(0, 9)}`, "turn:1:own"]);
    replay.seek(99);
    expect(replay.status).toMatchObject({ position: 4, ended: true });
    replay.seek(-3);
    expect(replay.status.position).toBe(0);
    replay.step(-1);
    expect(replay.status.position).toBe(0);
    replay.seek(3);
    replay.play();
    replay.restart();
    expect(replay.status).toMatchObject({ position: 0, playing: false });
    expect(asked.at(-1)).toBe(`set:${plan.start.slice(0, 9)}`);
    wind(5000);
    expect(replay.status.position).toBe(0);
    replay.play();
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

describe("turning the cube as the slider moves", () => {
  const steps = (text: string) => parseSolve(text, 3).steps.map((step) => step.moves);
  const solution = "R U R' U' R' F R2 U' R' U' R U R' F'";
  const list = steps(solution);

  /** The cube a path leaves: from the cube at the path's own start, every turn made. */
  const endOf = (states: string[], path: { from: number; turns: CubeMove[][] }) => path.turns.reduce((cube, turn) => turnAll(cube, 3, turn), states[path.from]);

  it("turns the steps between, forwards going on", () => {
    expect(scrubPath(list, 2, 5)).toEqual({ from: 2, turns: [list[2], list[3], list[4]] });
    expect(scrubPath(list, 0, 1)).toEqual({ from: 0, turns: [list[0]] });
  });

  it("undoes each step going back, the last first, as the layers it turned the other way", () => {
    const path = scrubPath(list, 5, 2);
    expect(path.from).toBe(5);
    expect(path.turns).toHaveLength(3);
    // Step 5 is the fifth made (index 4), R', undone as R.
    expect(path.turns[0]).toEqual(list[4].map((move) => ({ ...move, turns: 4 - move.turns })));
    expect(path.turns[2]).toEqual(list[2].map((move) => ({ ...move, turns: 4 - move.turns })));
  });

  it("ends on exactly the cube a jump to the same place shows, whichever way it goes", () => {
    const planned = planReplay({ scramble: "F R U R' U' F'", solution });
    if (!planned.ok) throw new Error("the plan should read");
    const { states } = planned.plan;
    const moves = planned.plan.steps.map((step) => step.moves);
    for (let from = 0; from <= moves.length; from += 1) {
      for (let to = 0; to <= moves.length; to += 1) {
        const path = scrubPath(moves, from, to);
        expect(endOf(states, path), `${from} to ${to}`).toBe(states[to]);
      }
    }
  });

  it("turns a wide step as the one step it is, and undoes it the same way", () => {
    const wide = steps("Rw U Rw'");
    expect(scrubPath(wide, 0, 1).turns[0]).toHaveLength(2);
    const back = scrubPath(wide, 3, 2);
    expect(back.turns[0]).toHaveLength(2);
    // The wide turn that was made anticlockwise (one quarter by the right-hand rule) is undone as three.
    expect(back.turns[0].every((move) => move.turns === 3)).toBe(true);
  });

  it("catches up at once on a long jump: it goes to a few steps short and turns only those", () => {
    const forward = scrubPath(list, 0, 12);
    expect(forward.from).toBe(12 - REPLAY_SCRUB_TURNS);
    expect(forward.turns).toHaveLength(REPLAY_SCRUB_TURNS);
    const back = scrubPath(list, 13, 1);
    expect(back.from).toBe(1 + REPLAY_SCRUB_TURNS);
    expect(back.turns).toHaveLength(REPLAY_SCRUB_TURNS);
    expect(scrubPath(list, 3, 3)).toEqual({ from: 3, turns: [] });
    expect(scrubPath(list, 0, 99).from).toBe(list.length - REPLAY_SCRUB_TURNS);
    expect(scrubPath(list, 4, 2, 1).from).toBe(3);
  });

  it("is what a replay does when asked to seek with animation, and nothing but a jump when not", () => {
    const planned = planReplay({ scramble: "F R U R' U' F'", solution, timeMs: 3000 });
    if (!planned.ok) throw new Error("the plan should read");
    const { plan } = planned;
    const { asked, cube, clock } = rig();
    const replay = new Replay(cube, plan, { clock });
    asked.length = 0;
    replay.seek(3, { animate: true });
    expect(asked).toEqual(["turn:1:70", "turn:1:70", "turn:1:70"]);
    expect(replay.status.position).toBe(3);
    asked.length = 0;
    replay.seek(1, { animate: true });
    expect(asked).toEqual(["turn:1:70", "turn:1:70"]);
    asked.length = 0;
    replay.seek(13, { animate: true });
    expect(asked[0]).toBe(`set:${plan.states[13 - REPLAY_SCRUB_TURNS].slice(0, 9)}`);
    expect(asked.slice(1)).toHaveLength(REPLAY_SCRUB_TURNS);
    asked.length = 0;
    replay.seek(2);
    expect(asked).toEqual([`set:${plan.states[2].slice(0, 9)}`]);
  });

  it("cancels a catch-up that turns the other way: the cube is put where it was going, then goes back", () => {
    const planned = planReplay({ scramble: "F R U R' U' F'", solution, timeMs: 3000 });
    if (!planned.ok) throw new Error("the plan should read");
    const { plan } = planned;
    const { asked, clock } = rig();
    let busy = false;
    const cube: ReplayCube = {
      setState: (state) => {
        asked.push(`set:${state.slice(0, 9)}`);
        busy = false;
      },
      turnTogether: (moves) => {
        asked.push(`turn:${moves.length}`);
        busy = true;
      },
      get busy() {
        return busy;
      },
    };
    const replay = new Replay(cube, plan, { clock });
    asked.length = 0;
    replay.seek(4, { animate: true });
    replay.seek(5, { animate: true });
    // Still turning the same way: the turns are added, nothing is cut short.
    expect(asked.filter((line) => line.startsWith("set"))).toEqual([]);
    replay.seek(2, { animate: true });
    expect(asked.filter((line) => line.startsWith("set"))).toEqual([`set:${plan.states[5].slice(0, 9)}`]);
    expect(asked.at(-1)).toBe("turn:1");
    expect(replay.status.position).toBe(2);
  });
});

describe("going back into the scramble", () => {
  const planned = planReplay({ scramble: "R U R' U'", solution: "U R U' R'", timeMs: 2000 });
  if (!planned.ok) throw new Error("the plan should read");
  const plan = planned.plan;

  it("plans the cube after every step of the scramble", () => {
    expect(plan.scrambleStates).toHaveLength(5);
    expect(plan.scrambleStates[0]).toBe(solvedCube(3));
    expect(plan.scrambleStates[4]).toBe(plan.start);
    expect(plan.scrambleStates[1]).toBe(after("R"));
    expect(plan.scrambleStates[3]).toBe(after("R U R'"));
  });

  it("says where it is in the scramble, which is all of it unless the viewer has gone back", () => {
    const { cube, clock } = rig();
    const replay = new Replay(cube, plan, { clock });
    expect(replay.status).toMatchObject({ scrambleAt: 4, scrambleTotal: 4, position: 0 });
    replay.seekScramble(2);
    expect(replay.status).toMatchObject({ scrambleAt: 2, position: 0, ended: false });
    replay.seek(1);
    expect(replay.status.scrambleAt).toBe(4);
  });

  it("shows the cube after that many scramble steps, and steps through it both ways", () => {
    const { asked, cube, clock } = rig();
    const replay = new Replay(cube, plan, { clock });
    replay.seekScramble(2);
    expect(asked.at(-1)).toBe(`set:${plan.scrambleStates[2].slice(0, 9)}`);
    replay.step(1);
    expect(replay.status.scrambleAt).toBe(3);
    expect(asked.at(-1)).toBe("turn:1:own");
    replay.step(-1);
    replay.step(-1);
    expect(replay.status.scrambleAt).toBe(1);
    expect(asked.slice(-2)).toEqual([`set:${plan.scrambleStates[2].slice(0, 9)}`, "turn:1:own"]);
    replay.seekScramble(4);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 0 });
    // At the scrambled cube a step back stays there, as ever.
    replay.step(-1);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 0 });
  });

  it("plays the rest of the scramble, quickly, and then the solve", () => {
    const { asked, cube, clock, wind } = rig();
    const replay = new Replay(cube, plan, { clock });
    replay.seekScramble(1);
    asked.length = 0;
    replay.play();
    expect(replay.status).toMatchObject({ scrambleAt: 2, position: 0, playing: true });
    wind(REPLAY_SCRAMBLE_STEP_MS * 2);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 0 });
    wind(REPLAY_SCRAMBLE_STEP_MS);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 1 });
    expect(asked.slice(0, 3)).toEqual(["turn:1:180", "turn:1:180", "turn:1:180"]);
    wind(5000);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 4, ended: true, playing: false });
  });

  it("pauses in the scramble where it is", () => {
    const { asked, cube, clock, wind } = rig();
    const replay = new Replay(cube, plan, { clock });
    replay.seekScramble(0);
    replay.play();
    wind(REPLAY_SCRAMBLE_STEP_MS);
    replay.pause();
    expect(replay.status.scrambleAt).toBe(2);
    expect(asked.at(-1)).toBe(`set:${plan.scrambleStates[2].slice(0, 9)}`);
    wind(5000);
    expect(replay.status.scrambleAt).toBe(2);
  });
});

describe("a step back is the move turned the other way", () => {
  /** A cube that does what it is told, on the model, so that what it shows can be read. */
  const model = (n: number) => {
    let state = solvedCube(n);
    const turned: CubeMove[][] = [];
    const cube: ReplayCube = {
      setState: (next) => void (state = next),
      turnTogether: (moves) => {
        turned.push([...moves]);
        state = turnAll(state, n, moves);
      },
    };
    return { cube, turned, get state() { return state; } };
  };
  const planned = planReplay({ scramble: "F R U R' U' F' x", solution: "x' Rw U Rw' U' F R U R' U' F'", timeMs: 3000 });
  if (!planned.ok) throw new Error("the plan should read");
  const plan = planned.plan;

  it("turns the inverse of the step it takes back, and ends on the cube before it, from every position", () => {
    for (let at = 1; at <= plan.steps.length; at += 1) {
      const shown = model(3);
      const replay = new Replay(shown.cube, plan, { clock: rig().clock });
      replay.seek(at);
      shown.cube.setState(plan.states[at]);
      shown.turned.length = 0;
      replay.step(-1);
      expect(replay.status.position, `from ${at}`).toBe(at - 1);
      expect(shown.turned, `from ${at}`).toHaveLength(1);
      // Exactly what turning the step does, the other way: the same layers, each turned as far the other way.
      expect(shown.turned[0].map((move) => ({ ...move, turns: 4 - move.turns })), `from ${at}`).toEqual(plan.steps[at - 1].moves);
      expect(shown.state, `from ${at}`).toBe(plan.states[at - 1]);
    }
  });

  it("is the same move and the same length of turn as stepping on, so it looks as Forward does", () => {
    const shown = model(3);
    const replay = new Replay(shown.cube, plan, { clock: rig().clock });
    replay.step(1);
    replay.step(1);
    expect(shown.state).toBe(plan.states[2]);
    replay.step(-1);
    replay.step(-1);
    expect(shown.state).toBe(plan.states[0]);
    expect(shown.turned).toHaveLength(4);
    // Back at the first step stays there, and shows it.
    replay.step(-1);
    expect(shown.turned).toHaveLength(4);
    expect(shown.state).toBe(plan.states[0]);
  });

  it("does the same in the scramble, a step at a time", () => {
    const shown = model(3);
    const replay = new Replay(shown.cube, plan, { clock: rig().clock });
    replay.seekScramble(4);
    shown.turned.length = 0;
    replay.step(-1);
    expect(shown.turned).toHaveLength(1);
    expect(shown.state).toBe(plan.scrambleStates[3]);
    replay.step(1);
    expect(shown.state).toBe(plan.scrambleStates[4]);
  });
});

describe("walking the scramble and the solve as one", () => {
  const planned = planReplay({ scramble: "R U R' U'", solution: "U R U' R'", timeMs: 2000 });
  if (!planned.ok) throw new Error("the plan should read");
  const plan = planned.plan;

  it("turns a step back from the scrambled cube into the scramble, and on, and back again", () => {
    const { asked, cube, clock } = rig();
    const replay = new Replay(cube, plan, { clock });
    asked.length = 0;
    replay.walk(-1);
    expect(replay.status).toMatchObject({ scrambleAt: 3, position: 0 });
    expect(asked).toEqual([`set:${plan.scrambleStates[4].slice(0, 9)}`, "turn:1:own"]);
    replay.walk(-1);
    expect(replay.status.scrambleAt).toBe(2);
    replay.walk(1);
    replay.walk(1);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 0 });
    replay.walk(1);
    expect(replay.status.position).toBe(1);
    replay.walk(-1);
    expect(replay.status).toMatchObject({ scrambleAt: 4, position: 0 });
  });

  it("goes no further back than the solved cube", () => {
    const { cube, clock } = rig();
    const replay = new Replay(cube, plan, { clock });
    for (let at = 0; at < 9; at += 1) replay.walk(-1);
    expect(replay.status).toMatchObject({ scrambleAt: 0, position: 0 });
  });
});
