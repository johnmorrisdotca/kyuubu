# The API in full

The reference tables of Kyuubu's README, moved here to keep it under the length npm shows. Every export of every entry point is also in the [API reference](https://johnmorrisdotca.github.io/kyuubu/api.html), made from the source.

## The model

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

## Notation, scrambles and randomness

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

## The solve

| Export | Signature | Does |
| --- | --- | --- |
| `solveSteps` | `(state, n) => SolveStep[] \| null` | The layer-by-layer solve; `null` for a size without a method |
| `SOLVABLE_SIZES` | `[2, 3]` | The sizes it is written for |
| `SOLVE_ALGORITHMS` | | The method's seven algorithms, in notation |
| `stageName`, `stageSays` | `(stage, language?) => string` | A step's name, and what it is for |
| `algorithmName` | `(algorithm, language?) => string` | An algorithm's name |

Types: `SolveStep` (`{ stage, moves, parts, algorithms }`), `SolvePart`
(`{ moves, algorithm? }`), `SolveStage`, `SolveAlgorithm`.

## Export, import and the command line

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

## Replay, the player and famous solves

| Export | Signature | Does |
| --- | --- | --- |
| `parseSolve` | `(text, n) => SolveReading` | A solve as written, read into steps, or the first fault |
| `parseSolveMove` | `(token, n) => step \| "unknown" \| "no-such-layer"` | One written step |
| `solveMoves`, `applySolve` | `(steps) => CubeMove[]`, `(state, n, steps) => string` | The layers the steps turn; a cube after them |
| `solveText`, `countSolveMoves` | `(steps) => string`, `(steps) => number` | The steps in standard form; how many count as moves |
| `readSolveLink` | `(text) => SolveLink \| null` | The scramble and solve in a link to alg.cubing.net |
| `planReplay` | `(source) => { ok, plan } \| { ok, fault }` | A solve read, checked and timed |
| `Replay` | `new Replay(cube, plan, options?)` | A plan played: `play`, `pause`, `step`, `walk`, `seek(n, { animate? })`, `seekScramble(n)`, `restart`, `setSpeed`, `setLoop`, `status`, `destroy` |
| `scrubPath` | `(steps, from, to, shown?) => ScrubPath` | The turns that take the cube from one position to another: each step going on, each undone going back, a long jump catching up at once |
| `REPLAY_SPEEDS`, `REPLAY_STEP_MS`, `REPLAY_LOOP_REST_MS`, `MAX_REPLAY_STEPS` | | The speeds offered, the steady pace, the rest before a repeat, the longest solve |
| `REPLAY_SCRUB_TURNS`, `REPLAY_SCRUB_MS`, `REPLAY_SCRAMBLE_STEP_MS` | `6`, `70`, `200` | How many turns a slider shows, how long each takes, how long each step of the scramble takes when a replay walks through it |
| `CUBE_OPTIONS` | | Every choice the package offers, as rows a page can be built from (see *Build one with every option*); `CUBE_OPTION_GROUPS` names the groups and `CUBE_OPTIONS_LEFT_OUT` says why a few options are not choices |
| `moveName` | `(code, language?) => string \| null` | What a move turns, in a few plain words: "Right face, anticlockwise" |
| `mountMoveList` | `(element, options) => MoveListHandle` | The moves as buttons: the one just made marked, each taking the replay there. Options: `groups`, `current`, `locale`, `onPick`, `label` |
| `MOVE_LIST_CSS` | | The list's stylesheet, put in the page once |

Types: `SolveMove`, `SolveReading`, `NotationFault`, `SolveLink`,
`ReplaySource`, `ReplayPlan`, `ReplayFault`, `ReplayStatus`, `ReplayOptions`,
`ReplayCube`, `ReplayClock`, `ScrubPath`, `MoveListGroup`, `MoveListItem`, `MoveListOptions`, `MoveListHandle`.

From `@johnmorrisdotca/kyuubu/player`: `mountPlayer(element, options)`,
`PLAYER_CSS`, and the types `PlayerOptions` and `PlayerHandle`. From
`@johnmorrisdotca/kyuubu/element`: `defineCube(name?)`,
`CUBE_ELEMENT_NAME`, `CUBE_ELEMENT_ATTRIBUTES` and the type
`KyuubuCubeElement`. From `@johnmorrisdotca/kyuubu/famous`: `FAMOUS_SOLVES`,
`famousSolve(id)` and the type `FamousSolve`.

## Scale and the cube that keeps turning

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

## Show me on the cube

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

## Words

| Export | Does |
| --- | --- |
| `WORDS` | The cube's own words in English and Japanese: its label, the steps, the algorithms |
| `STRINGS` | `WORDS` and the command line's words together: every word the package says |
| `fill` | `fill("A {n}×{n} cube", { n: 3 })` is `"A 3×3 cube"` |
| `languageOf` | The language a tag such as `ja-JP` names: `"ja"` or `"en"` |

Types: `CubeWords`, `CliWords`, `KyuubuStrings`, `KyuubuLanguage`.

## `new CubeView(element, options)`

| Option | Default | Meaning |
| --- | --- | --- |
| `size` | required | The cube's side, 2 or more |
| `state` | solved | The stickers to start with |
| `scale` | | `"small"` (72 pixels), `"medium"` (160) or `"large"` (300): the box is given that width and kept square. Left out, the cube fills its box. A `small` cube is look-only unless `interactive` says otherwise |
| `width` | | How wide it is drawn, in pixels, in place of `scale`'s |
| `interactive` | `true` | Whether a person can turn it. `turn()` always works. `false` at `small` |
| `keyboard` | `"focus"` | `"focus"`, `"page"` or `"none"` |
| `turnMs` | `160` | How long a quarter turn made by a key, notation or code takes. Turns waiting in line go faster, and reduced motion gets none |
| `animateScramble` | `true` | Whether `scramble(moves)` shows the turns it makes: the last ten, quickly. Reduced motion shows none |
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
| `scramble(moves, { animate? })` | Scrambles the cube from where it is: the last ten turns shown quickly, the rest made at once; never told to `onTurn` |
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
`data-committed` and `data-angle`, while a drag has taken a seam `data-seam`, and while a hint is shown `data-hint`
(`"drag"`, `"look"` or `"whole"`); each sticker carries `data-slot` and
`data-face`, and under a hint `data-hint-lit` and, on the one to take hold
of, `data-hint-grab`. The arrow is `[data-hint-arrow]`, with the way to drag
on the screen in `data-drag`. Tests can wait on these.

Also exported, for tools of your own: `moveForWheel` and `moveForDrag` (the
turn the wheel means over a sticker, and the turn a whole drag means at
once), `readKey` (the turn a key
means; type `KeyReading`), `viewMatrix` (the way the cube is looked at; type
`Mat3`), and the types `CubeViewOptions` and `CubeTheme`.

## `<Kyuubu />`, from `@johnmorrisdotca/kyuubu/react`

This component takes every `CubeView` option as a prop, plus `className`,
`style` and any `data-*` (type `KyuubuProps`). Its `ref` (type
`KyuubuHandle`) gives `turn`, `setState`, `resetLook`, `setTheme`, `state`,
`showHint` and `scramble`. When the `state` prop changes to something the cube is not
already showing, the cube shows it, so a parent can keep the state and hand it
back without the cube jumping.

The `hint` prop shows moves on the cube the way the visual guide does (the
layer lit, an arrow the way to drag it); null shows nothing:

```tsx
<Kyuubu size={3} state={state} hint={nextStep.moves.slice(0, 1)} onTurn={(move, now) => setState(now)} />
```

`<KyuubuMoves />`, from the same entry, is the list of moves of a scramble or
a solve as buttons (see *See each move*), for a page that draws its own cube
and its own scrubber: give it `groups` and the move just made as `current`,
and it marks that one and scrolls it into view; `onPick(index, group, at)`
hears a press or a key (type `KyuubuMovesProps`).

```tsx
import { KyuubuMoves } from "@johnmorrisdotca/kyuubu/react";

<KyuubuMoves
  groups={[{ label: "Solution", main: true, items: ["R", "U", "R'", "U'"] }]}
  current={at - 1}
  onPick={(index) => setAt(index + 1)}
/>;
```
