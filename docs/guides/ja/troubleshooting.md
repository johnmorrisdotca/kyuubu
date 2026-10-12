---
title: 困ったとき・よくある質問
section: troubleshooting
order: 9
description: 困ったとき・よくある質問の使い方と注意点。
---

## 表示が空になる

表示先の大きさと位置指定を確認します。表示用のエントリーを読み込み、カスタム要素なら定義用のエントリーも読み込んでください。エンジンだけでは要素は登録されません。[キューブを表示する](mount-a-cube.md)が最小の設定です。

## 読み取りが null になる

`parseMove` と `parseMoves`は不明な記号や存在しない層を拒否します。`decodeCubeMoves`は不正なコードを拒否します。位置と理由には `parseSolve`を使います。直方体では長方形の断面の 4 分の 1 回転も拒否します。`readCuboidMoves`で記号と理由を確認できます。`parseCuboidDims`は対応しない寸法を拒否します。`readSolveLink`は対応する alg.cubing.net のリンクを読み、任意の URL は読みません。

## その他の null と undefined

`solveSteps`は 2×2 と 3×3 以外では null です。`moveName` と `cuboidMoveName`は対応しない標準表記では null です。ドラッグが短すぎるか曖昧な間は選択が null になり、離しても回転が確定しない場合も null です。単一の動きではない組み合わせには説明やヒントを作れません。十分に見える側面がないと、全体回転の face や arrow も null です。`cubeWidthPx`が null のときは表示先の幅を使います。

`fromJSON` と `fromText`は読めない書き出しに null を返します。JSON は記録を再構成し、渡された計算済みの状態を使いません。不正な記録を省く場合があります。`famousSolve` と `cuboidPreset`は未知のキーで undefined、`paceFromAttribute`は既定値を使う場合に undefined です。プランのないプレイヤーでは plan や status が null で、fault に理由があります。マウント前の React ref は null です。要素の文字列プロパティは属性がなければ null です。

## 読めたソルブが未完成

読める再生プランでも `solved: false`の場合があります。入力された再構成をそのまま保つためです。入力を拒否する `ok: false`とは異なります。ステッカーの数が正しくても、実際に到達できる状態とは限りません。

## 直方体の回転が例外になる

基本エンジンには可能な回転を渡します。先に `cuboidMoveLegal`で確認するか、寸法を使って読み取ってください。不正な回転は RangeError になり、半回転へ勝手に変わりません。

## ソルブを保存・送信するか

エンジンとビルダーは記録を送信しません。ビルダーの設定はアドレスに入ります。履歴の保存は表示先のアプリが選びます。書き出すファイルは端末内で作られます。新しい日本語の説明はリリース前に確認が必要です。
