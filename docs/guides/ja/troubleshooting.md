---
title: 困ったとき・よくある質問
section: troubleshooting
order: 9
description: 表示が空になる、読み取りがnullになる、例外が出るといった場合の原因と、保存や送信の扱いを確認します。
---

## 表示が空になる

表示先の大きさと位置指定を確認します。表示用のエントリーを読み込み、カスタム要素なら定義用のエントリーも読み込んでください。エンジンだけでは要素は登録されません。[キューブを表示する](mount-a-cube.md)が最小の設定です。

## 読み取りがnullになる

`parseMove`と`parseMoves`は不明な記号や存在しない層を拒否します。`decodeCubeMoves`は不正なコードを拒否します。位置と理由には`parseSolve`を使います。直方体では長方形の断面の4分の1回転も拒否します。`readCuboidMoves`で記号と理由を確認できます。`parseCuboidDims`は対応しない寸法を拒否します。`readSolveLink`は対応するalg.cubing.netのリンクを読み、任意のURLは読みません。

## その他のnullとundefined

`solveSteps`は2×2と3×3以外ではnullです。`moveName`と`cuboidMoveName`は対応しない標準表記ではnullです。ドラッグが短すぎるか曖昧な間は選択がnullになり、離しても回転が確定しない場合もnullです。単一の動きではない組み合わせには説明やヒントを作れません。十分に見える側面がないと、全体回転のfaceやarrowもnullです。`cubeWidthPx`がnullのときは表示先の幅を使います。

`fromJSON`と`fromText`は読めない書き出しにnullを返します。JSONは記録を再構成し、渡された計算済みの状態を使いません。不正な記録を省く場合があります。`famousSolve`と`cuboidPreset`は未知のキーでundefined、`paceFromAttribute`は既定値を使う場合にundefinedです。プランのないプレイヤーではplanやstatusがnullで、faultに理由があります。マウント前のReact refはnullです。要素の文字列プロパティは属性がなければnullです。

## 読めたソルブが未完成

読める再生プランでも`solved: false`の場合があります。入力された再構成をそのまま保つためです。入力を拒否する`ok: false`とは異なります。ステッカーの数が正しくても、実際に到達できる状態とは限りません。

## 直方体の回転が例外になる

基本エンジンには可能な回転を渡します。先に`cuboidMoveLegal`で確認するか、寸法を使って読み取ってください。不正な回転はRangeErrorになり、半回転へ勝手に変わりません。

## ソルブは保存・送信されますか

エンジンとビルダーは記録を送信しません。ビルダーの設定はアドレスに入ります。履歴の保存は表示先のアプリが選びます。書き出すファイルは端末内で作られます。
