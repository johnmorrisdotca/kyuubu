import { CUBE_FACE_ORDER, countsAsMove, cubeSolved, isCubeState, solvedCube, turnAll, type CubeFace } from "./cube.ts";
import { movesNotation, parseMove } from "./notation.ts";
import { seededRandom } from "./random.ts";
import { MAX_RECORD_SIZE, MIN_RECORD_SIZE, RECORD_FORMAT } from "./record.ts";
import { FULL_SCRAMBLE_LENGTHS, randomScramble } from "./scramble.ts";
import { SOLVABLE_SIZES, SOLVE_ALGORITHMS, solveSteps, type SolveStep } from "./solve.ts";
import { STRINGS, type KyuubuStrings } from "./strings.ts";
import { fill, languageOf, stageName, type KyuubuLanguage } from "./words.ts";
import type { CubeMove } from "./types.ts";
import { VERSION } from "./version.ts";

/**
 * THE COMMAND LINE, as a pure function: `kyuubu` in a terminal is this, handed
 * the real process by `bin/kyuubu.mjs`. It reads nothing and writes nothing
 * itself, so a program can call it without starting one.
 */

/** What the command line is told about where it runs. All of it may be left out. */
export type CliSurroundings = {
  /** The environment: `LC_ALL`, `LC_MESSAGES` and `LANG` choose the language, and `NO_COLOR` turns colour off. */
  env?: Readonly<Record<string, string | undefined>>;
  /** What was piped in, for `--stdin`. */
  stdin?: string;
  /** Whether standard output is a terminal that shows colour. Piped output is never coloured. */
  colour?: boolean;
  /** The system's language, used where the environment names none (Windows). */
  locale?: string;
  /** Where unseeded scrambles come from: a number in [0, 1), `Math.random` when left out. */
  random?: () => number;
};

/** What the command line came to: the exit code, and what goes to standard output and standard error. */
export type CliResult = { code: 0 | 1 | 2; out: string; err: string };

/** The longest scramble the command line will make. */
export const MAX_CLI_LENGTH = 1000;
/** The most scrambles the command line makes at once. */
export const MAX_CLI_COUNT = 100;

type Mode = "scramble" | "apply" | "verify" | "solve";

const VALUED: Readonly<Record<string, string>> = { "-n": "--size", "-l": "--length", "-c": "--count", "-s": "--seed", "-f": "--from" };
const BARE: Readonly<Record<string, string>> = { "-j": "--json", "-h": "--help", "-v": "--version" };
const TAKES_VALUE = new Set(["--size", "--length", "--count", "--seed", "--from", "--state", "--lang"]);
const FLAGS = new Set(["--scramble", "--apply", "--verify", "--solve", "--stdin", "--faces", "--json", "--no-color", "--help", "--version"]);

/** The standard colours as a terminal's 24-bit background, by face letter. */
const TERMINAL: Readonly<Record<CubeFace, string>> = {
  U: "247;247;242",
  R: "200;16;46",
  F: "0;155;72",
  D: "255;213;0",
  L: "255;88;0",
  B: "0;70;173",
};

/**
 * The cube unfolded flat, as lines of text: the top above the front, the left,
 * front, right and back in a row, and the bottom below.
 *
 *         U U U
 *         U U U
 *         U U U
 *     L L L F F F R R R B B B
 *     …
 *
 * With `colour`, each sticker is a block of its colour in place of its letter.
 */
export function cubeNet(state: string, n: number, colour = false): string {
  const face = (letter: CubeFace, row: number) => {
    const at = CUBE_FACE_ORDER.indexOf(letter) * n * n + row * n;
    return [...state.slice(at, at + n)].map((sticker) => (colour && sticker in TERMINAL ? `\u001b[48;2;${TERMINAL[sticker as CubeFace]}m  \u001b[0m` : sticker)).join(colour ? "" : " ");
  };
  const gap = " ".repeat(colour ? 2 * n + 1 : 2 * n);
  const lines: string[] = [];
  for (let row = 0; row < n; row += 1) lines.push(`${gap}${face("U", row)}`);
  for (let row = 0; row < n; row += 1) lines.push((["L", "F", "R", "B"] as const).map((letter) => face(letter, row)).join(" "));
  for (let row = 0; row < n; row += 1) lines.push(`${gap}${face("D", row)}`);
  return `${lines.join("\n")}\n`;
}

/** The turns in a line of notation, or the first part of it that is not one. */
function readTurns(text: string, n: number): { moves: CubeMove[] } | { bad: string } {
  const moves: CubeMove[] = [];
  for (const part of text.trim().split(/\s+/).filter((one) => one !== "")) {
    const move = parseMove(part, n);
    if (move === null) return { bad: part };
    moves.push(move);
  }
  return { moves };
}

/**
 * The whole command line. `args` are the arguments after the command's name;
 * the result is the exit code and the text for each stream. Exit code 0 is
 * done, 1 is something asked for that could not be done (turns the cube cannot
 * make, a cube that is not solved under `--verify`), and 2 is a command that
 * was itself wrong.
 *
 * @example
 * runCli(["--seed", "club night"]).out;                       // one scramble, the same everywhere
 * runCli(["--verify", "--from", "R U", "U' R'"]).code;        // 0: those turns solve it
 */
export function runCli(args: readonly string[], surroundings: CliSurroundings = {}): CliResult {
  const env = surroundings.env ?? {};
  const fromEnv = env.LC_ALL || env.LC_MESSAGES || env.LANG;
  let language: KyuubuLanguage = languageOf(fromEnv !== undefined && fromEnv !== "" ? fromEnv : surroundings.locale);

  // Every option first, so that a mistake is told in the language asked for.
  const given = new Map<string, string>();
  const flags = new Set<string>();
  const words: string[] = [];
  const wrong: { key: keyof KyuubuStrings; values: Record<string, string> }[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const raw = args[at];
    const equals = raw.startsWith("--") ? raw.indexOf("=") : -1;
    const name = VALUED[raw] ?? BARE[raw] ?? (equals > 0 ? raw.slice(0, equals) : raw);
    if (TAKES_VALUE.has(name)) {
      const value = equals > 0 ? raw.slice(equals + 1) : args[at + 1];
      if (value === undefined) wrong.push({ key: "cliNeedsValue", values: { option: raw } });
      else given.set(name, value);
      if (equals < 0) at += 1;
    } else if (FLAGS.has(name) && equals < 0) flags.add(name);
    else if (raw.startsWith("-") && raw.length > 1) wrong.push({ key: "cliBadOption", values: { option: raw } });
    else words.push(raw);
  }

  const asked = given.get("--lang");
  if (asked === "en" || asked === "ja") language = asked;
  else if (asked !== undefined) wrong.push({ key: "cliBadLang", values: { value: asked } });
  const say = (key: keyof KyuubuStrings, values: Record<string, string | number> = {}) => fill(STRINGS[language][key], values);
  const refuse = (code: 1 | 2, key: keyof KyuubuStrings, values: Record<string, string | number> = {}): CliResult => ({ code, out: "", err: `kyuubu: ${say(key, values)}\n` });

  if (wrong.length > 0) return refuse(2, wrong[0].key, wrong[0].values);
  if (flags.has("--help")) return { code: 0, out: say("cliUsage"), err: "" };
  if (flags.has("--version")) return { code: 0, out: `${VERSION}\n`, err: "" };

  const modes = (["scramble", "apply", "verify", "solve"] as const).filter((mode) => flags.has(`--${mode}`));
  if (modes.length > 1) return refuse(2, "cliOneMode");
  const mode: Mode = modes[0] ?? "scramble";
  const json = flags.has("--json");
  const colour = surroundings.colour === true && !flags.has("--no-color") && (env.NO_COLOR === undefined || env.NO_COLOR === "") && !json;

  const whole = (name: string, fallback: number, low: number, high: number, key: keyof KyuubuStrings): number | CliResult => {
    const value = given.get(name);
    if (value === undefined) return fallback;
    const read = name === "--size" ? /^(\d+)(?:\s*[x×]\s*\1)?$/i.exec(value.trim())?.[1] : /^\d+$/.test(value.trim()) ? value.trim() : undefined;
    const number = read === undefined ? NaN : Number(read);
    return Number.isInteger(number) && number >= low && number <= high ? number : refuse(2, key, { value });
  };
  const n = whole("--size", 3, MIN_RECORD_SIZE, MAX_RECORD_SIZE, "cliBadSize");
  if (typeof n !== "number") return n;

  if (mode === "scramble") {
    const length = whole("--length", FULL_SCRAMBLE_LENGTHS[n] ?? 25, 1, MAX_CLI_LENGTH, "cliBadLength");
    if (typeof length !== "number") return length;
    const count = whole("--count", 1, 1, MAX_CLI_COUNT, "cliBadCount");
    if (typeof count !== "number") return count;
    const seed = given.get("--seed");
    // One seed serves the whole command: its scrambles come one after another from the same source.
    const random = seed === undefined ? (surroundings.random ?? Math.random) : seededRandom(seed);
    const scrambles = Array.from({ length: count }, () => randomScramble(n, length, random, { faces: flags.has("--faces") }));
    if (json) {
      const body = {
        format: RECORD_FORMAT,
        generator: `kyuubu ${VERSION}`,
        scrambles: scrambles.map((moves) => ({ size: n, scramble: movesNotation(moves, n), state: turnAll(solvedCube(n), n, moves), ...(seed === undefined ? {} : { seed }) })),
      };
      return { code: 0, out: `${JSON.stringify(body, null, 2)}\n`, err: "" };
    }
    return { code: 0, out: scrambles.map((moves) => `${movesNotation(moves, n)}\n`).join(""), err: "" };
  }

  // The cube the turns start from: a state given, or a scramble made on a solved cube.
  let start = solvedCube(n);
  const state = given.get("--state");
  if (state !== undefined) {
    if (!isCubeState(state.trim(), n)) return refuse(1, "cliBadState", { n, count: 6 * n * n, each: n * n });
    start = state.trim();
  }
  const from = given.get("--from");
  if (from !== undefined) {
    const mixed = readTurns(from, n);
    if ("bad" in mixed) return refuse(1, "cliBadMoves", { part: mixed.bad, n });
    start = turnAll(start, n, mixed.moves);
  }
  if (mode === "verify" && state === undefined && from === undefined) return refuse(2, "cliNeedsStart");

  const typed = [...words, ...(flags.has("--stdin") ? [surroundings.stdin ?? ""] : [])].join(" ");
  const read = readTurns(typed, n);
  if ("bad" in read) return refuse(1, "cliBadMoves", { part: read.bad, n });
  const end = turnAll(start, n, read.moves);
  const count = read.moves.filter(countsAsMove).length;

  if (mode === "solve") {
    if (!SOLVABLE_SIZES.includes(n)) return refuse(1, "cliNoMethod");
    let steps: SolveStep[];
    try {
      // A cube already solved needs nothing, whichever way up it is held.
      steps = cubeSolved(end, n) ? [] : solveSteps(end, n)!;
    } catch {
      return refuse(1, "cliImpossible");
    }
    const total = steps.reduce((sum, step) => sum + step.moves.filter(countsAsMove).length, 0);
    if (json) {
      const body = {
        format: RECORD_FORMAT,
        generator: `kyuubu ${VERSION}`,
        size: n,
        state: end,
        count: total,
        steps: steps.map((step) => ({ stage: step.stage, name: stageName(step.stage, language), moves: movesNotation(step.moves, n), algorithms: step.algorithms.map((name) => ({ name, moves: SOLVE_ALGORITHMS[name] })) })),
      };
      return { code: 0, out: `${JSON.stringify(body, null, 2)}\n`, err: "" };
    }
    if (steps.length === 0) return { code: 0, out: `${say("cliAlreadySolved")}\n`, err: "" };
    // Japanese is twice as wide as it is long: the names are padded by what they take on the screen.
    const width = (text: string) => [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 0x2e7f ? 2 : 1), 0);
    const names = steps.map((step) => stageName(step.stage, language));
    const widest = Math.max(...names.map(width));
    const lines = steps.map((step, at) => `${names[at]}${" ".repeat(widest - width(names[at]) + 2)}${movesNotation(step.moves, n)}`);
    return { code: 0, out: `${lines.join("\n")}\n${say("cliSteps", { count: total, steps: steps.length })}\n`, err: "" };
  }

  const solved = cubeSolved(end, n);
  if (json) {
    const body = { format: RECORD_FORMAT, generator: `kyuubu ${VERSION}`, size: n, moves: movesNotation(read.moves, n), count, state: end, solved };
    return { code: mode === "verify" && !solved ? 1 : 0, out: `${JSON.stringify(body, null, 2)}\n`, err: "" };
  }
  if (mode === "verify") return { code: solved ? 0 : 1, out: `${say(solved ? "cliSolvedIn" : "cliNotSolvedAfter", { count })}\n`, err: "" };
  return { code: 0, out: `${cubeNet(end, n, colour)}${say("cliState")}: ${end}\n${say(solved ? "solved" : "notSolved")}\n`, err: "" };
}
