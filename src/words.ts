import type { SolveAlgorithm, SolveStage } from "./solve.ts";

/**
 * THE WORDS THE CUBE ITSELF SAYS, in English and Japanese: what a screen
 * reader calls it, whether it is solved, the names of the steps of a solve
 * and what each is for, and the names of the method's algorithms. They are
 * kept apart from the command line's words (`strings.ts`), so that a page
 * that only draws a cube carries only these.
 *
 * `{n}` and the other braces are filled in when a line is shown; a table in
 * another language must keep them.
 */
export type CubeWords = {
  cubeLabel: string;
  solved: string;
  notSolved: string;
  stageHold: string;
  stageWhiteCross: string;
  stageWhiteCorners: string;
  stageWhiteLayer: string;
  stageMiddleLayer: string;
  stageYellowCross: string;
  stageYellowFace: string;
  stageYellowCorners: string;
  stageYellowEdges: string;
  saysHold: string;
  saysWhiteCross: string;
  saysWhiteCorners: string;
  saysWhiteLayer: string;
  saysMiddleLayer: string;
  saysYellowCross: string;
  saysYellowFace: string;
  saysYellowCorners: string;
  saysYellowEdges: string;
  algCornerIn: string;
  algEdgeRight: string;
  algEdgeLeft: string;
  algYellowCross: string;
  algSune: string;
  algCornerCycle: string;
  algEdgeCycle: string;
};

/** The two languages the package speaks. */
export type KyuubuLanguage = "en" | "ja";

/** The cube's words in both languages. `STRINGS` in `strings.ts` is these and the command line's together. */
export const WORDS: Readonly<Record<KyuubuLanguage, CubeWords>> = {
  en: {
    cubeLabel: "A {n}×{n} cube",
    solved: "Solved",
    notSolved: "Not solved",
    stageHold: "Hold it",
    stageWhiteCross: "White cross",
    stageWhiteCorners: "White corners",
    stageWhiteLayer: "White layer",
    stageMiddleLayer: "Middle layer",
    stageYellowCross: "Yellow cross",
    stageYellowFace: "Yellow face",
    stageYellowCorners: "Yellow corners",
    stageYellowEdges: "Yellow edges",
    saysHold: "Turn the whole cube so that white is on the bottom.",
    saysWhiteCross: "Put a white edge in its place on the bottom, with its other colour matching the side.",
    saysWhiteCorners: "Put a white corner in its place on the bottom, between the edges of the cross.",
    saysWhiteLayer: "Put a white corner in its place on the bottom.",
    saysMiddleLayer: "Drop an edge from the top into its place in the middle layer.",
    saysYellowCross: "Make a yellow cross on the top.",
    saysYellowFace: "Turn the whole top yellow.",
    saysYellowCorners: "Move the top corners to their own places.",
    saysYellowEdges: "Move the top edges to their own places, and the cube is solved.",
    algCornerIn: "Corner in",
    algEdgeRight: "Edge in, to the right",
    algEdgeLeft: "Edge in, to the left",
    algYellowCross: "Yellow cross",
    algSune: "Sune",
    algCornerCycle: "Three corners round",
    algEdgeCycle: "Three edges round",
  },
  ja: {
    cubeLabel: "{n}×{n}のキューブ",
    solved: "完成",
    notSolved: "未完成",
    stageHold: "持ち方",
    stageWhiteCross: "白のクロス",
    stageWhiteCorners: "白のコーナー",
    stageWhiteLayer: "白の面",
    stageMiddleLayer: "二段目",
    stageYellowCross: "黄色のクロス",
    stageYellowFace: "黄色の面",
    stageYellowCorners: "黄色のコーナー",
    stageYellowEdges: "黄色のエッジ",
    saysHold: "キューブ全体を回して、白を下にします。",
    saysWhiteCross: "白のエッジを下の面の正しい位置に入れ、もう一方の色を側面に合わせます。",
    saysWhiteCorners: "白のコーナーを、下の面のクロスのエッジの間に入れます。",
    saysWhiteLayer: "白のコーナーを下の面の正しい位置に入れます。",
    saysMiddleLayer: "上の面のエッジを二段目の正しい位置に入れます。",
    saysYellowCross: "上の面に黄色のクロスを作ります。",
    saysYellowFace: "上の面をすべて黄色にします。",
    saysYellowCorners: "上の面のコーナーを正しい位置に動かします。",
    saysYellowEdges: "上の面のエッジを正しい位置に動かすと、キューブの完成です。",
    algCornerIn: "コーナーを入れる",
    algEdgeRight: "エッジを右に入れる",
    algEdgeLeft: "エッジを左に入れる",
    algYellowCross: "黄色のクロス",
    algSune: "Sune",
    algCornerCycle: "コーナーの三点交換",
    algEdgeCycle: "エッジの三点交換",
  },
};

/** A line of a table with its braces filled in: `fill("A {n}×{n} cube", { n: 3 })` is "A 3×3 cube". A brace with nothing to fill it is left as it is. */
export function fill(text: string, values: Readonly<Record<string, string | number>> = {}): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

const upper = (text: string) => text[0].toUpperCase() + text.slice(1);

/** The name of a step of the solve, as a person would say it: "White cross", 「白のクロス」. */
export function stageName(stage: SolveStage, language: KyuubuLanguage = "en"): string {
  return WORDS[language][`stage${upper(stage)}` as keyof CubeWords];
}

/** What a step of the solve is for, in a sentence: "Make a yellow cross on the top." */
export function stageSays(stage: SolveStage, language: KyuubuLanguage = "en"): string {
  return WORDS[language][`says${upper(stage)}` as keyof CubeWords];
}

/** The name of one of the method's algorithms, as a person would say it: "Sune", 「コーナーの三点交換」. */
export function algorithmName(algorithm: SolveAlgorithm, language: KyuubuLanguage = "en"): string {
  return WORDS[language][`alg${upper(algorithm)}` as keyof CubeWords];
}

/** The language a tag names, as far as the package speaks it: anything beginning "ja" is Japanese, and the rest is English. */
export function languageOf(tag: string | null | undefined): KyuubuLanguage {
  return String(tag ?? "").toLowerCase().startsWith("ja") ? "ja" : "en";
}
