# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/johnmorrisdotca/kyuubu/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/johnmorrisdotca/kyuubu/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/johnmorrisdotca/kyuubu/releases/tag/v0.1.0
