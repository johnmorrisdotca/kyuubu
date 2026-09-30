# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-30

### Added

- A cube of any size from 2×2, modelled as a string of stickers and turned by pure functions.
- Standard notation, read and written: faces, inner layers (`2R`), middle slices (`M E S`), whole-cube turns (`x y z`), primes and doubles.
- Seedable scrambles, with competition-style lengths for 2×2 to 7×7.
- `CubeView`: the cube in CSS 3D, turned by dragging a sticker, by the mouse wheel over a sticker (Ctrl for its column, Shift for its face), by touch and by keys, with animated, queued turns.
- `Kyuubu`, a React component around `CubeView`.
- A live demo on GitHub Pages.

[Unreleased]: https://github.com/johnmorrisdotca/kyuubu/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/johnmorrisdotca/kyuubu/releases/tag/v0.1.0
