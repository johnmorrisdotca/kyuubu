/** Options and the numbers a cuboid on the screen is drawn from. */
import type { CubeFace } from "../cube.ts";
import type { CubeAxis, Vec3 } from "../types.ts";
import type { CubeTheme } from "../view/view.ts";
import type { KyuubuLanguage } from "../words.ts";

import type { CuboidDragPick } from "./gestures.ts";
import type { CuboidDims, CuboidMove } from "./model.ts";

/** Everything a cuboid on the screen can be told when it is made. Only `dims` is needed.
 *
 * @example
 * ```ts
 * import type { CuboidViewOptions } from "@johnmorrisdotca/kyuubu/cuboid/draw";
 *
 *
 * const value: CuboidViewOptions = { dims: [2, 3, 3], interactive: true, keyboard: "focus" };
 * console.log(value.dims);
 * ```
 */
export type CuboidViewOptions = {
  /** The puzzle's width, height and depth: each 1 to 7, and not 1×1×1. */
  dims: CuboidDims;
  /** The stickers, one letter each (`solvedCuboid`); solved when left out. */
  state?: string;
  /** Colours for the six faces, by the letter a solved face carries. A face left out takes its CSS custom property (`--kyuubu-up` and the rest), and the standard colour where that is not set. */
  colours?: Partial<Record<CubeFace, string>>;
  /** The colour of the plastic between stickers and inside the puzzle. Left out, it is `--kyuubu-plastic`, and `#111` where that is not set. */
  plastic?: string;
  /** A whole look at once: colours, plastic and the shape of a sticker. `colours` and `plastic` given beside it win. */
  theme?: CubeTheme;
  /** Whether the puzzle's corners are rounded, like the plastic of a real one: true when left out. */
  rounded?: boolean;
  /** The language of the puzzle's accessible name: English or Japanese. Left out, it follows the page's `lang`. */
  locale?: KyuubuLanguage;
  /** Whether a person can turn it. A look-only puzzle still turns when asked (`turn`). True when left out. */
  interactive?: boolean;
  /** Where the keys are listened for: the puzzle itself once it has focus (the default), the whole page, or nowhere. */
  keyboard?: "focus" | "page" | "none";
  /** How long a quarter turn takes, in milliseconds, when it is made by a key, by notation or from code: 160 when left out. A device that asks for reduced motion gets no animation, whatever this says. */
  turnMs?: number;
  /** The point of no return of a dragged layer that turns by quarters, in degrees: 30 when left out. From 5 to 85. */
  commitAngle?: number;
  /** How the puzzle is first seen: turned about its up axis, in degrees. */
  yaw?: number;
  /** How the puzzle is first seen: tipped towards the viewer, in degrees. */
  pitch?: number;
  /** How much of the space the puzzle fills, 0 to 1. */
  fill?: number;
  /** A turn a person made, with the stickers once it is done. */
  onTurn?: (move: CuboidMove, state: string) => void;
  /** Every time the view is turned, for anything that wants to keep it. */
  onLook?: (yaw: number, pitch: number) => void;
  /** What a screen reader calls the puzzle. Left out, it is "A 2×3×3 cuboid" in the puzzle's language. */
  label?: string;
};

/** What a cuboid tells the listeners `on` adds: a turn a person made, with the stickers after it; and the view turned, in degrees.
 *
 * @example
 * ```ts
 * import type { CuboidViewEvents } from "@johnmorrisdotca/kyuubu/cuboid/draw";
 *
 *
 * const value: CuboidViewEvents = { turn: (move, state) => console.log(move, state), look: (yaw, pitch) => console.log(yaw, pitch) };
 * console.log(Object.keys(value));
 * ```
 */
export type CuboidViewEvents = {
  turn: (move: CuboidMove, state: string) => void;
  look: (yaw: number, pitch: number) => void;
};

/** The length an edge is drawn at, before the puzzle is fitted to its element. */
export const EDGE = 300;
/** How far outside the element a drag may wander, as a share of the smaller side, before it is given up. */
export const DRAG_LEAVE = 0.25;
/** The least distance, in pixels, a drag may wander outside the element before it is given up. */
export const DRAG_LEAVE_LEAST = 32;
/** How far back, in milliseconds, a drag's speed is measured from when it is let go. */
export const SPEED_WINDOW = 100;
/** How a layer past the point of no return is shown, unless `--kyuubu-commit-filter` says otherwise. */
export const COMMIT_FILTER = "brightness(1.14)";

/** A corner of a sticker that is a corner of the puzzle, and the style that rounds it. */
export type RoundCorner = {
  property: "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius";
  vertex: Vec3;
};
/** Where an element sits before the puzzle is turned to be looked at. */
export type Placed = {
  right: Vec3;
  down: Vec3;
  out: Vec3;
  at: Vec3;
  slot?: number;
  layer?: number;
  corners?: RoundCorner[];
  drawn?: { transform: string; visible: boolean; z: string; round: string };
};
/** A layer turning: which way, and how far so far. */
export type Spin = { axis: CubeAxis; radians: number; layer: number };
/** One step waiting to be turned. */
export type Queued = { move: CuboidMove; report: boolean; ms?: number };
/** A layer the pointer is holding: the drag, how far it has turned, and the samples its speed is read from. */
export type LiveDrag = {
  pick: CuboidDragPick;
  angle: number;
  committed: boolean;
  samples: { at: number; angle: number }[];
};
