# Contributing to Kyuubu

Thank you for helping. Bug reports, ideas and pull requests are all welcome.

## Reporting a bug

Open an [issue](https://github.com/johnmorrisdotca/kyuubu/issues). Include:

- the cube's size, and the moves that lead to the problem (notation is
  perfect: `3×3: R U R' U'`), or the text the demo's *Save* tab shows;
- what you expected, and what happened;
- the browser and device, if it is about drawing or input.

## Making a change

```sh
git clone https://github.com/johnmorrisdotca/kyuubu
cd kyuubu
pnpm install
pnpm check          # lint, types, tests and a build: the same as CI
pnpm test:site      # the demo in real browsers: builds it, then taps it
pnpm test:cli       # the command line, run as a child process
pnpm test:package   # npm pack, install the tarball, import every entry, run the command
pnpm site           # builds the demo into ./_site
pnpm dlx serve _site   # or any static server
```

| Path | Holds |
| --- | --- |
| `src/cube.ts` | The model: the state string, turns as permutations, solved, undo, encoding |
| `src/notation.ts` | Reading and writing notation |
| `src/scramble.ts`, `src/random.ts` | Scrambles, and the seeded random source |
| `src/solve.ts` | The layer-by-layer solve |
| `src/record.ts` | A solve as JSON, text and CSV |
| `src/words.ts`, `src/strings.ts` | Every word the package says, in English and Japanese |
| `src/cli.ts`, `bin/kyuubu.mjs` | The command line: a pure function, and the few lines that hand it the process |
| `src/view/` | The CSS 3D view, its geometry, and how drags, the wheel and keys become turns |
| `src/react.tsx` | The React wrapper |
| `test/` | Tests for all of the above, and for the documents |
| `demo/`, `scripts/site.mjs` | The demo page and what builds it |
| `e2e/` | The demo's tests, in real browsers |

- **The model stays pure.** A function that takes a state returns a new one
  and never changes its input. Nothing outside `src/view` and `src/react.tsx`
  touches the DOM.
- **Gestures are tested without a screen.** A new way of turning the cube
  belongs in `src/view/gestures.ts` or `keys.ts` as a pure function, with a
  test, before it is wired into the view.
- **The demo is tested by tapping it.** `e2e/*.e2e.mjs` are Playwright tests
  that open the built demo in Chromium and WebKit, at a phone's width by
  touch and at a desktop's by mouse, and do what a person does. After every
  flow they check that nothing is wider than the screen, nothing to tap is
  under 44px, and the page complained of nothing. A change to the demo or
  the view comes with a test there. The first time, `pnpm exec playwright
  install chromium webkit` fetches the browsers.
- **Never break a seed.** `seededRandom` must give the same numbers for the
  same seed for ever, and `randomScramble` the same scramble from the same
  source, because people share them. Tests pin both.
- **Never break a saved solve.** `fromJSON` must go on reading everything
  `toJSON` has ever written at `format` 1.
- **Words go in `src/words.ts`** (the cube's) **or `src/strings.ts`** (the
  command line's), in English and Japanese, then `pnpm docs:make` to bring
  `docs/strings-ja.md` up to date. Japanese is plain and polite, and uses the
  words Japanese cubers use: キューブ, スクランブル, 手数, クロス, コーナー,
  エッジ. The demo page's own words are the table at the top of `demo/app.js`.
- **Examples in the README are run by `test/docs.test.js`.** Change a value
  in one and the other has to follow. The framework examples are the
  projects `scripts/check-frameworks.mjs` builds.
- **Every export gets a doc comment**, and the README's tables (notation,
  options, theming, limits) are kept in step with the code. A test holds both.
- **The demo wears the family's look.** `demo/family.css` and
  `scripts/family-template.mjs` are the same files in every package of the
  family, held by a hash in the tests: do not edit them here. What is
  Kyuubu's own goes in `demo/site.css`.
- **No dependencies.** The package has none at run time and should stay so.
  React stays an optional peer.
- One change per pull request, with a line in `CHANGELOG.md` under
  *Unreleased*.

## Before a release that names a framework

```sh
pnpm build && node scripts/check-frameworks.mjs
```

It packs the package, builds a small Vue, Svelte, Angular, React and plain
project from the tarball, opens each in Chromium and WebKit, turns the cube
with a key, and checks the turn came back. It needs the network and a few
minutes, so it is run by hand and not in CI.

## Releasing

Maintainers bump the version in `package.json` and `src/version.ts`, and move
*Unreleased* to the new version in `CHANGELOG.md`, dated. Pushing the tag
`vX.Y.Z` runs the Release workflow, which checks that the tag matches
`package.json`, runs the checks, builds the package, proves the packed
tarball installs and runs (`scripts/check-package.mjs`), attaches the tarball
to a GitHub release, and publishes it to npm with provenance, through npm's
trusted publishing (no token is kept). A version already on npm is not
published again. The workflow can also be run by hand.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By taking
part, you agree to it.
