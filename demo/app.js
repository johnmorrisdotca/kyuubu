// The demo page: a cube on the felt, and everything the package does beside it.

import { bindControls } from "./app-controls.js";
import { draw } from "./app-draw.js";
import { make } from "./app-play.js";
import { bindSolve } from "./app-solve.js";
import { bindSolves } from "./app-solves.js";
import { SOLVES, s } from "./app-state.js";
import { fromJSON } from "./dist/index.js";

try {
  s.solves = fromJSON(localStorage.getItem(SOLVES) ?? "") ?? [];
} catch {
  // A browser that keeps nothing starts with an empty list.
}

bindControls();
bindSolve();
bindSolves();
make(3);
draw();
