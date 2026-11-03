import { readFileSync } from "node:fs";
import * as kyuubu from "../src/index.ts";

export const {
  CUBE_THEMES,
  DEFAULT_COLOURS,
  DEFAULT_PLASTIC,
  FACE_PROPERTIES,
  FULL_SCRAMBLE_LENGTHS,
  MAX_CLI_COUNT,
  MAX_CLI_LENGTH,
  MAX_RECORDS,
  MAX_RECORD_MOVES,
  MAX_RECORD_SEED,
  MAX_RECORD_SIZE,
  MIN_RECORD_SIZE,
  SOLVABLE_SIZES,
  SOLVE_ALGORITHMS,
  STRINGS,
  VERSION,
  countsAsMove,
  cubeSolved,
  encodeCubeMoves,
  fromJSON,
  fromText,
  movesNotation,
  parseMove,
  parseMoves,
  randomScramble,
  runCli,
  seededRandom,
  solveSteps,
  solvedCube,
  stageName,
  stageSays,
  summarize,
  toCSV,
  toJSON,
  toText,
  turnAll,
  undoAll,
} = kyuubu;

export const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
// The pages the README's long sections moved to, then the README: what the package says about itself is held to the code across all of them. The pages come first, so that a heading is found where its section is written in full.
export const readme = [
  "docs/CONTROLS.md",
  "docs/REPLAY.md",
  "docs/DISPLAY.md",
  "docs/CUBOIDS-USE.md",
  "docs/API.md",
  "README.md",
]
  .map(read)
  .join("\n");
export const pkg = JSON.parse(read("package.json"));
export const cell = (text) => text.replace(/\\\|/g, "|").trim();

/** The rows of the table under a heading: each row's cells. */
export function table(heading, nth = 0) {
  const from = readme.indexOf(heading);
  if (from < 0) throw new Error(`the README has no “${heading}”`);
  const tables = [];
  let rows = null;
  for (const line of readme.slice(from).split("\n").slice(1)) {
    if (line.startsWith("|")) {
      if (rows === null) rows = [];
      rows.push(
        line
          .split(/(?<!\\)\|/)
          .slice(1, -1)
          .map(cell),
      );
    } else if (rows !== null) {
      tables.push(rows.slice(2));
      rows = null;
    }
    if (line.startsWith("## ") || tables.length > nth) break;
  }
  return tables[nth];
}

/** The code blocks of one language under a heading, up to the next heading of the same depth or less. */
export function blocks(heading, language) {
  const from = readme.indexOf(heading);
  if (from < 0) throw new Error(`the README has no “${heading}”`);
  const depth = heading.match(/^#+/)[0].length;
  const rest = readme.slice(from + heading.length);
  const end = rest.search(new RegExp(`\\n#{1,${depth}} `));
  return [
    ...(end < 0 ? rest : rest.slice(0, end)).matchAll(
      new RegExp(`\`\`\`${language}(?: no-[a-z]+)?\\n([\\s\\S]*?)\`\`\``, "g"),
    ),
  ].map((found) => found[1]);
}

export const codes = (text) => [...text.matchAll(/`([^`]+)`/g)].map((found) => found[1]);
