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
  playerPlay: string;
  playerPause: string;
  playerBack: string;
  playerOn: string;
  playerAgain: string;
  playerLoop: string;
  playerSpeed: string;
  playerOwnPace: string;
  playerMoveOf: string;
  playerScrub: string;
  playerUnsolved: string;
  playerCannotRead: string;
  playerNoSuchLayer: string;
  playerTooLong: string;
  playerEvenPace: string;
  playerCredit: string;
  guideSideR: string;
  guideSideL: string;
  guideSideU: string;
  guideSideD: string;
  guideSideF: string;
  guideSideB: string;
  guideFace: string;
  guideInner: string;
  guideWide: string;
  guideMiddleM: string;
  guideMiddleE: string;
  guideMiddleS: string;
  guideTowards: string;
  guideAway: string;
  guideToRight: string;
  guideToLeft: string;
  guideClockwise: string;
  guideAnticlockwise: string;
  guideTurn: string;
  guideHalf: string;
  guideWholeX: string;
  guideWholeXPrime: string;
  guideWholeX2: string;
  guideWholeY: string;
  guideWholeYPrime: string;
  guideWholeY2: string;
  guideWholeZ: string;
  guideWholeZPrime: string;
  guideWholeZ2: string;
  guideDrag: string;
  guideDragHalf: string;
  guideDragSlab: string;
  guideLook: string;
  guideWholeHow: string;
  guideOff: string;
  guideOffHow: string;
  guideTakeBack: string;
  guideDoIt: string;
  guideDone: string;
  guideLabel: string;
  playerFollow: string;
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
    playerPlay: "Play",
    playerPause: "Pause",
    playerBack: "Back",
    playerOn: "Forward",
    playerAgain: "To the scramble",
    playerLoop: "Repeat",
    playerSpeed: "Speed",
    playerOwnPace: "Real speed",
    playerMoveOf: "Move {at} of {total}",
    playerScrub: "Where in the solve",
    playerUnsolved: "These moves do not end on a solved cube.",
    playerCannotRead: "“{token}” is not a move (line {line}, place {column}).",
    playerNoSuchLayer: "“{token}” turns a layer this cube does not have (line {line}, place {column}).",
    playerTooLong: "That is too long to play.",
    playerEvenPace: "The solve took {time} seconds. Its moves are spread evenly over that time here; the real solve was not this even.",
    playerCredit: "Kyuubu",
    guideSideR: "right",
    guideSideL: "left",
    guideSideU: "top",
    guideSideD: "bottom",
    guideSideF: "front",
    guideSideB: "back",
    guideFace: "the {side} face",
    guideInner: "layer {depth} in from the {side}",
    guideWide: "the {count} layers on the {side}",
    guideMiddleM: "the middle layer between left and right",
    guideMiddleE: "the middle layer between top and bottom",
    guideMiddleS: "the middle layer between front and back",
    guideTowards: "towards you",
    guideAway: "away from you",
    guideToRight: "to the right",
    guideToLeft: "to the left",
    guideClockwise: "clockwise, as you look at the front",
    guideAnticlockwise: "anticlockwise, as you look at the front",
    guideTurn: "Turn {layers} {way}.",
    guideHalf: "Turn {layers} half way round.",
    guideWholeX: "Turn the whole cube so that the front goes to the top.",
    guideWholeXPrime: "Turn the whole cube so that the front goes to the bottom.",
    guideWholeX2: "Turn the whole cube upside down, rolling it forwards.",
    guideWholeY: "Turn the whole cube so that the front goes to the left.",
    guideWholeYPrime: "Turn the whole cube so that the front goes to the right.",
    guideWholeY2: "Turn the whole cube round, so that the back comes to the front.",
    guideWholeZ: "Turn the whole cube so that the top goes to the right.",
    guideWholeZPrime: "Turn the whole cube so that the top goes to the left.",
    guideWholeZ2: "Turn the whole cube upside down, rolling it sideways.",
    guideDrag: "Take hold of the sticker with the dot, and drag it along the arrow.",
    guideDragHalf: "A half turn: drag twice as far, or make two quarter turns the same way.",
    guideDragSlab: "{count} layers turn together: drag each of them along the arrow.",
    guideLook: "Drag beside the cube to look round it, until you can see a side of the lit layer.",
    guideWholeHow: "No drag on a sticker does this: press {key}, or choose “{button}”.",
    guideOff: "You turned {made}, not {wanted}.",
    guideOffHow: "Take it back to carry on from where you were, or turn it back yourself.",
    guideTakeBack: "Take it back",
    guideDoIt: "Turn it for me",
    guideDone: "That was the last move.",
    guideLabel: "What to turn next",
    playerFollow: "Turn it yourself",
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
    playerPlay: "再生",
    playerPause: "一時停止",
    playerBack: "戻る",
    playerOn: "進む",
    playerAgain: "スクランブルに戻す",
    playerLoop: "くり返す",
    playerSpeed: "速さ",
    playerOwnPace: "実際の速さ",
    playerMoveOf: "{total}手中{at}手目",
    playerScrub: "ソルブの位置",
    playerUnsolved: "この手順ではキューブはそろいません。",
    playerCannotRead: "「{token}」は回転記号ではありません（{line}行目、{column}文字目）。",
    playerNoSuchLayer: "「{token}」はこのキューブにない層を回します（{line}行目、{column}文字目）。",
    playerTooLong: "長すぎて再生できません。",
    playerEvenPace: "このソルブのタイムは{time}秒です。ここでは各手をその時間に均等に割り振っています。実際のソルブはこれほど均等ではありません。",
    playerCredit: "Kyuubu",
    guideSideR: "右",
    guideSideL: "左",
    guideSideU: "上",
    guideSideD: "下",
    guideSideF: "前",
    guideSideB: "後ろ",
    guideFace: "{side}の面",
    guideInner: "{side}から{depth}番目の層",
    guideWide: "{side}側の{count}層",
    guideMiddleM: "左右の間の中央の層",
    guideMiddleE: "上下の間の中央の層",
    guideMiddleS: "前後の間の中央の層",
    guideTowards: "手前に",
    guideAway: "奥に",
    guideToRight: "右に",
    guideToLeft: "左に",
    guideClockwise: "正面から見て時計回りに",
    guideAnticlockwise: "正面から見て反時計回りに",
    guideTurn: "{layers}を{way}回します。",
    guideHalf: "{layers}を半回転させます。",
    guideWholeX: "キューブ全体を回して、前の面を上にします。",
    guideWholeXPrime: "キューブ全体を回して、前の面を下にします。",
    guideWholeX2: "キューブ全体を前に転がして、上下を逆にします。",
    guideWholeY: "キューブ全体を回して、前の面を左にします。",
    guideWholeYPrime: "キューブ全体を回して、前の面を右にします。",
    guideWholeY2: "キューブ全体を回して、後ろの面を前にします。",
    guideWholeZ: "キューブ全体を回して、上の面を右にします。",
    guideWholeZPrime: "キューブ全体を回して、上の面を左にします。",
    guideWholeZ2: "キューブ全体を横に転がして、上下を逆にします。",
    guideDrag: "点のあるステッカーを持って、矢印に沿ってドラッグします。",
    guideDragHalf: "半回転です。2倍の距離をドラッグするか、同じ向きに2回回します。",
    guideDragSlab: "{count}つの層を一緒に回します。それぞれを矢印に沿ってドラッグします。",
    guideLook: "キューブの外側をドラッグして、光っている層の側面が見えるまで見る向きを変えます。",
    guideWholeHow: "ステッカーのドラッグではできません。{key}を押すか、「{button}」を選びます。",
    guideOff: "{wanted}ではなく{made}を回しました。",
    guideOffHow: "取り消して元の位置から続けるか、自分で回して戻します。",
    guideTakeBack: "取り消す",
    guideDoIt: "代わりに回す",
    guideDone: "これが最後の手でした。",
    guideLabel: "次に回す手",
    playerFollow: "自分で回す",
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
