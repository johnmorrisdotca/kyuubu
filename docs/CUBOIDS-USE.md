# Cuboids: the shapes, the entry points and more

Box-shaped turning puzzles from 1×1×2 to 7×7×7. The notation, scrambles and drags are in [cuboids.md](cuboids.md). Moved here from [the README](../README.md) to keep it under the length npm shows.

## Cuboids

<p align="center">
  <img src="docs/cuboids.jpg" alt="The cuboids page on green felt: a scrambled 2×3×3 Domino drawn like the cube, a row of the seven named shapes (Brick, Floppy, Tower, Domino, Block, Pillar, Tall pillar) each drawn small, and the chooser for any width, height and depth from 1 to 7" width="720">
  <img src="docs/cuboids-phone.jpg" alt="The same page on a phone in dark mode, in Japanese: a scrambled 3×4×3 pillar on the felt under its shape and move count" width="220">
</p>

A cuboid is a turning puzzle shaped like a box, `a × b × c` cubies with each
side from 1 to 7: the Floppy 1×3×3, the Tower 2×2×3, the Domino 2×3×3, a
3×3×4 pillar, and the 1×2×3 brick, or any other. It has its own entry points
and leaves the cube's untouched. It is drawn, turned, scrambled, written down
and played back the way the cube is.

The rule that makes it different is one line. **A layer may turn a quarter only
where its slice is square, and may always turn a half.** A quarter turn of a
slice that is not square would push its corners out of the box and change the
puzzle's shape; a half turn puts every cubie of it where another one was. So the
Domino's two 3×3 slices turn like a cube's face, and its six 2×3 slices only
half way round. A side one cubie deep (the 1 of a 1×3×3) is the whole puzzle,
and turning it moves nothing: it is not a layer. `1×1×1` has nothing to turn
and is not a cuboid.

```ts
import {
  cuboidSolved, legalTurns, parseCuboidMoves, randomCuboidScramble, readCuboidMove,
  seededRandom, solvedCuboid, turnAllCuboid,
} from "@johnmorrisdotca/kyuubu/cuboid";

const dims = [2, 3, 3] as const;                  // width, height, depth, as the puzzle first sits
legalTurns(dims, 0, 0);                           // [1, 2, 3]: the right and left slices are 3×3, square
legalTurns(dims, 1, 0);                           // [2]: a 2×3 slice, so a half turn only

const scramble = randomCuboidScramble(dims, undefined, seededRandom("club night"));
const mixed = turnAllCuboid(solvedCuboid(dims), dims, scramble);
cuboidSolved(mixed, dims);                        // false: a scramble never leaves it solved
```

On a page, one line draws a puzzle a person can turn:

```ts
import { CuboidView } from "@johnmorrisdotca/kyuubu/cuboid/draw";

const view = new CuboidView(document.getElementById("puzzle"), { dims: [3, 3, 1], keyboard: "page" });
view.turn({ axis: 1, layer: 2, turns: 2 });       // a half turn of the top row of a floppy
```

### The shapes

Each shape is listed once, with its sides in order: `3×3×2` is a Domino turned
on its side. `CUBOID_PRESETS` holds them, with their names and a line in each
language on what is special.

| Shape | Name | What it is |
| --- | --- | --- |
| 1×2×3 | Brick | The smallest with a name: five turns, all half turns, and 192 states |
| 1×3×3 | Floppy | A flat 3×3 one cubie thick: half turns only, 768 states (192 if only the outer slices turn) |
| 2×2×3 | Tower | A 2×2 with a layer added: three layers turn a quarter, the sides only a half |
| 2×3×3 | Domino | A 3×3 cut in half: the two 3×3 slices turn a quarter, the sides only a half |
| 2×3×4 | Block | No slice is square, so every turn is a half turn |
| 3×3×4 | Pillar | A 3×3 with a fourth layer: the four layers turn a quarter, the long sides a half |
| 3×3×5 | Tall pillar | The pillar with a fifth layer, and the biggest named shape |

### The entry points

| Import | Holds |
| --- | --- |
| `@johnmorrisdotca/kyuubu/cuboid` | The model, notation, scramble, named shapes, words, gestures and `planCuboidReplay`: no DOM |
| `@johnmorrisdotca/kyuubu/cuboid/draw` | `CuboidView`: the puzzle drawn in CSS 3D |
| `@johnmorrisdotca/kyuubu/cuboid/play` | `mountCuboidPlayer`: a solve with its controls |
| `@johnmorrisdotca/kyuubu/cuboid/element` | `defineCuboid`: registers `<kyuubu-cuboid>` |
| `@johnmorrisdotca/kyuubu/cuboid/element/define` | Importing it registers `<kyuubu-cuboid>` |

The model's calls are the cube's with `Cuboid` in the name and `dims` for `n`:
`solvedCuboid`, `turnCuboid`, `turnAllCuboid`, `cuboidSolved`, `isCuboidState`,
`legalTurns`, `legalCuboidMoves`, `undoCuboidMove`, `cuboidMovesNotation`,
`parseCuboidMove`, `randomCuboidScramble`. `turnCuboid` throws a `RangeError`
for a turn the puzzle cannot make. `CuboidView` has the cube view's options
(`dims` for `size`) and members, less hints, scale and the wheel's turns, and
its root is marked `data-kyuubu-cuboid` with `data-state`, `data-dims`,
`data-turning`, `data-dragging`, `data-committed` and `data-angle`.

One tag plays a solve on any cuboid:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/cuboid/element-define.js"></script>
<kyuubu-cuboid dims="3x3x1" scramble="U2 R2 M2" moves="M2 R2 U2" controls></kyuubu-cuboid>
```

### More on cuboids

The notation (`R2` for a half turn, and why `R` is refused where only half
turns are), how a scramble is drawn, how a drag and a key turn a layer that
only half turns, and the tag's attributes are in [docs/cuboids.md](docs/cuboids.md), which is on GitHub and
not in the package. The [cuboids page](https://johnmorrisdotca.github.io/kyuubu/cuboids.html)
has them all to try.
