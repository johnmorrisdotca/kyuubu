# Cuboids

The reference for the cuboid entry points: its notation, scrambles, drag, the tag and what each entry holds. [Back to the README](../README.md#cuboids), which has the rule and the named shapes.

## Notation

The cube's notation (in the README), with one rule added. `R`, `L`, `U`, `D`, `F`, `B`
turn the outer layer on that face clockwise as it is seen; `'` is anticlockwise;
`2` is a half turn; a digit first (`2R`) is the layer that many in from the face;
`M`, `E`, `S` are the middle layer of an odd side. There is no `x`, `y` or `z`.

| Written | Meaning on a cuboid |
| --- | --- |
| `R2`, `U2`, `M2` | A half turn: always allowed on a layer that exists |
| `R`, `R'`, `U` … | A quarter turn: only where the layer's slice is square. Elsewhere it is refused, as `"half-turn-only"`, and says to write `R2` |
| `F` on a 3×3×1 | Refused as `"whole-puzzle"`: the side is one cubie deep |
| `3R` on a side two deep, `M` on an even side | Refused as `"no-such-layer"` |
| `x`, `Rw`, `Q` | Refused as `"unknown"` |

```ts
const floppy = [3, 3, 1] as const;
readCuboidMove("R", floppy);    // { fault: "half-turn-only" }
readCuboidMove("R2", floppy);   // { move: { axis: 0, layer: 2, turns: 2 } }
readCuboidMove("F", floppy);    // { fault: "whole-puzzle" }
parseCuboidMoves("R U2 L' D2", [2, 3, 3]);   // four moves; null if any is refused
```

`readCuboidMoves(text, dims)` says which piece of a line is wrong, where it
begins and why. On the page, a key turns its layer, and on a layer that only
half turns it turns it a half whichever way Shift says, because that is the only
turn it has.

## Scrambles

A scramble is made of turns the puzzle can make, so it can always be undone and
is always solvable. A puzzle small enough to list every state of (up to 20,000:
every cuboid with a side of 1 up to 1×3×4) is scrambled to a state drawn
uniformly from all that are not solved, by the shortest turns that reach it:
no state is likelier than another, which no walk of one length can say of a
puzzle whose every turn is a half turn, as it can reach only half the states. A
bigger one is a random walk of `cuboidScrambleLength` turns (8 and 2.2 a layer),
never two in a row on one layer. Pass a `length` for a walk of exactly that many
turns. A seeded source gives the same scramble everywhere, pinned by a test.

## Drag, and the half turn

Dragging a sticker turns the layer that carries it, with the pointer, as on
the cube. A layer that turns a quarter is let go as the cube's is (past 30
degrees it is a quarter, past 120 a half). A layer that only half turns follows
twice as fast, and is a half turn from the middle of the way round, or from a
flick; let go short of that and it goes back and no move is made. A layer that
cannot turn is never picked.

## Play a solve, and the tag

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/kyuubu@1/dist/cuboid/element-define.js"></script>
<kyuubu-cuboid dims="3x3x1" scramble="U2 R2 M2" moves="M2 R2 U2" controls></kyuubu-cuboid>
```

`dims` is `3x3x1`, `3×3×1`, `3 3 1` or `3,3,1`; the other attributes are the
`<kyuubu-cuboid>`'s own: `scramble`, `moves`, `time`, `autoplay`, `controls`,
`loop`, `speed`, `theme` and `lang`, and `readout`, `movelist` and `scrub`, each on
unless `"false"`, as on the cube, and it has `play()`, `pause()`, `step()`,
`seek()` and `restart()`. Under the puzzle it names the move just made in large
type (`R2`, with "Right face, twice" beside it, `cuboidMoveName` is the words
alone) and lists the scramble and the solve as buttons, and the slider turns the
puzzle where it goes; a cuboid has no x, y or z, and a half turn of a layer that
is not square is written `R2`. `mountCuboidPlayer` from
`@johnmorrisdotca/kyuubu/cuboid/play` is the same without the tag, and
`planCuboidReplay` reads, checks and times a solve for the replay the cube
uses. The [cuboids page](https://johnmorrisdotca.github.io/kyuubu/cuboids.html)
has them all.
