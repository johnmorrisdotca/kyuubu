# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/johnmorrisdotca/kyuubu/releases/tag/v0.1.0
