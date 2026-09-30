import { FAMOUS_SOLVE_DATA } from "./famous.data.ts";

/**
 * FAMOUS SOLVES: record-setting solves of the 3×3 that were filmed, written
 * down move by move by the people who study them, and published.
 *
 * Every one here is a fact that can be checked, and is: the scramble and the
 * moves are as their source gives them, and a test plays each and fails if
 * the cube does not end solved. A solve with no published reconstruction, or
 * one that does not play out, is left out, which is why the list is short
 * and has gaps. The times, names, competitions and dates are the World Cube
 * Association's public results; nothing else about anyone is kept. This
 * project is not affiliated with the WCA.
 *
 * It is its own entry of the package (`@johnmorrisdotca/kyuubu/famous`), so a
 * page that does not show it does not carry it. To add one, see
 * CONTRIBUTING.md: a source is asked for, and `pnpm solve:check` plays it.
 */

/** One famous solve. */
export type FamousSolve = {
  /** A short name for it, fixed for good: the solver and the time. */
  id: string;
  /** The cube's side. */
  size: number;
  /** The official time, in milliseconds. */
  timeMs: number;
  /** Who solved it, as the WCA's results name them. */
  solver: string;
  /** The country they represent. */
  country: string;
  /** The competition. */
  competition: string;
  /** The competition's id at worldcubeassociation.org. */
  competitionId: string;
  /** The competition's first day, as year-month-day. The solve was made on one of its days. */
  from: string;
  /** The competition's last day. */
  to: string;
  /** What it was when it was made. */
  record: "world record" | "tied world record";
  /** The scramble, white on top and green in front. */
  scramble: string;
  /** The solve, a line for each stage as its source sets it out. */
  solution: string;
  /** Who worked the moves out from the film, where the source says. */
  reconstructedBy?: string;
  /** Where the scramble and the moves were published. */
  source: string;
  /** The day the source was last read, as year-month-day. */
  checked: string;
};

/** The famous solves, the newest record first. */
export const FAMOUS_SOLVES: readonly FamousSolve[] = FAMOUS_SOLVE_DATA;

/** One famous solve by its id, or undefined. */
export function famousSolve(id: string): FamousSolve | undefined {
  return FAMOUS_SOLVES.find((solve) => solve.id === id);
}
