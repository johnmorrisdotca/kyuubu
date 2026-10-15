---
title: 直方体を使う
section: how-to
order: 4
description: 直方体の寸法を選び、断面の形に合う回転を使い、直方体を表示して再生します。
---

## 寸法を選ぶ

箱形のパズルには[直方体エンジン](entry:cuboid)を使います。寸法はx、y、zの順で、それぞれ1から7の整数です。1×1×1は回せる層がないため使えません。厚さが1個の方向はパズル全体であり、層の回転にはなりません。

## 断面の形に合わせる

正方形の断面は4分の1回転ができ、長方形の断面は半回転だけです。`readCuboidMoves`は読み取れない記号と理由を返し、別の回転へ勝手に変えません。

```ts
import { legalTurns, readCuboidMoves, solvedCuboid, turnAllCuboid } from "@johnmorrisdotca/kyuubu/cuboid";

const dims = [2, 3, 3] as const;
console.log(legalTurns(dims, 0, 0));
console.log(legalTurns(dims, 1, 0));
const reading = readCuboidMoves("R U2", dims);
if (reading.ok) console.log(turnAllCuboid(solvedCuboid(dims), dims, reading.moves));
else console.log(reading.token, reading.fault);
```

## 表示と再生

[CuboidView](api:CuboidView)には`size`の代わりに`dims`を渡します。[直方体プレイヤー](entry:cuboid-play)と[要素](entry:cuboid-element)も同じ回転の規則を守ります。詳しくは[Cuboids](../../cuboids.md)と[使い方](../../CUBOIDS-USE.md)を参照してください。
