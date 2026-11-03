import { describe, expect, it } from "vitest";
import { solvedCube, turnAll } from "../src/cube.ts";
import { parseSolve } from "../src/reconstruction.ts";
import {
  planReplay,
  REPLAY_SCRAMBLE_STEP_MS,
  REPLAY_SCRUB_TURNS,
  Replay,
  type ReplayCube,
  scrubPath,
} from "../src/replay.ts";
import type { CubeMove } from "../src/types.ts";
import { after, rig } from "./solve.replay.fixture.ts";

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
  const endOf = (states: string[], path: { from: number; turns: CubeMove[][] }) =>
    path.turns.reduce((cube, turn) => turnAll(cube, 3, turn), states[path.from]);

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
      setState: (next) => {
        state = next;
      },
      turnTogether: (moves) => {
        turned.push([...moves]);
        state = turnAll(state, n, moves);
      },
    };
    return {
      cube,
      turned,
      get state() {
        return state;
      },
    };
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
      expect(
        shown.turned[0].map((move) => ({ ...move, turns: 4 - move.turns })),
        `from ${at}`,
      ).toEqual(plan.steps[at - 1].moves);
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
