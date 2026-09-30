<div align="center">

<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/cube.gif" alt="A 3×3 cube turning R U R' U' F M B' y" width="320" />

# Kyuubu キューブ

**A turning cube for the browser, 2×2 to 7×7, drawn in CSS 3D. It needs no canvas, no WebGL and no framework.**

[![CI](https://github.com/johnmorrisdotca/kyuubu/actions/workflows/ci.yml/badge.svg)](https://github.com/johnmorrisdotca/kyuubu/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/kyuubu.svg)](https://www.npmjs.com/package/kyuubu)
[![bundle size](https://img.shields.io/bundlephobia/minzip/kyuubu)](https://bundlephobia.com/package/kyuubu)
[![licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](src/index.ts)

**[Live demo](https://johnmorrisdotca.github.io/kyuubu/)** · [Quick start](#quick-start) · [API](#api) · [Notation](#notation) · [Controls](#controls)

</div>

*Kyuubu* (キューブ) is how Japanese says "cube".

## Why Kyuubu

- **Any size, one model.** The 2×2 up to the 7×7 all run on the same few lines of geometry. There are no hand-written tables of face cycles.
- **Real 3D in plain CSS.** Every sticker is an element placed with a `matrix3d`. While a layer turns, the inside of the cube shows as plastic, never as a hole. It stays sharp at any zoom, and screen readers see a labelled `application`.
- **Every way of turning it works:**
  - drag a sticker;
  - roll the mouse wheel over a sticker (Ctrl for the other layer, Shift for the face);
  - use a finger;
  - or type standard notation.
- **A plain model under the view.**
  - A cube is a string of `6 × n × n` letters, and a turn is a pure function.
  - That makes a cube easy to store, send over the wire, snapshot in a test, or re-check on a server.
- **Notation in and out.** It reads and writes `R U R' U'`, `2R2`, `M'`, `x` and more.
- **Seedable scrambles.** Pass your own random source and every browser gets the same scramble.
- **A solve you can follow.** `solveSteps` gives the beginner's layer-by-layer method for any 2×2 or 3×3, one named step at a time.
- **Small and typed.** It has no runtime dependencies and is written in strict TypeScript. The optional React component has a single peer dependency, React itself.

## Quick start

```sh
pnpm add kyuubu      # or: npm install kyuubu
```

```html
<div id="cube" style="width: 400px; height: 400px"></div>

<script type="module">
  import { CubeView, cubeSolved } from "kyuubu";

  new CubeView(document.getElementById("cube"), {
    size: 3,
    keyboard: "page",
    onTurn: (move, state) => {
      if (cubeSolved(state, 3)) alert("Solved!");
    },
  });
</script>
```

The cube fills the element it is given, so give that element a size.

### With React

```tsx
import { Kyuubu, type KyuubuHandle } from "kyuubu/react";
import { useRef } from "react";

export function Cube() {
  const cube = useRef<KyuubuHandle>(null);
  return (
    <>
      <Kyuubu ref={cube} size={3} style={{ maxWidth: 420 }} onTurn={(move, state) => console.log(move, state)} />
      <button onClick={() => cube.current?.resetLook()}>Front on</button>
    </>
  );
}
```

With no `className`, the box is a square as wide as its container, and `style` adds to that. A `className` takes over, so it must position the box (relative or absolute) and give it a height.

### Scramble, then check a solve on the server

```ts
import { randomScramble, movesNotation, turnAll, solvedCube, undoAll, cubeSolved, parseMoves } from "kyuubu";

const scramble = randomScramble(3, 25);
movesNotation(scramble, 3); // "R U2 F' L ..."
const scrambled = turnAll(solvedCube(3), 3, scramble);

// Later, with the moves a player sent back:
const answer = parseMoves("R U R' U' ...", 3);
const solved = answer !== null && cubeSolved(turnAll(scrambled, 3, answer), 3);

// Or solve it by undoing the scramble:
cubeSolved(turnAll(scrambled, 3, undoAll(scramble)), 3); // true
```

## Controls

| Input | On a sticker | Around the cube |
| --- | --- | --- |
| Drag / swipe | Turns the layer carrying that sticker, the way you moved | Looks at the cube from anywhere |
| Wheel | Turns the sticker's row | Turns the view sideways |
| <kbd>Ctrl</kbd> + wheel | Turns the sticker's column | Tips the view up or down |
| <kbd>Shift</kbd> + wheel | Turns the sticker's face | |

| Key | Turn |
| --- | --- |
| <kbd>R</kbd> <kbd>L</kbd> <kbd>U</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>B</kbd> | Face clockwise; with <kbd>Shift</kbd>, counter-clockwise |
| <kbd>M</kbd> <kbd>E</kbd> <kbd>S</kbd> | Middle slice (odd cubes) |
| <kbd>X</kbd> <kbd>Y</kbd> <kbd>Z</kbd> | Whole cube |
| <kbd>2</kbd>–<kbd>9</kbd>, then a face | That many layers in, e.g. <kbd>2</kbd> <kbd>R</kbd> is `2R` on a 4×4 |
| Arrow keys | Look around |

Keys are heard when the cube has focus (`keyboard: "focus"`, the default) or anywhere on the page (`"page"`), never while the reader is typing in a field.

## Notation

Kyuubu uses [WCA](https://www.worldcubeassociation.org/regulations/#12a)-style notation.

| Written | Means |
| --- | --- |
| `R` `L` `U` `D` `F` `B` | A quarter turn of that face, clockwise as seen from that face |
| `R'` | The same face, counter-clockwise |
| `R2` | A half turn |
| `2R`, `3U'` | The 2nd or 3rd layer in from that face (big cubes) |
| `M` `E` `S` | Middle slice, turning like `L`, `D` and `F` |
| `x` `y` `z` | The whole cube, turning like `R`, `U` and `F` |

`parseMoves(text, n)` returns `null` for anything the cube can't turn, so input can be checked before it is used.

## API

Everything is exported from `kyuubu`. The React component is exported from `kyuubu/react`.

### The model

| Export | Signature | Does |
| --- | --- | --- |
| `solvedCube` | `(n) => string` | A solved `n × n` cube. |
| `turnCube` | `(state, n, move) => string` | One turn. The state passed in is never changed. |
| `turnAll` | `(state, n, moves) => string` | Many turns, in order. |
| `cubeSolved` | `(state, n) => boolean` | Every face one colour. A solved cube turned whole in the hand still counts. |
| `undoOf` / `undoAll` | `(move) => move` / `(moves) => moves` | The turn or turns that take it back. |
| `countsAsMove` | `(move) => boolean` | `false` for a whole-cube turn, which is only a look. |
| `isCubeState` | `(state, n) => boolean` | Right length, and `n²` stickers of each face. |
| `moveFits` | `(n, move) => boolean` | Whether a move exists on this size. |
| `encodeCubeMoves` / `decodeCubeMoves` | `(moves) => string` / `(code) => moves \| null` | Three characters a move, e.g. `x23y02z*1`, for compact storage. |
| `cubeSlots`, `faceOfSlot`, `layerOf`, `permutationOf` | | Lower-level geometry, for tools of your own. |

A **state** is `6 × n × n` letters, one per sticker. Faces come in the order `U R F D L B`, and each face is read in rows as seen from outside. A letter names the face that sticker belongs to when the cube is solved.

A **move** is `{ axis, layer, turns }`:

- `axis`: `0` (x, to the right), `1` (y, up) or `2` (z, towards you).
- `layer`: counted from the axis's negative side, `0` to `n − 1`, or `"all"` for the whole cube.
- `turns`: `1`, `2` or `3` quarter turns by the right-hand rule.

### Notation and scrambles

| Export | Signature |
| --- | --- |
| `parseMove` / `parseMoves` | `(text, n) => CubeMove \| null` / `CubeMove[] \| null` |
| `moveNotation` / `movesNotation` | `(move, n) => string` / `(moves, n) => string` |
| `faceMove`, `middleMove`, `wholeMove` | Build a move from a letter, a depth and `"cw" \| "half" \| "ccw"` |
| `randomScramble` | `(n, length, random = Math.random) => CubeMove[]`: never repeats an axis twice in a row, and never leaves the cube solved |
| `FULL_SCRAMBLE_LENGTHS` | Competition-style lengths by size: `{ 2: 11, 3: 25, 4: 40, 5: 60, 6: 80, 7: 100 }` |

### A solve a person can follow

`solveSteps(state, n)` works out the layer-by-layer solve most people learn first, for a 2×2 or 3×3 in any state. It returns `null` for other sizes.

```ts
import { solveSteps, movesNotation } from "kyuubu";

for (const step of solveSteps(state, 3)!) {
  console.log(step.stage, movesNotation(step.moves, 3));
}
// hold          x2
// whiteCross    D R' D'
// whiteCorners  U2 R U R' U' R U R' U'
// middleLayer   U R U' R' U' F' U F
// yellowCross   F R U R' U' F'
// yellowFace    R U R' U R U2 R'
// yellowCorners R' F R' B2 R F' R' B2 R2
// yellowEdges   R U' R U R U R U' R' U' R2
```

- The cube is held with white on the bottom. The `hold` step, if one is needed, is the whole-cube turn that puts it there.
- The 3×3 goes white cross, white corners, middle layer, yellow cross, yellow face, yellow corners, yellow edges. The 2×2 goes white layer, yellow face, yellow corners.
- Each step's `parts` split it into lining-up turns and whole algorithms (`cornerIn`, `edgeRight`, `edgeLeft`, `yellowCross`, `sune`, `cornerCycle`, `edgeCycle`), so a page can say which algorithm to use and when. `SOLVE_ALGORITHMS` gives each one in notation.
- Every step is a short search over the moves a beginner is taught, so it reads like the method, not like a computer's shortest solve. A whole 3×3 takes a few milliseconds.

### `new CubeView(element, options)`

| Option | Default | Meaning |
| --- | --- | --- |
| `size` | required | The cube's side, 2 or more. |
| `state` | solved | The stickers to start with. |
| `interactive` | `true` | Whether a person can turn it. `turn()` always works. |
| `keyboard` | `"focus"` | `"focus"`, `"page"` or `"none"`. |
| `turnMs` | `160` | How long a quarter turn takes. Turns waiting in line go faster. |
| `yaw`, `pitch` | `-35`, `28` | The first view, in degrees. |
| `fill` | `0.9` | How much of its box the cube fills. |
| `colours` | standard | Face colours by letter: `{ U, R, F, D, L, B }`. |
| `plastic` | `"#111"` | The colour between stickers. |
| `label` | `"A n×n cube"` | Its accessible name. |
| `onTurn` | | `(move, state)` for every turn a person makes. |
| `onLook` | | `(yaw, pitch)` whenever the view turns. |

| Member | Does |
| --- | --- |
| `turn(move, { report?, animate? })` | Turns a layer, animated after any turns already on their way. |
| `setState(state)` | Shows a state at once. |
| `state`, `size` | The state once every turn in line has finished, and the side. |
| `setLook(yaw, pitch)`, `resetLook()`, `looking` | The view. |
| `setInteractive(on)` | Lets a person turn it, or stops them. |
| `destroy()` | Removes the cube and every listener. |

The root element carries `data-kyuubu`, `data-state` and `data-turning="true" \| "false"`. Tests can wait on these.

### `<Kyuubu />` (`kyuubu/react`)

This component takes every `CubeView` option as a prop, plus `className`, `style` and any `data-*`. Its `ref` gives `turn`, `setState`, `resetLook` and `state`. When the `state` prop changes to something the cube isn't already showing, the cube shows it. That means a parent can keep the state and hand it back without the cube jumping.

## Browser support

It works in every evergreen browser with CSS 3D transforms and Pointer Events: Chrome, Edge, Firefox and Safari 15+, on desktop and mobile. There's nothing to polyfill.

## Roadmap

- A solver for 4×4 and up, by reduction to a 3×3.
- Pattern and algorithm playback, with a scrubber.
- Stickerless and custom themes.
- Other shapes: 2×2×3, 3×3×2.

Ideas and pull requests are welcome.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

```sh
pnpm install
pnpm test           # model, notation, gestures and keys
pnpm lint
pnpm typecheck
pnpm demo       # builds, then lays the demo out in _site/
```

## Licence

[MIT](LICENSE) © John Morris
