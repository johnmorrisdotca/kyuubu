import { cubeSolved, turnAll, undoOf } from "./cube.ts";
import { moveNotation, movesNotation } from "./notation.ts";
import { parseSolve, type SolveMove } from "./reconstruction.ts";
import { solveSteps, type SolveStage } from "./solve.ts";
import type { CubeAxis, CubeMove, CubeTurns } from "./types.ts";
import { WORDS, fill, type CubeWords, type KyuubuLanguage } from "./words.ts";

/**
 * A SOLVE TO FOLLOW WITH YOUR OWN HANDS: a list of moves, or the method's
 * steps, taken one movement at a time. The guide says what the next movement
 * is; the person makes it; the guide hears the turn and moves on. A turn that
 * is not the one asked for is kept as a detour, and the guide says so and can
 * take it back. Pure: it knows the cube only as its state, and nothing here
 * touches a page. `mountGuide` puts one beside a `CubeView`.
 *
 * A movement is what a person does in one go: a turn of one layer, a wide
 * turn of several layers about one axis (`Rw`), or a turn of the whole cube.
 * A half turn may be made as one drag or as two quarter turns the same way,
 * and a wide turn a layer at a time: what is left of it is asked for next.
 */

/** What a guide walks: moves as written (`"R U R' U'"`, wide turns and rotations read as `parseSolve` reads them), or as moves, each a movement; or the layer-by-layer method, step by step from the cube as it is (2×2 and 3×3). */
export type GuideSource = { moves: string | readonly (CubeMove | readonly CubeMove[] | SolveMove)[] } | { method: true };

/** The movement a guide asks for now. */
export type GuideStep = {
  /** What is still to turn of it: the whole movement at first, less any layer or quarter already made. */
  moves: CubeMove[];
  /** The movement as asked for. */
  whole: CubeMove[];
  /** The movement in notation: `R'`, `Rw`, `x`. */
  text: string;
  /** What is still to turn, in notation: `2R` once the `R` of an `Rw` is made. */
  left: string;
  /** Whether it turns the whole cube, which no drag on a sticker does. */
  rotation: boolean;
  /** Which movement it is, from 0, in the list or in the method's step. */
  index: number;
  /** How many movements the list, or the method's step, has. */
  total: number;
  /** The method's stage it belongs to, following the method. */
  stage?: SolveStage;
};

/** What a guide made of a turn it was told of: the movement finished, part of it made, a detour, or a detour taken back by hand. */
export type GuideHeard = "done" | "part" | "off" | "back";

const same = (a: CubeMove, b: CubeMove) => a.axis === b.axis && a.layer === b.layer && a.turns === b.turns;

function movementOf(entry: CubeMove | readonly CubeMove[] | SolveMove): CubeMove[] {
  if (Array.isArray(entry)) return [...(entry as readonly CubeMove[])];
  if ("moves" in (entry as SolveMove)) return [...(entry as SolveMove).moves];
  return [entry as CubeMove];
}

/**
 * A movement in notation: one layer as `moveNotation` writes it; several
 * layers from a face inwards, about one axis and as far, as a wide turn
 * (`Rw`, `3Rw'`); anything else as its moves one after another.
 */
export function movementText(moves: readonly CubeMove[], n: number): string {
  if (moves.length === 1) return moveNotation(moves[0], n);
  const [first] = moves;
  const layers = moves.map((move) => move.layer);
  const oneWay = moves.every((move) => move.axis === first.axis && move.turns === first.turns && move.layer !== "all");
  if (oneWay) {
    const sorted = (layers as number[]).slice().sort((a, b) => a - b);
    const run = sorted.every((layer, at) => at === 0 || layer === sorted[at - 1] + 1);
    const outer = sorted.includes(n - 1) ? "positive" : sorted.includes(0) ? "negative" : null;
    if (run && outer !== null && sorted.length < n) {
      const face = moveNotation({ axis: first.axis, layer: outer === "positive" ? n - 1 : 0, turns: first.turns }, n);
      return `${sorted.length > 2 ? sorted.length : ""}${face[0]}w${face.slice(1)}`;
    }
  }
  return movesNotation(moves, n);
}

/**
 * A guide through a list of moves or the method's steps, for a cube of side
 * `n` starting from `state`.
 *
 * @example
 * const guide = new Guide(view.state, 3, { moves: "R U R' U'" });
 * guide.next;              // { text: "R", moves: [{ axis: 0, layer: 2, turns: 3 }], index: 0, total: 4, … }
 * guide.heard(someMove);   // "done", "part", "off" or "back"
 */
export class Guide {
  /** The cube's side. */
  readonly n: number;
  private now: string;
  private readonly method: boolean;
  private list: CubeMove[][] = [];
  private stage: SolveStage | undefined;
  private at = 0;
  private left: CubeMove[] = [];
  private detour: CubeMove[] = [];
  private made = 0;

  /** A guide; notation that cannot be read throws, with where it stopped. */
  constructor(state: string, n: number, source: GuideSource) {
    this.n = n;
    this.now = state;
    this.method = "method" in source;
    if ("moves" in source) {
      if (typeof source.moves === "string") {
        const read = parseSolve(source.moves, n);
        if (!read.ok) throw new SyntaxError(`“${read.fault.token}” is not a move this cube can turn (line ${read.fault.line}, place ${read.fault.column})`);
        this.list = read.steps.map(movementOf);
      } else this.list = source.moves.map(movementOf).filter((movement) => movement.length > 0);
    }
    this.begin();
  }

  /** The next step of the method, where the list has run out and the cube is not solved; or the first movement of the list. */
  private begin(): void {
    if (this.method && this.at >= this.list.length) {
      const [step] = cubeSolved(this.now, this.n) ? [] : (solveSteps(this.now, this.n) ?? []);
      this.list = step === undefined ? [] : step.moves.map((move) => [move]);
      this.stage = step?.stage;
      this.at = 0;
    }
    this.left = this.list[this.at]?.slice() ?? [];
  }

  /** The cube as the guide has it: where it started, with every turn it has been told of or has handed out. */
  get state(): string {
    return this.now;
  }

  /** The movement to make now, or null when there is nothing left to make. While there is a detour it is still the movement to come back to. */
  get next(): GuideStep | null {
    const whole = this.list[this.at];
    if (whole === undefined) return null;
    return {
      moves: this.left.slice(),
      whole: whole.slice(),
      text: movementText(whole, this.n),
      left: movementText(this.left, this.n),
      rotation: whole.some((move) => move.layer === "all"),
      index: this.at,
      total: this.list.length,
      ...(this.stage === undefined ? {} : { stage: this.stage }),
    };
  }

  /** The turns made that were not asked for, oldest first. */
  get detours(): readonly CubeMove[] {
    return this.detour;
  }

  /** How many movements have been finished, over every step of the method. */
  get done(): number {
    return this.made;
  }

  /** Whether there is nothing left to make. */
  get finished(): boolean {
    return this.list[this.at] === undefined;
  }

  /**
   * A turn made on the cube, by a person or anything else, told to the guide.
   * `"done"`: that finished the movement, and `next` is the one after.
   * `"part"`: it was part of it, and `next` asks for the rest. `"off"`: it was
   * not asked for, and is kept as a detour. `"back"`: it undid the last
   * detour.
   */
  heard(move: CubeMove): GuideHeard {
    this.now = turnAll(this.now, this.n, [move]);
    const last = this.detour.at(-1);
    if (last !== undefined) {
      if (same(undoOf(last), move)) {
        this.detour.pop();
        return "back";
      }
      this.detour.push(move);
      return "off";
    }
    const want = this.left.findIndex((one) => one.axis === move.axis && one.layer === move.layer);
    const one = this.left[want];
    if (one === undefined || this.finished) {
      this.detour.push(move);
      return "off";
    }
    if (one.turns === move.turns) this.left.splice(want, 1);
    // Half of a half turn, either way: the other half is the same quarter again.
    else if (one.turns === 2 && move.turns !== 2) this.left[want] = { ...one, turns: move.turns as CubeTurns };
    else {
      this.detour.push(move);
      return "off";
    }
    if (this.left.length > 0) return "part";
    this.at += 1;
    this.made += 1;
    this.begin();
    return "done";
  }

  /** The turns that take every detour back, last first, as the guide now has them made: turn them on the cube without telling the guide again. */
  takeBack(): CubeMove[] {
    const back = this.detour.slice().reverse().map(undoOf);
    this.now = turnAll(this.now, this.n, back);
    this.detour = [];
    return back;
  }

  /** Every detour taken back and the movement made, as the guide now has it: the turns to make on the cube, without telling the guide again. */
  makeNext(): CubeMove[] {
    const back = this.takeBack();
    const rest = this.left.slice();
    if (rest.length === 0) return back;
    this.now = turnAll(this.now, this.n, rest);
    this.left = [];
    this.at += 1;
    this.made += 1;
    this.begin();
    return [...back, ...rest];
  }
}

/* ------------------------------------------------------------------ */
/* Words                                                               */
/* ------------------------------------------------------------------ */

const SIDES: Record<CubeAxis, [negative: keyof CubeWords, positive: keyof CubeWords]> = {
  0: ["guideSideL", "guideSideR"],
  1: ["guideSideD", "guideSideU"],
  2: ["guideSideB", "guideSideF"],
};
const MIDDLES: Record<CubeAxis, keyof CubeWords> = { 0: "guideMiddleM", 1: "guideMiddleE", 2: "guideMiddleS" };
/** Which way a quarter turn by the right-hand rule carries the side you look at, about each axis: forwards (1) and back (3). */
const WAYS: Record<CubeAxis, [forwards: keyof CubeWords, back: keyof CubeWords]> = {
  0: ["guideTowards", "guideAway"],
  1: ["guideToRight", "guideToLeft"],
  2: ["guideAnticlockwise", "guideClockwise"],
};
const WHOLE: Record<CubeAxis, Record<CubeTurns, keyof CubeWords>> = {
  0: { 1: "guideWholeXPrime", 2: "guideWholeX2", 3: "guideWholeX" },
  1: { 1: "guideWholeYPrime", 2: "guideWholeY2", 3: "guideWholeY" },
  2: { 1: "guideWholeZPrime", 2: "guideWholeZ2", 3: "guideWholeZ" },
};

/**
 * A movement in plain words, for a cube held with its front towards you:
 * "Turn the right face away from you.", 「右の面を奥に回します。」. For a turn of
 * the whole cube, where its faces go. Null for turns that are not one
 * movement (different axes, or different amounts).
 */
export function movementSays(moves: readonly CubeMove[], n: number, language: KyuubuLanguage = "en"): string | null {
  const words = WORDS[language];
  if (moves.length === 0) return null;
  const [first] = moves;
  if (moves.some((move) => move.axis !== first.axis || move.turns !== first.turns || (move.layer === "all") !== (first.layer === "all"))) return null;
  if (first.layer === "all") return words[WHOLE[first.axis][first.turns]];
  const layers = [...new Set(moves.map((move) => move.layer as number))].sort((a, b) => a - b);
  // Named from the face the layers are nearer: the one they reach, for a wide turn.
  const mean = layers.reduce((sum, layer) => sum + layer, 0) / layers.length;
  const positive = layers.includes(n - 1) ? true : layers.includes(0) ? false : mean > (n - 1) / 2;
  const side = words[SIDES[first.axis][positive ? 1 : 0]];
  let named: string;
  if (layers.length === 1) {
    const layer = layers[0];
    const depth = positive ? n - layer : layer + 1;
    if (n % 2 === 1 && layer === (n - 1) / 2) named = words[MIDDLES[first.axis]];
    else named = depth === 1 ? fill(words.guideFace, { side }) : fill(words.guideInner, { side, depth });
  } else named = fill(words.guideWide, { side, count: layers.length });
  if (first.turns === 2) return fill(words.guideHalf, { layers: named });
  return fill(words.guideTurn, { layers: named, way: words[WAYS[first.axis][first.turns === 1 ? 0 : 1]] });
}

/** The key or keys that make a turn of the whole cube: `X`, `Shift+X`, `X X`. */
export function rotationKeys(move: CubeMove): string {
  const letter = ["X", "Y", "Z"][move.axis];
  if (move.turns === 2) return `${letter} ${letter}`;
  // x, y and z turn the way R, U and F do, which is back by the right-hand rule.
  return move.turns === 3 ? letter : `Shift+${letter}`;
}
