import { moveName } from "../move-name.ts";
import { fill, type KyuubuLanguage } from "../words.ts";

import type { CuboidFault } from "./notation.ts";

/**
 * THE CUBOID'S OWN WORDS, in English and Japanese: what a screen reader calls
 * it and what is said when a move cannot be made. The player's controls say
 * what the cube's do (`WORDS` in `words.ts`). `{braces}` are filled in when a
 * line is shown; a table in another language keeps them.
 */
export type CuboidWords = {
  /** What a screen reader calls a cuboid: `{dims}` is `2×3×3`. */
  cuboidLabel: string;
  /** A piece of notation that is not notation. `{token}` is the piece. */
  faultUnknown: string;
  /** A layer the cuboid does not have. */
  faultNoSuchLayer: string;
  /** A quarter turn of a layer that only half turns; `{half}` is the half turn to write instead. */
  faultHalfTurnOnly: string;
  /** The one layer of a side one cubie deep. */
  faultWholePuzzle: string;
  /** A cuboid that is not one the package makes. */
  faultDims: string;
  /** A solve too long to play. */
  faultLength: string;
};

/** The cuboid's words in both languages. */
export const CUBOID_WORDS: Readonly<Record<KyuubuLanguage, CuboidWords>> = {
  en: {
    cuboidLabel: "A {dims} cuboid",
    faultUnknown: "“{token}” is not a move.",
    faultNoSuchLayer: "“{token}” turns a layer this cuboid does not have.",
    faultHalfTurnOnly: "“{token}” would be a quarter turn, and that layer is not square, so it only makes half turns. Write “{half}”.",
    faultWholePuzzle: "“{token}” is a side one cubie deep, which is the whole puzzle: turning it moves nothing.",
    faultDims: "That is not a cuboid: each side is a whole number from 1 to 7.",
    faultLength: "That is too long to play.",
  },
  ja: {
    cuboidLabel: "{dims}の直方体パズル",
    faultUnknown: "「{token}」は回転記号ではありません。",
    faultNoSuchLayer: "「{token}」はこの直方体にない層を回します。",
    faultHalfTurnOnly: "「{token}」は1/4回転ですが、その層は正方形ではないので半回転しかできません。「{half}」と書いてください。",
    faultWholePuzzle: "「{token}」は奥行きが1つだけの辺で、パズル全体です。回しても何も動きません。",
    faultDims: "直方体ではありません。各辺は1から7までの整数です。",
    faultLength: "長すぎて再生できません。",
  },
};

/** The line that says why a piece of notation is not a move on a cuboid. */
export function faultSays(fault: CuboidFault, token: string, language: KyuubuLanguage = "en"): string {
  const words = CUBOID_WORDS[language];
  const text = { unknown: words.faultUnknown, "no-such-layer": words.faultNoSuchLayer, "half-turn-only": words.faultHalfTurnOnly, "whole-puzzle": words.faultWholePuzzle }[fault];
  return fill(text, { token, half: token.replace(/['2]$/, "") + "2" });
}

/**
 * What a move of a cuboid turns, in a few plain words, in English or Japanese:
 * `R2` is "Right face, twice", `2U2` "Up layer 2, twice", `M2` "Middle slice,
 * twice". It reads what `cuboidMoveNotation` writes (a face, a digit and a
 * face, M, E or S, then nothing, `'` or `2`); null for anything else, and for
 * the cube's wide turns and rotations, which a cuboid has none of.
 *
 * @example
 * cuboidMoveName("R2"); // "Right face, twice"
 */
export function cuboidMoveName(code: string, language: KyuubuLanguage = "en"): string | null {
  return /^([2-7]?[RLUDFB]|[MES])(2|')?$/.test(code) ? moveName(code, language) : null;
}
