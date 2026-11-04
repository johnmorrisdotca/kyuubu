// The demo page's clock, its turns and the cube it makes.

import { draw } from "./app-draw.js";
import { page } from "./app-page.js";
import { $, SOLVES, s, stage } from "./app-state.js";
import { CubeView, countsAsMove, cubeSolved, mountGuide, toJSON, undoOf } from "./dist/index.js";

const tick = () => {
  $("time").textContent = s.startedAt === null ? "0.00" : ((performance.now() - s.startedAt) / 1000).toFixed(2);
};
const run = () => {
  tick();
  s.frame = requestAnimationFrame(run);
};
export const stop = () => {
  cancelAnimationFrame(s.frame);
  s.frame = 0;
};

/** A fresh start: no moves, no clock, no steps shown. */
export function clear() {
  s.scramble = [];
  s.moves = [];
  s.startedAt = null;
  s.timed = false;
  s.banner = null;
  s.done = [];
  s.last = null;
  s.note = null;
  stop();
  tick();
}

export function keep() {
  try {
    localStorage.setItem(SOLVES, toJSON(s.solves));
  } catch {
    // Not kept; still listed until the page is closed.
  }
}

// Every turn made on the cube, by hand or by the page: counted, timed from the first after a scramble, and recorded when it solves.
export function turned(move) {
  s.moves.push(move);
  s.note = null;
  if (s.timed && s.startedAt === null && countsAsMove(move)) {
    s.startedAt = performance.now();
    run();
  }
  if (s.timed && cubeSolved(s.view.state, s.view.size)) {
    stop();
    const ms = s.startedAt === null ? 0 : Math.round(performance.now() - s.startedAt);
    $("time").textContent = (ms / 1000).toFixed(2);
    s.timed = false;
    s.banner = { time: (ms / 1000).toFixed(2), count: s.moves.filter(countsAsMove).length };
    s.solves.push({ size: s.view.size, scramble: s.scramble, moves: [...s.moves], ms, at: Date.now() });
    s.solves = s.solves.slice(-200);
    keep();
  }
  draw();
}

// A turn the page makes to show something is given its own time, so a run of them keeps one steady pace a person can follow, at the speed chosen under Controls.
export const shownMs = () => s.turnMs * 1.75;
export const play = (list) => {
  for (const move of list) {
    s.view.turnTogether([move], { ms: shownMs() });
    turned(move);
  }
};
// The last turn made taken back, from the moves and then from the scramble: the way home on a cube with no method here.
export const takeBack = () => {
  const move = s.moves.pop() ?? s.scramble.pop();
  if (move === undefined) return false;
  s.timed = false;
  stop();
  s.view.turnTogether([undoOf(move)], { ms: shownMs() });
  return true;
};

// Show me on the cube: the next move marked on the cube, with an arrow the way to drag it, and made by the person. The method where there is one; every turn taken back where there is not; or moves typed in.
export function showMe(source) {
  unguide();
  s.guide = mountGuide($("guide"), s.view, { ...source, locale: page.lang });
  draw();
}
export function unguide() {
  s.guide?.destroy();
  s.guide = null;
}

export function make(n, state) {
  unguide();
  s.view?.destroy();
  s.view = new CubeView(stage, {
    size: n,
    state,
    keyboard: "page",
    theme: s.theme,
    locale: page.lang,
    turnMs: s.turnMs,
    animateScramble: s.animateScramble,
    onTurn: (move) => {
      s.last = null;
      turned(move);
    },
  });
}
