---
title: The method and the guide
section: explanation
order: 7
description: Learn the method and the guide.
---

## A beginner's method

[solveSteps](api:solveSteps) produces the layer-by-layer method for 2×2 and 3×3, rather than a shortest solution. It holds white on the bottom, then places the pieces with the method's named algorithms. Other sizes return null. Large solver examples should be run separately from page rendering.

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

## A guide hears real turns

[Guide](api:Guide) is a pure state machine. Its source is explicit moves or `{ method: true }`. It asks for the next movement and hears the user's turns: done, part, off or back. A half turn may be completed by two quarter turns, and wide moves may be made one layer at a time. Detours are kept and can be undone.

## Draw a hint

`dragHint` describes a sticker drag; `rotationHint` describes holding and rotating the whole cube, which cannot be made by dragging one sticker. A null hint means that movement cannot be represented by that hint kind or is not one movement. `mountGuide` joins a guide to an interactive CubeView. [Replay and guidance](../REPLAY.md) keeps the detailed walkthrough.
