# Contributing to Kyuubu

Thanks for taking the time. Bug reports, ideas and pull requests are all welcome.

## Reporting a bug

Open an [issue](https://github.com/johnmorrisdotca/kyuubu/issues). Include:

- the cube size, and the moves that lead to the problem (notation is perfect, e.g. `R U R' U'`);
- what you expected, and what happened;
- the browser and device, if it's about drawing or input.

## Working on the code

```sh
git clone https://github.com/johnmorrisdotca/kyuubu.git
cd kyuubu
pnpm install
pnpm test
```

| Command | Does |
| --- | --- |
| `pnpm test` | Runs the tests (Vitest) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript, strict |
| `pnpm build` | Compiles to `dist/` |
| `pnpm demo` | Builds, then stages the demo page in `_site/` (serve it with any static server) |

### How the code is laid out

| Path | Holds |
| --- | --- |
| `src/cube.ts` | The model: the state string, turns as permutations, solved, undo, encoding |
| `src/notation.ts` | Reading and writing notation |
| `src/scramble.ts` | Scrambles |
| `src/view/` | The CSS 3D view (`view.ts`), its geometry, and how drags, the wheel and keys become turns |
| `src/react.tsx` | The React wrapper |
| `test/` | Tests for all of the above |
| `demo/` | The GitHub Pages demo |

### Guidelines

- **The model stays pure.** A function that takes a state returns a new one and never changes its input.
- **Gestures are tested without a screen.** A new way of turning the cube belongs in `src/view/gestures.ts` or `keys.ts` as a pure function, with a test, before it is wired into the view.
- **No runtime dependencies.** React stays an optional peer.
- Keep a pull request to one change, and add a line to `CHANGELOG.md` under **Unreleased**.
- CI runs lint, types, tests and a build on every pull request. Please make sure they pass locally first.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By taking part, you agree to it.
