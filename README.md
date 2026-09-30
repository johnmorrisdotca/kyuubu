# Kyuubu キューブ

A turning cube for the browser, from the 2×2 to the 7×7, drawn in CSS 3D with no canvas, no WebGL and no framework. Turn it with a drag, the mouse wheel, a finger or cubers' notation on the keyboard. A small React component is included.

**[Try the demo](https://johnmorrisdotca.github.io/kyuubu/)**

*Kyuubu* is キューブ, "cube", said the Japanese way.

## What it does

- **Any size.** Every cube from 2×2 up is the same few lines of geometry, not tables of face cycles.
- **Real 3D, in CSS.** Each sticker is an element placed with a `matrix3d`. A turning layer is animated with the inside of the cube shown as plastic, never as a hole.
- **Every hand turns it:**
  - drag a sticker across the cube to turn the layer that carries it that way;
  - drag the space around the cube to look at it from anywhere;
  - over a sticker, the **wheel** turns the layer carrying it sideways, **Ctrl + wheel** the layer across it, and **Shift + wheel** the face itself;
  - over the space around the cube, the wheel turns the whole cube, sideways or (with Ctrl) up and down;
  - keys in **standard notation**: `R L U D F B` (Shift for the other way), `M E S`, `x y z`, and a digit first to reach an inner layer (`2` then `R` is `2R` on a 4×4); the arrow keys look around.
- **A plain model underneath.** The state is a string of 6 × n × n letters and a turn is a pure function, so it is easy to store, send, test and check on a server.
- **Notation in and out.** `moveNotation`, `parseMoves` and friends read and write `R U R' U'`, `2R2`, `M'` and `x`.
- **Scrambles.** `randomScramble` takes any random source, so a seeded one gives the same scramble everywhere.

## Install

```sh
npm install kyuubu
```

## Use it

### Without a framework

```js
import { CubeView, randomScramble, cubeSolved, movesNotation } from "kyuubu";

const view = new CubeView(document.getElementById("cube"), {
  size: 3,
  keyboard: "page",
  onTurn: (move, state) => {
    if (cubeSolved(state, 3)) console.log("Solved!");
  },
});

const scramble = randomScramble(3, 25);
for (const move of scramble) view.turn(move);
console.log(movesNotation(scramble, 3)); // e.g. "R U2 F' ..."
```

The cube fills the element it is given, so give that element a size.

### With React

```jsx
import { Kyuubu } from "kyuubu/react";

export function Cube() {
  return <Kyuubu size={3} style={{ maxWidth: 400 }} onTurn={(move, state) => console.log(move, state)} />;
}
```

With no `className` the cube's box is a square as wide as its container, and `style` adds to that. A `className` takes over: it must position the box (relative or absolute) and give it a height, because the cube fills whatever box it is given.

Pass a `ref` to get `turn`, `setState`, `resetLook` and `state`.

## The model

- A **state** is `6 × n × n` letters, one per sticker, faces in the order `U R F D L B`, each read in rows as that face is seen from outside. A letter is the face a sticker belongs to when solved. `solvedCube(n)` makes one.
- A **move** is `{ axis, layer, turns }`. The axis is `0` (x, to the right), `1` (y, up) or `2` (z, towards you). The layer is counted from the axis's negative side, `0` to `n − 1`, or is `"all"` for the whole cube. The turns are `1`, `2` or `3` quarter turns by the right-hand rule. `parseMove("R", 3)` is `{ axis: 0, layer: 2, turns: 3 }`.
- `turnCube(state, n, move)` and `turnAll(state, n, moves)` return a new state and never change the one given.
- `cubeSolved(state, n)` asks whether every face is one colour, so a solved cube turned whole in the hand still counts as solved.
- `encodeCubeMoves` / `decodeCubeMoves` write moves as three characters each (`x23y02z*1`), which is handy for storing a solve.

## CubeView options

| Option | Default | Meaning |
| --- | --- | --- |
| `size` | (required) | The cube's side. |
| `state` | solved | The stickers to start with. |
| `interactive` | `true` | Whether a person can turn it. `turn()` always works. |
| `keyboard` | `"focus"` | `"focus"` listens when the cube has focus, `"page"` listens on the whole page (not while typing in a field), `"none"` never. |
| `turnMs` | `160` | How long a quarter turn takes. Turns waiting in line go faster. |
| `yaw`, `pitch` | `-35`, `28` | How the cube is first seen, in degrees. |
| `fill` | `0.9` | How much of its box the cube fills. |
| `colours`, `plastic` | standard | Face colours by letter, and the colour between stickers. |
| `onTurn` | | `(move, state)` for every turn a person makes. |
| `onLook` | | `(yaw, pitch)` whenever the view turns. |

## Develop

```sh
npm install
npm test          # the model, the notation, the gestures and the keys
npm run typecheck
npm run demo      # builds, then lays the demo out in _site/
```

The package's own `exports` point at the TypeScript source, so a project holding it in a workspace reads it with no build step. Publish with `pnpm publish`, which swaps in `publishConfig.exports` and so points the published package at `dist/`.

## Licence

MIT © John Morris
