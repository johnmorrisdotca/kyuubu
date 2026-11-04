// The demo page's solve, show-me, typed moves and saved text.

import { draw } from "./app-draw.js";
import { say } from "./app-page.js";
import { clear, make, play, showMe, shownMs, stop, takeBack, turned, unguide } from "./app-play.js";
import { $, s } from "./app-state.js";
import {
  cubeSolved,
  fromJSON,
  fromText,
  parseSolve,
  readSolveLink,
  SOLVABLE_SIZES,
  solveSteps,
  summarize,
  undoAll,
} from "./dist/index.js";

export function bindSolve() {
  // The layer-by-layer method, one step at a time: what the step is for, and its turns, made on the cube.
  const stepOnce = () => {
    // A cube already solved needs nothing, whichever way up it is held.
    const [step] = cubeSolved(s.view.state, s.view.size) ? [] : solveSteps(s.view.state, s.view.size);
    if (step === undefined) return false;
    // A solve the page made is not one to time or to keep.
    s.timed = false;
    stop();
    s.last = step;
    s.done.push(step);
    play(step.moves);
    return true;
  };
  $("next").addEventListener("click", () => {
    unguide();
    if (!SOLVABLE_SIZES.includes(s.view.size)) {
      takeBack();
      s.last = null;
      draw();
      return;
    }
    if (!stepOnce()) {
      s.last = null;
      draw();
    }
  });
  $("all").addEventListener("click", () => {
    unguide();
    if (!SOLVABLE_SIZES.includes(s.view.size)) while (takeBack());
    else for (let guard = 0; guard < 60 && stepOnce(); guard += 1);
    draw();
  });

  $("show").addEventListener("click", () => {
    if (s.guide !== null) unguide();
    else if (SOLVABLE_SIZES.includes(s.view.size)) showMe({ method: true });
    else showMe({ moves: undoAll([...s.scramble, ...s.moves]) });
    s.last = null;
    draw();
  });
  $("show-typed").addEventListener("click", () => {
    const read = parseSolve($("moves").value, s.view.size);
    $("error").textContent = read.ok
      ? ""
      : say("badMovesAt", { token: read.fault.token, line: read.fault.line, column: read.fault.column });
    if (!read.ok || read.steps.length === 0) return;
    showMe({ moves: read.steps });
    $("moves").value = "";
    $("stage").scrollIntoView({ block: "nearest" });
  });

  $("type").addEventListener("submit", (event) => {
    event.preventDefault();
    const typed = $("moves").value;
    // A link to a reconstruction is a whole solve, scramble and all: the famous solves page plays those.
    const link = readSolveLink(typed);
    if (link !== null) {
      const q = new URLSearchParams({ scramble: link.scramble, moves: link.solution });
      location.href = `famous.html#${q}`;
      return;
    }
    const read = parseSolve(typed, s.view.size);
    $("error").textContent = read.ok
      ? ""
      : say("badMovesAt", { token: read.fault.token, line: read.fault.line, column: read.fault.column });
    if (!read.ok) return;
    unguide();
    s.last = null;
    for (const step of read.steps) {
      s.view.turnTogether(step.moves, { ms: shownMs() });
      for (const move of step.moves) turned(move);
    }
    $("moves").value = "";
  });

  // Enter turns what is typed; Shift and Enter makes a new line, as a pasted solve of several lines has.
  $("moves").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    $("type").requestSubmit();
  });

  $("copy").addEventListener("click", async () => {
    $("text").select();
    try {
      await navigator.clipboard.writeText($("text").value);
    } catch {
      // No clipboard: the text is selected, ready to copy by hand.
    }
    s.note = "copied";
    draw();
  });
  $("load").addEventListener("click", () => {
    const text = $("text").value;
    const read = fromJSON(text)?.[0] ?? fromText(text);
    if (read === undefined || read === null) {
      s.note = "loadBad";
      $("saved").textContent = say(s.note);
      return;
    }
    make(read.size, summarize(read).start);
    clear();
    s.scramble = read.scramble;
    $("text").blur();
    play(read.moves);
    s.note = "loaded";
    draw();
  });
}
