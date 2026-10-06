# Contributing

Thank you for helping. Bug reports, ideas, corrections to the Japanese and pull
requests are all welcome.

This first part is the same in every package of the family. It is the master
text kept in
[johnmorrisdotca/.github](https://github.com/johnmorrisdotca/.github/blob/main/CONTRIBUTING.md),
copied unchanged into `scripts/community/CONTRIBUTING.md`, and a test holds
this file to that copy. What is particular to the package follows it, under
the heading "Particular to" and the package's name.

## Before you start

Open an issue first for anything bigger than a typo, so that we can agree on the
shape before you spend time on it. Taking part follows the
[Code of Conduct](CODE_OF_CONDUCT.md); report a security concern privately, as
[SECURITY.md](SECURITY.md) says.

## Making a change

```sh
pnpm install
pnpm check          # lint, types and tests: the same as CI
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm site           # build the demo into ./site, as GitHub Pages publishes it
```

The package's own further commands (its browser tests, its command line, its
data scripts) are listed under its own heading below.

## House rules, shared by every package of the family

- **No runtime dependencies.** Development dependencies are for tests, builds and
  documentation only.
- **The core is pure.** Every function in it returns new values and never
  changes what it was given.
- **Test what you change.** Tests sit beside the code they test. A rule you
  change has a test that would have caught it.
- **Words a person reads come in English and Japanese.** If you cannot write the
  Japanese, say so in the pull request and someone will.
- **Option values and names are kebab case.**
- **Art and sound are CC0 or public domain only**, checked at the source and
  credited. Data and word lists may be under another licence that lets them be
  shipped, with its notice kept in `NOTICE.md`. No GPL or LGPL code.
- **Needs Node 22 or later.**
- **A README table, example or count that a test holds to the code** changes
  together with the code.
- **The family's own files are the same in every package**: `demo/family.css`,
  `scripts/family-template.mjs`, `scripts/family-readme.mjs`,
  `scripts/release-notes.mjs`, the files in `scripts/community/` and
  `family.test.js` (in `src/`, or in `test/`). Do not edit one here. To change
  one, change it in every repository at once, bump `FAMILY_TEMPLATE_VERSION` for
  the template, and record the new hash in `family.test.js`. What is the
  package's own goes in its own stylesheet, `demo/<name>.css`, and its page
  builder, `scripts/site.mjs`.
- **The list of the family in the README is made, not written.**
  `pnpm family:readme` writes it between its markers from
  `scripts/family-template.mjs`.
- **The workflows are the family's too.** `ci.yml` runs `pnpm check`, the demo's
  browser tests and the packed package on Linux, macOS and Windows; `pages.yml`
  is the same text in every package. A package adds jobs of its own after those.

## Pull requests

One change per pull request. Say what changed and how you checked it, and add a
line to `CHANGELOG.md` under **Unreleased**: for a change a user would notice,
and for one to the repository alone.

## Releasing

Maintainers bump the version in `package.json` (and in `src/version.ts`, where
the package has one), move *Unreleased* to the new version in `CHANGELOG.md`,
dated, push, wait for CI and tag `vX.Y.Z`, the same as `package.json`'s version.
The Release workflow (`.github/workflows/release.yml`) checks and builds the
package, attaches the tarball to a GitHub release and publishes it to npm by
trusted publishing, with provenance and no token. A version already on npm is
not published again.

## Particular to Kyuubu

### Reporting a bug

Open an [issue](https://github.com/johnmorrisdotca/kyuubu/issues). Include:

- the cube's size, and the moves that lead to the problem (notation is
  perfect: `3×3: R U R' U'`), or the text the demo's *Save* tab shows;
- what you expected, and what happened;
- the browser and device, if it is about drawing or input.

### Commands and rules

```sh
pnpm check          # lint, types, tests and a build: the same as CI
pnpm test:site      # the demo in real browsers: builds it, then taps it
pnpm test:cli       # the command line, run as a child process
pnpm test:package   # npm pack, install the tarball, import every entry, run the command
pnpm site           # builds the demo into ./site
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
| `src/cuboid/` | The cuboid (a box-shaped puzzle): its model, notation, scramble, view, player and element |
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

### Before a release that names a framework

```sh
pnpm build && node scripts/check-frameworks.mjs
```

It packs the package, builds a small Vue, Svelte, Angular, React and plain
project from the tarball, opens each in Chromium and WebKit, turns the cube
with a key, and checks the turn came back. It needs the network and a few
minutes, and CI runs it on every push.

### Adding a famous solve

The list in `src/famous.data.ts` holds record solves whose scramble and
reconstruction are published. To add one:

1. Find where the scramble and the moves were published. The
   [Speedsolving wiki's history of the 3×3 record](https://www.speedsolving.com/wiki/index.php?title=History_of_World_Records/3x3x3)
   links a reconstruction for most records; the time, the name, the
   competition and its dates are in the
   [World Cube Association's results](https://www.worldcubeassociation.org/results/records).
2. Run `pnpm solve:check "<scramble>" "<moves>"`, or give it the
   alg.cubing.net link. It must say the cube ends solved.
3. Add the entry, in order of time, with its `source` and the day you read
   it as `checked`. Take the moves and drop the comments. Keep only what the
   WCA's public results say about the solver: name, country, competition,
   dates and time.
4. `pnpm test` plays every solve in the list.

Or open an "Add a solve" issue with the same things, and someone will.
