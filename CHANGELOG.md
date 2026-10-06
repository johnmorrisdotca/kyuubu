# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.11.1] - 2026-10-06

Nothing that was exported has changed.

### Changed

- The README takes the family's one layout, fully: a hero picture of the demo on a desk and on a phone in light and dark, a picture of the cube, of the page of every size, of the builder, of the famous solves and of two cuboids, an Install section, an Examples section of eleven examples whose output is what they print, and a short list of the calls to learn first. Its pictures are in `docs/images` (WebP, light and dark) and are retaken with `pnpm screenshots:readme` (it replaces `pnpm pictures`, `docs/desktop.jpg`, `docs/phone.jpg`, `docs/cuboids.jpg` and `docs/cuboids-phone.jpg`); they are not in the tarball, and `pnpm test:package` fails if one is.
- To keep the README under the 64,000 characters npm can show, the long sections moved to pages under `docs/`, each with its heading and a summary left in the README: the controls and the drag to `docs/CONTROLS.md`; the solve a person can follow, showing a move on the cube and replaying a solve to `docs/REPLAY.md`; the cube drawn small and the cube that keeps turning to `docs/DISPLAY.md`; the cuboids to `docs/CUBOIDS-USE.md`; the tables of every export to `docs/API.md`; the source tree to `docs/ARCHITECTURE.md`. Nothing was removed, and the tests that hold these to the code read the README and these pages together.
- The export's text and CSV samples name their language (`text`), and the README's Accessibility section sits before Browser support, where the standard puts it.
- `pnpm test:readme` type-checks and runs every TypeScript and JavaScript example in the README against the built package, as a CI job of its own, and `pnpm check` holds the README to the family's lint.

## [1.11.0] - 2026-10-06

Cuboids: turning puzzles shaped like a box. Five entry points are new, and nothing the cube exports has changed, except that `CubeOption.names` has three more optional keys and `CUBE_OPTIONS` has a row for `dims`.

### Added

- **Cuboids.** Turning puzzles shaped like a box, `a × b × c` with each side from 1 to 7 (the Floppy 1×3×3, the Tower 2×2×3, the Domino 2×3×3, a 3×3×4 pillar, the 1×2×3 brick, and any other), under five new entry points that leave the cube's exports and behaviour as they were: `@johnmorrisdotca/kyuubu/cuboid` (the model, notation, scrambles, the named shapes, words, gestures and `planCuboidReplay`), `/cuboid/draw` (`CuboidView`, drawn in CSS 3D like the cube), `/cuboid/play` (`mountCuboidPlayer`), `/cuboid/element` and `/cuboid/element/define` (the `<kyuubu-cuboid>` tag).
- The rule of a cuboid: a layer turns a quarter only where its slice is square, and a half turn always; a side one cubie deep is the whole puzzle and has no layer. A half turn is written `R2`; `R` and `R'` on a layer that only half turns are refused with the reason (`"half-turn-only"`, `"whole-puzzle"`, `"no-such-layer"`, `"unknown"`), and a key on such a layer turns it a half.
- Scrambles of a cuboid that can always be undone: a state drawn uniformly from all of them, by the shortest turns, where the puzzle has up to 20,000 states, and a random walk of `cuboidScrambleLength` turns where it has more.
- A Cuboids page in the demo, linked from every page: the seven named shapes, a chooser for any width, height and depth, scramble, undo and reset, typed notation, and a `<kyuubu-cuboid>` playing a solve; and a Cuboids section in the README with a picture.
- **The cuboid player names the move and lists the moves, as the cube's does.** `mountCuboidPlayer` and `<kyuubu-cuboid>` show the move just made in large type (`R2`, `M2`, `2U`) with what it turns in a few words, English or Japanese ("Right face, twice"), list the scramble and the solution as buttons, one just made marked and each taking the replay there, and turn the puzzle between where the slider was and where it goes. The options are `readout`, `moveList` and `animateScrub`, the attributes `readout`, `movelist` and `scrub` (each on unless `"false"`), and `setAnimateScrub(on)` and `animatingScrub` are on the handle. A cuboid has no x, y or z and no wide turns, so none is named; a half turn of a layer that is not square is written `R2`. `cuboidMoveName(code, language?)` is the words alone, null for anything a cuboid does not write.
- **The options list covers the cuboid.** Every option of `CuboidView`, `mountCuboidPlayer` and `<kyuubu-cuboid>` is a row of `CUBE_OPTIONS`, sharing the cube's row wherever the choice is the same one, under the new `names` keys `cuboid`, `cuboidPlayer` and `cuboidElement`, with a new row, `dims`; what is not a choice is in `CUBE_OPTIONS_LEFT_OUT` (`cuboid.state`, `cuboid.onTurn` and the rest) with its reason, and `test/options.test.js` holds all of it to the code. The builder page draws the cube's three ways of making one; a cuboid's is not on it yet.

## [1.10.0] - 2026-10-06

A builder page, and the list of the package's choices it is drawn from. Nothing that was exported has changed; `CUBE_OPTIONS`, `CUBE_OPTION_GROUPS`, `CUBE_OPTIONS_LEFT_OUT` and their types are new.

### Added

- **`CUBE_OPTIONS`: every choice the package offers, as a list.** Each row has an id, a group, a kind (number, boolean, choice, colour, text, moves), its default, its choices or range, what each way of making a cube calls it (`CubeView`, `mountPlayer`, the attributes of `<kyuubu-cube>` and of `<kyuubu-scramble>`) and one plain line in English and Japanese. `CUBE_OPTION_GROUPS` names the groups and `CUBE_OPTIONS_LEFT_OUT` says why an option that is not a choice (a function, a list only a program has) is not in it. `test/options.test.ts` reads the options of the view, the player and both elements from the source and fails until each is a row or is left out with its reason, so a new option cannot be missed by the builder.
- **The builder, `builder.html`, linked from every page's header.** Every choice in the list, grouped with a line each; a live cube (a cube to turn, a solve to watch, or a cube that keeps turning) that changes as each is chosen; and the exact code for it as a custom element, an ES module, an iframe, React, Vue, Svelte and Angular, each with Copy. The choices are in the address, so a link shares the cube. `demo/builder-code.js` writes the code from the list and the choices, and names no option, so the page and the file can be copied to another package.

## [1.9.0] - 2026-10-06

The player says which move it is and lists them, the slider and Back turn the cube the way they go, a drag on the seam turns two layers, and a scramble is shown turning. A minor release: nothing that was exported has changed or gone; every addition is on unless said otherwise, and each can be turned off.

### Added

- **The player says which move it is.** Beside "Move 12 of 33" the move just made is shown in large type (`R'`, `Rw`, `x2`, `3Uw'`, `M`) with what it turns in a few plain words, in English and Japanese: "Right face, anticlockwise", "Right two layers, clockwise", "Whole cube on x, twice", "Middle slice, same way as Left clockwise". `moveName(code, language?)` is the words alone, for any move in standard form: faces, wide turns, inner layers of a big cube, the slices M, E and S, the rotations x, y and z, primes and doubles; null for anything else.
- **The moves as buttons.** Under the cube the scramble and then the solution are drawn as buttons, the move just made marked (`aria-current="step"`) and scrolled into view inside the list, never the page, as the solve plays. A press on a move takes the replay there. Tab reaches the list once, the arrow keys go a move back or on (from any button of the player too), Home and End to the solution's first and last move, and the focus goes with them. Back past the first move is the scrambled cube, and on into the scramble, which then plays the rest of itself quickly before the solve (`Replay.seekScramble`, `REPLAY_SCRAMBLE_STEP_MS`, `ReplayStatus.scrambleAt` and `scrambleTotal`, `ReplayPlan.scrambleStates`). `mountMoveList` draws the list alone (`MOVE_LIST_CSS`, the `--kyuubu-moves-…` custom properties), `<KyuubuMoves />` is it for React.
- **A screen reader hears each move once**, in a polite live region ("R': Right face, anticlockwise. Move 5 of 33."), once the cube has been still a moment while a solve plays, and not for what was there when the player was drawn.
- **The slider turns the cube the way it goes.** Moving it, or pressing a move, shows the turns between where the cube was and where it goes: forwards going on, each undone, last first, going back; a long jump goes straight to six steps short of the end and turns those, and a new drag cancels the catch-up before it. It is the player's `animateScrub` option (on unless `false`), `setAnimateScrub(on)` and `animatingScrub`, `seek(n, { animate: true })` on a `Replay`, and `scrubPath` with no page at all (`REPLAY_SCRUB_TURNS`, `REPLAY_SCRUB_MS`).
- **`<kyuubu-cube>` attributes `readout`, `movelist` and `scrub`**, each on unless `"false"` (with `controls="false"` the first two are off unless asked for), and `readout=0`, `movelist=0`, `scrub=0` in the embed page's address. The options of the player are `readout`, `moveList` and `animateScrub`.
- **Two layers with one drag, like a real cube.** A drag that begins on the seam between two neighbouring layers, within a fifth of a sticker's width of the line between them (`SEAM_BAND`), and goes along it turns both together, as a wide turn (`Rw`, `Uw`, and on a big cube any two neighbours). The two layers are ringed the moment the finger is down, before it moves; a drag begun anywhere else on the sticker, or across the seam, turns the one layer as before. Two fingers put down on two neighbouring layers do the same. Both layers are told to `onTurn`, one after the other. The guide's arrow for a wide turn begins at the seam, and its line says so. `seamsAt`, `movesForRelease`, `DragPick.also`, the type `Seam` and `DragHint.seam` are the rules, for tools of your own; measured with real touches on a 390 pixel screen, a touch is one layer up to 0.3 of the way from the middle of a sticker to the seam and two from 0.34.
- **`CubeView.scramble(moves)`**, and the option `animateScramble` (on unless `false`): the last ten turns are shown, each in under a tenth of a second, and the turns before are made at once, so the demo's Scramble button on a 7×7 turns where it can be seen and is not a blur. The demo has a button for it, and its code shows `animateScramble: false` when it is off.
- The demo's "One on your page" and "On your page" code are written from what is chosen on the page (size, theme, colours, turn speed, scramble; size, pace and scale), the cube and frame beside each is made by that code, and Copy gives the code that is shown.

### Changed

- Of the repository, and nothing that is exported: `CONTRIBUTING.md` is the family's one text with a section of its own for Kyuubu, held to the master in johnmorrisdotca/.github by `test/family.test.js`; `ci.yml` and `pages.yml` are the family's one text (`pnpm check`, the demo, and the package on Linux, macOS and Windows), and any jobs of the package's own after them.
- The demo's own stylesheet is `demo/kyuubu.css`, named for the package like the family's.
- The demo is built into `site/`, where the Pages workflow and every other package look for it.

### Fixed

- **Back turns the move the other way.** A step back (the Back button, the left arrow) showed the previous cube at once, where Forward turned the move. It turns the move undone now, as long and as eased as Forward, and the move code and the list follow. `Replay.step(-1)` does it, and `Replay.walk(-1)` goes on into the scramble from the scrambled cube.
- The plastic across a turning gap was a 300 pixel box laid out wherever it was made, and a small cube near the right edge of a page made the page scroll sideways for as long as it turned. It is kept at no size until it is drawn.
- The API reference page wraps a long entry path instead of running about 2 px wider than a 360 px screen. Nothing the package exports has changed.

## [1.8.1] - 2026-10-05

Nothing that was exported has changed.

### Added

- A test holds every `@johnmorrisdotca/kyuubu@N` version pin in the README to this package's major version.

### Changed

- The family's list, in the README and in the demo's footer, names all twenty-four packages, Karakuri and Houseki included.
- The npm description is one sentence of 250 characters or fewer, so npm and its search show it whole; it is also the repository's About text. `homepage` is the demo site and `author` is `"John Morris"`, the same in every package.
- The GitHub Actions workflows use the current versions of the actions (checkout 7, setup-node 7, pnpm/action-setup 6; configure-pages 6, upload-pages-artifact 5 and deploy-pages 5 for Pages), which clears GitHub's Node 20 deprecation warning.
- `package.json` says `"type": "module"`, like the rest of the family, and every entry has an `import` condition.

## [1.8.0] - 2026-10-05

The 6×6 and 7×7 are held and drawn faster. No turn, notation, scramble, state or saved solve changes (the same moves make the same cube),
and nothing that was exported changes.

### Added

- **`test/big-cubes.test.ts`** holds the 6×6 and 7×7: every turn they have is written and read back layer by layer, the layers are named
  by depth (`3R`, a 7×7's middle layer `M`, a 6×6 with none), a digit and a face letter reach every layer at the keyboard, a competition's
  scramble (80 and 100 turns, from a seed, never solved, inner layers in it) is taken back to solved, a cube turned whole in the hand
  after it is still solved, and a wide turn (`Rw`, `3Uw'`, `4Fw2`) is the layers it names, turned together.
- **`e2e/big.e2e.mjs`**: with Chromium's processor slowed fourfold, six animated turns of a 3×3, a 6×6 and a 7×7 and the longest task the
  page runs, which has to stay under a hitch a person would see (120 ms, where a 7×7 measures 21).

### Changed

- **A big cube costs less in every frame.** The size of the box the cube is drawn in is measured when the box changes size, not in every
  frame of a turn (reading it made the page work out its styles and layout in the middle of the frame); a draw with no hint walks no
  stickers; and the colours are written to the stickers that changed colour, not to all 294 after every turn. Six turns of a 7×7 took
  145 ms of script in the page and 84 ms of style work with the processor slowed fourfold, and take 117 and 67 now.
- README's Limits says what the 7×7 costs on a phone's processor, and where it is held.

## [1.7.0] - 2026-10-01

### Added

- **Every attribute of `<kyuubu-cube>` and `<kyuubu-scramble>` is also a property that writes it.** React 19, Vue 3 and Svelte 5 set a property rather than an attribute on a custom element that has one of the name, so the elements are now drawn the same way from markup, from `setAttribute` and from a framework: `cube.size = 4`, `cube.autoplay = true`, `scramble.paused = false`. Numbers are written as text, a flag reads as a boolean, `controls` (on unless it says otherwise) is written `"false"` to turn it off, the methods are untouched and `lang` stays the browser's own. `e2e/properties.e2e.mjs` sets every one in Chromium and WebKit, and `KyuubuCubeElement` and `KyuubuScrambleElement` type them.
- A README Accessibility section, held to the source by a test.
- `SECURITY.md`, and a `CODE_OF_CONDUCT.md` that is the family's shared text, with the copy a test holds them to in `scripts/community`.
- The README's family list names all nineteen packages, read from one table by a test.

### Changed

- **Node 22 or later**: `engines` is `>=22`, as the README, CONTRIBUTING and CI already tested. Node 20 is end-of-life.
- The GitHub release's notes are that version's section of this changelog, not a pointer to it (`scripts/release-notes.mjs`).
- **A Help switch in the demo.** Beside the language chooser in the family header, shared by every demo. Off (the default) the pages are as they were; on, each option row (the size, the look, the colours, the speed of turns, the pace of the small cubes) says in one plain line what it does, in English or Japanese, and every button in it has the same words as its hover text. Kept on the device. The README's pictures are retaken with it.

## [1.6.0] - 2026-10-01

### Added

- **The cube drawn small, medium or large.** A `scale` option (and a `width`
  in pixels) on `CubeView`, a prop on the React component and an attribute on
  the elements. Small is 72 pixels, for a list or a picker, and look-only
  unless asked; medium is 160; large is 300. The box is one steady square.
  `setScale()` changes it later.
- **A cube that keeps turning.** `keepScrambling(view, { pace })` turns random
  layers on its own, every half second, second or four seconds, or any pace
  from 0.2 seconds; `stop()`, `start()` and `setPace()`. It is paused on a
  hidden tab and stays still for a device that asks for reduced motion.
- **`<kyuubu-scramble>`**, the same as a tag, and `embed-scramble.html` for an
  iframe.
- **A turning cubes page in the demo** (`cubes.html`): the cube at three
  scales turning at a pace you choose, every size small for a list, and the
  embed, in English and Japanese.

## [1.5.0] - 2026-10-01

### Added

- The React component shows the visual guide too: a `hint` prop (moves, or
  null for none) and `showHint` on its handle, as `CubeView` has. A hint is
  shown again on a cube made afresh, and a new array of the same moves on
  every render changes nothing.
- The React component passes `rounded` through, as every other option is.

## [1.4.1] - 2026-09-30

### Fixed

- A rounded cube showed a small hole to the felt at the corner nearest the
  eye, where three faces meet and each had rounded its corner. A corner of
  the cube is now rounded only where it is on the cube's outline, worked out
  as the cube is turned and looked round.

## [1.4.0] - 2026-09-30

### Added

- **Show me on the cube.** The next move of a solve, marked on the cube
  itself: the layer that turns is lit and the rest dimmed, and an arrow lies
  across its stickers the way to drag them, with a dot on the sticker to take
  hold of. Beside the cube the move is given in notation and in plain words
  ("Turn the right face towards you.", 「右の面を手前に回します。」). The person
  makes the move by hand and the guide moves on; a turn it did not ask for is
  said to be one, with a button to take it back and an arrow for turning it
  back by hand. It walks the layer-by-layer method step by step (2×2 and
  3×3) or any moves as written, wide turns and turns of the whole cube among
  them, on every size from 2×2 to 7×7. The arrow is worked out with the
  drag's own rules and drawn again whenever the cube is looked at from
  somewhere else; a test proves that following it makes exactly its move, for
  every face, slice, wide turn and direction from 2×2 to 5×5. New:
  `mountGuide` and `GUIDE_CSS`; the pure `Guide`, `dragHint`,
  `movementSays`, `movementText` and `rotationKeys`; `HINT_MIN_FACING` and
  `HINT_MIN_FOLLOW`; on `CubeView`, `showHint(moves)`, `hint` and
  `on("turn" | "look", listener)`; the custom properties `--kyuubu-hint-colour`,
  `--kyuubu-hint-edge`, `--kyuubu-hint-dim` and `--kyuubu-hint-opacity`.
- The player can hand the cube to the viewer to follow a solve by hand: a
  "Turn it yourself" button, the `guide` option and attribute, `guide=1` on
  the embed page, and `follow(on)` and `following` on its handle.
- The demo has "Show me on the cube" beside the step-by-step solve, and for
  moves typed under Notation.
- **Rounded corners.** The cube's own corners are rounded like the plastic of
  a real cube, by default. `rounded: false` makes them square again, and
  `theme.cornerRadius` or `--kyuubu-corner-radius` says how round.

## [1.3.2] - 2026-09-30

### Fixed

- The cube could still be drawn flat on an iPhone, one face and nothing
  behind it, most often while a famous solve played. The cause was the way it
  was drawn: stickers placed in 3D inside a turned group, which Safari can
  flatten into the group's plane when it lets go of its 3D layers. The cube
  no longer asks the browser for any 3D context (no `preserve-3d`). Every
  sticker is given its whole place on the screen in one transform, worked out
  from the way the cube is looked at and how far a layer has turned; the cube
  decides itself which stickers face the viewer and which part of a turning
  cube is drawn in front. A browser that draws everything flat still shows
  the whole cube.
- On a phone, dragging up or down on the cube could scroll the page instead
  of turning a layer, and a quick second tap could zoom the page. A touch
  that begins on the cube is now the cube's; a touch beside it scrolls the
  page as before. The demo pages and the player's buttons no longer zoom on a
  double tap; two fingers still zoom.
- On a device that asks for reduced motion, turns are made at once, however
  many are waiting, where each used to wait for the next frame of the
  screen: a whole solve no longer takes seconds to reach the solved cube.

## [1.3.1] - 2026-09-30

### Fixed

- On a phone, a cube could come back into view drawn flat: one face, and
  nothing behind it. Seen in Safari on an iPhone after choosing a second
  famous solve. Three things are done about it. The player keeps one cube for
  its whole life and loads each solve onto it (`load(source)` on the player's
  handle), where the famous solves page used to make a new cube for every
  solve. The cube makes its layers afresh whenever it comes back into view
  (`redraw()` on `CubeView`). And the famous solves page brings the cube into
  view before it plays, so a solve is no longer played out of sight below
  the fold.

### Changed

- The player's restart goes back to the scrambled cube and waits there, and
  its button says so ("To the scramble"). It used to begin playing again at
  once, so the scramble the record was solved from was never seen standing
  still.

## [1.3.0] - 2026-09-30

### Added

- **A solve read as it is written down.** `parseSolve` reads what
  competitors and reconstructions write: wide turns (`Rw`, `3Rw`, and the
  lower-case `r`), rotations in both spellings (`x`, `[r]`), `R2'` and `R3`,
  comments after `//`, brackets and a bracket repeated (`(U R' U' R)2`), and
  moves run together with no spaces. It gives the steps, or the first thing
  it could not read with its line and place. With it: `parseSolveMove`,
  `solveMoves`, `applySolve`, `solveText`, `countSolveMoves`, and
  `readSolveLink`, which reads a solve out of a link to alg.cubing.net.
- **A replay.** `planReplay` reads, checks and times a scramble and its
  solve; `Replay` plays the plan on a cube: play, pause, a step either way,
  anywhere by `seek`, the solve's own pace or a half, a quarter or a tenth of
  it, once or on repeat. A solve's recorded time is spread evenly over its
  moves, and that is said wherever it is shown; a time for every step can be
  given instead.
- **A player**, `@johnmorrisdotca/kyuubu/player`: `mountPlayer` draws the
  cube and those controls in an element, in English or Japanese.
- **A custom element**, `@johnmorrisdotca/kyuubu/element`:
  `<kyuubu-cube scramble="…" moves="…" time="3.13" controls autoplay loop>`.
  `defineCube()` registers it, and `@johnmorrisdotca/kyuubu/element/define`
  does so by being imported, for a page with one script tag.
- **An embed page** on the demo site, `embed.html`, for an iframe on a site
  that allows no scripts. The address carries the solve; nothing is stored.
- **Famous solves**, `@johnmorrisdotca/kyuubu/famous`: twelve world record
  solves of the 3×3, from 11.75 seconds in 2005 to 2.76 in 2026, each with
  its solver, competition, dates, scramble, moves and source. A test plays
  every one and fails if the cube does not end solved.
- A famous solves page on the demo site: watch one, slow it down, paste a
  solve or a link and play it, and copy the code to embed it.
- `turnTogether` on `CubeView`, which turns several layers as one movement
  in a time of its own, and `busy`.
- An "Add a solve" issue template, and `pnpm solve:check`.

### Changed

- The demo's notation box takes several lines, comments and wide turns, says
  which piece it could not read, and sends a pasted link to the famous solves
  page.
- The demo's solve buttons always offer a way back. On a 4×4 and up, where
  there is no step-by-step method yet, they take back every turn made, the
  last first. A solve the page plays keeps one steady pace, at the speed
  chosen under Controls, and no longer speeds up as its turns queue.

## [1.2.0] - 2026-09-30

### Added

- **The layer follows the drag.** A drag on a sticker, by mouse or by finger,
  picks its layer once and then turns it with the pointer, forwards and back.
  Nothing is a move while the pointer is down. Let go short of the point of
  no return and the layer goes back with nothing recorded; at it or past it
  the layer snaps on to the quarter turn, or the half turn if it was dragged
  that far, and that is one move.
- **`commitAngle`**, the point of no return in degrees: 30 unless given. Past
  it the held layer brightens (`--kyuubu-commit-filter`) and the cube's
  element carries `data-committed="true"`. `data-dragging` and `data-angle`
  say the rest.
- A drag that could be either of two layers waits a little longer before it
  picks one.
- Escape, a cancelled pointer, or a drag that wanders well off the cube puts
  the layer back and records nothing.
- `setTurnMs`, to change how long a turn made by a key, by notation or from
  code takes, and a speed choice in the demo's Controls tab.
- The rules as pure functions: `pickDrag`, `dragAngle`, `quartersForRelease`,
  `pastCommit`, `moveForRelease`, the constants `COMMIT_ANGLE`,
  `DRAG_START_PX`, `DRAG_DECIDE_PX`, `DRAG_CLEAR_RATIO`, `FLICK_SPEED` and
  `FLICK_ANGLE`, and the type `DragPick`.

### Changed

- A drag no longer makes its turn the moment the pointer moves. `onTurn` is
  called once for a dragged turn, after the layer has snapped home, and never
  for one that went back. A short, fast flick still makes the quarter turn.
  Turns made by keys, the wheel, notation and `turn()` are as they were.
- A device that asks for reduced motion gets no turn animation, whatever
  `turnMs` says.
- Starting a drag finishes at once any turn still being animated.
- The move record, the notation, saved solves and every existing option are
  unchanged.

## [1.1.0] - 2026-09-30

Everything here is added beside what was there: nothing exported has changed
its meaning, and every scramble made from a random source of your own comes
out as it did.

### Added

- **A command line.** `kyuubu` in a terminal on Linux, macOS or Windows:
  scrambles (`--seed`, `--size`, `--length`, `--count`, `--faces`), turns
  applied and the cube drawn unfolded (`--apply`), a check that turns solve a
  scramble (`--verify`, by exit code), and the layer-by-layer solve
  (`--solve`). `--json`, `--lang`, `--stdin`, `--no-color`. `runCli` is the
  whole of it as a pure function, and `cubeNet` draws a cube as text.
- **Export and import of a solve**: `toJSON` and `fromJSON` (versioned JSON,
  which trusts nothing it reads and works the cube out again), `toText` and
  `fromText` (a few plain lines of notation), `toCSV` (a list of solves for a
  spreadsheet, safe to open), and `summarize`. Types `SolveRecord` and
  `SolveSummary`.
- **Scrambles from a seed**: `seededRandom("any text")` gives the same
  numbers on every device, so `randomScramble(3, 25, seededRandom(seed))` is
  the same scramble for everybody. And `randomScramble` takes
  `{ faces: true }` to turn only the outer faces.
- **Theming.** Every face's colour, the plastic and the shape of a sticker
  are CSS custom properties (`--kyuubu-up` and the rest) as well as options.
  A `theme` option, `setTheme` to change the look of a cube already drawn,
  and three looks in `CUBE_THEMES`: `standard`, `paper` and `stickerless`.
  `DEFAULT_PLASTIC`, `FACE_PROPERTIES` and the type `CubeTheme`.
- **English and Japanese.** The cube's accessible name follows a `locale`
  option or the page's `lang`, with `setLocale` to change it. `stageName`,
  `stageSays` and `algorithmName` name the steps of a solve, say what each is
  for and name its algorithms, in either language. `WORDS`, `STRINGS`, `fill`
  and `languageOf`. Every Japanese line is listed in `docs/strings-ja.md`.
  The Japanese has not yet been reviewed by a native reader.
- `VERSION`, and a doc comment on every export.
- The React component takes `theme` and `locale`, and its handle has
  `setTheme`.
- A new demo site in the family's look, light and dark, in English and
  Japanese: the solve shown step by step with each step's name and reason,
  solves kept on the device and saved as text, JSON or CSV, and themes.
- The README's examples are run by a test. Vue, Svelte, Angular, React and a
  plain page are each built from the packed tarball and turned in Chromium
  and WebKit by `scripts/check-frameworks.mjs`.
- `scripts/check-package.mjs` packs the package with npm, installs the
  tarball in an empty project, imports every entry by `import` and by
  `require`, and runs the command. It runs in CI on Linux, macOS and Windows
  and before every publish.

### Changed

- A sticker's colour is written on the page as `var(--kyuubu-up, #f7f7f2)`
  where no colour was given in code, and as the colour itself where one was.
  It looks the same; a test that read a sticker's inline style would see the
  difference.
- On a page whose `lang` is Japanese, the cube's default accessible name is
  in Japanese. A `label` of your own is left as it is.
- CI runs on Node 22 and 24. The package still runs on Node 20.

## [1.0.2] - 2026-09-30

### Fixed

- The package's `exports` name its built files directly. 1.0.0 and 1.0.1 on npm named source files that are not shipped, because they relied on a rewrite only `pnpm publish` performs, so neither could be imported when installed from npm. Install 1.0.2.

## [1.0.1] - 2026-09-30

### Fixed

- The package resolves under `require` as well as `import` (Node 22 and later load its ES modules either way), so a test runner that compiles to CommonJS, such as Playwright's, can import it.

## [1.0.0] - 2026-09-30

The first stable release, published as a tarball on GitHub Releases.

### Changed

- The package is named `@johnmorrisdotca/kyuubu`, and its React component is imported from `@johnmorrisdotca/kyuubu/react`.

### Added

- A tagged version builds the package and attaches its tarball to that version's GitHub release.

- `solveSteps`: the layer-by-layer beginner's method for any 2×2 or 3×3, as named steps. Each step comes with its turns and the algorithms it uses.
- `joinTurns`, which merges turns of the same layer in a row into one.

## [0.1.0] - 2026-09-30

### Added

- A cube of any size from 2×2, modelled as a string of stickers and turned by pure functions.
- Standard notation, read and written: faces, inner layers (`2R`), middle slices (`M E S`), whole-cube turns (`x y z`), primes and doubles.
- Seedable scrambles, with competition-style lengths for 2×2 to 7×7.
- `CubeView`: the cube in CSS 3D, turned by dragging a sticker, by the mouse wheel over a sticker (Ctrl for its column, Shift for its face), by touch and by keys, with animated, queued turns.
- `Kyuubu`, a React component around `CubeView`.
- A live demo on GitHub Pages.

[Unreleased]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.8.1...HEAD
[1.8.1]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.8.0...v1.8.1
[1.7.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/johnmorrisdotca/kyuubu/releases/tag/v0.1.0
