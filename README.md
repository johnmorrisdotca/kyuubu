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

<p align="center"><a href="https://johnmorrisdotca.github.io/kyuubu/"><strong>Turn a cube →</strong></a> · <a href="https://johnmorrisdotca.github.io/kyuubu/api.html">API reference</a> · <a href="https://johnmorrisdotca.github.io/kyuubu/builder.html">Build a cube</a></p>

<table align="center">
<tr>
<td align="center" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/hero-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/hero-desk-light.webp" alt="A scrambled 3×3 on green felt, three steps into its solve, under the demo's header with its language chooser, page links, cloth swatches and Help switch: the Solve tab naming the White cross step with its reason, the timer and the move count above the cube, and the 2×2 to 7×7 sizes and the scramble and undo buttons under it." width="720">
</picture>
<br><em>A scrambled 3×3, three steps into its solve, on a desk.</em>
</td>
<td align="center" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/hero-phone-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/hero-phone-light.webp" alt="The same cube on a phone, in Japanese: the timer and move count above it, the 2×2 to 7×7 sizes under it, the scramble, undo, reset and face-front buttons, and the tabs for the solve, the notation and the colours." width="220">
</picture>
<br><em>The cube on a phone, in Japanese, in the device's light or dark.</em>
</td>
</tr>
</table>

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

```ts no-check
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
- **Cuboids.** The Floppy 1×3×3, the Tower 2×2×3, the Domino 2×3×3 and any
  `a × b × c` from 1 to 7: turned by drag with the rule that a layer turns a
  quarter only where its slice is square, written in the same notation, and
  scrambled to a state chosen fairly. [Its own section](#cuboids).
- **English and Japanese**, for everything the package says to a person.
- **Accessible.** The cube is a labelled `application`, takes the keyboard,
  and every turn can be made without a pointer.

### What's in it

Each picture is a page of [the demo](https://johnmorrisdotca.github.io/kyuubu/), taken with `pnpm screenshots:readme`, in light and dark. `Math.random` is a seeded generator in the page, so every scramble is the same and the same pictures come again.

<table>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/the-cube-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/the-cube-desk-light.webp" alt="A scrambled 3×3 cube drawn in CSS 3D on green felt, seen at a corner with the top, front and right faces showing, each sticker a rounded square of red, orange, yellow, green, blue or white." width="300">
</picture>
<br><em><strong>The cube</strong>: drawn in plain CSS 3D, no canvas and no WebGL.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/cubes-of-every-size-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/cubes-of-every-size-desk-light.webp" alt="The page of cubes of every size: a 2×2 to a 7×7 drawn one after another, and the same cube drawn large, medium and small for a list, with the tag that puts it on a page." width="400">
</picture>
<br><em><strong>Every size</strong>, from the 2×2 to the 7×7, large, medium or small.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/builder-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/builder-desk-light.webp" alt="The builder page: a live cube on the left and on the right a form with every option, such as size, scale, theme, turn speed and keys, above the code in ES module, React, Vue, Svelte and Angular that makes exactly that cube." width="300">
</picture>
<br><em><strong>The builder</strong>: every option, the cube and the code that makes it.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/famous-solves-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/famous-solves-desk-light.webp" alt="The famous solves page: a player that turns a cube through a record solve with its scramble and moves listed, scrub bar, speed buttons and a list of the moves as buttons, and the form to paste a solve of your own." width="400">
</picture>
<br><em><strong>Famous solves</strong>: replay a record, or paste a solve of your own.</em>
</td>
</tr>
<tr>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/cuboid-domino-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/cuboid-domino-desk-light.webp" alt="The cuboids page: a scrambled 2×3×3 Domino drawn like the cube, a row of shapes to choose from and the scramble, undo and reset buttons." width="400">
</picture>
<br><em><strong>Cuboids</strong>: a Domino, and shapes from 1×1×2 to 7×7×7.</em>
</td>
<td align="center" valign="top" width="50%">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/cuboid-pillar-desk-dark.webp">
<img src="https://raw.githubusercontent.com/johnmorrisdotca/kyuubu/main/docs/images/cuboid-pillar-desk-light.webp" alt="The cuboids page with a scrambled 3×4×3 pillar, taller than it is wide, on the green felt with the same buttons and the shapes to choose from." width="400">
</picture>
<br><em><strong>A pillar</strong>: any box, scrambled and turned by hand.</em>
</td>
</tr>
</table>

## Use it in your project

### Install

```sh
npm install @johnmorrisdotca/kyuubu
```

```sh
pnpm add @johnmorrisdotca/kyuubu
```

```sh
yarn add @johnmorrisdotca/kyuubu
```

A page with no bundler loads the cube as a tag from a CDN, naming the major version so that a release that changes what you use is one you choose:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></script>
```

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

```ts no-check
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

### Build one with every option

The [builder](https://johnmorrisdotca.github.io/kyuubu/builder.html) is a
page with every choice the package offers (size, scale, theme, a colour for
each face, turn speed, keys, the pace of a cube that keeps turning, the
replay's settings, the guide, the language), a live cube that changes as each
is chosen, and the exact code for that cube as a custom element, an ES module,
an iframe, React, Vue, Svelte and Angular, each with a Copy button. The
choices are in the address, so a link shares the cube. It writes nothing for a
choice that is what the package does when it is left out.

The page has no row of its own for any option. It is drawn from `CUBE_OPTIONS`,
the package's own list of its choices: each has a kebab-case `id`, a `group`, a
`kind` (`number`, `boolean`, `choice`, `colour`, `text` or `moves`), its default,
its choices or range, what each way of making a cube calls it (`names.view` for
`CubeView`, `names.player` for `mountPlayer`, `names.cube` for the attributes of
`<kyuubu-cube>` and the embed's address, `names.turning` for those of
`<kyuubu-scramble>`), and one plain line in English and Japanese. `CUBE_OPTION_GROUPS`
names the groups, and `CUBE_OPTIONS_LEFT_OUT` says why each option that is
not a choice (a function the page gives, a list only a program has) is not in it.
A test reads the options of the view, the player and both elements out of the
source and fails until each is a row or is left out with its reason, so a new
option cannot be added to the package and missed by the builder (types
`CubeOption`, `OptionKind`, `OptionGroup`, `CubeMaker`).

The code is written by `demo/builder-code.js`, pure functions from that list and
the choices made; the page is `demo/builder.html` and `demo/builder.js`. The three
files do not name an option, so they can be copied to another package with its own
list.

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
  Events. The model, the solver and the command line run in Node 22 and
  later.

The cookbook, with the output of each example, is under [Examples](#examples).

## Examples

Every TypeScript and JavaScript block that can run is type-checked against the built package and run by `pnpm test:readme`, so the output after `// →` is what the code prints. The model has no DOM in it, so most of these run under Node.

### A page with nothing else

Save this as a file and open it: one script and one element, and a cube a person can turn by drag, touch, wheel or keys:

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A cube</title>
<div id="cube" style="width: 300px; height: 300px; position: relative"></div>
<script type="module">
  import { CubeView } from "https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/index.js";

  new CubeView(document.getElementById("cube"), { size: 3, keyboard: "page" });
</script>
```

### A scramble from a seed

The same words give the same scramble for everyone, on every machine, so a club can share one by sharing a phrase. A cube is a string of 54 letters, and a turn is a pure function:

```ts
import { movesNotation, randomScramble, seededRandom, solvedCube, turnAll } from "@johnmorrisdotca/kyuubu";

const scramble = randomScramble(3, 25, seededRandom("club night"));
console.log(movesNotation(scramble, 3).split(" ").slice(0, 6).join(" "));   // → B L' S' U' F' R2
const cube = turnAll(solvedCube(3), 3, scramble);
console.log(cube.length);                                                    // → 54
```

### Read and write notation

`parseMoves` reads cubers' notation, and gives back `null` where any of it is not a turn. A turn undone is the turn the other way, in the opposite order:

```ts
import { cubeSolved, movesNotation, parseMoves, solvedCube, turnAll, undoAll } from "@johnmorrisdotca/kyuubu";

const moves = parseMoves("R U R' U'", 3)!;
console.log(movesNotation(undoAll(moves), 3));                               // → U R U' R'
console.log(cubeSolved(turnAll(solvedCube(3), 3, moves), 3));                // → false
console.log(parseMoves("R Q", 3));                                           // → null
```

### Watch it solve, one named step at a time

`solveSteps` is the beginner's layer-by-layer method as steps with names and reasons, in English and Japanese, and the moves of every step solve the cube:

```ts
import { cubeSolved, randomScramble, seededRandom, solveSteps, solvedCube, stageName, turnAll } from "@johnmorrisdotca/kyuubu";

const cube = turnAll(solvedCube(3), 3, randomScramble(3, 25, seededRandom("club night")));
const steps = solveSteps(cube, 3)!;
console.log(steps.length, stageName(steps[1].stage), stageName(steps[1].stage, "ja"));   // → 17 White cross 白のクロス
console.log(cubeSolved(turnAll(cube, 3, steps.flatMap((step) => step.moves)), 3));      // → true
```

### Check a solve on a server

The model has no DOM, so a server can scramble, send the scramble, and check the moves a player sends back. `summarize` says whether they solved it and how many turns it took:

```ts
import { parseMoves, summarize, toCSV, toText } from "@johnmorrisdotca/kyuubu";

const solve = { size: 3, scramble: parseMoves("R U2 F'", 3)!, moves: parseMoves("F U2 R'", 3)!, ms: 12340, seed: "club night" };
console.log(summarize(solve).solved, summarize(solve).count);                // → true 3
console.log(toCSV([solve]).split("\n")[1]);                                  // → ,3,R U2 F',F U2 R',3,true,12.34,club night
```

### Keep a solve, and read it back

A solve is its size, the scramble and the turns made after it. It is written out three ways, each a pure function that returns a string, and read back without trust:

```ts
import { fromText, parseMoves, toText } from "@johnmorrisdotca/kyuubu";

const solve = { size: 3, scramble: parseMoves("R U2 F'", 3)!, moves: parseMoves("F U2 R'", 3)!, ms: 12340, seed: "club night" };
const text = toText(solve);
console.log(text.split("\n").slice(0, 3));                                   // → [ '3x3', "scramble: R U2 F'", "solve: F U2 R'" ]
console.log(fromText(text)?.size, fromText("not a solve"));                  // → 3 null
```

### A tag in any framework

`<kyuubu-cube>` is the cube as a tag, for a page with a framework or none: a solve, shown on a cube at the pace it was made, with controls (see [Use it in your project](#use-it-in-your-project) for React, Vue, Svelte and Angular):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></script>
<kyuubu-cube size="4" scramble="R U R' U'" moves="U R U' R'" controls></kyuubu-cube>
```

### A solve played back

The same tag replays a solve with its scramble, a scrubber, speeds and a list of the moves as buttons, starting at once and beginning again at the end (see [Replay a solve](#replay-a-solve) for every attribute):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/element-define.js"></script>
<kyuubu-cube scramble="R U R' U'" moves="U R U' R'" time="2.5" controls autoplay loop></kyuubu-cube>
```

### A cuboid

Boxes from 1×1×2 to 7×7×7 are turned the same way, with their own entry points; one tag plays a solve on any of them:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/cuboid/element-define.js"></script>
<kyuubu-cuboid dims="3x3x1" scramble="U2 R2 M2" moves="M2 R2 U2" controls></kyuubu-cuboid>
```

### From a terminal

```sh
npx @johnmorrisdotca/kyuubu --seed table
```

```text
D' R2 U' F2 L' S L F' R E' B' R2 D S' R' E' B2 L' B' D2 F' E S U' M'
```

The scramble is the same for the same seed on every machine. `--solve`, `--verify` and `--json` do the rest of the job from a terminal: see [The command line](#the-command-line).

### A look of your own

Every colour and the shape of a sticker is a CSS custom property, an option, or a later `setTheme` (the table is under [Theming](#theming)):

```css
.cube { --kyuubu-up: #fff7d6; --kyuubu-front: #1b9e77; }
```

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

A person turns the cube with the keys (a letter turns its face, with Shift the other way), by dragging a sticker so that its layer turns with it, by the wheel, or by touch; a layer let go before its point of no return springs back, and a drag on the seam between two layers turns both.

The options, the examples and the tables are in [docs/CONTROLS.md](docs/CONTROLS.md#controls).

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

```ts no-check
parseMove("R", 3);      // { axis: 0, layer: 2, turns: 3 }
parseMove("2R'", 4);    // { axis: 0, layer: 2, turns: 1 }
parseMove("x", 3);      // { axis: 0, layer: "all", turns: 3 }
encodeCubeMoves(parseMoves("R U2 F'", 3)!);   // "x23y22z21": three characters a move, for a column
```

Every function returns a new state and leaves the one it was given alone.
`cubeSolved` asks only that every face be one colour, so a solved cube turned
whole in the hand is still solved.

## A solve a person can follow

`solveSteps` is the beginner's layer-by-layer method for any 2×2 or 3×3 as steps with names, reasons and the algorithm each one uses, in English and Japanese; the cube's guide tells a person what to turn next and shows it.

The options, the examples and the tables are in [docs/REPLAY.md](docs/REPLAY.md#a-solve-a-person-can-follow).

## Show me on the cube

A move written in notation can be shown on the cube itself: an arrow on the face to turn, in the direction to turn it, in sentences as well as letters, so that a person follows a solve by hand.

The options, the examples and the tables are in [docs/REPLAY.md](docs/REPLAY.md#show-me-on-the-cube).

## Replay a solve

A scramble and the moves that solved it, shown on a cube at the pace they were made: what a record looked like, a move at a time. Seen move by move in a list of buttons, embedded on any site as one tag or an iframe, with the famous record solves one click away.

The options, the examples and the tables are in [docs/REPLAY.md](docs/REPLAY.md#replay-a-solve).

## A cube drawn small, medium or large

A cube for a list or a row of cards is drawn at a named scale (`small`, `medium`, `large`) and fills the width it is given.

The options, the examples and the tables are in [docs/DISPLAY.md](docs/DISPLAY.md#a-cube-drawn-small-medium-or-large).

## A cube that keeps turning

A cube that turns by itself, slowly, for a hero or a loading screen: it stays still for anybody who asks for less motion.

The options, the examples and the tables are in [docs/DISPLAY.md](docs/DISPLAY.md#a-cube-that-keeps-turning).

## Cuboids

Box-shaped turning puzzles from 1×1×2 to 7×7×7, in their own entry points (`@johnmorrisdotca/kyuubu/cuboid` and its `/draw`, `/play`, `/element`), drawn like the cube, turned the same way, with one tag that plays a solve on any of them.

The options, the examples and the tables are in [docs/CUBOIDS-USE.md](docs/CUBOIDS-USE.md#cuboids).

## Scrambles and seeds

```ts no-check
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

Installing the package puts `kyuubu` on the path. It needs Node 22 or later
and nothing else, and runs the same on Linux, macOS and Windows.

```sh
npm install -g @johnmorrisdotca/kyuubu    # or use npx, as above
```

```text
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

```ts no-check
const solve = { size: 3, scramble: parseMoves("R U2 F'", 3)!, moves: parseMoves("F U2 R'", 3)!, ms: 12340, seed: "club night" };

toJSON(solve);        // { "format": 1, "generator": "kyuubu 1.11.1", "solves": [ … ] }
fromJSON(text);       // the solves back again, or null if it is not an export
toText(solve);        // a few lines for a chat or a note
fromText(text);       // the solve back again, or null
toCSV([solve]);       // for a spreadsheet
summarize(solve);     // { scramble: "R U2 F'", moves: "F U2 R'", solved: true, count: 3, start, state, size }
```

```text
3x3
scramble: R U2 F'
solve: F U2 R'
time: 12.34
seed: club night
```

```text
time,size,scramble,moves,count,solved,seconds,seed
,3,R U2 F',F U2 R',3,true,12.34,club night
```

The shape of the JSON, which is what to keep if you keep solves:

```json
{
  "format": 1,
  "generator": "kyuubu 1.11.1",
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

### Entry points

| Import | What it holds |
| --- | --- |
| `@johnmorrisdotca/kyuubu` | The model, notation, scrambles, the solver, export and import, `CubeView`, the guide, the replay and the words |
| `@johnmorrisdotca/kyuubu/react` | `Kyuubu`, a component wrapping `CubeView` |
| `@johnmorrisdotca/kyuubu/famous` | The record solves |
| `@johnmorrisdotca/kyuubu/player` | `mountPlayer`: a solve with its controls |
| `@johnmorrisdotca/kyuubu/element`, `/element/define` | `<kyuubu-cube>` and `<kyuubu-scramble>` |
| `@johnmorrisdotca/kyuubu/cuboid`, `/cuboid/draw`, `/cuboid/play`, `/cuboid/element`, `/cuboid/element/define` | The cuboids: model, view, player and tag |

### The calls to learn first

| Call | What it does |
| --- | --- |
| `solvedCube(n)`, `turnAll(cube, n, moves)`, `cubeSolved(cube, n)` | A cube is a string; a turn is a pure function |
| `parseMoves(text, n)`, `movesNotation(moves, n)`, `undoAll(moves)` | Notation in and out |
| `randomScramble(n, length, random)`, `seededRandom(seed)` | A scramble from a seed |
| `solveSteps(cube, n)`, `stageName(stage, language?)` | The beginner's method as named steps |
| `toJSON`, `toText`, `toCSV`, `fromJSON`, `fromText`, `summarize` | A solve kept and read back |
| `new CubeView(element, options)` and `<kyuubu-cube>` | The cube on a page |
| `new Replay(cube, plan, options)`, `planReplay` | A solve played back |

### Every export

The tables of every export (the model, notation, scrambles, the solve, export and import, the replay, the player and famous solves, scale, show me, words, `CubeView` and `<Kyuubu />`) are in [docs/API.md](docs/API.md), and each one, with its signature and doc comment, is in the [API reference](https://johnmorrisdotca.github.io/kyuubu/api.html).

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

```ts no-check
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
| Cuboid sides | 1 to 7 each, and not 1×1×1 | `CUBOID_MIN_SIDE`, `CUBOID_MAX_SIDE` |
| Cuboid states a scramble is drawn uniformly from | 20,000 | `CUBOID_RANDOM_STATE_MAX` |
| Layers notation reaches from a face | 9 | |
| Turns in one saved solve, scramble and moves each | 10,000 | `MAX_RECORD_MOVES` |
| Solves read from one file | 1,000 | `MAX_RECORDS` |
| Characters in a saved seed | 200 | `MAX_RECORD_SEED` |
| A scramble from the command line | 1 to 1,000 turns | `MAX_CLI_LENGTH` |
| Scrambles from the command line at once | 100 | `MAX_CLI_COUNT` |

The model turns a cube of any size from 2 up, and the view draws one; past
7×7 nothing is tested, and a saved solve is refused.

**The biggest cubes on a phone's processor.** A 7×7 is 294 stickers, each given its place on the screen in every frame of a turn.
Measured in Chromium with the processor slowed fourfold (about a phone), the longest single task over six turns of a 7×7 is 21
milliseconds (the 3×3, 9), and the longest of a dragged layer 19. The longest are at the start and the end of a turn, where the
layer's stickers are lifted out of the cube and put back; the frames between are a few milliseconds each. `e2e/big.e2e.mjs`
fails a change that makes a turn cost several times that.

## Accessibility

- **The cube is one control.** Its box is a `role="application"` named "A 3×3
  cube" (3×3のキューブ in Japanese; the `label` option changes it), and with the
  default `keyboard: "focus"` it is a tab stop, so every turn can be made from
  the keyboard (see [Controls](#controls)) as well as by a pointer.
- **A solve is said, not only shown.** The guide's line is a polite live
  region, read out once for each move, in sentences ("Turn the right face
  towards you.") as well as notation; a turn it did not ask for is announced
  as an alert. The player's controls are real buttons with names, the speeds,
  Loop and Follow report whether they are pressed, and the scrubber has a name.
  The move just made is also said once, in a polite live region, and not for
  every move of a solve playing; the moves are buttons named with their code,
  their words and where they are, reached by one Tab stop and the arrow keys,
  Home and End, the one just made marked with `aria-current`.
- **Motion is optional.** A device that asks for reduced motion gets turns
  made at once, a cube that keeps turning stays still, and the guide's arrow
  does not move.
- **What it does not do.** Which colour is where is not read out: a person who
  cannot see the cube hears what to turn and what was turned, not the state of
  the faces.

`test/docs.test.js` checks each of these against the source.

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

Done since the first release, and no longer on this list: Vue, Svelte and
Angular (above, each proved from the packed tarball), the `<kyuubu-cube>`
element for any page or framework, replaying and embedding a solve, famous
record solves, pasting a solve as it is written or as a link, each move
shown on the cube with an arrow to follow, and the other shapes (cuboids:
2×2×3, 3×3×2 and the rest).

Left out on purpose: a wrapper component for every framework (React has one;
everywhere else the element or one `new CubeView` does the same job, with
nothing more to keep up); a shortest-possible solver (others do that well,
and it teaches nobody the cube); a timer with inspection and penalties,
which is an application and not a cube; and anything that needs a server. Kyuubu runs
from a static page and costs nothing to host.

Ideas and pull requests are welcome.

## Architecture

The cube, its notation, the solver and the famous solves are plain functions
over a string, with no DOM: the state is one letter a sticker, and every turn
returns a new string. Drawing is its own layer under `view/`, in plain DOM and
CSS with no canvas, and the player, the custom elements and the React
component are thin wrappers over it, each its own entry point, so a page loads
only what it uses.

The file-by-file tree, with a line on each source file, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the model and the notation, the scrambler and the solver, the view, the player and the elements, the cuboids (`cuboid/`), and the command line. Tests live in `test/`, apart from the code, and `test/docs.test.js` runs the
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

<!-- family:start (made by scripts/family-readme.mjs from scripts/family-template.mjs; change those, not this) -->
Kyuubu is one of twenty-four packages, each made for the same site, each at
[github.com/johnmorrisdotca](https://github.com/johnmorrisdotca). The code of every one is MIT.

- [Korokoro](https://github.com/johnmorrisdotca/korokoro) (コロコロ): dice, with notation, exact odds, real sounds and the dice of many games. [Demo](https://johnmorrisdotca.github.io/korokoro/).
- [Kyuubu](https://github.com/johnmorrisdotca/kyuubu) (キューブ): a turning cube for the browser, 2×2 to 7×7, with record solves to replay. [Demo](https://johnmorrisdotca.github.io/kyuubu/).
- [Hitotsu](https://github.com/johnmorrisdotca/hitotsu) (一つ): a colour-card shedding game for two to eight, with the house rules people play. [Demo](https://johnmorrisdotca.github.io/hitotsu/).
- [Toranpu](https://github.com/johnmorrisdotca/toranpu) (トランプ): a deck of playing cards, card games with computer players, and solitaires. [Demo](https://johnmorrisdotca.github.io/toranpu/).
- [Tane](https://github.com/johnmorrisdotca/tane) (種): seeded random numbers and daily seeds, the same in every browser and on every server. [Demo](https://johnmorrisdotca.github.io/tane/).
- [Narabe](https://github.com/johnmorrisdotca/narabe) (並べ): one rules engine for abstract board games, from gomoku and Reversi to Go and checkers. [Demo](https://johnmorrisdotca.github.io/narabe/).
- [Tenka](https://github.com/johnmorrisdotca/tenka) (天下): world conquest for two to six, on a map of the real world. [Demo](https://johnmorrisdotca.github.io/tenka/).
- [Kumimoji](https://github.com/johnmorrisdotca/kumimoji) (組み文字): a crossword tile race, in English and Japanese kana. [Demo](https://johnmorrisdotca.github.io/kumimoji/).
- [Tsunagi](https://github.com/johnmorrisdotca/tsunagi) (繋ぎ): a line-joining logic puzzle whose every level has exactly one answer. [Demo](https://johnmorrisdotca.github.io/tsunagi/).
- [Jarajara](https://github.com/johnmorrisdotca/jarajara) (ジャラジャラ): mahjong tiles drawn as SVG, stacked layouts, and the matching solitaire Awase. [Demo](https://johnmorrisdotca.github.io/jarajara/).
- [Suido](https://github.com/johnmorrisdotca/suido) (水道): a pipe puzzle: turn the pieces until the water reaches every drain. [Demo](https://johnmorrisdotca.github.io/suido/).
- [Domino](https://github.com/johnmorrisdotca/domino) (ドミノ): dominoes and Mexican Train. [Demo](https://johnmorrisdotca.github.io/domino/).
- [Kotoba](https://github.com/johnmorrisdotca/kotoba) (言葉): word lists and word-game rules in English, French, German and Japanese. [Demo](https://johnmorrisdotca.github.io/kotoba/).
- [Sugoroku](https://github.com/johnmorrisdotca/sugoroku) (双六): backgammon and its variants, with the doubling cube and match play. [Demo](https://johnmorrisdotca.github.io/sugoroku/).
- [Kazu](https://github.com/johnmorrisdotca/kazu) (数): grid number puzzles: Sudoku and its variants, Futoshiki and Skyscrapers. [Demo](https://johnmorrisdotca.github.io/kazu/).
- [Meikyuu](https://github.com/johnmorrisdotca/meikyuu) (迷宮): mazes on squares, hexagons, triangles and circles, made from a seed and drawn through with a finger or the mouse. [Demo](https://johnmorrisdotca.github.io/meikyuu/).
- [Hikidashi](https://github.com/johnmorrisdotca/hikidashi) (引き出し): a drawer of small Japanese text tools: era dates, kanji numerals, readings and sentence difficulty. [Demo](https://johnmorrisdotca.github.io/hikidashi/).
- [Chizu](https://github.com/johnmorrisdotca/chizu) (地図): maps of the world and of countries' regions, in English and Japanese, with a quiz and callouts. [Demo](https://johnmorrisdotca.github.io/chizu/).
- [Bushu](https://github.com/johnmorrisdotca/bushu) (部首): find a kanji by the parts it is made of. [Demo](https://johnmorrisdotca.github.io/bushu/).
- [Tobiishi](https://github.com/johnmorrisdotca/tobiishi) (飛び石): peg solitaire with nine boards and seeded solvable challenges. [Demo](https://johnmorrisdotca.github.io/tobiishi/).
- [Jirai](https://github.com/johnmorrisdotca/jirai) (地雷): minesweeper on shaped grids with verified no-guess boards. [Demo](https://johnmorrisdotca.github.io/jirai/).
- [Gunjin](https://github.com/johnmorrisdotca/gunjin) (軍人): five hidden-rank strategy games with pass-the-device play. [Demo](https://johnmorrisdotca.github.io/gunjin/).
- [Karakuri](https://github.com/johnmorrisdotca/karakuri) (からくり): eight hyper-casual puzzle games, some of them physics: draw a shield, pull pins, cut ropes, slide blocks, pour tubes. [Demo](https://johnmorrisdotca.github.io/karakuri/).
- [Houseki](https://github.com/johnmorrisdotca/houseki) (宝石): gem and stone matching puzzles: falling triplets, stone collapse, colour chains and gem swap. [Demo](https://johnmorrisdotca.github.io/houseki/).

**This package is Kyuubu.** The demos of all twenty-four share one header and footer, so each links the rest.
<!-- family:end -->

## Development

```sh
pnpm install --frozen-lockfile
pnpm check             # lint, types, tests and the build
pnpm test:site         # the demo in real browsers
pnpm test:cli          # the command line, as a child process
pnpm test:package      # pack it as npm does, install it and import every entry
pnpm test:frameworks   # the framework examples, built from the packed tarball and played
pnpm test:readme       # every TypeScript and JavaScript example in this README, type-checked and run
pnpm screenshots:readme  # retake the README's pictures into docs/images (builds the demo first)
```

The pictures are taken on the maintainer's Mac and are retaken only when the look changes; they are in `docs/images` and are not in the package that npm installs.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). In short: run `pnpm check` before you push (see [Development](#development)).

Please follow the [code of conduct](./CODE_OF_CONDUCT.md). A way to make the
solver or a parser run for very long, or text that gets out of the cube into
the page, is for the [security policy](./SECURITY.md), not a public issue.

## Changes

See [CHANGELOG.md](./CHANGELOG.md).

The latest release is 1.11.1: the README takes the family's full layout, with pictures of the cube, its pages and the cuboids and examples that are run.

## Licence

[MIT](./LICENSE) © John Morris The cube is drawn in code: no picture, font or sound of anyone else's ships.
