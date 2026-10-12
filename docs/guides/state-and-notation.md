---
title: State and notation
section: explanation
order: 6
description: Learn state and notation.
---

## Stickers are the state

The state contains one letter per sticker in U, R, F, D, L, B face order. Geometry helpers map those slots to centres and outward normals. A move identifies axis, layer and quarter turns. Permutations move stickers to their new slots; turns return new strings and leave their inputs intact.

## Solved does not mean one orientation

`cubeSolved` checks that each face has one colour, so rotating a solved cube in the hand keeps it solved. `isCubeState` checks length and colour counts; it does not prove that physical turns can reach that arrangement.

```ts
import { cubeSolved, parseMoves, solvedCube, turnAll } from "@johnmorrisdotca/kyuubu";

const original = solvedCube(3);
const rotated = turnAll(original, 3, parseMoves("x y", 3)!);
console.log(original === rotated);
console.log(cubeSolved(rotated, 3));
```

## Parsing and reconstructions

`parseMove` and `parseMoves` read elementary layer moves and return null for refused notation. `parseSolve` preserves written steps, wide turns and whole-cube rotations; it reports a token's position and keeps the prefix it could read. Whole-cube rotations do not count as solving moves. The [notation](api:parseSolve) and [display details](../DISPLAY.md) retain the full reference.

## Separate entries

The core engine is usable in Node. React, replay controls, cuboid drawing and the famous-solves dataset are separate entries. Development tools that generate these docs add no runtime dependency to the npm package.
