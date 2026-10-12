---
title: 状態と回転記号
section: explanation
order: 6
description: 状態と回転記号の使い方と注意点。
---

## ステッカーが状態になる

状態は U、R、F、D、L、B の面順で、ステッカーごとに文字を並べます。幾何の補助関数で位置と外向きの法線に対応づけます。回転には軸、層、4 分の 1 回転の数を指定します。置換でステッカーを動かし、新しい文字列を返すので、入力は変わりません。

## 向きが変わっても揃っている

`cubeSolved`は各面が一色かを確認します。揃ったキューブを持ち替えても揃ったままです。`isCubeState`は長さと色の数を確認しますが、実際の回転で到達できるかまでは判定しません。

```ts
import { cubeSolved, parseMoves, solvedCube, turnAll } from "@johnmorrisdotca/kyuubu";

const original = solvedCube(3);
const rotated = turnAll(original, 3, parseMoves("x y", 3)!);
console.log(original === rotated);
console.log(cubeSolved(rotated, 3));
```

## 記号と再構成

`parseMove` と `parseMoves`は層の回転を読み、読み取れない場合は null を返します。`parseSolve`は手順の単位、幅のある回転、全体の回転を保ちます。問題のある記号の位置と、そこまで読めた手順を返します。全体の回転はソルブの手数に数えません。[記号の API](api:parseSolve)と[表示の説明](../../DISPLAY.md)に詳細があります。

## エントリーを分ける

基本エンジンは Node でも使えます。React、再生の操作、直方体の描画、有名なソルブのデータは別のエントリーです。ドキュメントを作る開発用ツールは npm パッケージの実行時依存には入りません。
