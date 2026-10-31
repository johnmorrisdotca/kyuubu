/** Colours, options and the numbers the cube on the screen is drawn from. */
import type { CubeFace } from "../cube.ts";
import type { CubeScale } from "../scale.ts";
import type { CubeAxis, CubeMove, Vec3 } from "../types.ts";
import type { KyuubuLanguage } from "../words.ts";

import type { DragPick } from "./gestures.ts";

/** The standard colours, by the letter a solved face carries: white up, red right, green front, yellow down, orange left, blue back.
 *
 * @example
 * ```ts
 * import { DEFAULT_COLOURS } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(DEFAULT_COLOURS);
 * ```
 */
export const DEFAULT_COLOURS: Readonly<Record<CubeFace, string>> = {
  U: "#f7f7f2",
  R: "#c8102e",
  F: "#009b48",
  D: "#ffd500",
  L: "#ff5800",
  B: "#0046ad",
};

/** The colour of the plastic between the stickers, where none is given.
 *
 * @example
 * ```ts
 * import { DEFAULT_PLASTIC } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(DEFAULT_PLASTIC);
 * ```
 */
export const DEFAULT_PLASTIC = "#111";

/**
 * How a cube looks: its six colours, its plastic, and the shape of a sticker.
 * Everything may be left out, and what is left out stays as it was.
 *
 * @example
 * ```ts
 * import type { CubeTheme } from "@johnmorrisdotca/kyuubu";
 * import { CUBE_THEMES } from "@johnmorrisdotca/kyuubu";
 *
 * const value: CubeTheme = CUBE_THEMES.paper;
 * console.log(value.plastic);
 * ```
 */
export type CubeTheme = {
  /** Colours for the six faces, by the letter a solved face carries. Any CSS colour. */
  colours?: Partial<Record<CubeFace, string>>;
  /** The colour of the plastic between stickers and inside the cube. */
  plastic?: string;
  /** How far a sticker sits in from the edge of its square, as a CSS length or percentage of the square. `"6%"` when left out. */
  stickerInset?: string;
  /** How round a sticker's corners are, as a CSS length or percentage. `"14%"` when left out. */
  stickerRadius?: string;
  /** How round the cube's own corners are, as a CSS length on a cube drawn 300px across (it grows and shrinks with the cube): `"15px"` when left out, `"0"` for square. Never more than nearly half a sticker. */
  cornerRadius?: string;
};

/**
 * Looks that come with the package. `standard` is the cube as it is sold;
 * `paper` is the quieter one the demo site wears, made to sit on warm paper
 * and green felt; `stickerless` has colour to the edge of every piece.
 *
 * @example
 * ```ts
 * import { CUBE_THEMES } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(Object.keys(CUBE_THEMES).slice(0, 8));
 * ```
 */
export const CUBE_THEMES = {
  standard: { colours: { ...DEFAULT_COLOURS }, plastic: DEFAULT_PLASTIC, stickerInset: "6%", stickerRadius: "14%" },
  paper: {
    colours: { U: "#fffdf7", R: "#b5452c", F: "#2f7a4f", D: "#e0b43b", L: "#d97a2b", B: "#2b5f8f" },
    plastic: "#1f2320",
    stickerInset: "6%",
    stickerRadius: "14%",
  },
  stickerless: { colours: { ...DEFAULT_COLOURS }, plastic: "#2a2a2a", stickerInset: "1.5%", stickerRadius: "10%" },
} as const satisfies Record<string, CubeTheme>;

/** The CSS custom property that colours each face, where no colour is given in code: set it on the cube's element or any ancestor.
 *
 * @example
 * ```ts
 * import { FACE_PROPERTIES } from "@johnmorrisdotca/kyuubu";
 *
 * console.log(FACE_PROPERTIES);
 * ```
 */
export const FACE_PROPERTIES: Readonly<Record<CubeFace, string>> = {
  U: "--kyuubu-up",
  R: "--kyuubu-right",
  F: "--kyuubu-front",
  D: "--kyuubu-down",
  L: "--kyuubu-left",
  B: "--kyuubu-back",
};

/** Everything a cube on the screen can be told when it is made. Only `size` is needed.
 *
 * @example
 * ```ts
 * import type { CubeViewOptions } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: CubeViewOptions = { size: 3, interactive: true, keyboard: "focus" };
 * console.log(value.size);
 * ```
 */
export type CubeViewOptions = {
  /** The cube's side: 2 for a 2×2, 3 for the classic. */
  size: number;
  /** The stickers, one letter each (`solvedCube`); solved when left out. */
  state?: string;
  /** Colours for the six faces, by the letter a solved face carries. A face left out takes its CSS custom property (`--kyuubu-up` and the rest), and the standard colour where that is not set. */
  colours?: Partial<Record<CubeFace, string>>;
  /** The colour of the plastic between stickers and inside the cube. Left out, it is `--kyuubu-plastic`, and `#111` where that is not set. */
  plastic?: string;
  /** A whole look at once: colours, plastic and the shape of a sticker. `colours` and `plastic` given beside it win. */
  theme?: CubeTheme;
  /** Whether the cube's corners are rounded, like the plastic of a real one: true when left out. The theme's `cornerRadius` says how round. */
  rounded?: boolean;
  /** The language of the cube's accessible name: English or Japanese. Left out, it follows the page's `lang`. */
  locale?: KyuubuLanguage;
  /** How big it is drawn: `small` (72 pixels, for a list or a picker), `medium` (160) or `large` (300). The host is given that width and kept square. Left out, the cube fills the box it is in. `width` wins over it. A `small` cube is look-only unless `interactive` says otherwise. */
  scale?: CubeScale;
  /** How wide it is drawn, in pixels, in place of `scale`'s. */
  width?: number;
  /** Whether a person can turn it. A look-only cube still turns when asked (`turn`). True when left out, except at `small`. */
  interactive?: boolean;
  /** Where the keys are listened for: the cube itself once it has focus (the default), the whole page, or nowhere. */
  keyboard?: "focus" | "page" | "none";
  /** Whether `scramble` shows the turns it makes: the last few, quickly, after the rest are made at once. True when left out; a device that asks for reduced motion shows none whatever this says. */
  animateScramble?: boolean;
  /** How long a quarter turn takes, in milliseconds, when it is made by a key, by notation or from code: 160 when left out. A device that asks for reduced motion gets no animation, whatever this says. `setTurnMs` changes it later. */
  turnMs?: number;
  /**
   * The point of no return of a dragged layer, in degrees: 30 when left out.
   * A layer let go short of it goes back and no move is made; at it or past
   * it, the turn is completed. From 5 to 85.
   */
  commitAngle?: number;
  /** How the cube is first seen: turned about its up axis, in degrees. */
  yaw?: number;
  /** How the cube is first seen: tipped towards the viewer, in degrees. */
  pitch?: number;
  /** How much of the space the cube fills, 0 to 1. */
  fill?: number;
  /** A turn a person made, with the cube's stickers once it is done. */
  onTurn?: (move: CubeMove, state: string) => void;
  /** Every time the view is turned, for anything that wants to keep it. */
  onLook?: (yaw: number, pitch: number) => void;
  /** What a screen reader calls the cube. Left out, it is "A 3×3 cube" in the cube's language. */
  label?: string;
};

/** The length an edge is drawn at, before the puzzle is fitted to its element. */
export const EDGE = 300;
/** How many of a scramble's last turns are shown turning; the rest are made at once. */
export const SCRAMBLE_SHOWN = 10;
/** How long each of those turns takes, in milliseconds. */
export const SCRAMBLE_TURN_MS = 85;
/** How far the wheel travels before it is taken as one step of a turn. */
export const WHEEL_STEP = 60;
/** How far outside the cube's element a drag may wander before it is taken as given up: this share of the element's smaller side, and never less than `DRAG_LEAVE_LEAST` pixels. A half turn on a big cube is a long drag. */
export const DRAG_LEAVE = 0.25;
/** The least distance, in pixels, a drag may wander outside the element before it is given up. */
export const DRAG_LEAVE_LEAST = 32;
/** How far back, in milliseconds, a drag's speed is measured from when it is let go. */
export const SPEED_WINDOW = 100;
/** How a layer past the point of no return is shown, unless `--kyuubu-commit-filter` says otherwise. */
export const COMMIT_FILTER = "brightness(1.14)";
/** The colour of a hint's arrow and of the ring round the stickers it lights, unless `--kyuubu-hint-colour` says otherwise. */
export const HINT_COLOUR = "#fff";
/** The edge drawn round the arrow so that it shows on a white sticker too, unless `--kyuubu-hint-edge` says otherwise. */
export const HINT_EDGE = "rgba(17, 17, 17, 0.85)";
/** How the stickers a hint does not light are shown, unless `--kyuubu-hint-dim` says otherwise. */
export const HINT_DIM = "brightness(0.62) saturate(0.7)";
/** The SVG namespace the hint arrow is drawn in. */
export const SVG = "http://www.w3.org/2000/svg";

/** What a cube tells the listeners `on` adds: a turn a person made, with the stickers after it; and the view turned, in degrees.
 *
 * @example
 * ```ts
 * import type { CubeViewEvents } from "@johnmorrisdotca/kyuubu";
 *
 *
 * const value: CubeViewEvents = { turn: (move, state) => console.log(move, state), look: (yaw, pitch) => console.log(yaw, pitch) };
 * console.log(Object.keys(value));
 * ```
 */
export type CubeViewEvents = {
  turn: (move: CubeMove, state: string) => void;
  look: (yaw: number, pitch: number) => void;
};

/** A layer the pointer is holding: the drag, how far it has turned, and the samples its speed is read from. */
export type LiveDrag = { pick: DragPick; angle: number; committed: boolean; samples: { at: number; angle: number }[] };

/** One step of the queue: a turn, or several layers about one axis turned as one (a wide turn), and how long it should take when that was asked for. */
export type Queued = { moves: CubeMove[]; report: boolean; ms?: number };
/** Where an element sits on the cube, before the cube is turned to be looked at: its own x, y and z as model vectors, its centre in pixels, and, for the plastic across a turning gap, the layer it closes. */
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
/** A corner of a sticker that is a corner of the cube: the style that rounds it, and the cube's corner it is, as a direction from the centre (each part 1 or −1). */
export type RoundCorner = {
  property: "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius";
  vertex: Vec3;
};
/** A layer turning: which way, how far so far, and which layers turn. */
export type Spin = { axis: CubeAxis; radians: number; layers: ReadonlySet<number | "all"> };
