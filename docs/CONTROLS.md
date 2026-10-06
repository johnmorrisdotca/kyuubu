# Controls: keys, drags and the two-layer seam

How a person turns the cube. Moved here from [the README](../README.md) to keep it under the length npm shows.

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

### Dragging a layer, and two layers at once

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
- **Two neighbouring layers turn together, like a real cube.** A drag that
  begins on the seam between two layers, within a fifth of a sticker's width
  of the line (`SEAM_BAND`, 0.18), and goes along that line turns both, as a
  wide turn (`Rw`, `Lw`, `Uw`, and on a big cube any two neighbours: `3R 4R`
  are two layers of a 5×5). The two layers are ringed as soon as the finger is
  down, before it has moved, so you see what will turn; a drag begun anywhere
  else on the sticker, or across the seam, turns the one layer as ever. A
  second finger put down on the neighbouring layer before the drag starts does
  the same: two fingers together take two layers. Both layers are told to
  `onTurn`, one after the other. The cube's element carries `data-seam`
  (`"near"` while the layers are ringed, `"held"`, `"pair"`), and each ringed
  sticker `data-seam-lit`. The guide's arrow for a wide turn begins at the
  seam, at its dot, and one drag from there makes it. A 2×2 has no seam: both
  its layers are the whole cube.
- **Giving up.** Escape, a cancelled pointer, or a drag that wanders well off
  the cube's element puts the layer back, and nothing is recorded.
- **`onTurn` is called once for a completed turn, after the layer has
  snapped home**, and never for one that went back.

While a layer is held the element carries `data-dragging="true"` and
`data-angle` (whole degrees, forwards positive). The rules are exported as
pure functions for tools and tests of your own: `pickDrag`, `dragAngle`,
`quartersForRelease`, `pastCommit`, `moveForRelease`, `movesForRelease` (every
layer a release turns, two for a seam) and `seamsAt` (the seams a touch at a
place on a sticker takes hold of), with the constants `COMMIT_ANGLE`,
`DRAG_START_PX`, `DRAG_DECIDE_PX`, `DRAG_CLEAR_RATIO`, `FLICK_SPEED`,
`FLICK_ANGLE` and `SEAM_BAND` (types `DragPick` and `Seam`).

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

**Scrambling.** `view.scramble(moves)` scrambles the cube the way a hand does:
the last ten turns are shown, each in under a tenth of a second, and the
turns before them are made at once, so a hundred-turn scramble of a 7×7 is
over in about a second and is not a blur that shows nothing. It is on unless
the cube is made with `animateScramble: false` (or `scramble(moves, { animate:
false })` is asked for one scramble); then nothing is shown turning. It is
never told to `onTurn`, and a device that asks for reduced motion shows none.
