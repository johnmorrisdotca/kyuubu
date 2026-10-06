// The cuboids page: a turning puzzle shaped like a box, from the named ones to any a×b×c, drawn the way the cube is.
/* global familyLanguage */
import { CUBE_THEMES } from "./dist/index.js";
import {
  CUBOID_MAX_SIDE,
  CUBOID_PRESETS,
  cuboidMovesNotation,
  cuboidName,
  cuboidSolved,
  faultSays,
  halfTurnOnly,
  isCuboidDims,
  legalTurns,
  randomCuboidScramble,
  readCuboidMoves,
  sameCuboid,
  solvedCuboid,
  undoCuboidMove,
} from "./dist/cuboid/index.js";
import { CuboidView } from "./dist/cuboid/draw.js";
import "./dist/cuboid/element-define.js";

// The page's own words, in the two languages the package speaks. Set as text, never as HTML.
const WORDS = {
  en: {
    pitch: "Turning puzzles shaped like a box: a 2×3×3, a floppy 1×3×3, a tall pillar, or any a×b×c from 1 to 7 on a side.",
    name: "Kyuubu is how Japanese says “cube”.",
    nameLink: "About the name",
    toCube: "The cube",
    toFamous: "Famous solves",
    toCubes: "Turning cubes",
    toCuboids: "Cuboids",
    toBuilder: "Builder",
    toApi: "API reference",
    shape: "Shape",
    moves: "Moves",
    scramble: "Scramble",
    undo: "Undo",
    reset: "Reset",
    frontOn: "Look again",
    hint: "Drag a sticker to turn its layer. A layer that is not square only turns half way round, so drag it past the middle. Drag the space round the puzzle to look at it.",
    solvedBanner: "Solved in {count} moves.",
    itsSolved: "Solved",
    notSolved: "Not solved",
    pickerTitle: "The named shapes",
    customTitle: "Any shape you like",
    sideX: "Width",
    sideY: "Height",
    sideZ: "Depth",
    customNone: "A cuboid needs one side of 2 or more: 1×1×1 has nothing to turn.",
    layersTitle: "What turns, and how far",
    layersText: "Each pair of faces has layers across the puzzle. A layer turns a quarter only if its slice is square; otherwise it turns a half turn, written with a 2.",
    axisX: "R / L",
    axisY: "U / D",
    axisZ: "F / B",
    layersCount: "{n} layers",
    layerOne: "one cubie deep: the whole puzzle, nothing to turn",
    layerQuarter: "quarter and half turns",
    layerHalf: "half turns only",
    typeTitle: "Type moves",
    typeLabel: "Moves in notation",
    turn: "Turn",
    scrambleWas: "Scramble",
    yourMoves: "Your moves",
    none: "None yet.",
    notationHelp: "R L U D F B turn a face a quarter clockwise, R' the other way, R2 a half turn. M E S are the middle layer of an odd side and 2R is the layer next in from R. A layer that is not square only half turns, so R is refused there and R2 is the way to write it. There are no x, y or z: a puzzle turned whole in the hand is another puzzle on its side.",
    embedTitle: "On your page",
    embedText: "One tag plays a solve on any cuboid; the model, notation and scrambles are plain functions. The puzzle below is the tag.",
    foot: "Nothing here is stored. Rubik's Cube is a trademark of its owner; Kyuubu is not affiliated with it.",
  },
  ja: {
    pitch: "箱の形をした回すパズルです。2×3×3、平たい1×3×3、背の高いピラー、そして各辺1〜7の好きな a×b×c を遊べます。",
    name: "「キューブ」は、英語の cube を日本語で書いたものです。",
    nameLink: "名前について（英語）",
    toCube: "キューブ",
    toFamous: "有名なソルブ",
    toCubes: "回り続けるキューブ",
    toCuboids: "直方体",
    toBuilder: "ビルダー",
    toApi: "API（英語）",
    shape: "形",
    moves: "手数",
    scramble: "スクランブル",
    undo: "元に戻す",
    reset: "リセット",
    frontOn: "見る向きを戻す",
    hint: "ステッカーをドラッグすると、その層が回ります。正方形でない層は半回転しかできないので、真ん中を過ぎるまでドラッグしてください。パズルの外側をドラッグすると見る向きが変わります。",
    solvedBanner: "{count}手でそろいました。",
    itsSolved: "そろっています",
    notSolved: "そろっていません",
    pickerTitle: "名前のある形",
    customTitle: "好きな形を作る",
    sideX: "横",
    sideY: "高さ",
    sideZ: "奥行き",
    customNone: "直方体には2以上の辺がひとつ必要です。1×1×1は回せるところがありません。",
    layersTitle: "回るところと、回せる角度",
    layersText: "向かい合う面のペアごとに、パズルを横切る層があります。層の切り口が正方形のときだけ1/4回転でき、そうでなければ半回転だけで、2をつけて書きます。",
    axisX: "R / L",
    axisY: "U / D",
    axisZ: "F / B",
    layersCount: "{n}層",
    layerOne: "奥行きが1つ。パズル全体なので回すところがありません",
    layerQuarter: "1/4回転と半回転",
    layerHalf: "半回転だけ",
    typeTitle: "回転記号を入力",
    typeLabel: "回転記号",
    turn: "回す",
    scrambleWas: "スクランブル",
    yourMoves: "回した手順",
    none: "まだありません。",
    notationHelp: "R L U D F B は面を時計回りに1/4回転し、R' は反時計回り、R2 は半回転です。M E S は奇数の辺の中央の層、2R は R の隣の層です。正方形でない層は半回転しかできないので、そこでは R は受け付けず、R2 と書きます。x y z はありません。手で持ち替えたパズルは、向きの違う別のパズルだからです。",
    embedTitle: "自分のページに置く",
    embedText: "タグ1つで、どの直方体の解き方も再生できます。モデル、回転記号、スクランブルは普通の関数です。下のパズルがそのタグです。",
    foot: "ここでは何も保存しません。Rubik's Cube は権利者の商標です。Kyuubu は権利者とは関係ありません。",
  },
};

const $ = (id) => document.getElementById(id);
const stage = $("stage");

let view;
let dims = CUBOID_PRESETS[1].dims;
let scramble = [];
let moves = [];
let banner = null;
let timed = false;

const page = familyLanguage({ id: "kyuubu", words: WORDS, onChange: (lang) => { view.setLocale(lang); draw(); } });
const say = (key, values) => {
  let text = page.word(key);
  for (const [name, value] of Object.entries(values ?? {})) text = text.replaceAll(`{${name}}`, String(value));
  return text;
};
const preset = () => CUBOID_PRESETS.find((one) => sameCuboid(one.dims, dims));

/** Everything on the page that is made of the puzzle's state and the language, drawn again. */
function draw() {
  const solved = cuboidSolved(view.state, dims);
  $("name").textContent = cuboidName(dims);
  $("count").textContent = String(moves.length);
  $("log").textContent = moves.length === 0 ? say("none") : cuboidMovesNotation(moves.slice(-60), dims);
  $("scrambled").textContent = scramble.length === 0 ? say("none") : cuboidMovesNotation(scramble, dims);
  $("hint").textContent = banner === null ? say("hint") : say("solvedBanner", banner);
  $("hint").dataset.tone = banner === null ? "" : "good";
  $("stage").dataset.solved = String(solved);
  $("undo").disabled = moves.length === 0;
  const known = preset();
  $("says-name").textContent = known === undefined ? cuboidName(dims) : `${known.name[page.lang]} · ${known.label}`;
  $("says").textContent = known === undefined ? say("layersText") : known.says[page.lang];
  for (const button of $("picker").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(known !== undefined && button.dataset.key === known.key));
    button.querySelector(".cuboid-pick-name").textContent = CUBOID_PRESETS.find((one) => one.key === button.dataset.key).name[page.lang];
  }
  for (const [axis, select] of [0, 1, 2].map((axis) => [axis, $(`side-${axis}`)])) select.value = String(dims[axis]);
  $("axes").replaceChildren(
    ...[0, 1, 2].map((axis) => {
      const li = document.createElement("li");
      li.dataset.axis = String(axis);
      const name = document.createElement("b");
      name.textContent = say(["axisX", "axisY", "axisZ"][axis]);
      const count = document.createElement("span");
      count.textContent = say("layersCount", { n: dims[axis] });
      const how = document.createElement("span");
      const turns = legalTurns(dims, axis, 0);
      how.textContent = turns.length === 0 ? say("layerOne") : halfTurnOnly(dims, axis) ? say("layerHalf") : say("layerQuarter");
      how.dataset.turns = turns.join("");
      li.append(name, count, how);
      return li;
    }),
  );
}

function make(next, state) {
  dims = next;
  view?.destroy();
  view = new CuboidView(stage, {
    dims,
    state,
    keyboard: "page",
    theme: CUBE_THEMES.paper,
    locale: page.lang,
    onTurn: (move) => {
      moves.push(move);
      banner = null;
      if (timed && cuboidSolved(view.state, dims)) {
        banner = { count: moves.length };
        timed = false;
      }
      draw();
    },
  });
}

function clear() {
  scramble = [];
  moves = [];
  banner = null;
  timed = false;
  $("error").textContent = "";
}

function use(next) {
  if (!isCuboidDims(next)) return false;
  make(next);
  clear();
  draw();
  return true;
}

for (const one of CUBOID_PRESETS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cube-pick";
  button.dataset.key = one.key;
  button.dataset.dims = one.label;
  button.dataset.testid = `pick-${one.key}`;
  const box = document.createElement("span");
  box.className = "cuboid-mark";
  const label = document.createElement("small");
  label.textContent = one.label;
  const name = document.createElement("small");
  name.className = "cuboid-pick-name";
  button.append(box, label, name);
  $("picker").append(button);
  new CuboidView(box, { dims: one.dims, theme: CUBE_THEMES.paper, keyboard: "none", interactive: false });
  button.addEventListener("click", () => {
    $("custom-error").textContent = "";
    use(one.dims);
  });
}

for (let axis = 0; axis < 3; axis += 1) {
  const select = $(`side-${axis}`);
  for (let side = 1; side <= CUBOID_MAX_SIDE; side += 1) {
    const option = document.createElement("option");
    option.value = String(side);
    option.textContent = String(side);
    select.append(option);
  }
  select.addEventListener("change", () => {
    const next = [0, 1, 2].map((one) => Number($(`side-${one}`).value));
    if (use(next)) $("custom-error").textContent = "";
    else {
      $("custom-error").textContent = say("customNone");
      draw();
    }
  });
}

$("scramble").addEventListener("click", () => {
  view.setState(solvedCuboid(dims));
  clear();
  scramble = randomCuboidScramble(dims);
  for (const move of scramble) view.turn(move, { ms: 90 });
  timed = true;
  draw();
});
$("undo").addEventListener("click", () => {
  const move = moves.pop();
  if (move !== undefined) view.turn(undoCuboidMove(move), { ms: 120 });
  banner = null;
  draw();
});
$("reset").addEventListener("click", () => {
  view.setState(solvedCuboid(dims));
  clear();
  draw();
});
$("look").addEventListener("click", () => view.resetLook());

$("type").addEventListener("submit", (event) => {
  event.preventDefault();
  const read = readCuboidMoves($("moves").value, dims);
  if (!read.ok) {
    $("error").textContent = faultSays(read.fault, read.token, page.lang);
    return;
  }
  $("error").textContent = "";
  for (const move of read.moves) view.turn(move, { report: true, ms: 120 });
  $("moves").value = "";
});

make(dims);
draw();
document.documentElement.dataset.ready = "true";
