---
title: ソルブを再生する
section: how-to
order: 3
description: ソルブを再生するの使い方と注意点。
---

## 回転記号を先に確認する

[planReplay](api:planReplay)は読み取れない入力と、読み取れるが未完成のソルブを区別します。`ok: false`の場合は問題のある部分が返ります。`ok: true`には状態と時間配分が入り、最後まで揃ったかは `plan.solved`で確認できます。

```ts
import { planReplay } from "@johnmorrisdotca/kyuubu";

const result = planReplay({ size: 3, scramble: "R U", solution: "U' R'", timeMs: 1200 });
if (result.ok) console.log(result.plan.solved, result.plan.totalMs);
else console.log(result.fault.part, result.fault.fault?.token);
```

## 再生の操作を置く

[プレイヤー](entry:player)は React なしでキューブ、手順一覧、スライダーと操作ボタンを表示します。自動再生は任意です。

```ts no-run
import { mountPlayer } from "@johnmorrisdotca/kyuubu/player";

const host = document.createElement("div");
document.body.append(host);
const player = mountPlayer(host, { scramble: "R U", solution: "U' R'", autoplay: false, locale: "en" });
console.log(player.plan?.solved);
player.seek(1);
// Call player.destroy() when removing it.
```

## 時間と記録を選ぶ

`timeMs`はソルブ全体の時間を各手に配り、`stepMs`は各手の時間を指定します。`speed`はプランを書き換えずに再生速度を変えます。[有名なソルブ](entry:famous)は別のデータエントリーなので、必要な場合だけ読み込みます。詳しい説明は[Replay](../../REPLAY.md)にあります。

## ソルブを保存する

`SolveRecord`にはサイズ、スクランブル、ソルブの各手と、任意の時間、日時、シードを入れます。JSON とテキストは書き出して読み戻せます。CSV、Markdown、SQL のダウンロードは[List downloads](../../list-downloads.md)を参照してください。
