---
title: Getting started
section: tutorial
order: 1
description: Learn getting started.
---

Install the package, scramble a cube, undo the scramble and put an interactive view on a page. The state engine works without a browser. Use Node 22 or later for the standalone TypeScript examples.

## Install

```sh
npm install @johnmorrisdotca/kyuubu
```

The package has no runtime dependencies and includes its types. React is an optional peer for the separate React entry.

## Turn a cube without a page

```ts
import { cubeSolved, movesNotation, parseMoves, seededRandom, randomScramble, solvedCube, turnAll, undoAll } from "@johnmorrisdotca/kyuubu";

const scramble = randomScramble(3, 8, seededRandom("daily-cube"));
const start = turnAll(solvedCube(3), 3, scramble);
console.log(movesNotation(scramble, 3));
console.log(cubeSolved(start, 3));
console.log(cubeSolved(turnAll(start, 3, undoAll(scramble)), 3));
console.log(parseMoves("not a move", 3));
```

The same seed gives the same random sequence. A state is a string of face letters; each move returns a new string. Always check a parser's result before handing it to the engine.

## Put it on a page

Continue with [Mount a cube](mount-a-cube.md). The [public reference](entry:main) includes the engine, themes, guide and input helpers. Replay and cuboids have separate entries, so choose the part your application needs.

## Next steps

[Replay a solve](replay-a-solve.md), [Use a cuboid](use-a-cuboid.md), [Embed and share](embed-and-share.md) and [Troubleshooting](troubleshooting.md) cover the next jobs.
