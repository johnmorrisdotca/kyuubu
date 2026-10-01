<h1 align="center">Kyuubu <sub>キューブ</sub></h1>

<p align="center"><strong>A turning cube for the browser, with a solve you can follow.</strong><br>
2×2 to 7×7, drawn in plain CSS 3D. Turn it by drag, touch, wheel, keys or cubers' notation; scramble it from a seed; and watch the layer-by-layer method solve it one named step at a time.</p>

<p align="center">
  <a href="https://github.com/johnmorrisdotca/kyuubu/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/johnmorrisdotca/kyuubu/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@johnmorrisdotca/kyuubu"><img alt="npm" src="https://img.shields.io/npm/v/@johnmorrisdotca/kyuubu?color=2f5d4a"></a>
  <a href="./LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-2f5d4a"></a>
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-0-2f5d4a">
  <img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-3178c6">
</p>

<p align="center"><a href="https://johnmorrisdotca.github.io/kyuubu/"><strong>Turn a cube →</strong></a> · <a href="https://johnmorrisdotca.github.io/kyuubu/api.html">API reference</a></p>

<p align="center">
  <img src="docs/desktop.jpg" alt="A scrambled 3×3 on green felt, three steps into its solve, under the demo's header with its language chooser, page links and five cloth patches: the Solve tab names the White cross step with its turn and lists the steps already taken" width="720">
  <img src="docs/phone.jpg" alt="The same cube on a phone in dark mode, in Japanese: the timer and move count above it, the 2×2 to 7×7 sizes and the scramble and undo buttons under it" width="220">
</p>

A 3D cube simulator, a cube model, a scramble generator and a beginner's
solver for the twisty puzzle everybody knows, from the 2×2 to the 7×7.

- **What is different.** The cube is drawn in CSS 3D, with no canvas and no
  WebGL, so it is sharp at any size and a screen reader is told what it is.
  Under it is a plain model: a cube is a string, a turn is a pure function.
  And the solve it shows is the one a person learns, step by named step.
- **What it costs a project.** Nothing: no dependencies, and one import.

## A cube in 30 seconds

```sh
npm install @johnmorrisdotca/kyuubu    # or pnpm add, or yarn add
```

```ts
import { cubeSolved, movesNotation, randomScramble, seededRandom, solveSteps, solvedCube, turnAll } from "@johnmorrisdotca/kyuubu";

const scramble = randomScramble(3, 25, seededRandom("club night"));
movesNotation(scramble, 3);                        // "B L' S' U' F' R2 B R U2 B' R2 …": the same for everyone with the seed
const cube = turnAll(solvedCube(3), 3, scramble);  // a cube is a string of 54 letters
const steps = solveSteps(cube, 3)!;                // 17 steps: hold, white cross, white corners, …
cubeSolved(turnAll(cube, 3, steps.flatMap((step) => step.moves)), 3);   // true
```

On a page, one line draws a cube a person can turn:

```ts
import { CubeView } from "@johnmorrisdotca/kyuubu";

new CubeView(document.getElementById("cube"), { size: 3, keyboard: "page" });
```

And from a terminal, on Linux, macOS or Windows:

```sh
npx @johnmorrisdotca/kyuubu --seed table   # D' R2 U' F2 L' S L F' R E' B' R2 D S' R' E' B2 L' B' D2 F' E S U' M'
```

Or with nothing to install, [turn a cube in the demo](https://johnmorrisdotca.github.io/kyuubu/).

## Who it is for

- **Puzzle and game sites.** A cube that works by mouse, finger and keyboard,
  at any size from 2×2 to 7×7, with every turn handed to your code and a
  state small enough to store in a column.
- **Speedcubing tools.** Scrambles from a seed (`--seed "club night"`), moves
  read and written in notation (`R U R' U'`), and a check that a solve solves
  its scramble, in the browser, on a server or in a terminal.
- **Teaching.** The beginner's layer-by-layer method for any 2×2 or 3×3, as
  steps with names, reasons and the algorithm each one uses, in English and
  Japanese.
- **Anybody who wants one on a page.** Give an element a size, and there is a
  cube in it.

"Rubik's Cube" is a trademark of its owner. Kyuubu is not affiliated with or
endorsed by them; it is a turning cube of its own, worked out from geometry.

## Use it in your project

Kyuubu is three things, each usable without the others: **an API** of plain
functions (turn, read notation, scramble, solve, save), **a view** you put in
any element, and **a React component** that wraps the view.

The view fills the element it is given, so that element needs a size and a
position (`relative` or `absolute`).

### 1. The API alone

```ts
import { cubeSolved, movesNotation, parseMoves, solvedCube, turnAll, undoAll } from "@johnmorrisdotca/kyuubu";

const moves = parseMoves("R U R' U'", 3);          // the turns, or null where any of it is not one
if (moves !== null) {
  const cube = turnAll(solvedCube(3), 3, moves);   // "UULUUFUUFRRUBRRURRFFDFFUFFFDDRDDDDDDBLLLLLLLLBRRBBBBBB"
  cubeSolved(cube, 3);                             // false
  movesNotation(undoAll(moves), 3);                // "U R U' R'": the turns that take it back
  cubeSolved(turnAll(cube, 3, undoAll(moves)), 3); // true
}
```

It has no DOM in it, so it runs the same on a server: scramble there, send
the scramble, and check the moves a player sends back.

### 2. The view, in plain HTML

```html
<div id="cube" style="width: 300px; height: 300px; position: relative"></div>
<p id="turned"></p>
<script type="module">
  import { CubeView, moveNotation } from "./node_modules/@johnmorrisdotca/kyuubu/dist/index.js";

  new CubeView(document.getElementById("cube"), {
    size: 3,
    keyboard: "page",
    onTurn: (move) => (document.getElementById("turned").textContent = moveNotation(move, 3)),
  });
</script>
```

The files are ES modules and need no build. With a bundler, import from
`@johnmorrisdotca/kyuubu` as everywhere else on this page.

### 3. React

```tsx
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { moveNotation } from "@johnmorrisdotca/kyuubu";
import { Kyuubu } from "@johnmorrisdotca/kyuubu/react";

function App() {
  const [turned, setTurned] = useState("");
  return (
    <>
      <Kyuubu size={3} keyboard="page" style={{ maxWidth: 300 }} onTurn={(move) => setTurned(moveNotation(move, 3))} />
      <p id="turned">{turned}</p>
    </>
  );
}
createRoot(document.getElementById("app")).render(<App />);
```

The component takes the view's options as props, plus `className`, `style`
and any `data-*` for its `<div>`. With no `className` the box is a square as
wide as its container. The cube is made in the browser after the first
render, so server rendering draws an empty box and nothing needs a provider.
In Next.js, use it from a client component (`"use client"`).

### 4. Vue

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { CubeView, moveNotation } from "@johnmorrisdotca/kyuubu";

const box = ref(null);
const turned = ref("");
let cube;
onMounted(() => {
  cube = new CubeView(box.value, { size: 3, keyboard: "page", onTurn: (move) => (turned.value = moveNotation(move, 3)) });
});
onBeforeUnmount(() => cube?.destroy());
</script>

<template>
  <div ref="box" style="width: 300px; height: 300px; position: relative"></div>
  <p id="turned">{{ turned }}</p>
</template>
```

### 5. Svelte and Angular

The same one call in the framework's mount hook, and `destroy()` on the way
out:

```svelte
<script>
  import { onMount } from "svelte";
  import { CubeView, moveNotation } from "@johnmorrisdotca/kyuubu";

  let box;
  let turned = $state("");
  onMount(() => {
    const cube = new CubeView(box, { size: 3, keyboard: "page", onTurn: (move) => (turned = moveNotation(move, 3)) });
    return () => cube.destroy();
  });
</script>

<div bind:this={box} style="width: 300px; height: 300px; position: relative"></div>
<p id="turned">{turned}</p>
```

```ts
// Angular: a standalone component
@Component({
  selector: "check-root",
  template: `<div #box style="width: 300px; height: 300px; position: relative"></div><p id="turned">{{ turned() }}</p>`,
})
class App implements OnDestroy {
  private box = viewChild.required<ElementRef<HTMLElement>>("box");
  private cube?: CubeView;
  turned = signal("");
  constructor() {
    afterNextRender(() => {
      this.cube = new CubeView(this.box().nativeElement, { size: 3, keyboard: "page", onTurn: (move) => this.turned.set(moveNotation(move, 3)) });
    });
  }
  ngOnDestroy() {
    this.cube?.destroy();
  }
}
```

Each of the five is built from the packed tarball, opened in Chromium and
WebKit, and turned with a key by `scripts/check-frameworks.mjs` before a
release names it. The examples above are the ones it builds.

### What a developer gets

- **Typed results.** TypeScript types for everything, with a doc comment on
  every export.
- **A random source you can replace.** `randomScramble` takes any function
  that returns a number from 0 up to 1. `seededRandom("any text")` is one
  that gives the same numbers everywhere.
- **No dependencies**, ES modules that also load under `require` (Node 22 and
  later), and `sideEffects: false`, so a bundler drops what you do not import.
- **Sizes.** The model, notation and scrambles alone are about 4 kB minified
  (2 kB gzipped) once a bundler has shaken the rest out. With the solver it
  is about 10 kB (4 kB gzipped). The view is about 17 kB (6 kB gzipped), and
  everything together 43 kB (16 kB gzipped).
- **Where it runs.** Every current browser with CSS 3D transforms and Pointer
  Events. The model, the solver and the command line run in Node 20 and
  later.

## Architecture

The cube, its notation, the solver and the famous solves are plain functions
over a string, with no DOM: the state is one letter a sticker, and every turn
returns a new string. Drawing is its own layer under `view/`, in plain DOM and
CSS with no canvas, and the player, the custom elements and the React
component are thin wrappers over it, each its own entry point, so a page loads
only what it uses.

```text
src/
├── cli.ts               the command line as a pure function: arguments in, text and an exit code out
├── cube.ts              the turning cube as pure functions over a string, one letter a sticker
├── element-define.ts    the "/element/define" entry: registers the custom elements by being imported
├── element.ts           the "/element" entry: the player as a <kyuubu-cube> custom element
├── famous.data.ts       the record solves, each with its published source, newest first
├── famous.ts            the "/famous" entry: record solves of the 3×3, played back move for move
├── guide-panel.ts       the panel beside a cube: the next movement in notation and words, and an arrow on the cube
├── guide.ts             a solve to follow with your own hands, one movement at a time, with detours taken back
├── index.ts             the main entry: the cube, notation, solver, famous solves, and the player to mount
├── notation.ts          the standard notation, for reading a move out and for the keys that make one
├── player.ts            the "/player" entry: a solve on a page, with play, pause, step and speed controls
├── random.ts            a seeded random source
├── react.tsx            the "/react" entry: the cube as a React component
├── reconstruction.ts    a solve as competitors write it down, with wide turns and rotations
├── record.ts            a solve kept as versioned JSON, plain text or CSV, and read back
├── replay.ts            a solve played back at the pace it was made
├── scale.ts             how big a cube is drawn, as a setting: small, medium or large
├── scramble-element.ts  <kyuubu-scramble>: a cube that keeps turning by itself, as a custom element
├── scramble.ts          how long a full scramble is for each size, and making one from a seed
├── scrambler.ts         a cube that turns one random layer, waits, and turns another, at a pace you choose
├── solve.ts             a layer-by-layer solve a person can follow, step by step, for any size
├── strings.ts           every word the package says to a person, in English and Japanese
├── types.ts             the vocabulary of a turning cube of any size
├── version.ts           the package's version, as in package.json
├── words.ts             the words the cube itself says, in English and Japanese
└── view/  the cube drawn on the screen in plain DOM and CSS
    ├── geometry.ts  the screen's geometry: from the cube's model to CSS
    ├── gestures.ts  from a hand to a turn: which layer a drag or a wheel means
    ├── hint.ts      where to drag: the sticker and the direction that make a given turn
    ├── keys.ts      the keyboard, in the notation cubers write
    └── view.ts      the cube on the screen: every sticker placed by one matrix3d, with no canvas or framework
```

Tests live in `test/`, apart from the code, and `test/docs.test.js` runs the
README's examples. `bin/` is the few lines that hand the command line the real
process, `scripts/` builds the demo and its API reference page and checks the
package as npm packs it, `demo/` is the site published on GitHub Pages, and
`e2e/` taps it in real browsers.

## The name

*Kyuubu* (キューブ) is the English word "cube" as Japanese writes it: a
borrowed word, spelled in katakana, the script Japanese uses for words taken
from other languages. It is said in three beats, kyu-u-bu, the middle one
only the vowel held longer, which is what the mark ー shows. Written more
formally in the Latin alphabet it is *kyūbu*; the package spells the long
vowel out, so that the name needs no accent to type.

## Where it comes from, and where it is used

Kyuubu was built for [Itsutsu](https://itsutsu.com), a site for board games,
puzzles, card games and dice games played at your own pace. *Itsutsu* (五つ) is
Japanese for "five", after five in a row, the game the site began with. The
site wanted a cube that worked on a phone without a canvas, that it could
check on the server move by move, and that could show a beginner what to do
next. Once that existed it seemed worth sharing.

### Used by

- [Itsutsu](https://itsutsu.com), for its cube.

That is the whole list so far. Using Kyuubu in something? Open an *Add my
project* issue and we will add you.

### The family

Kyuubu has siblings, each made for the same site, each MIT, each at
[github.com/johnmorrisdotca](https://github.com/johnmorrisdotca):

- [Korokoro](https://github.com/johnmorrisdotca/korokoro) (コロコロ, the sound
  of something small rolling along): a dice roller and a dice notation
  parser, with the exact odds of every roll.
- [Hitotsu](https://github.com/johnmorrisdotca/hitotsu) (一つ, "one"): a
  colour-card shedding game for two to eight, with the house rules as options
  and a computer player.
- [Toranpu](https://github.com/johnmorrisdotca/toranpu) (トランプ, the everyday
  Japanese word for a deck of playing cards): ten card games as pure
  TypeScript rules, with computer players.
- [Tane](https://github.com/johnmorrisdotca/tane) (種, a seed, the kind you
  plant): seeded random numbers and daily seeds.
- [Narabe](https://github.com/johnmorrisdotca/narabe) (並べ, "line them up"):
  one rules engine for forty-eight abstract board games.
- [Tenka](https://github.com/johnmorrisdotca/tenka) (天下, "under heaven"):
  world conquest for two to six, on a map of the real world.
- [Kumimoji](https://github.com/johnmorrisdotca/kumimoji) (組み文字, "letters
  put together"): the crossword tile race, in English and Japanese.

## Features

- **Any size, one model.** The 2×2 up to the 7×7 run on the same few lines of
  geometry. There are no hand-written tables of face cycles.
- **Real 3D in plain CSS.** Every sticker is an element given its whole
  place on the screen in one `matrix3d`, worked out by the cube itself, with
  nothing nested in 3D, so no browser can draw it flat. While a layer turns,
  the inside of the cube shows as plastic, never as a hole.
- **Every way of turning it.** Drag a sticker; roll the wheel over one; use a
  finger; press the keys cubers write with; or hand it notation from code.
- **The layer follows your hand.** A dragged layer turns with the pointer,
  forwards and back, and is a move only once it is let go past a point of no
  return. Start a turn, think better of it, and take it back.
- **A plain model under the view.** A cube is a string of `6 × n × n` letters
  and a turn is a pure function, so a cube is easy to store, send, snapshot
  in a test, or check again on a server.
- **Notation in and out.** It reads and writes `R U R' U'`, `2R2`, `M'`, `x`
  and the rest.
- **Scrambles from a seed.** The same seed gives the same scramble in every
  browser and on every server, so a club can race one scramble.
- **A solve you can follow.** The beginner's layer-by-layer method for any
  2×2 or 3×3: each step with its name, what it is for, its turns and the
  algorithms it uses.
- **Shown on the cube.** The next move of a solve, or of any moves, marked on
  the cube itself: the layer lit, an arrow the way to drag it, the move in
  notation and in plain words. It waits for your hand, moves on when you
  make the move, and says so, with a way back, when you make another.
- **Replay a record.** A scramble and its solve played on the cube at the
  pace it was made, with play, pause, step, speed and repeat; famous record
  solves included, each checked to end solved; and any solve pasted in, as
  it is written or as a link.
- **Embed it anywhere.** One `<kyuubu-cube>` tag, or an iframe for a site
  that allows no scripts.
- **Export and import.** A solve, scramble and moves together, as JSON that
  reads back in, as a few lines of plain text, or as CSV for a spreadsheet.
- **Themes.** Every colour is an option and a CSS custom property, with
  three looks included and a call to change them on a cube already drawn.
- **A command line.** `kyuubu --seed table` in a terminal on Linux, macOS or
  Windows: scrambles, turns, a check and a solve, as text or JSON.
- **English and Japanese**, for everything the package says to a person.
- **Accessible.** The cube is a labelled `application`, takes the keyboard,
  and every turn can be made without a pointer.

## Notation

Kyuubu reads and writes the notation cubers use.

| Written | Means |
| --- | --- |
| `R` `L` `U` `D` `F` `B` | A quarter turn of that face, clockwise as seen from that face |
| `R'` | The same face, counter-clockwise |
| `R2` | A half turn |
| `2R`, `3U'` | The 2nd or 3rd layer in from that face alone (big cubes), up to `9R` |
| `M` `E` `S` | The middle layer of an odd cube, turning like `L`, `D` and `F` |
| `x` `y` `z` | The whole cube, turning like `R`, `U` and `F` |

`parseMoves(text, n)` returns `null` for anything the cube of that size
cannot turn, so input can be checked before it is used: `M` on a 2×2, `4R`
on a 3×3, or a letter that is not a turn.

`parseSolve(text, n)` reads a solve the way competitors and the people who
reconstruct their solves write one, which is more than a key makes:

| Written | Means |
| --- | --- |
| `Rw`, `Rw'`, `Rw2` | A wide turn: the face and the layer behind it, as one step (WCA regulations, article 12a) |
| `3Rw` | Three layers deep, on a bigger cube |
| `r` `l` `u` `d` `f` `b` | The same wide turns, as reconstructions write them |
| `[r]` `[u]` `[f]`, `[l]` `[d]` `[b]` | The whole cube, turned the way that face turns |
| `R2'`, `R3` | `R2`, and `R'` |
| `// cross` | A comment, skipped to the end of its line |
| `(R U R' U')`, `(U R' U' R)2` | Brackets are skipped; a number after one repeats what is inside |
| `RUR'U'` | Moves run together with no spaces, as older reconstructions have them |

It gives back the steps it read, each with its text, its layers and whether
it counts as a move, or the first thing it could not read with its line and
place. `readSolveLink(text)` reads the scramble and the solve out of a link to
alg.cubing.net, so a person can paste the address.

## Controls

| Input | On a sticker | Beside the cube |
| --- | --- | --- |
| Drag or swipe | The layer carrying that sticker turns with the pointer; let go to make the turn, or to let it go back | Looks at the cube from anywhere |
| Wheel | Turns the sticker's row | Turns the view sideways |
| <kbd>Ctrl</kbd> + wheel | Turns the sticker's column | Tips the view up or down |
| <kbd>Shift</kbd> + wheel | Turns the sticker's face | |

| Key | Turn |
| --- | --- |
| <kbd>R</kbd> <kbd>L</kbd> <kbd>U</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>B</kbd> | Face clockwise; with <kbd>Shift</kbd>, counter-clockwise |
| <kbd>M</kbd> <kbd>E</kbd> <kbd>S</kbd> | Middle layer (odd cubes) |
| <kbd>X</kbd> <kbd>Y</kbd> <kbd>Z</kbd> | Whole cube |
| <kbd>2</kbd> to <kbd>9</kbd>, then a face | That many layers in: <kbd>2</kbd> <kbd>R</kbd> is `2R` on a 4×4 |
| Arrow keys | Look around |

Keys are heard when the cube has focus (`keyboard: "focus"`, the default) or
anywhere on the page (`"page"`), never while the reader is typing in a field.

### Dragging a layer

A drag on a sticker, by mouse or by finger, holds its layer and turns it with
the pointer. Nothing is a move while the pointer is down.

- **The layer is picked once.** After a few pixels the drag says which of the
  sticker's two layers it means. A drag that could be either waits a little
  longer before it picks, and the layer picked stays picked for that drag.
- **It turns both ways.** Drag back and the layer comes back; drag past
  where it began and it turns the other way.
- **There is a point of no return**, 30 degrees unless `commitAngle` says
  otherwise. Let go short of it and the layer goes back: no move is made and
  `onTurn` is not called. Let go at it or past it and the layer snaps on to
  the quarter turn, and that is one move. Dragged the same distance past a
  quarter turn, it is a half turn, recorded as one move (`R2`).
- **You can see and feel the point.** Past it the held layer brightens, and
  the cube's element carries `data-committed="true"`. The brightening is the
  CSS filter in `--kyuubu-commit-filter` (`brightness(1.14)` unless you set
  it; `none` turns it off).
- **A flick still turns.** A short, fast drag, still moving when it is let
  go, makes the quarter turn from short of the point, so quick hands lose
  nothing.
- **Giving up.** Escape, a cancelled pointer, or a drag that wanders well off
  the cube's element puts the layer back, and nothing is recorded.
- **`onTurn` is called once for a completed turn, after the layer has
  snapped home**, and never for one that went back.

While a layer is held the element carries `data-dragging="true"` and
`data-angle` (whole degrees, forwards positive). The rules are exported as
pure functions for tools and tests of your own: `pickDrag`, `dragAngle`,
`quartersForRelease`, `pastCommit` and `moveForRelease`, with the constants
`COMMIT_ANGLE`, `DRAG_START_PX`, `DRAG_DECIDE_PX`, `DRAG_CLEAR_RATIO`,
`FLICK_SPEED` and `FLICK_ANGLE` (type `DragPick`).

```ts
quartersForRelease(22);         // 0: short of the point, it goes back
quartersForRelease(38);         // 1: past it, a quarter turn
quartersForRelease(-38);        // -1: the other way
quartersForRelease(130);        // 2: a half turn
quartersForRelease(12, 0.4);    // 1: a flick, 0.4 degrees a millisecond
quartersForRelease(40, 0, 45);  // 0: with commitAngle 45
```

Turns made by a key, by notation or from code are animated over `turnMs`
(160 ms a quarter turn; `setTurnMs` changes it, and the demo's Controls tab
offers a slow setting). On a device that asks for reduced motion they are
not animated at all, and a layer let go is put straight where it belongs.

## The model

A **state** is `6 × n × n` letters, one a sticker. The faces come in the
order `U R F D L B`, and each face is read in rows as it is seen from
outside. A letter names the face its sticker belongs to when the cube is
solved, so a solved 2×2 is `UUUURRRRFFFFDDDDLLLLBBBB`.

A **move** is `{ axis, layer, turns }`:

- `axis`: `0` (x, to the right), `1` (y, up) or `2` (z, towards you).
- `layer`: counted from the axis's negative side, `0` to `n − 1`, or `"all"`
  for the whole cube.
- `turns`: `1`, `2` or `3` quarter turns by the right-hand rule.

```ts
parseMove("R", 3);      // { axis: 0, layer: 2, turns: 3 }
parseMove("2R'", 4);    // { axis: 0, layer: 2, turns: 1 }
parseMove("x", 3);      // { axis: 0, layer: "all", turns: 3 }
encodeCubeMoves(parseMoves("R U2 F'", 3)!);   // "x23y22z21": three characters a move, for a column
```

Every function returns a new state and leaves the one it was given alone.
`cubeSolved` asks only that every face be one colour, so a solved cube turned
whole in the hand is still solved.

## A solve a person can follow

`solveSteps(state, n)` works out the layer-by-layer solve most people learn
first, for a 2×2 or 3×3 in any state. It returns `null` for other sizes.

```ts
import { movesNotation, parseMoves, solveSteps, solvedCube, stageName, stageSays, turnAll } from "@johnmorrisdotca/kyuubu";

const cube = turnAll(solvedCube(2), 2, parseMoves("R U2 F'", 2)!);
for (const step of solveSteps(cube, 2)!) {
  console.log(stageName(step.stage), movesNotation(step.moves, 2));
}
// Hold it      x'
// White layer  F'
// White layer  F U F'
// White layer  F R2 F'

stageSays("whiteLayer");          // "Put a white corner in its place on the bottom."
stageName("whiteLayer", "ja");    // "白の面"
```

- The cube is held with white on the bottom. The `hold` step, if one is
  needed, is the whole-cube turn that puts it there.
- The 3×3 goes white cross, white corners, middle layer, yellow cross, yellow
  face, yellow corners, yellow edges. The 2×2 goes white layer, yellow face,
  yellow corners. A stage that places its pieces one at a time is a step for
  each piece.
- Each step's `parts` split it into lining-up turns and whole algorithms, so
  a page can say which algorithm to use and when. `SOLVE_ALGORITHMS` gives
  each one in notation, and `algorithmName` names it in either language.
- Every step is a short search over the moves a beginner is taught, so it
  reads like the method, not like a computer's shortest solve: a scrambled
  3×3 comes to something over a hundred moves, and takes a millisecond or two
  to work out.
- "White" and "yellow" are the up and down faces' letters, `U` and `D`,
  whatever colours your theme gives them.
- A state no cube can reach (a corner twisted, two stickers swapped) has no
  solve: `solveSteps` throws, and the command line says so.

| Algorithm | Notation | Used for |
| --- | --- | --- |
| `cornerIn` | `R U R' U'` | A white corner into the bottom |
| `edgeRight` | `U R U' R' U' F' U F` | A top edge into the middle layer, to the right |
| `edgeLeft` | `U' L' U L U F U' F'` | A top edge into the middle layer, to the left |
| `yellowCross` | `F R U R' U' F'` | The yellow cross |
| `sune` | `R U R' U R U2 R'` | The yellow face |
| `cornerCycle` | `R' F R' B2 R F' R' B2 R2` | Three top corners moved round |
| `edgeCycle` | `R U' R U R U R U' R' U' R2` | Three top edges moved round |

## Show me on the cube

The next move of a solve drawn on the cube: the layer that turns is lit and
the rest dimmed, an arrow lies across its stickers the way to drag them, and
beside the cube the move is given in notation and in plain words. The
person makes the move with their own hand, and the guide moves on.

```ts
import { CubeView, mountGuide } from "@johnmorrisdotca/kyuubu";

const view = new CubeView(cubeElement, { size: 3, state });
mountGuide(guideElement, view, { method: true });            // the layer-by-layer method, step by step
mountGuide(guideElement, view, { moves: "R U R' U' Rw x" }); // or any moves, as written
```

- **The arrow is the drag.** It is worked out with the drag's own rules
  (`pickDrag` and `moveForRelease`, above), run backwards: a sticker is
  chosen only if a drag along the arrow from it is read as exactly that
  move. A test proves it for every face, slice, wide turn and direction on
  every size from 2×2 to 5×5, from seven sides.
- **It follows your eye.** Look round the cube and the arrow is drawn again
  from where you are, on a side you can see. Where no side of the layer can
  be seen, it says to look round.
- **Half turns, wide turns and the whole cube.** A half turn is one long
  drag or two quarter turns the same way. A wide turn (`Rw`) is lit as one
  slab under one arrow, and each of its layers is dragged in turn. A turn of
  the whole cube (`x`) cannot be dragged: the guide names its key and has a
  button that makes it.
- **A turn it did not ask for** is said to be one ("You turned U, not R."),
  with a button to take it back, and an arrow on the cube for turning it
  back by hand.
- **Words**, in English and Japanese: "Turn the right face towards you."
  (`R'`), 「右の面を手前に回します。」. The line is announced to a screen reader
  once for each move, and on a device that asks for reduced motion nothing on
  the arrow moves.

Underneath, each part can be used alone. `view.showHint(moves)` lights a
layer and draws its arrow on any `CubeView`, and `view.hint` says which
sticker to take hold of and which way to drag it; `dragHint(moves, n, view)`
works that out with no page at all. `new Guide(state, n, source)` walks a
list or the method as a pure state machine (`next`, `heard(move)`,
`takeBack()`, `makeNext()`), and `movementSays` puts a move in words.
The player has it too: `mountPlayer(element, { …, guide: true })`, or its
"Turn it yourself" button, hands the viewer the cube to follow a solve by
hand.

## Replay a solve

A scramble and the moves that solved it, shown on a cube at the pace they
were made: what a record looked like, a move at a time.

```js
import { mountPlayer } from "@johnmorrisdotca/kyuubu/player";

mountPlayer(document.getElementById("solve"), {
  scramble: "D R' U2 F2 D U' B2 R2 L' F U' B2 U2 F L F' D'",
  solution: "x2 R' D2 R' D L' U L D R' U' R D L U' L' U' R U R' y' U R' U' R Rw' U' R U' R' U2 Rw U",
  timeMs: 3130,
  autoplay: true,
});
```

That draws the cube with its controls: play and pause, a step back and
forward, restart, where in the solve, the speed (the solve's own, a half, a
quarter, a tenth) and repeat. The viewer can drag to look round the cube and
cannot turn its layers, until they press "Turn it yourself": then the cube
is theirs, the solve's next move is shown on it (see *Show me on the cube*),
and each move they make brings the next. Options: `size`, `scramble`,
`solution`, `timeMs`, `stepMs`, `autoplay`, `loop`, `controls`, `speed`,
`theme`, `locale`, `guide` (start with the cube handed over), `onChange`,
`onEnd`. The handle has `load(source)` (another solve on the same cube), `play()`, `pause()`, `step(1 | -1)`,
`seek(n)`, `restart()` (back to the scrambled cube, waiting), `setSpeed()`, `setLoop()`, `setLocale()`,
`setTheme()`, `follow(on)` and `following`, `status`, `plan`, `fault` and `destroy()`.

**About the pace.** A reconstruction says how long the whole solve took and
almost never when each move was made. So the moves are spread evenly over the
recorded time: a 3.13 second solve takes 3.13 seconds, and the player says
that the real one was not this even. Give `stepMs`, a time for every step,
where you know them.

**A solve that does not end solved** is played anyway, and the player says
so. Only text that cannot be read is refused, with the piece it stopped at.

Without a page, `planReplay(source)` reads, checks and times a solve, and
`new Replay(cube, plan, options)` plays a plan on anything with `setState`
and `turnTogether`, which `CubeView` has.

### Embed a solve on any site

One tag, where the page may run a script. It needs no build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></script>
<kyuubu-cube scramble="R U R' U'" moves="U R U' R'" time="2.5" controls autoplay></kyuubu-cube>
```

| Attribute | Means |
| --- | --- |
| `scramble`, `moves` | The scramble and the solve, as written |
| `size` | The cube's side, 2 to 7: 3 when left out |
| `time` | The solve's time in seconds; left out, a steady pace |
| `autoplay`, `loop` | Start at once; begin again at the end |
| `controls` | Shown unless `controls="false"` |
| `speed` | The speed to start at: `1`, `0.5`, `0.25`, `0.1` |
| `theme` | `standard`, `paper` or `stickerless` |
| `lang` | `en` or `ja`; the page's language when left out |
| `guide` | Start with the cube handed to the viewer, to follow the solve by hand |

The element has `play()`, `pause()`, `step()`, `seek()`, `restart()` and
`status`, and sends `kyuubu-step` after every step and `kyuubu-end` at the
end. In a bundle, `import { defineCube } from "@johnmorrisdotca/kyuubu/element"`
and call it, or import `@johnmorrisdotca/kyuubu/element/define`, which does.
It is drawn in the page's own document, so the page's font, colour and the
`--kyuubu-player-…` custom properties (`felt`, `radius`, `rule`, `button`,
`ink`, `paper`, `focus`) dress it.

An iframe, where the page allows no scripts (a forum, a blog):

```html
<iframe src="https://johnmorrisdotca.github.io/kyuubu/embed.html#scramble=R+U+R'+U'&moves=U+R+U'+R'&time=2.5" title="Kyuubu" width="360" height="600" style="border:0;max-width:100%" loading="lazy"></iframe>
```

The address carries everything: `scramble`, `moves`, `time`, `size`, `theme`,
`lang`, `speed`, and `autoplay=1`, `loop=1`, `controls=0`, `guide=1`. The page stores
nothing, tracks nothing and loads nothing from anywhere else. A browser takes
an address of a few thousand characters, which is room for any solve of a
3×3. The [famous solves page](https://johnmorrisdotca.github.io/kyuubu/famous.html)
writes both snippets for whatever it is showing.

### Famous solves

`@johnmorrisdotca/kyuubu/famous` is a list of record-setting solves of the
3×3, each with its time, solver, country, competition, the competition's
dates, the scramble, the moves, who reconstructed it where the source says,
and where it was published. It is its own entry, so a page that does not show
it does not carry it.

```js
import { FAMOUS_SOLVES, famousSolve } from "@johnmorrisdotca/kyuubu/famous";

const solve = famousSolve("park-3.13");
mountPlayer(element, { scramble: solve.scramble, solution: solve.solution, timeMs: solve.timeMs });
```

Every solve in it is played by a test from its scramble, and is in the list
only because the cube ends solved. The list is short and has gaps: a record
with no published reconstruction, or one that does not play out, is left out.

**Where the records are.** The whole history of the 3×3 record, with a link
to each reconstruction, is kept on the
[Speedsolving wiki](https://www.speedsolving.com/wiki/index.php?title=History_of_World_Records/3x3x3),
and the official results, for every event, are the
[World Cube Association's records](https://www.worldcubeassociation.org/results/records).
The times, names, competitions and dates here are the WCA's public results;
the scrambles and moves are from the sources each entry names. Kyuubu is not
affiliated with the WCA.

**Add a solve.** Open an
[Add a solve](https://github.com/johnmorrisdotca/kyuubu/issues/new?template=add-a-solve.md)
issue with the scramble, the moves and where they were published, or send a
pull request: `pnpm solve:check "<scramble>" "<moves>"` plays it and prints
whether it ends solved and how many moves it is.

## A cube drawn small, medium or large

`scale` is the same three names Toranpu's cards take (a cube's `size` is its
side, so the setting is `scale` here). Small is for a list or a picker: every
side from 2×2 to 7×7 is drawn in 72 pixels, look-only, and the box is one
steady square, never wider than its container.

```ts
new CubeView(box, { size: 4, scale: "small" });    // 72 pixels wide, and square
new CubeView(box, { size: 3, scale: "large", interactive: false });
new CubeView(box, { size: 3, width: 100 });        // any width
```

The React component takes `scale` and `width` as props, and the elements below
take them as attributes.

## A cube that keeps turning

For a background or a widget, `keepScrambling` turns a random layer, waits,
and turns another, at a pace you choose. It never turns about the axis it just
used, and it never queues a turn behind one that is still moving.

```ts
import { CubeView, keepScrambling } from "@johnmorrisdotca/kyuubu";

const view = new CubeView(box, { size: 3, scale: "medium", interactive: false });
const loop = keepScrambling(view, { pace: "slow" });   // every 4 seconds
loop.setPace(0.5);                                     // every half second
loop.stop();                                           // the cube stays as it is
loop.start();
loop.destroy();                                        // lets go of the page
```

| Option | Default | Meaning |
| --- | --- | --- |
| `pace` | `1` | Seconds between turns, never under `0.2`, or `"fast"` (0.5), `"normal"` (1), `"slow"` (4) |
| `faces` | `false` | Turn only the six outer faces |
| `random` | `Math.random` | A `() => number` in [0, 1); seeded, the same cube turns the same way |
| `autoplay` | `true` | Start by itself |

It costs nothing nobody can see. A hidden tab is left alone and the cube carries
on when the tab comes back (it listens for `visibilitychange`). A device that
asks for reduced motion gets a cube that stays still: `running` is `false` and
no timer is set.

As a tag, with nothing to build:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></script>
<kyuubu-scramble size="3" pace="slow" scale="small"></kyuubu-scramble>
```

| Attribute | Means |
| --- | --- |
| `size` | The cube's side, 2 to 7: 3 when left out |
| `pace` | Seconds between turns, or `fast`, `normal`, `slow` |
| `paused` | Does not turn until `play()` |
| `scale`, `width` | `small`, `medium` or `large`, or a width in pixels |
| `theme` | `standard`, `paper` or `stickerless` |
| `faces` | Outer faces only |
| `seed` | The same turns every time |
| `interactive` | Lets a person turn it; off for a small one |
| `lang` | `en` or `ja` |

It has `play()`, `pause()`, `running` and `cube` (the `CubeView`). In a bundle,
`defineScramble` from `@johnmorrisdotca/kyuubu/element` registers it. An iframe
for a page that allows no scripts:

```html
<iframe src="https://johnmorrisdotca.github.io/kyuubu/embed-scramble.html#pace=slow&scale=medium" title="A cube that keeps turning" width="160" height="160" style="border:0;max-width:100%"></iframe>
```

The address carries `size`, `pace`, `scale`, `width`, `theme`, `faces`, `seed`
and `paused`. The [turning cubes page](https://johnmorrisdotca.github.io/kyuubu/cubes.html)
shows it at all three scales.

## Scrambles and seeds

```ts
randomScramble(3, 25);                                  // 25 turns, from Math.random
randomScramble(3, 25, seededRandom("club night"));      // the same 25 turns everywhere
randomScramble(3, 25, seededRandom("club night"), { faces: true });   // outer faces only: no M, E or S
FULL_SCRAMBLE_LENGTHS[4];                               // 40: the usual length for a 4×4
```

A scramble never turns the same axis twice running, so no turn undoes or
joins the one before it, and it never leaves the cube solved. Any layer may
turn, a 3×3's middle ones among them, unless `faces` is set.

`seededRandom(seed)` gives the same numbers for the same text on every
device, and a scramble made from it is pinned by a test: the seed
`"club night"` will always begin `B L' S' U'`. It is not for secrets.

## The command line

Installing the package puts `kyuubu` on the path. It needs Node 20 or later
and nothing else, and runs the same on Linux, macOS and Windows.

```sh
npm install -g @johnmorrisdotca/kyuubu    # or use npx, as above
```

```console
$ kyuubu --seed table
D' R2 U' F2 L' S L F' R E' B' R2 D S' R' E' B2 L' B' D2 F' E S U' M'

$ kyuubu -n 2 --seed table
D' R2 U' F2 L' B' L F' R D' B'

$ kyuubu --apply "R U R' U'"
      U U L
      U U F
      U U F
B L L F F D R R U B R R
L L L F F U B R R B B B
L L L F F F U R R B B B
      D D R
      D D D
      D D D
state: UULUUFUUFRRUBRRURRFFDFFUFFFDDRDDDDDDBLLLLLLLLBRRBBBBBB
Not solved

$ kyuubu --verify --from "R U" "U' R'"
Solved. Moves: 2

$ kyuubu -n 2 --solve "R U2 F'"
Hold it      x'
White layer  F'
White layer  F U F'
White layer  F R2 F'
Steps: 4. Moves: 7
```

| Option | What it does |
| --- | --- |
| `--scramble` | Print a scramble. This is what happens when nothing else is asked |
| `--apply` | Make the turns and show the cube: unfolded, then as its state |
| `--verify` | Say whether the turns solve the cube it starts from. Exit code 0 if they do, 1 if not |
| `--solve` | Show the layer-by-layer solve of the cube after the turns, step by step (2×2 and 3×3) |
| `-n`, `--size <n>` | The cube's side, 2 to 7, as `4` or `4x4`. 3 when left out |
| `-l`, `--length <n>` | How many turns a scramble has, 1 to 1000. The usual length for the size when left out |
| `-c`, `--count <n>` | How many scrambles, 1 to 100 |
| `-s`, `--seed <seed>` | The same seed gives the same scrambles. One seed serves the whole command, in order |
| `--faces` | Scramble with the outer faces only |
| `-f`, `--from <turns>` | The scramble the cube starts from |
| `--state <state>` | The cube to start from, as its `6 × n × n` letters |
| `--stdin` | Read the turns from standard input. Windows line endings are fine |
| `-j`, `--json` | Print JSON, with a `format` number |
| `--lang <en\|ja>` | English or Japanese. Otherwise `LC_ALL`, `LC_MESSAGES` or `LANG` decides, and where none is set (Windows), the system's language |
| `--no-color` | No colour. `NO_COLOR` is honoured too, and output that is piped is never coloured |
| `-h`, `--help`, `-v`, `--version` | |

| Exit code | Means |
| --- | --- |
| 0 | Done; under `--verify`, solved |
| 1 | Something asked for could not be done: a turn the cube cannot make, a state that is not a cube, a cube with no solve; under `--verify`, not solved |
| 2 | The command itself was wrong: an option it does not know, or one without its value |

Your shell reads `'` before Kyuubu does, so quote the turns:
`kyuubu --apply "R U R' U'"`. Turns may be one argument or several.

**From another program or another language**, the JSON is the way in: run
`kyuubu --json`, read standard output, and check the exit code.

```sh
printf "U'\nR'\n" | kyuubu --verify --from "R U" --stdin --json
```

In JavaScript there is no need for a process: `runCli(args, surroundings)` is
the whole command line as a pure function, returning `{ code, out, err }`.

## Export and import

A solve is its size, the scramble and the turns made after it. It is written
out three ways, each a pure function that returns a string; what is done with
it is yours.

```ts
const solve = { size: 3, scramble: parseMoves("R U2 F'", 3)!, moves: parseMoves("F U2 R'", 3)!, ms: 12340, seed: "club night" };

toJSON(solve);        // { "format": 1, "generator": "kyuubu 1.6.0", "solves": [ … ] }
fromJSON(text);       // the solves back again, or null if it is not an export
toText(solve);        // a few lines for a chat or a note
fromText(text);       // the solve back again, or null
toCSV([solve]);       // for a spreadsheet
summarize(solve);     // { scramble: "R U2 F'", moves: "F U2 R'", solved: true, count: 3, start, state, size }
```

```
3x3
scramble: R U2 F'
solve: F U2 R'
time: 12.34
seed: club night
```

```csv
time,size,scramble,moves,count,solved,seconds,seed
,3,R U2 F',F U2 R',3,true,12.34,club night
```

The shape of the JSON, which is what to keep if you keep solves:

```json
{
  "format": 1,
  "generator": "kyuubu 1.6.0",
  "solves": [
    {
      "size": 3,
      "scramble": "R U2 F'",
      "moves": "F U2 R'",
      "state": "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
      "solved": true,
      "count": 3,
      "ms": 12340,
      "seed": "club night"
    }
  ]
}
```

- **The JSON reads back in, and nothing in it is trusted.** `fromJSON` puts
  each solve together again from its size and its notation, and works out
  the cube, whether it is solved and the count of moves itself. `state`,
  `solved` and `count` are there for a reader without the package, and are
  ignored on the way in. A solve whose notation the cube cannot turn is left
  out. `ms` is milliseconds, and `at`, when there is one, is ISO 8601.
- **`format` goes up** only if a reader of the old shape would be wrong about
  the new one.
- **The text reads back too.** `fromText` takes the lines above in any order
  and either case, `3×3` for `3x3`, and a bare line of notation as a solve's
  moves on a 3×3.
- **The CSV is safe to open.** A cell that a spreadsheet would run as a
  formula (one starting with `=`, `+`, `-` or `@`) is given a leading
  apostrophe. Lines end CRLF, as RFC 4180 has them, and cells are quoted
  where they need to be.
- A cube's state on its own is already a string: keep `view.state`, and hand
  it back as the `state` option.

## API

The [API reference](https://johnmorrisdotca.github.io/kyuubu/api.html) lists every export of every entry point with its signature and its doc comment. It is made from the source by `pnpm site`, so it cannot fall behind the code.

Everything is exported from `@johnmorrisdotca/kyuubu`; the React component
from `@johnmorrisdotca/kyuubu/react`. Every export has a doc comment, which
an editor shows on hover.

### The model

| Export | Signature | Does |
| --- | --- | --- |
| `solvedCube` | `(n) => string` | A solved `n × n` cube |
| `turnCube` | `(state, n, move) => string` | One turn. The state passed in is never changed |
| `turnAll` | `(state, n, moves) => string` | Many turns, in order |
| `cubeSolved` | `(state, n) => boolean` | Every face one colour |
| `undoOf`, `undoAll` | `(move) => move`, `(moves) => moves` | The turn or turns that take it back |
| `countsAsMove` | `(move) => boolean` | `false` for a whole-cube turn, which is only a look |
| `isCubeState` | `(state, n) => boolean` | The right length, and `n²` stickers of each face. It does not say the cube can be solved |
| `moveFits` | `(n, move) => boolean` | Whether a move exists on this size |
| `encodeCubeMoves`, `decodeCubeMoves` | `(moves) => string`, `(code) => moves \| null` | Three characters a move, such as `x23y22z21`, for compact storage. Layers 0 to 9 |
| `joinTurns` | `(moves) => moves` | Turns of one layer in a row written as one: `U' U2` is `U` |
| `CUBE_FACE_ORDER` | `["U", "R", "F", "D", "L", "B"]` | The order a state is written in |
| `FACE_FRAMES` | | Each face's normal, and its rows and columns as seen from outside |
| `cubeSlots` | `(n) => { slots, index }` | Every sticker slot, in the order of the state |
| `faceOfSlot`, `faceOfNormal`, `layerOf` | | The face a slot is on; the face a normal points out of; the layer a piece sits in |
| `permutationOf` | `(n, move) => Int32Array` | Where every sticker goes under a turn |
| `quarterTurn` | `(vector, axis) => vector` | A vector turned a quarter about an axis |

Types: `CubeMove`, `CubeAxis`, `CubeTurns`, `CubeFace`, `StickerSlot`, `Vec3`.

### Notation, scrambles and randomness

| Export | Signature | Does |
| --- | --- | --- |
| `parseMove`, `parseMoves` | `(text, n) => CubeMove \| null`, `CubeMove[] \| null` | Notation read |
| `moveNotation`, `movesNotation` | `(move, n) => string`, `(moves, n) => string` | Notation written |
| `faceMove` | `(face, depth, amount, n) => CubeMove \| null` | A face or the layer `depth` in from it, turned `"cw"`, `"half"` or `"ccw"` |
| `middleMove` | `(letter, amount, n) => CubeMove \| null` | `M`, `E` or `S`; `null` on an even cube |
| `wholeMove` | `(letter, amount) => CubeMove` | `x`, `y` or `z` |
| `randomScramble` | `(n, length, random?, options?) => CubeMove[]` | A scramble. `options.faces` keeps to the outer faces |
| `FULL_SCRAMBLE_LENGTHS` | `{ 2: 11, 3: 25, 4: 40, 5: 60, 6: 80, 7: 100 }` | The usual length by size |
| `seededRandom` | `(seed) => () => number` | A random source fixed by a seed |

Types: `CubeFaceLetter`, `ScrambleOptions`.

### The solve

| Export | Signature | Does |
| --- | --- | --- |
| `solveSteps` | `(state, n) => SolveStep[] \| null` | The layer-by-layer solve; `null` for a size without a method |
| `SOLVABLE_SIZES` | `[2, 3]` | The sizes it is written for |
| `SOLVE_ALGORITHMS` | | The method's seven algorithms, in notation |
| `stageName`, `stageSays` | `(stage, language?) => string` | A step's name, and what it is for |
| `algorithmName` | `(algorithm, language?) => string` | An algorithm's name |

Types: `SolveStep` (`{ stage, moves, parts, algorithms }`), `SolvePart`
(`{ moves, algorithm? }`), `SolveStage`, `SolveAlgorithm`.

### Export, import and the command line

| Export | Signature | Does |
| --- | --- | --- |
| `toJSON`, `fromJSON` | `(solves) => string`, `(text) => SolveRecord[] \| null` | Versioned JSON, out and back |
| `toText`, `fromText` | `(solve) => string`, `(text) => SolveRecord \| null` | Plain lines, out and back |
| `toCSV` | `(solves) => string` | A row a solve |
| `summarize` | `(solve) => SolveSummary` | What a solve comes to |
| `RECORD_FORMAT` | `1` | The version of the JSON's shape |
| `runCli` | `(args, surroundings?) => { code, out, err }` | The command line as a pure function |
| `cubeNet` | `(state, n, colour?) => string` | A cube unfolded, as lines of text |
| `VERSION` | | The package's version |

Types: `SolveRecord` (`{ size, scramble, moves, ms?, at?, seed? }`),
`SolveSummary`, `CliSurroundings`, `CliResult`.

### Replay, the player and famous solves

| Export | Signature | Does |
| --- | --- | --- |
| `parseSolve` | `(text, n) => SolveReading` | A solve as written, read into steps, or the first fault |
| `parseSolveMove` | `(token, n) => step \| "unknown" \| "no-such-layer"` | One written step |
| `solveMoves`, `applySolve` | `(steps) => CubeMove[]`, `(state, n, steps) => string` | The layers the steps turn; a cube after them |
| `solveText`, `countSolveMoves` | `(steps) => string`, `(steps) => number` | The steps in standard form; how many count as moves |
| `readSolveLink` | `(text) => SolveLink \| null` | The scramble and solve in a link to alg.cubing.net |
| `planReplay` | `(source) => { ok, plan } \| { ok, fault }` | A solve read, checked and timed |
| `Replay` | `new Replay(cube, plan, options?)` | A plan played: `play`, `pause`, `step`, `seek`, `restart`, `setSpeed`, `setLoop`, `status`, `destroy` |
| `REPLAY_SPEEDS`, `REPLAY_STEP_MS`, `REPLAY_LOOP_REST_MS`, `MAX_REPLAY_STEPS` | | The speeds offered, the steady pace, the rest before a repeat, the longest solve |

Types: `SolveMove`, `SolveReading`, `NotationFault`, `SolveLink`,
`ReplaySource`, `ReplayPlan`, `ReplayFault`, `ReplayStatus`, `ReplayOptions`,
`ReplayCube`, `ReplayClock`.

From `@johnmorrisdotca/kyuubu/player`: `mountPlayer(element, options)`,
`PLAYER_CSS`, and the types `PlayerOptions` and `PlayerHandle`. From
`@johnmorrisdotca/kyuubu/element`: `defineCube(name?)`,
`CUBE_ELEMENT_NAME`, `CUBE_ELEMENT_ATTRIBUTES` and the type
`KyuubuCubeElement`. From `@johnmorrisdotca/kyuubu/famous`: `FAMOUS_SOLVES`,
`famousSolve(id)` and the type `FamousSolve`.

### Scale and the cube that keeps turning

| Export | Is |
| --- | --- |
| `CUBE_SCALES` | `["small", "medium", "large"]`; the type is `CubeScale` |
| `CUBE_SCALE_PX` | `{ small: 72, medium: 160, large: 300 }` |
| `CUBE_SCALE_INTERACTIVE` | Whether a cube of each scale is turned by a hand unless told: `small` is not |
| `cubeWidthPx` | `(scale?, width?) => number \| null`: the width a cube is drawn at |
| `isCubeScale` | `(value) => boolean` |
| `keepScrambling` | `(cube, options?) => KeepScramblingHandle`: `start`, `stop`, `setPace`, `running`, `destroy` |
| `SCRAMBLE_PACES` | `{ fast: 0.5, normal: 1, slow: 4 }`, in seconds; the type is `ScramblePace` |
| `SCRAMBLE_DEFAULT_PACE`, `SCRAMBLE_SHORTEST` | `1` and `0.2` seconds |
| `paceSeconds` | `(pace?) => number`: a pace as seconds |
| `nextTurn` | `(n, last, random, faces) => CubeMove`: one random layer, never about the last axis |
| `prefersReducedMotion` | `() => boolean` |

Types: `KeepScramblingOptions`, `Scrambled` (what the loop turns: a `CubeView` is one), `ScramblePage`.

### Show me on the cube

| Export | Signature | Does |
| --- | --- | --- |
| `mountGuide` | `(element, view, options) => GuideHandle` | The guide beside a cube: the next move on the cube and in words. Options: `moves` or `method`, `locale`, `onChange`, `onEnd`. The handle has `guide`, `takeBack()`, `makeNext()`, `load(source)`, `setLocale()`, `destroy()` |
| `GUIDE_CSS` | | The guide's stylesheet, put in the page once; it colours through `--kyuubu-guide-ink`, `alert`, `button`, `rule` and `focus` |
| `Guide` | `new Guide(state, n, source)` | The walk itself, with no page: `next`, `heard(move)` (`"done"`, `"part"`, `"off"` or `"back"`), `detours`, `takeBack()`, `makeNext()`, `done`, `finished`, `state` |
| `dragHint` | `(moves, n, view) => DragHint \| null` | The sticker to take hold of and the way to drag it that makes these turns, from this view; `null` for a turn of the whole cube |
| `HINT_MIN_FACING`, `HINT_MIN_FOLLOW` | `0.2`, `0.5` | How squarely a face must face the viewer to carry an arrow; how closely the arrow must go the layer's way |
| `movementSays` | `(moves, n, language?) => string \| null` | A movement in plain words: "Turn the right face towards you." |
| `movementText` | `(moves, n) => string` | A movement in notation, wide turns as `Rw` |
| `rotationKeys` | `(move) => string` | The keys for a turn of the whole cube: `X`, `Shift+X`, `X X` |

Types: `GuideSource` (`{ moves }` or `{ method: true }`), `GuideStep`,
`GuideHeard`, `GuidePanelOptions`, `GuideHandle`, `DragHint`, `HintArrow`,
`CubeViewEvents`.

### Words

| Export | Does |
| --- | --- |
| `WORDS` | The cube's own words in English and Japanese: its label, the steps, the algorithms |
| `STRINGS` | `WORDS` and the command line's words together: every word the package says |
| `fill` | `fill("A {n}×{n} cube", { n: 3 })` is `"A 3×3 cube"` |
| `languageOf` | The language a tag such as `ja-JP` names: `"ja"` or `"en"` |

Types: `CubeWords`, `CliWords`, `KyuubuStrings`, `KyuubuLanguage`.

### `new CubeView(element, options)`

| Option | Default | Meaning |
| --- | --- | --- |
| `size` | required | The cube's side, 2 or more |
| `state` | solved | The stickers to start with |
| `scale` | | `"small"` (72 pixels), `"medium"` (160) or `"large"` (300): the box is given that width and kept square. Left out, the cube fills its box. A `small` cube is look-only unless `interactive` says otherwise |
| `width` | | How wide it is drawn, in pixels, in place of `scale`'s |
| `interactive` | `true` | Whether a person can turn it. `turn()` always works. `false` at `small` |
| `keyboard` | `"focus"` | `"focus"`, `"page"` or `"none"` |
| `turnMs` | `160` | How long a quarter turn made by a key, notation or code takes. Turns waiting in line go faster, and reduced motion gets none |
| `commitAngle` | `30` | The point of no return of a dragged layer, in degrees, from 5 to 85 |
| `yaw`, `pitch` | `-35`, `28` | The first view, in degrees |
| `fill` | `0.9` | How much of its box the cube fills |
| `rounded` | `true` | Rounds the cube's corners like a real cube's plastic; `false` for square |
| `colours` | standard | Face colours by letter: `{ U, R, F, D, L, B }` |
| `plastic` | `"#111"` | The colour between stickers |
| `theme` | | A whole look at once: `{ colours, plastic, stickerInset, stickerRadius, cornerRadius }` |
| `locale` | the page's `lang` | `"en"` or `"ja"`, for the accessible name |
| `label` | `"A 3×3 cube"` | Its accessible name |
| `onTurn` | | `(move, state)` for every turn a person makes |
| `onLook` | | `(yaw, pitch)` whenever the view turns |

| Member | Does |
| --- | --- |
| `turn(move, { report?, animate? })` | Turns a layer, animated after any turns already on their way |
| `setState(state, size?)` | Shows a state at once |
| `state`, `size`, `host` | The state once every turn in line has finished; the side; the element |
| `setLook(yaw, pitch)`, `resetLook()`, `looking` | The view |
| `setInteractive(on)` | Lets a person turn it, or stops them |
| `setScale(scale?, width?)` | Draws it at a scale or a width, or with neither, back to filling its box |
| `turnTogether(moves, { animate?, ms? })` | Turns several layers about one axis as one movement (a wide turn), in `ms` when given |
| `busy` | Whether a turn asked for is still on its way |
| `redraw()` | Takes the cube out of the page and puts it straight back. Kept for pages that call it; since 1.3.2 the cube asks for no 3D context, so there are no layers for a browser to lose |
| `setTurnMs(ms)` | Changes how long a quarter turn takes |
| `setTheme(theme)` | Changes colours, plastic or sticker shape on the cube as drawn |
| `setLocale(locale)` | Changes the language of its accessible name |
| `showHint(moves)` | Lights the layer the turns are of, dims the rest, and draws the arrow to drag; `null` takes it away (see *Show me on the cube*) |
| `hint` | What the hint shows from where the cube is looked at now: the sticker to take hold of, the way to drag, or `face: null` to look round first |
| `on(type, listener)` | Listens for `"turn"` or `"look"`, as `onTurn` and `onLook` are told, as many listeners as wanted; returns what stops it |
| `destroy()` | Removes the cube and every listener |

The root element carries `data-kyuubu`, `data-state`,
`data-turning="true" | "false"`, and while a layer is dragged `data-dragging`,
`data-committed` and `data-angle`, and while a hint is shown `data-hint`
(`"drag"`, `"look"` or `"whole"`); each sticker carries `data-slot` and
`data-face`, and under a hint `data-hint-lit` and, on the one to take hold
of, `data-hint-grab`. The arrow is `[data-hint-arrow]`, with the way to drag
on the screen in `data-drag`. Tests can wait on these.

Also exported, for tools of your own: `moveForWheel` and `moveForDrag` (the
turn the wheel means over a sticker, and the turn a whole drag means at
once), `readKey` (the turn a key
means; type `KeyReading`), `viewMatrix` (the way the cube is looked at; type
`Mat3`), and the types `CubeViewOptions` and `CubeTheme`.

### `<Kyuubu />`, from `@johnmorrisdotca/kyuubu/react`

This component takes every `CubeView` option as a prop, plus `className`,
`style` and any `data-*` (type `KyuubuProps`). Its `ref` (type
`KyuubuHandle`) gives `turn`, `setState`, `resetLook`, `setTheme`, `state`
and `showHint`. When the `state` prop changes to something the cube is not
already showing, the cube shows it, so a parent can keep the state and hand it
back without the cube jumping.

The `hint` prop shows moves on the cube the way the visual guide does (the
layer lit, an arrow the way to drag it); null shows nothing:

```tsx
<Kyuubu size={3} state={state} hint={nextStep.moves.slice(0, 1)} onTurn={(move, now) => setState(now)} />
```

## Theming

Every colour, and the shape of a sticker, can be set three ways: as an
option when the cube is made, as a CSS custom property on the cube's element
or any ancestor, or later with `setTheme`. An option wins over a custom
property.

| Custom property | Option | Default | Is |
| --- | --- | --- | --- |
| `--kyuubu-up` | `colours.U` | `#f7f7f2` | The up face: white |
| `--kyuubu-right` | `colours.R` | `#c8102e` | The right face: red |
| `--kyuubu-front` | `colours.F` | `#009b48` | The front face: green |
| `--kyuubu-down` | `colours.D` | `#ffd500` | The down face: yellow |
| `--kyuubu-left` | `colours.L` | `#ff5800` | The left face: orange |
| `--kyuubu-back` | `colours.B` | `#0046ad` | The back face: blue |
| `--kyuubu-plastic` | `plastic` | `#111` | The plastic between stickers and inside the cube |
| `--kyuubu-sticker-inset` | `theme.stickerInset` | `6%` | How far a sticker sits in from the edge of its square |
| `--kyuubu-sticker-radius` | `theme.stickerRadius` | `14%` | How round a sticker's corners are |
| `--kyuubu-corner-radius` | `theme.cornerRadius` | `15px` | How round the cube's own corners are, on a cube 300px across (it scales with the cube); `0` is square, as is `rounded: false` |

A hint on the cube (`showHint`, and so the guide) is coloured by its own
properties, which work the same in light and dark, since the cube is drawn
the same on both:

| Custom property | Default | Is |
| --- | --- | --- |
| `--kyuubu-hint-colour` | `#fff` | The arrow, and the ring round every sticker of the layer to turn |
| `--kyuubu-hint-edge` | `rgba(17, 17, 17, 0.85)` | The edge round the arrow, so that it shows on a white sticker too |
| `--kyuubu-hint-dim` | `brightness(0.62) saturate(0.7)` | The CSS filter on every sticker the hint does not light; `none` dims nothing |
| `--kyuubu-hint-opacity` | `0.96` | How solid the arrow is |

`CUBE_THEMES` holds three looks: `standard`, `stickerless` (colour to the
edge of every piece) and `paper`, which is the one the demo site wears:

```ts
import { CUBE_THEMES, CubeView } from "@johnmorrisdotca/kyuubu";

const view = new CubeView(element, { size: 3, theme: CUBE_THEMES.paper });
view.setTheme({ colours: { U: "#fffdf7" }, plastic: "#1f2320" });   // later, without redrawing
```

```css
/* The same look from a stylesheet, which can follow light and dark. */
.my-cube {
  --kyuubu-up: #fffdf7; --kyuubu-right: #b5452c; --kyuubu-front: #2f7a4f;
  --kyuubu-down: #e0b43b; --kyuubu-left: #d97a2b; --kyuubu-back: #2b5f8f;
  --kyuubu-plastic: #1f2320;
}
```

The cube has no background of its own: it sits on whatever is behind its
element. `DEFAULT_COLOURS`, `DEFAULT_PLASTIC` and `FACE_PROPERTIES` (which
property colours which face) are exported.

## Limits

| Limit | Value | Constant |
| --- | --- | --- |
| Sizes the package is made and tested for | 2×2 to 7×7 | `MIN_RECORD_SIZE`, `MAX_RECORD_SIZE` |
| Sizes with a step-by-step solve | 2×2 and 3×3 | `SOLVABLE_SIZES` |
| Layers notation reaches from a face | 9 | |
| Turns in one saved solve, scramble and moves each | 10,000 | `MAX_RECORD_MOVES` |
| Solves read from one file | 1,000 | `MAX_RECORDS` |
| Characters in a saved seed | 200 | `MAX_RECORD_SEED` |
| A scramble from the command line | 1 to 1,000 turns | `MAX_CLI_LENGTH` |
| Scrambles from the command line at once | 100 | `MAX_CLI_COUNT` |

The model turns a cube of any size from 2 up, and the view draws one; past
7×7 nothing is tested, and a saved solve is refused.

## Browser support

Every current browser with CSS 3D transforms and Pointer Events: Chrome,
Edge, Firefox and Safari 15 or later, on desktop and mobile. There is
nothing to polyfill. It is tested in Chromium and in WebKit, Safari's
engine, at phone size with touch.

## Languages

English and Japanese, for everything the package says: the cube's accessible
name, the steps of a solve and what each is for, the algorithms' names, and
the command line. The view follows its `locale` option, or the page's `lang`;
the command line follows `--lang` or the environment. The demo has a chooser
of its own, follows the browser's language on a first visit, and takes
`?lang=ja` or `?lang=en` in the address.

**Japanese: included; not yet reviewed by a native reader. Corrections
welcome.** Every Japanese string is listed beside its English in
[docs/strings-ja.md](./docs/strings-ja.md), and there is an issue template
for fixing one.

## Roadmap

- A solve for the 4×4 and up, by reduction to a 3×3 (today a big cube can
  only take back every turn made on it)
- Competition-style scrambles for the big cubes, which use wide turns (the
  notation reads wide turns already; the scrambler does not make them yet)
- More famous solves: the records before 2017 whose reconstructions are in
  forum threads, and the other events
- Measured times for each move of the famous solves (the player takes a time
  per move already, as `stepMs`; the records give only the whole time)
- A drag that follows a real touch in the tests, not only a mouse
- Other shapes: 2×2×3, 3×3×2

Done since the first release, and no longer on this list: Vue, Svelte and
Angular (above, each proved from the packed tarball), the `<kyuubu-cube>`
element for any page or framework, replaying and embedding a solve, famous
record solves, pasting a solve as it is written or as a link, and each move
shown on the cube with an arrow to follow.

Left out on purpose: a wrapper component for every framework (React has one;
everywhere else the element or one `new CubeView` does the same job, with
nothing more to keep up); a shortest-possible solver (others do that well,
and it teaches nobody the cube); a timer with inspection and penalties,
which is an application and not a cube; and anything that needs a server. Kyuubu runs
from a static page and costs nothing to host.

Ideas and pull requests are welcome.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). In short:

```sh
pnpm install
pnpm check   # lint, types, tests and a build
pnpm site    # build the demo into ./_site, then serve it
```

Please follow the [code of conduct](./CODE_OF_CONDUCT.md).

## Changes

See [CHANGELOG.md](./CHANGELOG.md).

## Licence

[MIT](./LICENSE) © John Morris
