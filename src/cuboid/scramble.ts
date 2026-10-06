import { cuboidSolved, legalCuboidMoves, solvedCuboid, turnAllCuboid, turnCuboid, type CuboidDims, type CuboidMove } from "./model.ts";

/**
 * SCRAMBLING A CUBOID. A scramble is a list of turns from the solved puzzle
 * that the puzzle can make, so it can always be undone and the result is
 * always solvable, by construction.
 *
 * - A puzzle with few enough states (`CUBOID_RANDOM_STATE_MAX`, which takes in
 *   every cuboid with a side of 1 up to 1×3×4) is scrambled to a state chosen
 *   uniformly out of all of them: every state is listed once, a state is
 *   drawn, and the scramble is the shortest way there. No state is likelier
 *   than another, which no random walk of a fixed length can say of a puzzle
 *   whose turns are all half turns (its walks can only reach half the states).
 * - A bigger puzzle is scrambled by a random walk long enough to be near
 *   enough as likely to land anywhere (`cuboidScrambleLength`).
 */

/** The most states a cuboid has and still has its scramble drawn uniformly out of all of them. */
export const CUBOID_RANDOM_STATE_MAX = 20000;

/**
 * How many turns a random walk that scrambles a cuboid has: 8, and 2.2 for
 * every layer that is not the whole puzzle, up to 100. Near the 25 of a 3×3 for
 * a puzzle with as many layers.
 */
export function cuboidScrambleLength(dims: CuboidDims): number {
  const layers = dims.reduce((sum, side) => sum + (side > 1 ? side : 0), 0);
  return Math.min(100, Math.round(8 + 2.2 * layers));
}

type StateGraph = { states: string[]; parent: Int32Array; via: Int32Array; moves: CuboidMove[] };
const graphs = new Map<string, StateGraph | null>();

/** Every state of the puzzle with the turn that first reached it, or null where there are more than `CUBOID_RANDOM_STATE_MAX`. Worked out once and kept. */
function stateGraph(dims: CuboidDims): StateGraph | null {
  const key = dims.join(",");
  if (graphs.has(key)) return graphs.get(key)!;
  const moves = legalCuboidMoves(dims);
  const start = solvedCuboid(dims);
  const index = new Map<string, number>([[start, 0]]);
  const states = [start];
  const parent = [-1];
  const via = [-1];
  for (let at = 0; at < states.length; at += 1) {
    for (let k = 0; k < moves.length; k += 1) {
      const next = turnCuboid(states[at], dims, moves[k]);
      if (index.has(next)) continue;
      if (states.length >= CUBOID_RANDOM_STATE_MAX) {
        graphs.set(key, null);
        return null;
      }
      index.set(next, states.length);
      states.push(next);
      parent.push(at);
      via.push(k);
    }
  }
  const made = { states, parent: Int32Array.from(parent), via: Int32Array.from(via), moves };
  graphs.set(key, made);
  return made;
}

/** Whether a cuboid has few enough states to be scrambled to one drawn uniformly out of all of them. */
export function hasRandomStateScramble(dims: CuboidDims): boolean {
  return stateGraph(dims) !== null;
}

/**
 * A scramble. Without a `length`, a puzzle that has few enough states
 * (`hasRandomStateScramble`) is scrambled to a state drawn uniformly from all
 * the states that are not solved, by the shortest turns that reach it; any
 * other is scrambled by a random walk of `cuboidScrambleLength` turns, one
 * more than that half the time, so that a puzzle whose graph has two sides can
 * land on either. With a `length`, a random walk of exactly that many turns,
 * each of a layer chosen at random and a turn that layer can make, never two
 * in a row of the same layer, which would join into one. Never leaves the
 * puzzle solved: a turn is added until it is not.
 *
 * `random` is a number in [0, 1), like `Math.random`; pass `seededRandom(seed)`
 * for the same scramble from the same seed everywhere.
 *
 * @example
 * cuboidMovesNotation(randomCuboidScramble([2, 3, 3], undefined, seededRandom("club night")), [2, 3, 3]);
 */
export function randomCuboidScramble(dims: CuboidDims, length?: number, random: () => number = Math.random): CuboidMove[] {
  const graph = length === undefined ? stateGraph(dims) : null;
  if (graph !== null) {
    let at = 0;
    while (cuboidSolved(graph.states[at], dims)) at = Math.floor(random() * graph.states.length);
    const path: CuboidMove[] = [];
    for (; graph.parent[at] >= 0; at = graph.parent[at]) path.push(graph.moves[graph.via[at]]);
    return path.reverse();
  }
  const all = legalCuboidMoves(dims);
  if (all.length === 0) throw new RangeError("That cuboid has nothing to turn");
  const wanted = length ?? cuboidScrambleLength(dims) + (random() < 0.5 ? 0 : 1);
  const moves: CuboidMove[] = [];
  const start = solvedCuboid(dims);
  while (moves.length < wanted || cuboidSolved(turnAllCuboid(start, dims, moves), dims)) {
    const last = moves[moves.length - 1];
    const choices = last === undefined ? all : all.filter((move) => move.axis !== last.axis || move.layer !== last.layer);
    moves.push(choices[Math.floor(random() * choices.length)]);
  }
  return moves;
}
