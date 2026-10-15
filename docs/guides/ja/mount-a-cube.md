---
title: キューブを表示する
section: how-to
order: 2
description: 表示先の要素にキューブを描き、入力、色、Reactコンポーネントを設定します。
---

## 表示先の大きさを決める

[CubeView](api:CubeView)は表示先いっぱいに描画します。幅、高さとrelativeまたはabsoluteの位置指定を設定します。エンジンを読み込むだけでは表示は作られません。

```ts no-run
import { CubeView, CUBE_THEMES } from "@johnmorrisdotca/kyuubu";

const host = document.createElement("div");
host.style.cssText = "width:300px;height:300px;position:relative";
document.body.append(host);
const cube = new CubeView(host, {
  size: 3, interactive: true, keyboard: "focus", theme: CUBE_THEMES.paper,
  onTurn: (move, state) => console.log(move, state),
});
console.log(cube.state);
// Call cube.destroy() before discarding the host.
```

## 入力と色を選ぶ

`interactive: true`で操作できます。`keyboard: "focus"`はフォーカスのあるキューブだけでキーを受け取り、`"none"`はアプリ側にキーを任せます。テーマで配色をまとめて指定し、`colours`でU、R、F、D、L、Bの各面を上書きできます。表示の言語には`locale: "en"`または`"ja"`を使います。

## Reactで使う

[Reactエントリー](entry:react)には`Kyuubu`と`KyuubuMoves`があります。コンポーネントが表示の作成と片付けを行います。`size`は必須です。独自の`className`を使う場合は、大きさと位置を指定してください。指定しない場合は、幅に合わせた正方形になります。手動で回す場合は`KyuubuHandle`のrefを使います。

## 片付ける

直接作った表示、プレイヤー、ガイド、一覧には`destroy()`を呼び、イベントとアニメーションを片付けます。詳しい表示設定は[Display](../../DISPLAY.md)にあります。
