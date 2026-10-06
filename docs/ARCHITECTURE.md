# Architecture: the source tree

The file-by-file tree of Kyuubu's source, from [the README's Architecture section](../README.md#architecture). A test holds this tree to the files under `src/`, so it cannot fall behind the code.

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
├── cuboid/               the cuboid: a box-shaped turning puzzle, a × b × c from 1 to 7 on a side
│   ├── draw.ts           the "/cuboid/draw" entry: the cuboid drawn in CSS 3D, turned by drag, key and code
│   ├── element-define.ts the "/cuboid/element/define" entry: registers <kyuubu-cuboid> by being imported
│   ├── element.ts        the "/cuboid/element" entry: a solve on a cuboid as a <kyuubu-cuboid> custom element
│   ├── gestures.ts       from a hand to a turn on a cuboid: which layer a drag means, and the half-turn rule
│   ├── index.ts          the "/cuboid" entry: model, notation, scramble, shapes, words, gestures, replay plan
│   ├── model.ts          the cuboid as pure functions over a string: slots, legal turns, turns, solved
│   ├── notation.ts       the notation read and written for a cuboid, with the reason a move is refused
│   ├── play.ts           the "/cuboid/play" entry: a solve on a cuboid with play, step, speed and repeat
│   ├── presets.ts        the named shapes, each with its name and what is special about it
│   ├── replay.ts         a solve on a cuboid read, checked and timed for the replay the cube uses
│   ├── scramble.ts       a state drawn uniformly where the puzzle is small, a random walk where it is not
│   └── words.ts          the cuboid's own words, in English and Japanese
├── element-define.ts    the "/element/define" entry: registers the custom elements by being imported
├── element.ts           the "/element" entry: the player as a <kyuubu-cube> custom element
├── famous.data.ts       the record solves, each with its published source, newest first
├── famous.ts            the "/famous" entry: record solves of the 3×3, played back move for move
├── guide-panel.ts       the panel beside a cube: the next movement in notation and words, and an arrow on the cube
├── guide.ts             a solve to follow with your own hands, one movement at a time, with detours taken back
├── index.ts             the main entry: the cube, notation, solver, famous solves, and the player to mount
├── options.ts           every choice the package offers, as a list a builder page is drawn from
├── move-list.ts         the moves of a scramble or a solve as buttons, the one just made marked and scrolled into view
├── move-name.ts         what a move turns, in a few plain words, in English and Japanese
├── notation.ts          the standard notation, for reading a move out and for the keys that make one
├── player.ts            the "/player" entry: a solve on a page, with play, pause, step and speed controls
├── random.ts            a seeded random source
├── react.tsx            the "/react" entry: the cube as a React component
├── reconstruction.ts    a solve as competitors write it down, with wide turns and rotations
├── reflect.ts           makes each attribute of a custom element a property too, as React, Vue and Svelte set them
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
