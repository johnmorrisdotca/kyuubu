# The solve a person can follow, and replaying a solve

The beginner's method as steps, showing a move on the cube, replaying a solve, embedding one and the famous solves. Moved here from [the README](../README.md) to keep it under the length npm shows.

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
`theme`, `locale`, `guide` (start with the cube handed over), `readout` and
`moveList` (the move just made in large type and in words, and the moves as
buttons; on unless `controls` is `false`, or unless said otherwise), `animateScrub`
(on unless said otherwise), `onChange`, `onEnd`. The handle has `load(source)` (another solve on the same cube), `play()`, `pause()`, `step(1 | -1)`,
`seek(n)`, `restart()` (back to the scrambled cube, waiting), `setSpeed()`, `setLoop()`, `setLocale()`,
`setTheme()`, `setAnimateScrub(on)` and `animatingScrub`, `follow(on)` and `following`, `status`, `plan`, `fault` and `destroy()`.

### See each move

Beside "Move 12 of 33" the player says which move that is: its code in large
type (`R'`, `Rw`, `x2`, `3Uw'`, `M`), and what it turns in a few plain words,
in English or Japanese ("Right face, anticlockwise", "Right two layers,
clockwise", "Whole cube on x, twice", "Middle slice, same way as Left
clockwise"). Under the cube the moves are drawn as buttons, the scramble and
then the solution, the one just made marked and scrolled into view inside the
list (never the page) as the solve plays; the scramble's are marked the same
way, since you can go back into it. A press on a move takes the replay there
(the cube is the cube after that move), a press on the scramble's last move is
the scrambled cube the solve starts from.

- **Keys.** Tab reaches the list once, at the move just made. Left and right
  (or up and down) go a move back or on, <kbd>Home</kbd> to the solution's
  first move and <kbd>End</kbd> to its last, and the focus goes with them. The
  same keys work from any button of the player. Back past the first move is the
  scrambled cube, and on into the scramble (`walk(-1)`; each step back is the move turned the other way, as long and as eased as a step on): a replay stepped back into it plays
  the rest of the scramble quickly (`REPLAY_SCRAMBLE_STEP_MS`) and then the
  solve.
- **A screen reader** hears each move once, in a polite live region: "R':
  Right face, anticlockwise. Move 5 of 33." While the solve plays it is told
  once the cube has been still for a moment, not for every move, and nothing
  is said for what was there when the player was drawn. Each button is named
  with its code, its words and where it is.
- **The slider turns the cube the way it goes.** Moving it (or pressing a
  move) shows the turns between where the cube was and where it goes: each
  move turned going on, each one undone, last first, going back. A long jump
  goes straight to six steps short and turns those (`REPLAY_SCRUB_TURNS`, each
  `REPLAY_SCRUB_MS` long), and a new drag cancels the catch-up before it. It is
  on unless `animateScrub: false`; `seek(n, { animate: true })` is the same
  for code, and `scrubPath` works out the turns with no page at all.
- **The words** are `moveName(code, language)`, which names any move in
  standard form (`Rw'`, `2R`, `M2`, `y`), and `null` for anything else.

```ts
import { moveName } from "@johnmorrisdotca/kyuubu";
import { mountPlayer } from "@johnmorrisdotca/kyuubu/player";

moveName("R'");  // "Right face, anticlockwise"
moveName("Rw");  // "Right two layers, clockwise"
moveName("x2");  // "Whole cube on x, twice"
moveName("2R'", "ja"); // "右から2層目、反時計回り"

mountPlayer(document.getElementById("solve"), {
  scramble: "R U R' U'",
  solution: "U R U' R'",
  timeMs: 2000,
  animateScrub: true,
});
```

The list can be drawn alone, for a cube and a scrubber of your own:
`mountMoveList(element, { groups, current, onPick })` (colours
`--kyuubu-moves-ink`, `paper`, `rule`, `focus` and `height`, falling back to the
player's; `MOVE_LIST_CSS`; the handle has `setCurrent(index)`, `setGroups()`,
`setLocale()`, `focus()` and `destroy()`).

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
| `readout`, `movelist` | The move just made in large type and in words, and the moves as buttons: shown unless `"false"` (and, with `controls="false"`, only if asked for) |
| `scrub` | Moving the slider turns the cube between where it was and where it goes: on unless `scrub="false"` |

The element has `play()`, `pause()`, `step()`, `seek()`, `restart()` and
`status`, and sends `kyuubu-step` after every step and `kyuubu-end` at the
end. In a bundle, `import { defineCube } from "@johnmorrisdotca/kyuubu/element"`
and call it, or import `@johnmorrisdotca/kyuubu/element/define`, which does.
It is drawn in the page's own document, so the page's font, colour and the
`--kyuubu-player-…` custom properties (`felt`, `radius`, `rule`, `button`,
`ink`, `paper`, `focus`) dress it.

**In a framework, an attribute is also a property.** React 19, Vue 3 and
Svelte 5 set a property rather than an attribute on a custom element that has
one of the name, so `<kyuubu-cube size={4}>` is `cube.size = 4`. Every attribute
in the table above, and every one of `<kyuubu-scramble>` below, is a property
that writes the attribute: a number is its text, `true` turns a flag on and
`false` or `null` turns it off (`controls`, which is on unless it says
otherwise, is written `"false"`), and reading gives the attribute's text, or a
boolean for a flag. The methods are untouched, and `lang` is the browser's own.
`e2e/properties.e2e.mjs` sets every one in Chromium and WebKit.

An iframe, where the page allows no scripts (a forum, a blog):

```html
<iframe src="https://johnmorrisdotca.github.io/kyuubu/embed.html#scramble=R+U+R'+U'&moves=U+R+U'+R'&time=2.5" title="Kyuubu" width="360" height="600" style="border:0;max-width:100%" loading="lazy"></iframe>
```

The address carries everything: `scramble`, `moves`, `time`, `size`, `theme`,
`lang`, `speed`, and `autoplay=1`, `loop=1`, `controls=0`, `guide=1`, `readout=0`, `movelist=0`, `scrub=0`. The page stores
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
