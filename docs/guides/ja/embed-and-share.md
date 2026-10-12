---
title: キューブの埋め込みと共有
section: how-to
order: 5
description: キューブの埋め込みと共有の使い方と注意点。
---

## ビルダーから始める

ビルダーでは手で回す表示、ソルブの再生、回り続けるキューブを選べます。プレビューはパッケージ本来のエンジンを使います。選んだ形式のモジュール、フレームワーク、カスタム要素、iframe のコードをコピーします。設定はアドレスに入るので、保存せずに共有できます。

## 要素を登録する

定義用のエントリーを読み込むと `kyuubu-cube` と `kyuubu-scramble`が登録されます。エンジンだけでは登録されません。別のタグ名には define 関数を使います。

```ts no-run
import "@johnmorrisdotca/kyuubu/element/define";

const cube = document.createElement("kyuubu-cube");
cube.setAttribute("scramble", "R U");
cube.setAttribute("moves", "U' R'");
cube.setAttribute("autoplay", "off");
cube.addEventListener("kyuubu-end", () => console.log("Finished"));
document.body.append(cube);
```

## 属性とイベント

[CUBE_ELEMENT_ATTRIBUTES](api:CUBE_ELEMENT_ATTRIBUTES)にサイズ、スクランブル、手順、時間、操作、テーマの属性があります。真偽値の属性は存在すれば有効で、`off`、`false`、`0`、`no`なら無効です。プロパティも属性に対応します。`kyuubu-step`は再生状態を付けて伝播し、`kyuubu-end`は終了時に伝播します。要素を外すとプレイヤーも片付けられます。

`kyuubu-scramble`にはペース、大きさ、幅、シード、入力の別の属性一覧があります。直方体には別の登録エントリーと `dims`を使います。[ビルダーの説明](../../embed-builder.md)に各設定とフレームの通知があります。進行の通知はメタデータで、個人の保存記録は含めません。

## フレームの大きさ

選んだ形式の寸法を使い、幅を表示先に収めます。再生には操作ボタンの場所が必要です。回り続ける表示は指定したスケールまたは幅を使います。
