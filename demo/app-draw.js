// The demo page drawn again from the cube's state and the language, and the code example under it.

import { page, say } from "./app-page.js";
import { $, record, s } from "./app-state.js";
import {
  algorithmName,
  CUBE_THEMES,
  CubeView,
  countsAsMove,
  cubeSolved,
  movesNotation,
  SOLVABLE_SIZES,
  SOLVE_ALGORITHMS,
  stageName,
  stageSays,
  summarize,
  toText,
} from "./dist/index.js";
import { viewCode, viewOptions } from "./snippets.js";

/** Everything on the page that is made of the cube's state and the language, drawn again. */
export function draw() {
  document
    .querySelector('[data-say="pageDocs"]')
    ?.setAttribute("href", page.lang === "ja" ? "docs/ja/index.html" : "docs/index.html");
  const n = s.view.size;
  $("count").textContent = String(s.moves.filter(countsAsMove).length);
  $("log").textContent = s.moves.length === 0 ? say("none") : movesNotation(s.moves.slice(-60), n);
  $("scrambled").textContent = s.scramble.length === 0 ? say("none") : movesNotation(s.scramble, n);
  $("hint").textContent = s.banner === null ? say("hint") : say("solvedBanner", s.banner);
  $("hint").hidden = s.guide !== null && s.banner === null;
  $("guide").hidden = s.guide === null;
  $("show").setAttribute("aria-pressed", String(s.guide !== null));
  $("hint").dataset.tone = s.banner === null ? "" : "good";
  if (document.activeElement !== $("text"))
    $("text").value = s.scramble.length + s.moves.length === 0 ? "" : toText(record());
  $("saved").textContent = s.note === null ? "" : say(s.note);

  drawExample();
  const can = SOLVABLE_SIZES.includes(n);
  // Always a way back: the method where there is one, and every turn taken back where there is not.
  const stuck = !can && s.scramble.length + s.moves.length === 0;
  $("next").disabled = stuck;
  $("all").disabled = stuck;
  $("show").disabled = stuck && s.guide === null;
  const step = $("step");
  step.replaceChildren();
  const line = (tag, text, className) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    step.append(el);
  };
  if (!can) line("p", say("stepsOnly"), "fam-muted");
  else if (s.last !== null) {
    line("b", stageName(s.last.stage, page.lang));
    line("p", stageSays(s.last.stage, page.lang));
    line("p", movesNotation(s.last.moves, n), "fam-notation");
    for (const name of new Set(s.last.algorithms))
      line("p", `${say("uses")} ${algorithmName(name, page.lang)} · ${SOLVE_ALGORITHMS[name]}`, "fam-fine");
  } else if (cubeSolved(s.view.state, n)) line("p", say("itsSolved"), "fam-muted");
  $("done").replaceChildren(
    ...s.done.map((one) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = stageName(one.stage, page.lang);
      const turns = document.createElement("code");
      turns.className = "fam-notation";
      turns.textContent = movesNotation(one.moves, n);
      li.append(name, turns);
      return li;
    }),
  );

  for (const button of $("sizes").children) button.setAttribute("aria-pressed", String(Number(button.dataset.n) === n));
  for (const button of $("themes").children)
    button.setAttribute("aria-pressed", String(button.dataset.themeName === s.themeName));
  for (const button of $("speeds").children)
    button.setAttribute("aria-pressed", String(Number(button.dataset.ms) === s.turnMs));
  for (const input of $("colours").querySelectorAll("input")) {
    input.value = input.dataset.face === "plastic" ? s.theme.plastic : s.theme.colours[input.dataset.face];
    input.previousElementSibling.textContent = say(
      input.dataset.face === "plastic" ? "plastic" : `face${input.dataset.face}`,
    );
  }

  const box = $("solves");
  if (s.solves.length === 0) {
    const empty = document.createElement("p");
    empty.className = "fam-muted";
    empty.textContent = say("solvesNone");
    box.replaceChildren(empty);
  } else {
    const table = document.createElement("table");
    const head = table.createTHead().insertRow();
    for (const key of ["solveSize", "solveTime", "solveMoves"]) {
      const th = document.createElement("th");
      th.textContent = say(key);
      head.append(th);
    }
    const body = table.createTBody();
    for (const solve of [...s.solves].reverse()) {
      const row = body.insertRow();
      row.insertCell().textContent = `${solve.size}×${solve.size}`;
      row.insertCell().textContent = solve.ms === undefined ? "" : (solve.ms / 1000).toFixed(2);
      row.insertCell().textContent = String(summarize(solve).count);
    }
    const wrap = document.createElement("div");
    wrap.className = "fam-table-box cube-solves";
    wrap.append(table);
    box.replaceChildren(wrap);
  }
}

/** The code under the page, and the cube beside it, both made from what is chosen above. */
let example = { key: "", preview: null };
function drawExample() {
  const spec = {
    size: s.view.size,
    ...(s.themeName === "" ? { colours: s.theme.colours, plastic: s.theme.plastic } : { theme: s.themeName }),
    turnMs: s.turnMs,
    animateScramble: s.animateScramble,
  };
  const code = viewCode(spec);
  $("example-code").textContent = code;
  const key = JSON.stringify(spec);
  if (key === example.key) return;
  example.preview?.destroy();
  example = {
    key,
    preview: new CubeView($("example-preview"), { ...viewOptions(spec, CUBE_THEMES), locale: page.lang }),
  };
}
