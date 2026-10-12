---
title: はじめに
section: tutorial
order: 1
description: はじめにの使い方と注意点。
---

パッケージを入れ、キューブをスクランブルし、元に戻してから、ページに操作できる表示を置きます。状態を扱うエンジンはブラウザーなしでも動きます。単独の TypeScript の例には Node 22 以降を使います。

## インストール

```sh
npm install @johnmorrisdotca/kyuubu
```

実行時の依存パッケージはなく、型も含まれています。React は別の React エントリーを使うときだけ必要です。

## ページなしで回す

```ts
import { cubeSolved, movesNotation, parseMoves, seededRandom, randomScramble, solvedCube, turnAll, undoAll } from "@johnmorrisdotca/kyuubu";

const scramble = randomScramble(3, 8, seededRandom("daily-cube"));
const start = turnAll(solvedCube(3), 3, scramble);
console.log(movesNotation(scramble, 3));
console.log(cubeSolved(start, 3));
console.log(cubeSolved(turnAll(start, 3, undoAll(scramble)), 3));
console.log(parseMoves("not a move", 3));
```

同じシードからは同じ乱数列が出ます。状態は面の文字を並べた文字列で、回すたびに新しい文字列が返ります。読み取り結果を確認してからエンジンに渡します。

## ページに置く

[キューブを表示する](mount-a-cube.md)へ進みます。[公開 API](entry:main)にはエンジン、テーマ、ガイド、入力の補助関数があります。再生と直方体には別のエントリーがあります。

## 次に読む

[ソルブを再生する](replay-a-solve.md)、[直方体を使う](use-a-cuboid.md)、[埋め込みと共有](embed-and-share.md)、[困ったとき](troubleshooting.md)を参照してください。
