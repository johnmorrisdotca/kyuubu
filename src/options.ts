import { CUBE_SCALES } from "./scale.ts";
import { SCRAMBLE_PACES } from "./scrambler.ts";
import { REPLAY_SPEEDS } from "./replay.ts";
import type { KyuubuLanguage } from "./words.ts";

/**
 * EVERY CHOICE THE PACKAGE OFFERS, as a list a page can be built from: the
 * demo's builder draws one control for each, groups them, says one plain line
 * about each, and writes the code that makes the cube they describe. A new
 * option is a row here; `test/options.test.ts` fails until every option of the
 * view, of the player and of the two custom elements is a row, or is named in
 * `CUBE_OPTIONS_LEFT_OUT` with its reason, so the builder cannot fall behind
 * the package.
 *
 * A cube is made in one of three ways, and a row says what each calls the
 * option: `view` is `CubeView` (and `<Kyuubu />`: a cube a person turns),
 * `player` is `mountPlayer` (a solve played back; `<kyuubu-cube>` and the embed
 * page take the same, as `cube`), and `turning` is `<kyuubu-scramble>` (a cube
 * that keeps turning by itself). A box-shaped puzzle has the same three ways,
 * under `cuboid` (`CuboidView`), `cuboidPlayer` (`mountCuboidPlayer`) and
 * `cuboidElement` (`<kyuubu-cuboid>`), and shares a row with the cube wherever
 * the choice is the same one; the builder page draws the cube's three.
 */

/** How a choice is made: a number in a range, on or off, one of a few, a colour, or text (moves are text with notation in it). */
export type OptionKind = "number" | "boolean" | "choice" | "colour" | "text" | "moves";

/** The three ways a cube is made. */
export type CubeMaker = "view" | "player" | "turning";

/** What the choices are gathered under, in the order a page shows them. */
export type OptionGroup = "size" | "look" | "turning" | "input" | "scramble" | "solve" | "replay" | "guide" | "words";

/** One choice. */
export type CubeOption = {
  /** Its one name, in kebab case: what the builder's controls and its address call it. */
  id: string;
  group: OptionGroup;
  kind: OptionKind;
  /** What it is when nothing is said: the same as leaving it out. Absent where leaving it out is its own state (no theme, no scale). */
  default?: string | number | boolean;
  /** The ways to choose from, for a `choice`. */
  choices?: readonly string[];
  /** The least, the most and the step, for a `number`. */
  range?: { min: number; max: number; step: number };
  /** What each way of making a cube calls it: `view` the `CubeView` option (`colours.U` is one face), `player` the `mountPlayer` option, `cube` the attribute of `<kyuubu-cube>` and the embed's address, `turning` the attribute of `<kyuubu-scramble>`; and for a cuboid, `cuboid` the `CuboidView` option, `cuboidPlayer` the `mountCuboidPlayer` option and `cuboidElement` the attribute of `<kyuubu-cuboid>`. Absent where that way does not have it. */
  names: { view?: string; player?: string; cube?: string; turning?: string; cuboid?: string; cuboidPlayer?: string; cuboidElement?: string };
  /** What the player's option is worth in this option's own unit: `timeMs` is milliseconds and `time` seconds. */
  factor?: { player?: number };
  /** The label and the one plain line, in each language. */
  say: Record<KyuubuLanguage, { label: string; help: string }>;
};

const face = (letter: "U" | "R" | "F" | "D" | "L" | "B", id: string, en: [string, string], ja: [string, string]): CubeOption => ({
  id,
  group: "look",
  kind: "colour",
  names: { view: `colours.${letter}`, cuboid: `colours.${letter}` },
  say: { en: { label: en[0], help: en[1] }, ja: { label: ja[0], help: ja[1] } },
});

/** Every choice the package offers, grouped, with what each is called in each way of making a cube. */
export const CUBE_OPTIONS: readonly CubeOption[] = [
  {
    id: "size",
    group: "size",
    kind: "number",
    default: 3,
    range: { min: 2, max: 7, step: 1 },
    names: { view: "size", player: "size", cube: "size", turning: "size" },
    say: {
      en: { label: "Size", help: "The cube's side: 2 for a 2×2, 3 for the classic, up to 7." },
      ja: { label: "大きさ", help: "キューブの一辺の層の数です。2なら2×2、3なら標準、最大7です。" },
    },
  },
  {
    id: "dims",
    group: "size",
    kind: "text",
    default: "3x3x3",
    names: { cuboid: "dims", cuboidPlayer: "dims", cuboidElement: "dims" },
    say: {
      en: { label: "Width, height, depth", help: "A cuboid's three sides, each from 1 to 7 and not 1×1×1, written 3x3x1: a call takes them as [3, 3, 1]." },
      ja: { label: "幅・高さ・奥行き", help: "直方体の3辺です。各辺は1から7まで、1×1×1は不可。3x3x1のように書きます。呼び出しでは[3, 3, 1]です。" },
    },
  },
  {
    id: "scale",
    group: "size",
    kind: "choice",
    choices: CUBE_SCALES,
    names: { view: "scale", turning: "scale" },
    say: {
      en: { label: "Scale", help: "How big it is drawn: small for a list, medium, or large. Left out, it fills its box." },
      ja: { label: "表示の大きさ", help: "表示の大きさです。小はリスト向き、中、大。選ばないと、入れ物いっぱいに表示します。" },
    },
  },
  {
    id: "width",
    group: "size",
    kind: "number",
    range: { min: 48, max: 600, step: 4 },
    names: { view: "width", turning: "width" },
    say: {
      en: { label: "Width", help: "How wide it is drawn, in pixels, instead of a scale." },
      ja: { label: "幅", help: "表示の幅をピクセルで指定します。大きさの選択より優先されます。" },
    },
  },
  {
    id: "fill",
    group: "size",
    kind: "number",
    default: 0.9,
    range: { min: 0.5, max: 1, step: 0.05 },
    names: { view: "fill", cuboid: "fill" },
    say: {
      en: { label: "Fill", help: "How much of its box the cube fills, from half to all of it." },
      ja: { label: "余白", help: "入れ物のどのくらいをキューブが占めるかです。半分から全部まで。" },
    },
  },
  {
    id: "rounded",
    group: "size",
    kind: "boolean",
    default: true,
    names: { view: "rounded", cuboid: "rounded" },
    say: {
      en: { label: "Rounded corners", help: "Rounds the cube's corners like real plastic; off for square ones." },
      ja: { label: "角を丸く", help: "本物のキューブのように角を丸くします。オフにすると角ばります。" },
    },
  },
  {
    id: "theme",
    group: "look",
    kind: "choice",
    choices: ["standard", "paper", "stickerless"],
    names: { view: "theme", player: "theme", cube: "theme", turning: "theme", cuboid: "theme", cuboidPlayer: "theme", cuboidElement: "theme" },
    say: {
      en: { label: "Theme", help: "A whole look at once: standard, paper or stickerless. The colours below are given on top of it." },
      ja: { label: "テーマ", help: "見た目をまとめて選びます（標準・ペーパー・ステッカーなし）。下の色はその上に重ねて指定します。" },
    },
  },
  face("U", "colour-up", ["Top colour", "The colour of the top face."], ["上の色", "上の面の色です。"]),
  face("R", "colour-right", ["Right colour", "The colour of the right face."], ["右の色", "右の面の色です。"]),
  face("F", "colour-front", ["Front colour", "The colour of the front face."], ["前の色", "前の面の色です。"]),
  face("D", "colour-down", ["Bottom colour", "The colour of the bottom face."], ["下の色", "下の面の色です。"]),
  face("L", "colour-left", ["Left colour", "The colour of the left face."], ["左の色", "左の面の色です。"]),
  face("B", "colour-back", ["Back colour", "The colour of the back face."], ["後ろの色", "後ろの面の色です。"]),
  {
    id: "plastic",
    group: "look",
    kind: "colour",
    default: "#111111",
    names: { view: "plastic", cuboid: "plastic" },
    say: {
      en: { label: "Plastic", help: "The colour between the stickers and inside the cube." },
      ja: { label: "プラスチックの色", help: "ステッカーのあいだと、キューブの内側の色です。" },
    },
  },
  {
    id: "yaw",
    group: "look",
    kind: "number",
    default: -35,
    range: { min: -180, max: 180, step: 5 },
    names: { view: "yaw", cuboid: "yaw" },
    say: {
      en: { label: "Turned by", help: "How the cube is first seen: turned about its up axis, in degrees." },
      ja: { label: "最初の向き（左右）", help: "最初に見える向きです。縦の軸まわりの角度（度）。" },
    },
  },
  {
    id: "pitch",
    group: "look",
    kind: "number",
    default: 28,
    range: { min: -90, max: 90, step: 5 },
    names: { view: "pitch", cuboid: "pitch" },
    say: {
      en: { label: "Tipped by", help: "How the cube is first seen: tipped towards the viewer, in degrees." },
      ja: { label: "最初の向き（上下）", help: "最初に見える向きです。手前に傾ける角度（度）。" },
    },
  },
  {
    id: "turn-ms",
    group: "turning",
    kind: "number",
    default: 160,
    range: { min: 0, max: 1000, step: 20 },
    names: { view: "turnMs", cuboid: "turnMs" },
    say: {
      en: { label: "Turn speed", help: "How long a quarter turn takes, in milliseconds, when a key, notation or code makes it." },
      ja: { label: "回す速さ", help: "キーや回転記号、コードで回すとき、4分の1回転にかかる時間（ミリ秒）です。" },
    },
  },
  {
    id: "animate-scramble",
    group: "turning",
    kind: "boolean",
    default: true,
    names: { view: "animateScramble" },
    say: {
      en: { label: "Show the scramble turning", help: "Shows the last turns of a scramble turning, quickly; the rest are made at once." },
      ja: { label: "スクランブルを回して見せる", help: "スクランブルの最後の数手を素早く回して見せます。それ以前は一度に行います。" },
    },
  },
  {
    id: "commit-angle",
    group: "turning",
    kind: "number",
    default: 30,
    range: { min: 5, max: 85, step: 5 },
    names: { view: "commitAngle", cuboid: "commitAngle" },
    say: {
      en: { label: "Point of no return", help: "How far a dragged layer must be turned, in degrees, before letting go makes the move." },
      ja: { label: "確定する角度", help: "ドラッグした層を離したときに回転が確定する角度（度）です。" },
    },
  },
  {
    id: "interactive",
    group: "input",
    kind: "boolean",
    default: true,
    names: { view: "interactive", turning: "interactive", cuboid: "interactive" },
    say: {
      en: { label: "Can be turned by hand", help: "Whether a person can drag a layer. A small cube is for looking at unless this says otherwise." },
      ja: { label: "手で回せる", help: "層をドラッグして回せるかどうかです。小さいキューブは、指定しない限り見るだけです。" },
    },
  },
  {
    id: "keyboard",
    group: "input",
    kind: "choice",
    default: "focus",
    choices: ["focus", "page", "none"],
    names: { view: "keyboard", cuboid: "keyboard" },
    say: {
      en: { label: "Keys", help: "Where the keys are heard: on the cube once it has focus, anywhere on the page, or nowhere." },
      ja: { label: "キー操作", help: "キーを受け付ける場所です。キューブにフォーカスがあるとき、ページ全体、またはなし。" },
    },
  },
  {
    id: "pace",
    group: "scramble",
    kind: "choice",
    default: "normal",
    choices: Object.keys(SCRAMBLE_PACES),
    names: { turning: "pace" },
    say: {
      en: { label: "Pace", help: "How often it makes a turn: every half second, every second or every four seconds." },
      ja: { label: "回る間隔", help: "回る間隔です。0.5秒ごと、1秒ごと、4秒ごと。" },
    },
  },
  {
    id: "paused",
    group: "scramble",
    kind: "boolean",
    default: false,
    names: { turning: "paused" },
    say: {
      en: { label: "Stopped", help: "Starts it still; it turns when played." },
      ja: { label: "止めておく", help: "止まった状態から始めます。再生すると回ります。" },
    },
  },
  {
    id: "faces",
    group: "scramble",
    kind: "boolean",
    default: false,
    names: { turning: "faces" },
    say: {
      en: { label: "Outer faces only", help: "Turns only the outer faces, never an inner layer." },
      ja: { label: "外側の面だけ", help: "外側の面だけを回し、内側の層は回しません。" },
    },
  },
  {
    id: "seed",
    group: "scramble",
    kind: "text",
    names: { turning: "seed" },
    say: {
      en: { label: "Seed", help: "The same seed turns the same layers in the same order, everywhere." },
      ja: { label: "シード", help: "同じシードなら、どこでも同じ層を同じ順に回します。" },
    },
  },
  {
    id: "scramble",
    group: "solve",
    kind: "moves",
    default: "R U R' U'",
    names: { player: "scramble", cube: "scramble", cuboidPlayer: "scramble", cuboidElement: "scramble" },
    say: {
      en: { label: "Scramble", help: "The moves that scramble the cube, as cubers write them: R U R' U', wide turns Rw, x y z." },
      ja: { label: "スクランブル", help: "キューブを崩す手順です。回転記号で書きます（R U R' U'、ワイド Rw、x y z）。" },
    },
  },
  {
    id: "solution",
    group: "solve",
    kind: "moves",
    default: "U R U' R'",
    names: { player: "solution", cube: "moves", cuboidPlayer: "solution", cuboidElement: "moves" },
    say: {
      en: { label: "Moves", help: "The moves that solve it, as cubers write them. Comments after // are skipped." },
      ja: { label: "手順", help: "そろえる手順です。回転記号で書きます。// のあとはコメントとして読み飛ばします。" },
    },
  },
  {
    id: "time",
    group: "solve",
    kind: "number",
    range: { min: 0, max: 600, step: 0.01 },
    names: { player: "timeMs", cube: "time", cuboidPlayer: "timeMs", cuboidElement: "time" },
    factor: { player: 1000 },
    say: {
      en: { label: "Time", help: "How long the solve took, in seconds. The moves are spread over it; left out, a steady pace." },
      ja: { label: "タイム", help: "ソルブにかかった秒数です。各手をその時間に割り振ります。空なら一定の速さです。" },
    },
  },
  {
    id: "speed",
    group: "replay",
    kind: "choice",
    default: "1",
    choices: REPLAY_SPEEDS.map(String),
    names: { player: "speed", cube: "speed", cuboidPlayer: "speed", cuboidElement: "speed" },
    say: {
      en: { label: "Speed", help: "The speed it starts at: 1 is the solve's own pace, then a half, a quarter and a tenth." },
      ja: { label: "再生の速さ", help: "再生を始める速さです。1は実際の速さ。ほかに2分の1、4分の1、10分の1。" },
    },
  },
  {
    id: "autoplay",
    group: "replay",
    kind: "boolean",
    default: false,
    names: { player: "autoplay", cube: "autoplay", cuboidPlayer: "autoplay", cuboidElement: "autoplay" },
    say: {
      en: { label: "Start at once", help: "Plays as soon as it is drawn." },
      ja: { label: "すぐに再生", help: "表示されたらすぐに再生を始めます。" },
    },
  },
  {
    id: "loop",
    group: "replay",
    kind: "boolean",
    default: false,
    names: { player: "loop", cube: "loop", cuboidPlayer: "loop", cuboidElement: "loop" },
    say: {
      en: { label: "Repeat", help: "Begins again when it reaches the end." },
      ja: { label: "くり返す", help: "最後まで来たら、また最初から再生します。" },
    },
  },
  {
    id: "controls",
    group: "replay",
    kind: "boolean",
    default: true,
    names: { player: "controls", cube: "controls", cuboidPlayer: "controls", cuboidElement: "controls" },
    say: {
      en: { label: "Controls", help: "Shows play, step, the slider and the speeds. Off, the cube plays alone." },
      ja: { label: "操作ボタン", help: "再生、コマ送り、スライダー、速さの切り替えを表示します。オフなら再生だけです。" },
    },
  },
  {
    id: "readout",
    group: "replay",
    kind: "boolean",
    default: true,
    names: { player: "readout", cube: "readout", cuboidPlayer: "readout", cuboidElement: "readout" },
    say: {
      en: { label: "Move readout", help: "Shows the move just made in large type, with what it turns in words." },
      ja: { label: "手の表示", help: "いま回した手を大きな文字と、回す内容を表す言葉で表示します。" },
    },
  },
  {
    id: "move-list",
    group: "replay",
    kind: "boolean",
    default: true,
    names: { player: "moveList", cube: "movelist", cuboidPlayer: "moveList", cuboidElement: "movelist" },
    say: {
      en: { label: "List of moves", help: "Shows the moves as buttons; the one just made is marked and each one takes the replay there." },
      ja: { label: "手順の一覧", help: "手順をボタンで表示します。いまの手に印が付き、押すとそこへ移ります。" },
    },
  },
  {
    id: "animate-scrub",
    group: "replay",
    kind: "boolean",
    default: true,
    names: { player: "animateScrub", cube: "scrub", cuboidPlayer: "animateScrub", cuboidElement: "scrub" },
    say: {
      en: { label: "Slider turns the cube", help: "Moving the slider turns the cube between where it was and where it goes." },
      ja: { label: "スライダーで回す", help: "スライダーを動かすと、元の位置から新しい位置までキューブが回ります。" },
    },
  },
  {
    id: "guide",
    group: "guide",
    kind: "boolean",
    default: false,
    names: { player: "guide", cube: "guide" },
    say: {
      en: { label: "Turn it yourself", help: "Starts with the cube handed to the viewer, the solve's next move shown on it." },
      ja: { label: "自分で回す", help: "キューブを見る人に渡した状態から始めます。次の手がキューブ上に示されます。" },
    },
  },
  {
    id: "locale",
    group: "words",
    kind: "choice",
    choices: ["en", "ja"],
    names: { view: "locale", player: "locale", cube: "lang", turning: "lang", cuboid: "locale", cuboidPlayer: "locale", cuboidElement: "lang" },
    say: {
      en: { label: "Language", help: "English or Japanese, for everything it says. Left out, it follows the page." },
      ja: { label: "言語", help: "表示される言葉の言語です。選ばないと、ページの言語に従います。" },
    },
  },
  {
    id: "label",
    group: "words",
    kind: "text",
    names: { view: "label", cuboid: "label" },
    say: {
      en: { label: "Name for a screen reader", help: "What a screen reader calls the cube. Left out, it is “A 3×3 cube”." },
      ja: { label: "読み上げる名前", help: "スクリーンリーダーが読み上げるキューブの名前です。空なら「3×3のキューブ」のようになります。" },
    },
  },
];

/** The order the groups are shown in, with what each is called. */
export const CUBE_OPTION_GROUPS: Readonly<Record<OptionGroup, Record<KyuubuLanguage, string>>> = {
  size: { en: "Size and shape", ja: "大きさと形" },
  look: { en: "Colours and look", ja: "色と見た目" },
  turning: { en: "Turning", ja: "回し方" },
  input: { en: "Hands and keys", ja: "手とキー" },
  scramble: { en: "A cube that keeps turning", ja: "回り続けるキューブ" },
  solve: { en: "The solve", ja: "ソルブ" },
  replay: { en: "The replay", ja: "再生" },
  guide: { en: "Turn it yourself", ja: "自分で回す" },
  words: { en: "Words", ja: "言葉" },
};

/**
 * What is not a choice, by the way of making a cube that has it and its
 * name there, each with why: a function, a value that is itself the state, a
 * list that needs a program to write. A name is in this list or in
 * `CUBE_OPTIONS`, or `test/options.test.ts` fails.
 */
export const CUBE_OPTIONS_LEFT_OUT: Readonly<Record<string, string>> = {
  "view.state": "the stickers themselves: a state is the cube's, and is made by turning it",
  "view.onTurn": "a function the page gives, told of every turn a person makes",
  "view.onLook": "a function the page gives, told whenever the view turns",
  "view.colours": "six options of its own, one for each face (`colour-up` and the rest)",
  "cuboid.state": "the stickers themselves: a state is the puzzle's, and is made by turning it",
  "cuboid.onTurn": "a function the page gives, told of every turn a person makes",
  "cuboid.onLook": "a function the page gives, told whenever the view turns",
  "cuboid.colours": "six options of its own, one for each face (`colour-up` and the rest)",
  "cuboidPlayer.stepMs": "a time for each step: a list of numbers that only a program has",
  "cuboidPlayer.onChange": "a function the page gives, told after every step",
  "cuboidPlayer.onEnd": "a function the page gives, told at the end",
  "player.stepMs": "a time for each step: a list of numbers that only a program has",
  "player.onChange": "a function the page gives, told after every step",
  "player.onEnd": "a function the page gives, told at the end",
};
