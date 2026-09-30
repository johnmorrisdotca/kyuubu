import { WORDS, type CubeWords, type KyuubuLanguage } from "./words.ts";

/**
 * EVERY WORD THE PACKAGE SAYS TO A PERSON, in English and Japanese, in one
 * table: the cube's own words (`words.ts`) and the command line's. `{n}` and
 * the other braces are filled in when a line is shown; a table in another
 * language must keep them.
 *
 * The Japanese has not yet been reviewed by a native reader. Every line is
 * listed beside its English in `docs/strings-ja.md`.
 */

/** The command line's words: its help, its refusals and what it reports. */
export type CliWords = {
  cliUsage: string;
  cliBadOption: string;
  cliNeedsValue: string;
  cliOneMode: string;
  cliBadSize: string;
  cliBadLength: string;
  cliBadCount: string;
  cliBadLang: string;
  cliBadMoves: string;
  cliBadState: string;
  cliNoMethod: string;
  cliImpossible: string;
  cliNeedsStart: string;
  cliSolvedIn: string;
  cliNotSolvedAfter: string;
  cliAlreadySolved: string;
  cliSteps: string;
  cliState: string;
};

/** Every word the package says: the cube's and the command line's. */
export type KyuubuStrings = CubeWords & CliWords;

const USAGE_EN = `Usage: kyuubu [options] [turns]

A turning cube from the command line: scrambles, turns, a check and a solve.
Turns are written in cubers' notation. Quote them, since a shell reads the ' itself.

  kyuubu                                   a scramble for the 3×3
  kyuubu -n 4 -c 5                         five scrambles for the 4×4
  kyuubu --seed "club night"               the same scramble for everyone with the seed
  kyuubu --apply "R U R' U'"               the cube after those turns
  kyuubu --verify --from "R U" "U' R'"     whether the turns solve the scramble
  kyuubu --solve "R U2 F' L"               the layer-by-layer solve of that scramble

What to do:
      --scramble        Print a scramble. This is what happens when nothing else is asked
      --apply           Make the turns and show the cube
      --verify          Say whether the turns solve the cube: exit code 0 if they do, 1 if not
      --solve           Show the layer-by-layer solve, step by step (2×2 and 3×3)

Options:
  -n, --size <n>        The cube's side, 2 to 7. 3 when left out
  -l, --length <n>      How many turns a scramble has. The usual length for the size when left out
  -c, --count <n>       How many scrambles, 1 to 100
  -s, --seed <seed>     The same seed gives the same scrambles, everywhere
      --faces           Scramble with the outer faces only: no inner layers
  -f, --from <turns>    The scramble the cube starts from
      --state <state>   The cube to start from, as its 6 × n × n letters
      --stdin           Read the turns from standard input
  -j, --json            Print JSON
      --lang <en|ja>    English or Japanese
      --no-color        No colour
  -h, --help            This help
  -v, --version         The version
`;

const USAGE_JA = `使い方: kyuubu [オプション] [回転記号]

コマンドラインで回すキューブです。スクランブル、回転、確認、解き方を扱います。
回転は回転記号で書きます。シェルが ' を読んでしまうので、引用符で囲んでください。

  kyuubu                                   3×3のスクランブル
  kyuubu -n 4 -c 5                         4×4のスクランブルを5個
  kyuubu --seed "club night"               同じシードなら、だれでも同じスクランブル
  kyuubu --apply "R U R' U'"               その回転のあとのキューブ
  kyuubu --verify --from "R U" "U' R'"     その回転でスクランブルがそろうかどうか
  kyuubu --solve "R U2 F' L"               そのスクランブルを一段ずつそろえる手順

すること:
      --scramble        スクランブルを表示します（何も指定しないときの動作）
      --apply           回転を行い、キューブを表示します
      --verify          回転でキューブがそろうかを答えます。そろえば終了コード0、そろわなければ1
      --solve           一段ずつそろえる手順を表示します（2×2と3×3）

オプション:
  -n, --size <n>        キューブの大きさ（2〜7）。省略時は3
  -l, --length <n>      スクランブルの手数。省略時はその大きさの標準の手数
  -c, --count <n>       スクランブルの個数（1〜100）
  -s, --seed <seed>     同じシードなら、どこでも同じスクランブル
      --faces           外側の面だけでスクランブルします（内側の層は回しません）
  -f, --from <回転>     はじめのスクランブル
      --state <状態>    はじめのキューブの状態（6 × n × n 文字）
      --stdin           回転を標準入力から読みます
  -j, --json            JSONで表示します
      --lang <en|ja>    英語または日本語
      --no-color        色を付けません
  -h, --help            このヘルプ
  -v, --version         バージョン
`;

const CLI: Readonly<Record<KyuubuLanguage, CliWords>> = {
  en: {
    cliUsage: USAGE_EN,
    cliBadOption: "unknown option {option}",
    cliNeedsValue: "{option} needs a value",
    cliOneMode: "choose one of --scramble, --apply, --verify and --solve",
    cliBadSize: "“{value}”: a cube is 2 to 7 on a side",
    cliBadLength: "“{value}”: a scramble is 1 to 1000 turns",
    cliBadCount: "“{value}”: 1 to 100 scrambles at a time",
    cliBadLang: "“{value}”: the languages are en and ja",
    cliBadMoves: "“{part}” is not a turn a {n}×{n} cube can make",
    cliBadState: "that is not a {n}×{n} cube: it takes {count} letters, {each} each of U, R, F, D, L and B",
    cliNoMethod: "the step-by-step solve is for the 2×2 and the 3×3",
    cliImpossible: "this cube cannot be solved by turning it: a piece has been twisted or swapped",
    cliNeedsStart: "--verify needs the cube it starts from: --from \"<scramble>\" or --state <state>",
    cliSolvedIn: "Solved. Moves: {count}",
    cliNotSolvedAfter: "Not solved. Moves: {count}",
    cliAlreadySolved: "Already solved",
    cliSteps: "Steps: {steps}. Moves: {count}",
    cliState: "state",
  },
  ja: {
    cliUsage: USAGE_JA,
    cliBadOption: "不明なオプションです: {option}",
    cliNeedsValue: "{option} には値が必要です",
    cliOneMode: "--scramble、--apply、--verify、--solve のうち1つを選んでください",
    cliBadSize: "「{value}」: キューブの大きさは2〜7です",
    cliBadLength: "「{value}」: スクランブルは1〜1000手です",
    cliBadCount: "「{value}」: 一度に作れるスクランブルは1〜100個です",
    cliBadLang: "「{value}」: 言語は en か ja です",
    cliBadMoves: "「{part}」は{n}×{n}のキューブでは回せません",
    cliBadState: "{n}×{n}のキューブの状態ではありません。U・R・F・D・L・B を{each}個ずつ、合わせて{count}文字が必要です",
    cliNoMethod: "手順を表示できるのは2×2と3×3だけです",
    cliImpossible: "このキューブは回すだけではそろいません。パーツがねじれているか、入れ替わっています",
    cliNeedsStart: "--verify には、はじめのキューブが必要です: --from \"<スクランブル>\" または --state <状態>",
    cliSolvedIn: "完成。手数: {count}",
    cliNotSolvedAfter: "未完成。手数: {count}",
    cliAlreadySolved: "すでに完成しています",
    cliSteps: "ステップ数: {steps}、手数: {count}",
    cliState: "状態",
  },
};

// Marked pure, so that a bundler drops the whole table, the help above with it, from a page that never asks for it.
function both(language: KyuubuLanguage): KyuubuStrings {
  return { ...WORDS[language], ...CLI[language] };
}

/** The package's words in both languages. A page in a third language passes its own table where one is taken: `{ ...STRINGS.en, solved: "Resuelto" }`. */
export const STRINGS: Readonly<Record<KyuubuLanguage, KyuubuStrings>> = {
  en: /* @__PURE__ */ both("en"),
  ja: /* @__PURE__ */ both("ja"),
};
