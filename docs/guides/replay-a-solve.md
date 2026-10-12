---
title: Replay a solve
section: how-to
order: 3
description: Learn replay a solve.
---

## Validate the notation first

[planReplay](api:planReplay) distinguishes a refused input from a valid but unfinished solve. `ok: false` identifies the failed part. `ok: true` supplies the states and timing; inspect `plan.solved` to know whether the last state is solved.

```ts
import { planReplay } from "@johnmorrisdotca/kyuubu";

const result = planReplay({ size: 3, scramble: "R U", solution: "U' R'", timeMs: 1200 });
if (result.ok) console.log(result.plan.solved, result.plan.totalMs);
else console.log(result.fault.part, result.fault.fault?.token);
```

## Mount the controls

The [player entry](entry:player) draws the cube, move list, slider and controls without requiring React. Autoplay is optional.

```ts no-run
import { mountPlayer } from "@johnmorrisdotca/kyuubu/player";

const host = document.createElement("div");
document.body.append(host);
const player = mountPlayer(host, { scramble: "R U", solution: "U' R'", autoplay: false, locale: "en" });
console.log(player.plan?.solved);
player.seek(1);
// Call player.destroy() when removing it.
```

## Choose timing and records

`timeMs` spreads the recorded solve time across its moves; `stepMs` supplies per-step timing. `speed` changes playback without rewriting the plan. [Famous solves](entry:famous) is a separate data entry; import it only when needed. The longer walkthrough remains in [Replay](../REPLAY.md).

## Save a solve

A `SolveRecord` stores size, scramble moves, solve moves and optional timing, date and seed. `toJSON`/`fromJSON` and `toText`/`fromText` provide round trips; CSV, Markdown and SQL downloads are described in [List downloads](../list-downloads.md).
