// The demo page's controls: sizes, colours, themes, speeds, tabs and the buttons beside the cube.

import { draw } from "./app-draw.js";
import { say } from "./app-page.js";
import { clear, make, unguide } from "./app-play.js";
import { $, s } from "./app-state.js";
import {
  CUBE_FACE_ORDER,
  CUBE_THEMES,
  FULL_SCRAMBLE_LENGTHS,
  randomScramble,
  solvedCube,
  undoOf,
} from "./dist/index.js";

export function bindControls() {
  for (let n = 2; n <= 7; n += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.n = String(n);
    button.textContent = `${n}×${n}`;
    button.addEventListener("click", () => {
      make(n);
      clear();
      draw();
    });
    $("sizes").append(button);
  }

  for (const face of [...CUBE_FACE_ORDER, "plastic"]) {
    const label = document.createElement("label");
    const name = document.createElement("span");
    const input = document.createElement("input");
    input.type = "color";
    input.dataset.face = face;
    input.dataset.testid = `colour-${face}`;
    input.addEventListener("input", () => {
      if (face === "plastic") s.theme = { ...s.theme, plastic: input.value };
      else s.theme = { ...s.theme, colours: { ...s.theme.colours, [face]: input.value } };
      s.themeName = "";
      s.view.setTheme(s.theme);
      draw();
    });
    label.append(name, input);
    $("colours").append(label);
  }
  for (const button of $("themes").children) {
    button.addEventListener("click", () => {
      s.themeName = button.dataset.themeName;
      s.theme = { ...CUBE_THEMES[s.themeName], colours: { ...CUBE_THEMES[s.themeName].colours } };
      s.view.setTheme(s.theme);
      draw();
    });
  }

  for (const button of $("speeds").children) {
    button.addEventListener("click", () => {
      s.turnMs = Number(button.dataset.ms);
      s.view.setTurnMs(s.turnMs);
      draw();
    });
  }

  const tabs = [...$("tabs").children];
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      for (const other of tabs) {
        other.setAttribute("aria-selected", String(other === tab));
        $(other.getAttribute("aria-controls")).hidden = other !== tab;
      }
    });
  }

  $("scramble").addEventListener("click", () => {
    unguide();
    const n = s.view.size;
    s.view.setState(solvedCube(n));
    clear();
    s.scramble = randomScramble(n, FULL_SCRAMBLE_LENGTHS[n] ?? 25);
    s.view.scramble(s.scramble);
    s.timed = true;
    draw();
  });
  $("undo").addEventListener("click", () => {
    unguide();
    const move = s.moves.pop();
    if (move !== undefined) s.view.turn(undoOf(move));
    s.last = null;
    draw();
  });
  $("reset").addEventListener("click", () => {
    unguide();
    s.view.setState(solvedCube(s.view.size));
    clear();
    draw();
  });
  $("look").addEventListener("click", () => s.view.resetLook());
  $("animate-scramble").addEventListener("click", () => {
    s.animateScramble = !s.animateScramble;
    $("animate-scramble").setAttribute("aria-pressed", String(s.animateScramble));
    make(s.view.size, s.view.state);
    draw();
  });
  $("example-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("example-code").textContent);
      $("example-copied").textContent = say("exampleCopied");
    } catch {
      $("example-copied").textContent = "";
    }
  });
}
