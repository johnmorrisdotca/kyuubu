// The demo page: a cube on the felt, and everything the package does beside it.
/* global familyLanguage */
import { viewCode, viewOptions } from "./snippets.js";
import {
  CUBE_FACE_ORDER,
  CUBE_THEMES,
  CubeView,
  FULL_SCRAMBLE_LENGTHS,
  SOLVABLE_SIZES,
  SOLVE_ALGORITHMS,
  algorithmName,
  countsAsMove,
  cubeSolved,
  fill,
  fromJSON,
  fromText,
  mountGuide,
  movesNotation,
  parseSolve,
  readSolveLink,
  randomScramble,
  solveSteps,
  solvedCube,
  stageName,
  stageSays,
  summarize,
  toCSV,
  toJSON,
  toText,
  undoAll,
  undoOf,
} from "./dist/index.js";

// The page's own words, in the two languages the package speaks. Set as text, never as HTML.
const WORDS = {
  en: {
    pitch: "A turning cube for the browser, 2×2 to 7×7, drawn in CSS 3D. Drag a sticker to turn its layer, or type cubers' notation, and follow the layer-by-layer solve one step at a time.",
    name: "Kyuubu is how Japanese says “cube”.",
    nameLink: "About the name",
    toFamous: "Famous solves",
    toApi: "API reference",
    toBuilder: "Builder",
    toCubes: "Turning cubes",
    toCuboids: "Cuboids",
    time: "Time",
    moves: "Moves",
    size: "Size",
    scramble: "Scramble",
    undo: "Undo",
    reset: "Reset",
    frontOn: "Front on",
    hint: "Drag a sticker and its layer turns with you: let go early and it goes back. Drag beside the cube to look round it.",
    solvedBanner: "Solved: {time} s, {count} moves",
    tabSolve: "Solve",
    tabMoves: "Notation",
    tabSave: "Save",
    tabLook: "Colours",
    tabKeys: "Controls",
    solveIntro: "The layer-by-layer method most people learn first, worked out for the cube as it is now.",
    nextStep: "Show the next step",
    allSteps: "Solve it all",
    showMe: "Show me on the cube",
    showMeIntro: "Show me on the cube marks the layer to turn and draws an arrow the way to drag it, one move at a time, and waits for you to make it.",
    showTyped: "Show me on the cube",
    stepsOnly: "This page has no step-by-step method for this size, so these two take back every turn made, the last one first.",
    itsSolved: "It is solved.",
    uses: "Algorithm:",
    typeLabel: "Moves in notation",
    turn: "Turn",
    badMoves: "That is not notation this cube can turn.",
    badMovesAt: "“{token}” is not notation this cube can turn (line {line}, place {column}).",
    scrambleWas: "Scramble",
    yourMoves: "Your moves",
    none: "Nothing yet.",
    notationHelp: "R L U D F B turn a face clockwise. R' is the other way and R2 is a half turn. M E S are the middle layers, x y z the whole cube, and 2R the second layer in on a bigger cube. Rw or r is a wide turn. Anything after // is a comment and is skipped, so a solve can be pasted as it is written; paste a link to alg.cubing.net and it is played on the famous solves page.",
    saveIntro: "This solve as plain text: the scramble and your moves. Copy it, or paste one here (text or JSON) and load it.",
    saveLabel: "A solve, as text or JSON",
    copy: "Copy",
    copied: "Copied.",
    load: "Load",
    loadBad: "That is not a solve this page can read.",
    loaded: "Loaded.",
    json: "Save as JSON",
    csv: "Save as CSV",
    solvesTitle: "Solves on this device",
    solvesNone: "Scramble the cube and solve it, and it is listed here.",
    solveSize: "Cube",
    solveTime: "Time",
    solveMoves: "Moves",
    clear: "Clear the list",
    lookIntro: "Every colour is an option and a CSS custom property. Choose a theme, or tap a colour to change it.",
    themeLabel: "Theme",
    themeStandard: "Standard",
    themePaper: "Paper",
    themeStickerless: "Stickerless",
    faceU: "Up",
    faceR: "Right",
    faceF: "Front",
    faceD: "Down",
    faceL: "Left",
    faceB: "Back",
    plastic: "Plastic",
    keysDo: "Do this",
    keysDoes: "It does",
    k1: "Drag a sticker",
    k1does: "Its layer turns with the pointer, forwards and back. Let go early and it goes back; past the point where it brightens, the turn is made",
    speedLabel: "Speed of turns made by keys, notation and the solve",
    speedFast: "Fast",
    speedNormal: "Normal",
    speedSlow: "Slow",
    k2: "Drag beside the cube",
    k2does: "Looks at it from anywhere",
    k3: "Wheel on a sticker",
    k3does: "Turns its row. With Ctrl its column, with Shift its face",
    k4does: "Turn a face. With Shift, the other way",
    k5does: "The middle layers",
    k6does: "The whole cube",
    k7: "2, then R",
    k7does: "The second layer in",
    k8: "Arrow keys",
    k8does: "Look round the cube",
    exampleLook: "This code makes the cube beside it: the size, theme, colours and turn speed chosen above. Copy it and you have it.",
    exampleCopied: "Copied.",
    animateScramble: "Show the scramble turning",
    moreTitle: "One on your page",
    moreText: "Install it, give an element a size, and make a cube in it. React, Vue, Svelte and Angular are in the README.",
    foot: "Your solves stay on this device. Turn it with a mouse, a finger, the wheel or the keys.",
  },
  ja: {
    pitch: "ブラウザで回せるキューブです（2×2〜7×7、CSS 3Dで描画）。ステッカーをドラッグして層を回すか、回転記号を入力します。一段ずつそろえる解き方を、1ステップずつ確認できます。",
    name: "「キューブ」は、英語の cube を日本語で書いたものです。",
    nameLink: "名前について（英語）",
    toFamous: "有名なソルブ",
    toApi: "API（英語）",
    toBuilder: "ビルダー",
    toCubes: "回り続けるキューブ",
    toCuboids: "直方体",
    time: "タイム",
    moves: "手数",
    size: "大きさ",
    scramble: "スクランブル",
    undo: "元に戻す",
    reset: "リセット",
    frontOn: "正面に戻す",
    hint: "ステッカーをドラッグすると層が一緒に回り、途中で離すと元に戻ります。外側をドラッグすると見る向きが変わります。",
    solvedBanner: "完成: {time}秒、{count}手",
    tabSolve: "解き方",
    tabMoves: "回転記号",
    tabSave: "保存",
    tabLook: "色",
    tabKeys: "操作",
    solveIntro: "多くの人が最初に覚える、一段ずつそろえる解き方です。いまのキューブの状態から手順を求めます。",
    nextStep: "次のステップ",
    allSteps: "最後までそろえる",
    showMe: "キューブの上で教えて",
    showMeIntro: "「キューブの上で教えて」は、回す層に印を付け、ドラッグする向きを矢印で示します。1手ずつ、回すのを待ちます。",
    showTyped: "キューブの上で教えて",
    stepsOnly: "このサイズには解き方の手順がありません。この二つのボタンは、回した手を最後から順に戻します。",
    itsSolved: "そろっています。",
    uses: "使う手順:",
    typeLabel: "回転記号を入力",
    turn: "回す",
    badMoves: "このキューブでは回せない記号です。",
    badMovesAt: "「{token}」はこのキューブでは回せない記号です（{line}行目、{column}文字目）。",
    scrambleWas: "スクランブル",
    yourMoves: "回した手順",
    none: "まだありません。",
    notationHelp: "R L U D F B は面を時計回りに回します。R' は反時計回り、R2 は180度です。M E S は中央の層、x y z はキューブ全体、2R は大きいキューブで外から2番目の層です。Rw や r はワイド（2層回し）です。// のあとはコメントとして読み飛ばすので、ソルブを書かれたまま貼り付けられます。alg.cubing.net のリンクを貼ると「有名なソルブ」のページで再生します。",
    saveIntro: "いまのソルブをテキストで表示します（スクランブルと回した手順）。コピーするか、ここに貼り付けて（テキストまたはJSON）読み込めます。",
    saveLabel: "ソルブ（テキストまたはJSON）",
    copy: "コピー",
    copied: "コピーしました。",
    load: "読み込む",
    loadBad: "読み込めない内容です。",
    loaded: "読み込みました。",
    json: "JSONで保存",
    csv: "CSVで保存",
    solvesTitle: "この端末のソルブ",
    solvesNone: "スクランブルしてそろえると、ここに記録されます。",
    solveSize: "キューブ",
    solveTime: "タイム",
    solveMoves: "手数",
    clear: "記録を消す",
    lookIntro: "色はすべて、オプションとCSSカスタムプロパティで変えられます。テーマを選ぶか、色をタップして変更します。",
    themeLabel: "テーマ",
    themeStandard: "標準",
    themePaper: "ペーパー",
    themeStickerless: "ステッカーレス",
    faceU: "上",
    faceR: "右",
    faceF: "前",
    faceD: "下",
    faceL: "左",
    faceB: "後ろ",
    plastic: "本体",
    keysDo: "操作",
    keysDoes: "動き",
    k1: "ステッカーをドラッグ",
    k1does: "層がポインターに合わせて前後に回ります。途中で離すと元に戻り、明るくなる位置を過ぎて離すと回転が確定します",
    speedLabel: "キー・回転記号・解き方で回す速さ",
    speedFast: "速い",
    speedNormal: "標準",
    speedSlow: "ゆっくり",
    k2: "キューブの外側をドラッグ",
    k2does: "見る向きが変わります",
    k3: "ステッカーの上でホイール",
    k3does: "横の列が回ります。Ctrlで縦の列、Shiftでその面",
    k4does: "面を回します。Shiftで逆回り",
    k5does: "中央の層",
    k6does: "キューブ全体",
    k7: "2 のあとに R",
    k7does: "外から2番目の層",
    k8: "矢印キー",
    k8does: "見る向きが変わります",
    exampleLook: "このコードで、横のキューブができます。上で選んだ大きさ、テーマ、色、回す速さが入っています。コピーすれば、そのまま使えます。",
    exampleCopied: "コピーしました。",
    animateScramble: "スクランブルを回して見せる",
    moreTitle: "自分のページに置く",
    moreText: "インストールして、大きさを決めた要素の中にキューブを作ります。React、Vue、Svelte、Angular の例は README にあります。",
    foot: "ソルブの記録はこの端末にだけ保存されます。マウス、指、ホイール、キーボードで回せます。",
  },
};

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const SOLVES = "kyuubu.page.solves";

let view;
let theme = { ...CUBE_THEMES.paper, colours: { ...CUBE_THEMES.paper.colours } };
let themeName = "paper";
let turnMs = 160;
let animateScramble = true;
let scramble = [];
let moves = [];
let startedAt = null;
let timed = false;
let frame = 0;
let banner = null;
let done = [];
let last = null;
let note = null;
let solves = [];
let guide = null;
try {
  solves = fromJSON(localStorage.getItem(SOLVES) ?? "") ?? [];
} catch {
  // A browser that keeps nothing starts with an empty list.
}

const page = familyLanguage({ id: "kyuubu", words: WORDS, onChange: (lang) => { view.setLocale(lang); guide?.setLocale(lang); draw(); } });
const say = (key, values) => fill(page.word(key), values);
const record = () => ({ size: view.size, scramble, moves });

/** Everything on the page that is made of the cube's state and the language, drawn again. */
function draw() {
  const n = view.size;
  $("count").textContent = String(moves.filter(countsAsMove).length);
  $("log").textContent = moves.length === 0 ? say("none") : movesNotation(moves.slice(-60), n);
  $("scrambled").textContent = scramble.length === 0 ? say("none") : movesNotation(scramble, n);
  $("hint").textContent = banner === null ? say("hint") : say("solvedBanner", banner);
  $("hint").hidden = guide !== null && banner === null;
  $("guide").hidden = guide === null;
  $("show").setAttribute("aria-pressed", String(guide !== null));
  $("hint").dataset.tone = banner === null ? "" : "good";
  if (document.activeElement !== $("text")) $("text").value = scramble.length + moves.length === 0 ? "" : toText(record());
  $("saved").textContent = note === null ? "" : say(note);

  drawExample();
  const can = SOLVABLE_SIZES.includes(n);
  // Always a way back: the method where there is one, and every turn taken back where there is not.
  const stuck = !can && scramble.length + moves.length === 0;
  $("next").disabled = stuck;
  $("all").disabled = stuck;
  $("show").disabled = stuck && guide === null;
  const step = $("step");
  step.replaceChildren();
  const line = (tag, text, className) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    step.append(el);
  };
  if (!can) line("p", say("stepsOnly"), "fam-muted");
  else if (last !== null) {
    line("b", stageName(last.stage, page.lang));
    line("p", stageSays(last.stage, page.lang));
    line("p", movesNotation(last.moves, n), "fam-notation");
    for (const name of new Set(last.algorithms)) line("p", `${say("uses")} ${algorithmName(name, page.lang)} · ${SOLVE_ALGORITHMS[name]}`, "fam-fine");
  } else if (cubeSolved(view.state, n)) line("p", say("itsSolved"), "fam-muted");
  $("done").replaceChildren(
    ...done.map((one) => {
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
  for (const button of $("themes").children) button.setAttribute("aria-pressed", String(button.dataset.themeName === themeName));
  for (const button of $("speeds").children) button.setAttribute("aria-pressed", String(Number(button.dataset.ms) === turnMs));
  for (const input of $("colours").querySelectorAll("input")) {
    input.value = input.dataset.face === "plastic" ? theme.plastic : theme.colours[input.dataset.face];
    input.previousElementSibling.textContent = say(input.dataset.face === "plastic" ? "plastic" : `face${input.dataset.face}`);
  }

  const box = $("solves");
  if (solves.length === 0) {
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
    for (const solve of [...solves].reverse()) {
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
  const spec = { size: view.size, ...(themeName === "" ? { colours: theme.colours, plastic: theme.plastic } : { theme: themeName }), turnMs, animateScramble };
  const code = viewCode(spec);
  $("example-code").textContent = code;
  const key = JSON.stringify(spec);
  if (key === example.key) return;
  example.preview?.destroy();
  example = { key, preview: new CubeView($("example-preview"), { ...viewOptions(spec, CUBE_THEMES), locale: page.lang }) };
}

const tick = () => {
  $("time").textContent = startedAt === null ? "0.00" : ((performance.now() - startedAt) / 1000).toFixed(2);
};
const run = () => {
  tick();
  frame = requestAnimationFrame(run);
};
const stop = () => {
  cancelAnimationFrame(frame);
  frame = 0;
};

/** A fresh start: no moves, no clock, no steps shown. */
function clear() {
  scramble = [];
  moves = [];
  startedAt = null;
  timed = false;
  banner = null;
  done = [];
  last = null;
  note = null;
  stop();
  tick();
}

function keep() {
  try {
    localStorage.setItem(SOLVES, toJSON(solves));
  } catch {
    // Not kept; still listed until the page is closed.
  }
}

// Every turn made on the cube, by hand or by the page: counted, timed from the first after a scramble, and recorded when it solves.
function turned(move) {
  moves.push(move);
  note = null;
  if (timed && startedAt === null && countsAsMove(move)) {
    startedAt = performance.now();
    run();
  }
  if (timed && cubeSolved(view.state, view.size)) {
    stop();
    const ms = startedAt === null ? 0 : Math.round(performance.now() - startedAt);
    $("time").textContent = (ms / 1000).toFixed(2);
    timed = false;
    banner = { time: (ms / 1000).toFixed(2), count: moves.filter(countsAsMove).length };
    solves.push({ size: view.size, scramble, moves: [...moves], ms, at: Date.now() });
    solves = solves.slice(-200);
    keep();
  }
  draw();
}

// A turn the page makes to show something is given its own time, so a run of them keeps one steady pace a person can follow, at the speed chosen under Controls.
const shownMs = () => turnMs * 1.75;
const play = (list) => {
  for (const move of list) {
    view.turnTogether([move], { ms: shownMs() });
    turned(move);
  }
};
// The last turn made taken back, from the moves and then from the scramble: the way home on a cube with no method here.
const takeBack = () => {
  const move = moves.pop() ?? scramble.pop();
  if (move === undefined) return false;
  timed = false;
  stop();
  view.turnTogether([undoOf(move)], { ms: shownMs() });
  return true;
};

// Show me on the cube: the next move marked on the cube, with an arrow the way to drag it, and made by the person. The method where there is one; every turn taken back where there is not; or moves typed in.
function showMe(source) {
  unguide();
  guide = mountGuide($("guide"), view, { ...source, locale: page.lang });
  draw();
}
function unguide() {
  guide?.destroy();
  guide = null;
}

function make(n, state) {
  unguide();
  view?.destroy();
  view = new CubeView(stage, { size: n, state, keyboard: "page", theme, locale: page.lang, turnMs, animateScramble, onTurn: (move) => { last = null; turned(move); } });
}

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
    if (face === "plastic") theme = { ...theme, plastic: input.value };
    else theme = { ...theme, colours: { ...theme.colours, [face]: input.value } };
    themeName = "";
    view.setTheme(theme);
    draw();
  });
  label.append(name, input);
  $("colours").append(label);
}
for (const button of $("themes").children) {
  button.addEventListener("click", () => {
    themeName = button.dataset.themeName;
    theme = { ...CUBE_THEMES[themeName], colours: { ...CUBE_THEMES[themeName].colours } };
    view.setTheme(theme);
    draw();
  });
}

for (const button of $("speeds").children) {
  button.addEventListener("click", () => {
    turnMs = Number(button.dataset.ms);
    view.setTurnMs(turnMs);
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
  const n = view.size;
  view.setState(solvedCube(n));
  clear();
  scramble = randomScramble(n, FULL_SCRAMBLE_LENGTHS[n] ?? 25);
  view.scramble(scramble);
  timed = true;
  draw();
});
$("undo").addEventListener("click", () => {
  unguide();
  const move = moves.pop();
  if (move !== undefined) view.turn(undoOf(move));
  last = null;
  draw();
});
$("reset").addEventListener("click", () => {
  unguide();
  view.setState(solvedCube(view.size));
  clear();
  draw();
});
$("look").addEventListener("click", () => view.resetLook());
$("animate-scramble").addEventListener("click", () => {
  animateScramble = !animateScramble;
  $("animate-scramble").setAttribute("aria-pressed", String(animateScramble));
  make(view.size, view.state);
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

// The layer-by-layer method, one step at a time: what the step is for, and its turns, made on the cube.
const stepOnce = () => {
  // A cube already solved needs nothing, whichever way up it is held.
  const [step] = cubeSolved(view.state, view.size) ? [] : solveSteps(view.state, view.size);
  if (step === undefined) return false;
  // A solve the page made is not one to time or to keep.
  timed = false;
  stop();
  last = step;
  done.push(step);
  play(step.moves);
  return true;
};
$("next").addEventListener("click", () => {
  unguide();
  if (!SOLVABLE_SIZES.includes(view.size)) {
    takeBack();
    last = null;
    draw();
    return;
  }
  if (!stepOnce()) {
    last = null;
    draw();
  }
});
$("all").addEventListener("click", () => {
  unguide();
  if (!SOLVABLE_SIZES.includes(view.size)) while (takeBack());
  else for (let guard = 0; guard < 60 && stepOnce(); guard += 1);
  draw();
});

$("show").addEventListener("click", () => {
  if (guide !== null) unguide();
  else if (SOLVABLE_SIZES.includes(view.size)) showMe({ method: true });
  else showMe({ moves: undoAll([...scramble, ...moves]) });
  last = null;
  draw();
});
$("show-typed").addEventListener("click", () => {
  const read = parseSolve($("moves").value, view.size);
  $("error").textContent = read.ok ? "" : say("badMovesAt", { token: read.fault.token, line: read.fault.line, column: read.fault.column });
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
  const read = parseSolve(typed, view.size);
  $("error").textContent = read.ok ? "" : say("badMovesAt", { token: read.fault.token, line: read.fault.line, column: read.fault.column });
  if (!read.ok) return;
  unguide();
  last = null;
  for (const step of read.steps) {
    view.turnTogether(step.moves, { ms: shownMs() });
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
  note = "copied";
  draw();
});
$("load").addEventListener("click", () => {
  const text = $("text").value;
  const read = fromJSON(text)?.[0] ?? fromText(text);
  if (read === undefined || read === null) {
    note = "loadBad";
    $("saved").textContent = say(note);
    return;
  }
  make(read.size, summarize(read).start);
  clear();
  scramble = read.scramble;
  $("text").blur();
  play(read.moves);
  note = "loaded";
  draw();
});

const download = (name, type, text) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};
const current = () => (solves.length > 0 ? solves : scramble.length + moves.length > 0 ? [record()] : []);
$("json").addEventListener("click", () => download("kyuubu-solves.json", "application/json", toJSON(current())));
$("csv").addEventListener("click", () => download("kyuubu-solves.csv", "text/csv", toCSV(current())));
$("clear").addEventListener("click", () => {
  solves = [];
  keep();
  draw();
});

make(3);
draw();
