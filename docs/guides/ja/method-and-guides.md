---
title: 解法とガイド
section: explanation
order: 7
description: 2×2と3×3の初心者向けの解法を求め、実際の回転に反応するガイドで手順を追います。
---

## 初心者の解法

[solveSteps](api:solveSteps)は2×2と3×3の層ごとの解法を返します。最短手順ではありません。白を下に持ち、名前の付いた手順で各パーツを揃えます。それ以外のサイズはnullです。大きなソルバーの例はページの描画とは別に実行してください。

```ts
import { cubeSolved, parseMoves, solveSteps, solvedCube, turnAll } from "@johnmorrisdotca/kyuubu";

const start = turnAll(solvedCube(2), 2, parseMoves("R", 2)!);
const steps = solveSteps(start, 2);
if (steps !== null) {
  console.log(steps.map((step) => step.stage));
  console.log(cubeSolved(turnAll(start, 2, steps.flatMap((step) => step.moves)), 2));
}
console.log(solveSteps(solvedCube(4), 4));
```

## 実際の回転に合わせて進むガイド

[Guide](api:Guide)は表示に依存しない状態機械です。明示した手順または`{ method: true }`を使います。次の動きを示し、操作をdone、part、off、backとして受け取ります。半回転は4分の1回転を2回に分けられ、幅のある回転は層ごとに回せます。寄り道も記録し、戻せます。

## ヒントを表示する

`dragHint`はステッカーのドラッグ、`rotationHint`は持ち替えによる全体の回転を示します。全体の回転はステッカー1枚のドラッグではできません。nullは、その種類のヒントで表せないか、単一の動きではないことを示します。`mountGuide`でガイドを操作可能なCubeViewに結びます。[再生とガイド](../../REPLAY.md)に詳しい説明があります。
