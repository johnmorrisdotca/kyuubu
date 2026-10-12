---
title: Use a cuboid
section: how-to
order: 4
description: Learn use a cuboid.
---

## Choose dimensions

Import the [cuboid engine](entry:cuboid) for box-shaped puzzles. Dimensions are x, y and z, each a whole number from 1 to 7; 1×1×1 is refused because it has no layer to turn. A side one cubie deep is the whole puzzle, not a legal layer turn.

## Respect the slice

A square slice can make quarter turns; a rectangular slice only half turns. `readCuboidMoves` explains a refused token instead of silently changing it.

```ts
import { legalTurns, readCuboidMoves, solvedCuboid, turnAllCuboid } from "@johnmorrisdotca/kyuubu/cuboid";

const dims = [2, 3, 3] as const;
console.log(legalTurns(dims, 0, 0));
console.log(legalTurns(dims, 1, 0));
const reading = readCuboidMoves("R U2", dims);
if (reading.ok) console.log(turnAllCuboid(solvedCuboid(dims), dims, reading.moves));
else console.log(reading.token, reading.fault);
```

## Draw and replay

[CuboidView](api:CuboidView) takes `dims` instead of `size`. [The cuboid player](entry:cuboid-play) and [element](entry:cuboid-element) preserve the same legality rules. The full shape and notation material remains in [Cuboids](../cuboids.md) and [Cuboid usage](../CUBOIDS-USE.md).
