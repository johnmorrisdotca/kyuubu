import { CUBE_THEMES } from "./dist/index.js";

// The demo page's shared state: one object every part of the page reads and writes.
export const $ = (id) => document.getElementById(id);
export const stage = $("stage");
export const SOLVES = "kyuubu.page.solves";
export const s = {
  view: undefined,
  theme: { ...CUBE_THEMES.paper, colours: { ...CUBE_THEMES.paper.colours } },
  themeName: "paper",
  turnMs: 160,
  animateScramble: true,
  scramble: [],
  moves: [],
  startedAt: null,
  timed: false,
  frame: 0,
  banner: null,
  done: [],
  last: null,
  note: null,
  solves: [],
  guide: null,
};
export const record = () => ({ size: s.view.size, scramble: s.scramble, moves: s.moves });
