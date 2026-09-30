import { countsAsMove, cubeSolved, solvedCube, turnAll } from "./cube.ts";
import { movesNotation, parseMoves } from "./notation.ts";
import type { CubeMove } from "./types.ts";
import { VERSION } from "./version.ts";

/**
 * A SOLVE, KEPT: the scramble and the turns that followed it, written out so
 * that it can be saved, sent and read back. Three ways, each a pure function
 * that returns a string:
 *
 * - `toJSON` and `fromJSON`: versioned JSON, which reads back in;
 * - `toText` and `fromText`: a few plain lines of notation, to paste in a chat;
 * - `toCSV`: a list of solves for a spreadsheet.
 *
 * Nothing read back is trusted. The cube after the scramble, whether the
 * turns solve it and how many moves they are, are worked out again from the
 * notation, never taken from the file.
 */

/** The version of the JSON's shape. It goes up only if a reader of the old shape would be wrong about the new one. */
export const RECORD_FORMAT = 1;

/** The smallest cube a record may be of. */
export const MIN_RECORD_SIZE = 2;
/** The largest cube a record may be of: the package is made and tested for 2×2 to 7×7. */
export const MAX_RECORD_SIZE = 7;
/** The most turns one record may hold, scramble and solve each. */
export const MAX_RECORD_MOVES = 10000;
/** The most solves read from one file. */
export const MAX_RECORDS = 1000;
/** The longest seed kept with a solve. */
export const MAX_RECORD_SEED = 200;

/** One solve: the cube's size, the scramble that mixed it, and the turns made after. */
export type SolveRecord = {
  /** The cube's side, 2 to 7. */
  size: number;
  /** The turns that scrambled a solved cube. */
  scramble: CubeMove[];
  /** The turns made after the scramble, in order, whole-cube turns among them. */
  moves: CubeMove[];
  /** How long the solve took, in milliseconds, where it was timed. */
  ms?: number;
  /** When it was done, in milliseconds since 1970, where that is known. */
  at?: number;
  /** The seed the scramble came from, where it came from one. */
  seed?: string;
};

/** What a record comes to, worked out from its turns. */
export type SolveSummary = {
  size: number;
  /** The scramble in notation. */
  scramble: string;
  /** The turns after it in notation. */
  moves: string;
  /** The cube once scrambled. */
  start: string;
  /** The cube after every turn. */
  state: string;
  /** Whether it ended solved. */
  solved: boolean;
  /** The moves that count: every turn but those of the whole cube. */
  count: number;
};

/** A record's scramble and turns in notation, the cube before and after, whether it ended solved, and its count of moves. */
export function summarize(record: SolveRecord): SolveSummary {
  const start = turnAll(solvedCube(record.size), record.size, record.scramble);
  const state = turnAll(start, record.size, record.moves);
  return {
    size: record.size,
    scramble: movesNotation(record.scramble, record.size),
    moves: movesNotation(record.moves, record.size),
    start,
    state,
    solved: cubeSolved(state, record.size),
    count: record.moves.filter(countsAsMove).length,
  };
}

const list = (records: SolveRecord | readonly SolveRecord[]): readonly SolveRecord[] => (Array.isArray(records) ? records : [records as SolveRecord]);

/**
 * One solve or many, as JSON: `{ "format": 1, "generator": "kyuubu 1.1.0", "solves": [ … ] }`.
 * Each solve carries its size, its scramble and its turns in notation, and what
 * they come to (`state`, `solved`, `count`), for a reader that does not have the package.
 */
export function toJSON(records: SolveRecord | readonly SolveRecord[]): string {
  const solves = list(records).map((record) => {
    const summary = summarize(record);
    return {
      size: summary.size,
      scramble: summary.scramble,
      moves: summary.moves,
      state: summary.state,
      solved: summary.solved,
      count: summary.count,
      ...(record.ms === undefined ? {} : { ms: record.ms }),
      ...(record.at === undefined ? {} : { at: new Date(record.at).toISOString() }),
      ...(record.seed === undefined ? {} : { seed: record.seed }),
    };
  });
  return `${JSON.stringify({ format: RECORD_FORMAT, generator: `kyuubu ${VERSION}`, solves }, null, 2)}\n`;
}

function rebuilt(entry: unknown): SolveRecord | null {
  if (typeof entry !== "object" || entry === null) return null;
  const { size, scramble, moves, ms, at, seed } = entry as Record<string, unknown>;
  if (typeof size !== "number" || !Number.isInteger(size) || size < MIN_RECORD_SIZE || size > MAX_RECORD_SIZE) return null;
  if (typeof scramble !== "string" || typeof moves !== "string") return null;
  const mixed = parseMoves(scramble, size);
  const made = parseMoves(moves, size);
  if (mixed === null || made === null || mixed.length > MAX_RECORD_MOVES || made.length > MAX_RECORD_MOVES) return null;
  const record: SolveRecord = { size, scramble: mixed, moves: made };
  if (typeof ms === "number" && Number.isFinite(ms) && ms >= 0) record.ms = ms;
  if (typeof at === "string" && at.length <= 40 && Number.isFinite(Date.parse(at))) record.at = Date.parse(at);
  if (typeof seed === "string" && seed.length <= MAX_RECORD_SEED) record.seed = seed;
  return record;
}

/**
 * The solves in a JSON export, or null where the text is not one: not JSON,
 * not this format, or a later one. Each solve is put together again from its
 * size and its notation; one whose notation the cube cannot turn is left out,
 * and what the file says of `state`, `solved` and `count` is ignored.
 */
export function fromJSON(text: string): SolveRecord[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const { format, solves } = data as Record<string, unknown>;
  if (format !== RECORD_FORMAT || !Array.isArray(solves)) return null;
  return solves.slice(0, MAX_RECORDS).flatMap((entry) => {
    const record = rebuilt(entry);
    return record === null ? [] : [record];
  });
}

/** Seconds to the hundredth, as a timer shows them. */
const seconds = (ms: number) => (ms / 1000).toFixed(2);

/**
 * A solve as a few plain lines, to paste in a chat or a note:
 *
 *     3x3
 *     scramble: R U2 F'
 *     solve: F U2 R'
 *     time: 12.34
 *
 * A line is left out where there is nothing to say. `fromText` reads it back.
 */
export function toText(record: SolveRecord): string {
  const summary = summarize(record);
  const lines = [`${record.size}x${record.size}`];
  if (record.scramble.length > 0) lines.push(`scramble: ${summary.scramble}`);
  if (record.moves.length > 0) lines.push(`solve: ${summary.moves}`);
  if (record.ms !== undefined) lines.push(`time: ${seconds(record.ms)}`);
  if (record.seed !== undefined) lines.push(`seed: ${record.seed}`);
  return `${lines.join("\n")}\n`;
}

/**
 * A solve read back from plain lines, or null where they are not one. The
 * size is a line such as `3x3` or `3×3` (a 3×3 where there is none), and
 * `scramble:`, `solve:`, `time:` and `seed:` name the rest, in any order and
 * either case. Lines with no name are turns of the solve, so a bare line of
 * notation is read too.
 */
export function fromText(text: string): SolveRecord | null {
  if (text.length > 200000) return null;
  let size = 3;
  let sized = false;
  const parts = { scramble: [] as string[], solve: [] as string[] };
  let ms: number | undefined;
  let seed: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;
    const side = /^(\d)\s*[x×]\s*(\d)$/i.exec(line);
    if (side !== null) {
      if (sized || side[1] !== side[2]) return null;
      size = Number(side[1]);
      sized = true;
      continue;
    }
    const named = /^(scramble|solve|moves|time|seed)\s*:\s*(.*)$/i.exec(line);
    if (named === null) parts.solve.push(line);
    else if (/^scramble$/i.test(named[1])) parts.scramble.push(named[2]);
    else if (/^(solve|moves)$/i.test(named[1])) parts.solve.push(named[2]);
    else if (/^time$/i.test(named[1])) {
      const read = Number(named[2].replace(/\s*s$/i, ""));
      if (named[2].trim() === "" || !Number.isFinite(read) || read < 0) return null;
      ms = Math.round(read * 1000);
    } else seed = named[2].slice(0, MAX_RECORD_SEED);
  }
  if (size < MIN_RECORD_SIZE || size > MAX_RECORD_SIZE) return null;
  const scramble = parseMoves(parts.scramble.join(" "), size);
  const moves = parseMoves(parts.solve.join(" "), size);
  if (scramble === null || moves === null || scramble.length > MAX_RECORD_MOVES || moves.length > MAX_RECORD_MOVES) return null;
  if (scramble.length === 0 && moves.length === 0) return null;
  return { size, scramble, moves, ...(ms === undefined ? {} : { ms }), ...(seed === undefined ? {} : { seed }) };
}

/** A cell as RFC 4180 writes it, and never a formula: a cell a spreadsheet would run (one starting =, +, - or @) is given a leading apostrophe. */
function cell(value: string | number | boolean | undefined): string {
  if (value === undefined) return "";
  if (typeof value !== "string") return String(value);
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * A list of solves as CSV, for a spreadsheet: a header, then a row a solve,
 * with lines ended CRLF as RFC 4180 has them. The columns are `time` (when,
 * ISO 8601), `size`, `scramble`, `moves`, `count`, `solved`, `seconds` and `seed`.
 */
export function toCSV(records: readonly SolveRecord[]): string {
  const rows = records.map((record) => {
    const summary = summarize(record);
    return [
      record.at === undefined ? undefined : new Date(record.at).toISOString(),
      record.size,
      summary.scramble,
      summary.moves,
      summary.count,
      summary.solved,
      record.ms === undefined ? undefined : seconds(record.ms),
      record.seed,
    ]
      .map(cell)
      .join(",");
  });
  return ["time,size,scramble,moves,count,solved,seconds,seed", ...rows].map((row) => `${row}\r\n`).join("");
}
