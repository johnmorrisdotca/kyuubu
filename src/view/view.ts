import { CUBE_FACE_ORDER, FACE_FRAMES, cubeSlots, faceOfNormal, layerOf, solvedCube, turnCube, type CubeFace } from "../cube.ts";
import { CUBE_SCALE_INTERACTIVE, cubeWidthPx, type CubeScale } from "../scale.ts";
import { WORDS, fill, languageOf, type KyuubuLanguage } from "../words.ts";
import type { CubeAxis, CubeMove, StickerSlot, Vec3 } from "../types.ts";

import { apply, axisVector, cross, multiply, placement, rotation, viewMatrix, type Mat3 } from "./geometry.ts";
import { COMMIT_ANGLE, dragAngle, moveForRelease, moveForWheel, pastCommit, pickDrag, quartersForRelease, type DragPick } from "./gestures.ts";
import { dragHint, type DragHint } from "./hint.ts";
import { readKey } from "./keys.ts";

/**
 * THE CUBE ON THE SCREEN, in plain DOM and CSS: no canvas, no WebGL, no
 * framework. A sticker is a square element given its whole place on the
 * screen in one `matrix3d`, worked out here from the way the cube is looked
 * at and how far a turning layer has gone; a turn gathers the stickers of
 * its layer into a group, then puts every colour where it landed.
 *
 * Nothing is nested in 3D (no `preserve-3d`): which stickers face the viewer
 * and which part of a turning cube is in front are decided here, not by the
 * browser. Safari on a phone can let go of nested 3D layers and draw a cube
 * as one flat face; a cube that asks for no 3D context cannot be flattened.
 *
 * Every hand does something:
 * - drag a sticker across the cube and the layer that carries it that way turns
 *   with the pointer, forwards and back; let go past the point of no return
 *   and the turn is made, short of it and the layer goes back;
 * - drag the space around the cube to turn the whole cube and look at it;
 * - the wheel over a sticker turns the layer carrying it sideways, Ctrl with
 *   the wheel the one carrying it up and down, Shift with the wheel the face
 *   it is on; over the space around the cube the wheel turns the whole cube,
 *   sideways, or up and down with Ctrl;
 * - keys in cubers' notation (`keys.ts`), and the arrows to look around.
 */

/** The standard colours, by the letter a solved face carries: white up, red right, green front, yellow down, orange left, blue back. */
export const DEFAULT_COLOURS: Readonly<Record<CubeFace, string>> = {
  U: "#f7f7f2",
  R: "#c8102e",
  F: "#009b48",
  D: "#ffd500",
  L: "#ff5800",
  B: "#0046ad",
};

/** The colour of the plastic between the stickers, where none is given. */
export const DEFAULT_PLASTIC = "#111";

/**
 * How a cube looks: its six colours, its plastic, and the shape of a sticker.
 * Everything may be left out, and what is left out stays as it was.
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
 */
export const CUBE_THEMES = {
  standard: { colours: { ...DEFAULT_COLOURS }, plastic: DEFAULT_PLASTIC, stickerInset: "6%", stickerRadius: "14%" },
  paper: { colours: { U: "#fffdf7", R: "#b5452c", F: "#2f7a4f", D: "#e0b43b", L: "#d97a2b", B: "#2b5f8f" }, plastic: "#1f2320", stickerInset: "6%", stickerRadius: "14%" },
  stickerless: { colours: { ...DEFAULT_COLOURS }, plastic: "#2a2a2a", stickerInset: "1.5%", stickerRadius: "10%" },
} as const satisfies Record<string, CubeTheme>;

/** The CSS custom property that colours each face, where no colour is given in code: set it on the cube's element or any ancestor. */
export const FACE_PROPERTIES: Readonly<Record<CubeFace, string>> = {
  U: "--kyuubu-up",
  R: "--kyuubu-right",
  F: "--kyuubu-front",
  D: "--kyuubu-down",
  L: "--kyuubu-left",
  B: "--kyuubu-back",
};

/** Everything a cube on the screen can be told when it is made. Only `size` is needed. */
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

const EDGE = 300;
const WHEEL_STEP = 60;
/** How far outside the cube's element a drag may wander before it is taken as given up: this share of the element's smaller side, and never less than `DRAG_LEAVE_LEAST` pixels. A half turn on a big cube is a long drag. */
const DRAG_LEAVE = 0.25;
const DRAG_LEAVE_LEAST = 32;
/** How far back, in milliseconds, a drag's speed is measured from when it is let go. */
const SPEED_WINDOW = 100;
/** How a layer past the point of no return is shown, unless `--kyuubu-commit-filter` says otherwise. */
const COMMIT_FILTER = "brightness(1.14)";
/** The colour of a hint's arrow and of the ring round the stickers it lights, unless `--kyuubu-hint-colour` says otherwise. */
const HINT_COLOUR = "#fff";
/** The edge drawn round the arrow so that it shows on a white sticker too, unless `--kyuubu-hint-edge` says otherwise. */
const HINT_EDGE = "rgba(17, 17, 17, 0.85)";
/** How the stickers a hint does not light are shown, unless `--kyuubu-hint-dim` says otherwise. */
const HINT_DIM = "brightness(0.62) saturate(0.7)";
const SVG = "http://www.w3.org/2000/svg";

/** What a cube tells the listeners `on` adds: a turn a person made, with the stickers after it; and the view turned, in degrees. */
export type CubeViewEvents = {
  turn: (move: CubeMove, state: string) => void;
  look: (yaw: number, pitch: number) => void;
};

type LiveDrag = { pick: DragPick; angle: number; committed: boolean; samples: { at: number; angle: number }[] };

/** One step of the queue: a turn, or several layers about one axis turned as one (a wide turn), and how long it should take when that was asked for. */
type Queued = { moves: CubeMove[]; report: boolean; ms?: number };
/** Where an element sits on the cube, before the cube is turned to be looked at: its own x, y and z as model vectors, its centre in pixels, and, for the plastic across a turning gap, the layer it closes. */
type Placed = { right: Vec3; down: Vec3; out: Vec3; at: Vec3; slot?: number; layer?: number; corners?: RoundCorner[]; drawn?: { transform: string; visible: boolean; z: string; round: string } };
/** A corner of a sticker that is a corner of the cube: the style that rounds it, and the cube's corner it is, as a direction from the centre (each part 1 or −1). */
type RoundCorner = { property: "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius"; vertex: Vec3 };
/** A layer turning: which way, how far so far, and which layers turn. */
type Spin = { axis: CubeAxis; radians: number; layers: ReadonlySet<number | "all"> };

/**
 * A cube on the screen. `new CubeView(element, { size: 3 })` draws it in the
 * element, which it fills, so the element needs a size; `destroy()` takes it
 * away again with every listener.
 *
 * @example
 * const view = new CubeView(document.getElementById("cube"), { size: 3, onTurn: (move, state) => save(state) });
 * view.turn(parseMove("R", 3));
 */
export class CubeView {
  /** The element the cube was made in. */
  readonly host: HTMLElement;
  private options: Required<Omit<CubeViewOptions, "state" | "onTurn" | "onLook" | "colours" | "plastic" | "theme" | "label" | "locale" | "scale" | "width">> & Pick<CubeViewOptions, "onTurn" | "onLook" | "label">;
  private theme: { colours: Partial<Record<CubeFace, string>>; plastic?: string; stickerInset?: string; stickerRadius?: string; cornerRadius?: string };
  private readonly listeners: { turn: Set<CubeViewEvents["turn"]>; look: Set<CubeViewEvents["look"]> } = { turn: new Set(), look: new Set() };
  /** The turn a hint is shown for, and what it came to from where the cube is looked at now. */
  private hintMoves: CubeMove[] | null = null;
  private hintNow: DragHint | null = null;
  private arrow: HTMLDivElement | null = null;
  private arrowKey = "";
  private language: KyuubuLanguage;
  private n: number;
  private target: string;
  private shown: string;
  private yaw: number;
  private pitch: number;
  private readonly root: HTMLDivElement;
  private readonly pivot: HTMLDivElement;
  private readonly still: HTMLDivElement;
  private readonly turning: HTMLDivElement;
  private stickers: HTMLDivElement[] = [];
  private readonly places = new Map<HTMLElement, Placed>();
  private spin: Spin | null = null;
  private queue: Queued[] = [];
  private animating = false;
  private frame = 0;
  private depth = 1;
  private wheelSum = 0;
  private gesture: { id: number; x: number; y: number; at: number; slot: number | null; done: boolean; yaw: number; pitch: number } | null = null;
  /** The layer the pointer is holding, turned as far as it has been dragged. */
  private drag: LiveDrag | null = null;
  /** What ends a layer's snap after it is let go, run early when something cannot wait for it. */
  private finishSnap: (() => void) | null = null;
  private sized = { width: "", height: "", maxWidth: "", aspectRatio: "" };
  private sizedByScale = false;
  private readonly resize: ResizeObserver | null;
  /**
   * The side of the box the cube is drawn in, measured when the box changes size and not in every frame of a turn: reading
   * it asks the page to work out its styles and layout there and then, in the middle of the frame, which on a big cube
   * on a phone is the longest thing a frame does.
   */
  private side = 0;
  /** Whether a sticker is marked as the one a hint says to take hold of, so a draw with no hint has nothing to take the mark off. */
  private grabbed = false;
  /** Whether every sticker has been given its colour once, after which `paint` writes only the ones that changed (a new theme resets it). */
  private coloured = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(host: HTMLElement, options: CubeViewOptions) {
    this.host = host;
    this.options = {
      interactive: options.scale === undefined ? true : CUBE_SCALE_INTERACTIVE[options.scale],
      keyboard: "focus",
      turnMs: 160,
      commitAngle: COMMIT_ANGLE,
      yaw: -35,
      pitch: 28,
      fill: 0.9,
      rounded: true,
      // An option passed as undefined, as a wrapper passes every prop it was not given, leaves the default standing.
      ...(Object.fromEntries(Object.entries(options).filter(([key, value]) => value !== undefined && !["colours", "plastic", "theme", "locale"].includes(key))) as CubeViewOptions),
    };
    const given = <T extends object>(from: T | undefined) => Object.fromEntries(Object.entries(from ?? {}).filter(([, value]) => value !== undefined)) as Partial<T>;
    this.theme = {
      ...given(options.theme),
      colours: { ...given(options.theme?.colours), ...given(options.colours) },
      ...(options.plastic === undefined ? {} : { plastic: options.plastic }),
    };
    this.language = options.locale ?? languageOf(host.ownerDocument?.documentElement?.lang);
    this.n = options.size;
    this.target = options.state ?? solvedCube(this.n);
    this.shown = this.target;
    this.yaw = this.options.yaw;
    this.pitch = this.options.pitch;

    this.root = document.createElement("div");
    this.root.setAttribute("role", "application");
    this.root.setAttribute("aria-label", this.label());
    this.root.dataset.kyuubu = "";
    this.root.dataset.turning = "false";
    this.root.dataset.dragging = "false";
    this.root.dataset.committed = "false";
    Object.assign(this.root.style, { position: "absolute", inset: "0", touchAction: "none", userSelect: "none", outline: "none", cursor: "grab" });
    this.pivot = this.layer();
    this.still = this.layer();
    this.turning = this.layer();
    this.pivot.append(this.still, this.turning);
    this.root.append(this.pivot);
    Object.assign(this.pivot.style, { left: "50%", top: "50%" });
    host.append(this.root);
    this.setScale(options.scale, options.width);
    this.measureSide();

    this.build();
    this.look();
    this.resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            this.measureSide();
            this.look();
          });
    this.resize?.observe(host);
    // Safari on a phone can let go of the 3D layers of a cube that is out of sight, and then draws it flat when
    // it comes back: one face of it, and nothing behind. Taking the cube out of the page and putting it straight
    // back as it comes into view makes the browser build its layers again, and is nothing a person can see.
    if (typeof IntersectionObserver !== "undefined") {
      const seen = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.redraw();
      });
      seen.observe(this.root);
      this.cleanups.push(() => seen.disconnect());
    }
    this.hands();
  }

  /** The stickers as they will be once every turn asked for has finished. */
  get state(): string {
    return this.target;
  }

  /** The cube's side. */
  get size(): number {
    return this.n;
  }

  /**
   * Change how the cube looks, at once and without redrawing it: any of its
   * colours, its plastic, and the shape of its stickers. What is left out of
   * `theme` stays as it is. To go back to the CSS custom properties and the
   * standard colours, pass `CUBE_THEMES.standard`, or make the cube again.
   */
  setTheme(theme: CubeTheme): void {
    const defined = Object.fromEntries(Object.entries(theme).filter(([key, value]) => value !== undefined && key !== "colours"));
    const colours = Object.fromEntries(Object.entries(theme.colours ?? {}).filter(([, value]) => value !== undefined));
    this.theme = { ...this.theme, ...defined, colours: { ...this.theme.colours, ...colours } };
    this.dress();
    // `dress` put the plastic on every sticker, so every one is coloured again.
    this.coloured = false;
    this.paint();
  }

  /** The language of the cube's accessible name. A `label` given when the cube was made is left as it is. */
  setLocale(locale: KyuubuLanguage): void {
    this.language = locale;
    this.root.setAttribute("aria-label", this.label());
  }

  private label(): string {
    return this.options.label ?? fill(WORDS[this.language].cubeLabel, { n: this.n });
  }

  private plastic(): string {
    return this.theme.plastic ?? `var(--kyuubu-plastic, ${DEFAULT_PLASTIC})`;
  }

  private colourOf(letter: string): string {
    if (!(letter in DEFAULT_COLOURS)) return this.plastic();
    const face = letter as CubeFace;
    return this.theme.colours[face] ?? `var(${FACE_PROPERTIES[face]}, ${DEFAULT_COLOURS[face]})`;
  }

  /** The plastic and the shape of every sticker, as the theme has them now. */
  private dress(): void {
    const plastic = this.plastic();
    const corner = this.corner();
    const { slots } = cubeSlots(this.n);
    for (const sticker of this.stickers) {
      sticker.style.background = plastic;
      // The corners of a face that are the cube's own corners are rounded, so the plastic reads as a real cube's.
      const slot = slots[Number(sticker.dataset.slot)];
      const frame = FACE_FRAMES[faceOfNormal(slot.normal)];
      const col = (frame.right.reduce((sum, value, k) => sum + value * slot.centre[k], 0) + this.n - 1) / 2;
      const row = (frame.down.reduce((sum, value, k) => sum + value * slot.centre[k], 0) + this.n - 1) / 2;
      const last = this.n - 1;
      // Which of them are rounded is decided as the cube is drawn (`draw`): only a corner on the cube's outline is.
      const corners: RoundCorner[] = [];
      const at = (across: number, down: number): Vec3 => frame.normal.map((value, k) => value + across * frame.right[k] + down * frame.down[k]) as unknown as Vec3;
      if (row === 0 && col === 0) corners.push({ property: "borderTopLeftRadius", vertex: at(-1, -1) });
      if (row === 0 && col === last) corners.push({ property: "borderTopRightRadius", vertex: at(1, -1) });
      if (row === last && col === 0) corners.push({ property: "borderBottomLeftRadius", vertex: at(-1, 1) });
      if (row === last && col === last) corners.push({ property: "borderBottomRightRadius", vertex: at(1, 1) });
      for (const property of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"] as const) sticker.style[property] = "";
      const place = this.places.get(sticker);
      if (place !== undefined) {
        place.corners = corner === "" ? [] : corners;
        if (place.drawn !== undefined) place.drawn = { ...place.drawn, round: "" };
      }
      const face = sticker.firstChild as HTMLDivElement;
      face.style.inset = this.theme.stickerInset ?? "var(--kyuubu-sticker-inset, 6%)";
      face.style.borderRadius = this.theme.stickerRadius ?? "var(--kyuubu-sticker-radius, 14%)";
    }
  }

  /** How round the cube's corners are drawn: never more than nearly half a sticker, and nothing when the cube is not rounded. */
  private corner(): string {
    if (!this.options.rounded) return "";
    return `min(${this.theme.cornerRadius ?? "var(--kyuubu-corner-radius, 15px)"}, ${Math.round(this.unit() * 0.45)}px)`;
  }

  /**
   * Draw the cube at a scale, or at a width in pixels (which wins), or with
   * neither, back to filling the box it is in. The box keeps one steady
   * square, never wider than its container, so nothing round it moves when
   * the cube does. The cube's own `interactive` is not touched.
   */
  setScale(scale?: CubeScale, width?: number): void {
    const px = cubeWidthPx(scale, width);
    const box = this.host.style;
    if (px === null) {
      // A cube never given a scale leaves its box exactly as the page sized it.
      if (!this.sizedByScale) return;
      box.width = this.sized.width;
      box.height = this.sized.height;
      box.maxWidth = this.sized.maxWidth;
      box.aspectRatio = this.sized.aspectRatio;
      this.sizedByScale = false;
    } else {
      if (!this.sizedByScale) this.sized = { width: box.width, height: box.height, maxWidth: box.maxWidth, aspectRatio: box.aspectRatio };
      this.sizedByScale = true;
      box.width = `${px}px`;
      box.height = "auto";
      box.maxWidth = "100%";
      box.aspectRatio = "1 / 1";
      if (this.host.ownerDocument.defaultView?.getComputedStyle(this.host).position === "static") box.position = "relative";
    }
    this.root.style.cursor = this.options.interactive ? "grab" : "default";
    this.measureSide();
    if (this.stickers.length > 0) this.look();
  }

  /** The box's smaller side as it is now, or a size to draw at where it has none yet (a box that is hidden). */
  private measureSide(): void {
    const fallback = EDGE * 1.8;
    this.side = Math.min(this.host.clientWidth || fallback, this.host.clientHeight || this.host.clientWidth || fallback);
  }

  /** Whether a person can turn it now. */
  setInteractive(interactive: boolean): void {
    this.options.interactive = interactive;
    this.root.style.cursor = interactive ? "grab" : "default";
  }

  /** Put the stickers as given, at once, dropping any turn still to come. */
  setState(state: string, size: number = this.n): void {
    this.settleDrag();
    this.queue = [];
    this.stopTurn();
    this.target = state;
    this.shown = state;
    if (size !== this.n) {
      this.n = size;
      this.hintMoves = null;
      this.root.setAttribute("aria-label", this.label());
      this.build();
    }
    this.paint();
  }

  /** Turn a layer, animated after any turns already on their way. Told to `onTurn` only when `report` says so. */
  turn(move: CubeMove, { report = false, animate = true }: { report?: boolean; animate?: boolean } = {}): void {
    this.settleDrag();
    this.target = turnCube(this.target, this.n, move);
    if (report) this.told(move);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ moves: [move], report });
    if (!this.animating) this.next();
  }

  /**
   * Several layers about one axis turned together, the same way and as far,
   * as one movement: a wide turn (`Rw` is the right face and the layer behind
   * it). `ms`, when given, is how long the whole movement takes, whatever
   * `turnMs` says, so a replay can keep a solve's own pace; a device that
   * asks for reduced motion still gets none. Never told to `onTurn`. Moves
   * that do not share an axis and a distance are turned one after another.
   */
  turnTogether(moves: readonly CubeMove[], { animate = true, ms }: { animate?: boolean; ms?: number } = {}): void {
    if (moves.length === 0) return;
    const together = moves.every((move) => move.axis === moves[0].axis && move.turns === moves[0].turns && move.layer !== "all") || moves.length === 1;
    if (!together) {
      for (const move of moves) this.turnTogether([move], { animate, ms: ms === undefined ? undefined : ms / moves.length });
      return;
    }
    this.settleDrag();
    for (const move of moves) this.target = turnCube(this.target, this.n, move);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ moves: [...moves], report: false, ms });
    if (!this.animating) this.next();
  }

  /** Whether a turn asked for is still on its way. */
  get busy(): boolean {
    return this.animating || this.queue.length > 0;
  }

  /** The cube taken out of the page and put straight back, so that the browser makes its layers again. Nothing about it changes. */
  redraw(): void {
    const pivot = this.pivot;
    pivot.remove();
    void this.root.offsetWidth;
    this.root.append(pivot);
  }

  /** How long a quarter turn made by a key, by notation or from code takes, in milliseconds, from now on. */
  setTurnMs(ms: number): void {
    this.options.turnMs = Math.max(0, ms);
  }

  /** Look at the cube from another way round, in degrees. */
  setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-89, Math.min(89, pitch));
    this.look();
    this.options.onLook?.(this.yaw, this.pitch);
    for (const listener of [...this.listeners.look]) listener(this.yaw, this.pitch);
  }

  /** A turn a person made, told to `onTurn` and to every listener. */
  private told(move: CubeMove): void {
    this.options.onTurn?.(move, this.target);
    for (const listener of [...this.listeners.turn]) listener(move, this.target);
  }

  /**
   * Listen for what the cube tells `onTurn` and `onLook`, beside them, as
   * many listeners as are wanted: `"turn"` for every turn a person makes,
   * `"look"` whenever the view turns. Returns what stops listening.
   */
  on(type: "turn", listener: CubeViewEvents["turn"]): () => void;
  on(type: "look", listener: CubeViewEvents["look"]): () => void;
  on(type: keyof CubeViewEvents, listener: CubeViewEvents[keyof CubeViewEvents]): () => void {
    const set = this.listeners[type] as Set<typeof listener>;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /**
   * Show on the cube how to make a turn: the layer that turns is lit and the
   * rest dimmed, and an arrow lies across the stickers the way to drag them,
   * worked out afresh whenever the cube is looked at from somewhere else. The
   * arrow is the drag's own rules run backwards, so a drag along it from the
   * sticker at its tail is that turn. Several layers about one axis turned as
   * far (a wide turn) are lit as one slab with one arrow; each is dragged on
   * its own. A turn of the whole cube lights nothing: no drag on a sticker
   * makes it. `null` takes the hint away. Nothing about the cube changes.
   */
  showHint(moves: CubeMove | readonly CubeMove[] | null): void {
    const list = moves === null ? [] : Array.isArray(moves) ? [...(moves as readonly CubeMove[])] : [moves as CubeMove];
    this.hintMoves = list.length === 0 ? null : list;
    this.hintNow = null;
    this.arrowKey = "";
    this.light();
    this.draw();
  }

  /** What the hint shows from where the cube is looked at now: the layers lit, the sticker to take hold of and the way to drag it; null with no hint, or for a turn of the whole cube. */
  get hint(): DragHint | null {
    return this.hintNow;
  }

  /** Back to the way it was first seen. */
  resetLook(): void {
    this.setLook(this.options.yaw, this.options.pitch);
  }

  /** The way the cube is looked at now, in degrees. */
  get looking(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  /** Take the cube off the page, with every listener it added. */
  destroy(): void {
    this.listeners.turn.clear();
    this.listeners.look.clear();
    this.stopTurn();
    this.resize?.disconnect();
    for (const clean of this.cleanups) clean();
    this.root.remove();
  }

  private layer(): HTMLDivElement {
    const div = document.createElement("div");
    Object.assign(div.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0" });
    return div;
  }

  private unit(): number {
    return EDGE / this.n;
  }

  /** Every sticker, placed once; a turn only moves them in groups and repaints them. */
  private build(): void {
    this.still.replaceChildren();
    this.turning.replaceChildren();
    this.places.clear();
    const unit = this.unit();
    const { slots } = cubeSlots(this.n);
    this.stickers = slots.map((slot, at) => {
      const frame = FACE_FRAMES[faceOfNormal(slot.normal)];
      const sticker = document.createElement("div");
      sticker.dataset.slot = String(at);
      Object.assign(sticker.style, {
        position: "absolute",
        width: `${unit}px`,
        height: `${unit}px`,
        left: `${-unit / 2}px`,
        top: `${-unit / 2}px`,
      });
      this.places.set(sticker, { right: frame.right, down: frame.down, out: frame.normal, at: this.surface(slot), slot: at });
      const face = document.createElement("div");
      Object.assign(face.style, { position: "absolute", pointerEvents: "none" });
      sticker.append(face);
      this.still.append(sticker);
      return sticker;
    });
    this.dress();
    this.light();
    this.paint();
    this.draw();
  }

  /** The stickers of the layer a hint is for lit, with a ring round each, and every other sticker dimmed; or all as they were, with no hint. */
  private light(): void {
    const moves = this.hintMoves;
    const layers = new Set(moves === null || moves.some((move) => move.layer === "all") ? [] : moves.map((move) => move.layer as number));
    const axis = moves?.[0]?.axis ?? 0;
    const { slots } = cubeSlots(this.n);
    const ring = `0 0 0 ${Math.max(1.5, this.unit() * 0.055).toFixed(2)}px var(--kyuubu-hint-colour, ${HINT_COLOUR})`;
    const hinting = layers.size > 0;
    for (const sticker of this.stickers) {
      const lit = hinting && layers.has(layerOf(slots[Number(sticker.dataset.slot)].centre, axis, this.n));
      const face = sticker.firstChild as HTMLDivElement;
      face.style.boxShadow = lit ? ring : "";
      sticker.style.filter = hinting && !lit ? `var(--kyuubu-hint-dim, ${HINT_DIM})` : "";
      if (lit) sticker.dataset.hintLit = "";
      else delete sticker.dataset.hintLit;
    }
  }

  /** Where the hint's arrow is drawn from here, or nowhere: the layer's side cannot be seen, it is a turn of the whole cube, or a layer is turning. */
  private drawHint(view: Mat3, scale: number, lens: number): void {
    const moves = this.hintMoves;
    const whole = moves !== null && moves.some((move) => move.layer === "all");
    const hint = moves === null || whole ? null : dragHint(moves, this.n, view);
    this.hintNow = hint;
    if (moves === null) delete this.root.dataset.hint;
    else this.root.dataset.hint = whole ? "whole" : hint?.face === null || hint === null ? "look" : "drag";
    // With no hint and no mark left to take off there is nothing to do: not a pass over every sticker of a 7×7 in every frame.
    if (hint !== null || this.grabbed) {
      for (const sticker of this.stickers) {
        const grab = hint?.grab === Number(sticker.dataset.slot);
        if (grab && sticker.dataset.hintGrab === undefined) sticker.dataset.hintGrab = "";
        else if (!grab && sticker.dataset.hintGrab !== undefined) delete sticker.dataset.hintGrab;
      }
      this.grabbed = hint?.grab !== undefined && hint.grab !== null;
    }
    const arrow = hint?.arrow ?? null;
    if (arrow === null || hint === null || this.spin !== null) {
      if (this.arrow !== null) this.arrow.style.visibility = "hidden";
      return;
    }
    const half = this.unit() / 2;
    const length = arrow.length * half;
    const width = arrow.width * half;
    const element = this.arrowElement();
    const key = `${length.toFixed(1)}|${width.toFixed(1)}|${hint.quarters}|${this.n}`;
    if (key !== this.arrowKey) {
      this.arrowKey = key;
      this.drawArrow(element, length, width, hint.quarters === 2);
    }
    const scaled = (v: Vec3) => apply(view, v).map((value) => value * scale) as unknown as Vec3;
    // Its middle, half its length on from the sticker it starts at, lifted a hair off the face.
    const middle = arrow.from.map((value, k) => (value + (arrow.along[k] * arrow.length) / 2) * half + arrow.normal[k] * 0.6) as unknown as Vec3;
    element.style.transform = `perspective(${lens}px) ${placement(scaled(arrow.along), scaled(cross(arrow.along, arrow.normal)), apply(view, arrow.normal), scaled(middle))}`;
    element.style.visibility = "";
    element.dataset.drag = hint.drag!.map((value) => value.toFixed(4)).join(",");
  }

  /** The element the hint's arrow is drawn in: one, above every sticker, taking no pointer. */
  private arrowElement(): HTMLDivElement {
    if (this.arrow !== null) return this.arrow;
    const element = document.createElement("div");
    element.dataset.hintArrow = "";
    element.setAttribute("aria-hidden", "true");
    Object.assign(element.style, { position: "absolute", pointerEvents: "none", zIndex: "100", visibility: "hidden" });
    this.pivot.append(element);
    this.arrow = element;
    return element;
  }

  /**
   * The arrow itself, `length` by `width` pixels on a cube 300 across: a dot
   * at its tail where the sticker is taken hold of, a shaft, and a head; two
   * heads for a half turn. Drawn in its colour with an edge round it, so it
   * shows on every sticker; where motion is welcome, a mark runs along it.
   */
  private drawArrow(element: HTMLDivElement, length: number, width: number, half: boolean): void {
    for (const running of element.getAnimations?.({ subtree: true }) ?? []) running.cancel();
    const unit = this.unit();
    const shaft = Math.min(width * 0.6, unit * (width > unit * 1.01 ? 0.3 : 0.2));
    const headWide = Math.min(width * 0.92, shaft * 3.2);
    const headLong = headWide * 0.72;
    const mid = width / 2;
    const edge = Math.max(1, unit * 0.035);
    Object.assign(element.style, { width: `${length}px`, height: `${width}px`, left: `${-length / 2}px`, top: `${-width / 2}px` });
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("width", String(length));
    svg.setAttribute("height", String(width));
    svg.setAttribute("viewBox", `0 0 ${length} ${width}`);
    svg.style.overflow = "visible";
    svg.style.display = "block";
    svg.style.opacity = "var(--kyuubu-hint-opacity, 0.96)";
    const heads = half ? [length, length - headLong * 0.78] : [length];
    const shapes = (): SVGElement[] => {
      const made: SVGElement[] = [];
      const dot = document.createElementNS(SVG, "circle");
      dot.setAttribute("cx", "0");
      dot.setAttribute("cy", String(mid));
      dot.setAttribute("r", String(shaft * 0.95));
      made.push(dot);
      const bar = document.createElementNS(SVG, "rect");
      bar.setAttribute("x", "0");
      bar.setAttribute("y", String(mid - shaft / 2));
      bar.setAttribute("width", String(Math.max(0, heads[heads.length - 1] - headLong * 0.9)));
      bar.setAttribute("height", String(shaft));
      made.push(bar);
      for (const tip of heads) {
        const head = document.createElementNS(SVG, "polygon");
        head.setAttribute("points", `${tip - headLong},${mid - headWide / 2} ${tip},${mid} ${tip - headLong},${mid + headWide / 2}`);
        made.push(head);
      }
      return made;
    };
    // The edge first, all of it, then the colour over it: one outline round the whole arrow.
    const outline = document.createElementNS(SVG, "g");
    outline.style.fill = "none";
    outline.style.stroke = `var(--kyuubu-hint-edge, ${HINT_EDGE})`;
    outline.style.strokeWidth = String(edge * 2);
    outline.style.strokeLinejoin = "round";
    outline.append(...shapes());
    const body = document.createElementNS(SVG, "g");
    body.style.fill = `var(--kyuubu-hint-colour, ${HINT_COLOUR})`;
    body.append(...shapes());
    svg.append(outline, body);
    const calm = this.host.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (!calm) {
      const runner = document.createElementNS(SVG, "circle");
      runner.setAttribute("cx", "0");
      runner.setAttribute("cy", String(mid));
      runner.setAttribute("r", String(shaft * 0.32));
      runner.style.fill = `var(--kyuubu-hint-edge, ${HINT_EDGE})`;
      svg.append(runner);
      runner.animate?.(
        [
          { transform: "translateX(0px)", opacity: 0 },
          { transform: `translateX(${(length - headLong) * 0.2}px)`, opacity: 1, offset: 0.2 },
          { transform: `translateX(${(length - headLong) * 0.85}px)`, opacity: 1, offset: 0.85 },
          { transform: `translateX(${length - headLong}px)`, opacity: 0 },
        ],
        { duration: 1400, iterations: Infinity, easing: "ease-in-out" },
      );
    }
    element.replaceChildren(svg);
  }

  private surface(slot: StickerSlot): Vec3 {
    const half = this.unit() / 2;
    return slot.centre.map((value, at) => (value + slot.normal[at]) * half) as unknown as Vec3;
  }

  private paint(): void {
    this.stickers.forEach((sticker, at) => {
      const letter = this.shown[at];
      // Only a sticker that changed colour is written: a quarter turn of a 7×7 moves 77 of its 294.
      if (sticker.dataset.face === letter && this.coloured) return;
      (sticker.firstChild as HTMLDivElement).style.background = this.colourOf(letter);
      sticker.dataset.face = letter;
    });
    this.coloured = true;
    this.root.dataset.state = this.shown;
  }

  private view(): Mat3 {
    return viewMatrix(this.yaw, this.pitch);
  }

  /** Fit the cube to its space and turn it the way it is looked at. */
  private look(): void {
    this.draw();
  }

  /**
   * Every element given its place on the screen: turned the way the cube is
   * looked at, and a turning layer's by how far it has gone. An element
   * facing away is hidden. While a layer turns, the cube is in pieces along
   * the axis (the turning layers and the still ones between them), each a
   * block whose faces never cover one another; the pieces are stacked so the
   * one nearer the eye is drawn over the one behind. Only the turning group
   * is redrawn when `turningOnly`, as each frame of a turn is.
   */
  private draw(turningOnly = false): void {
    const side = this.side;
    const scale = (side * this.options.fill) / (EDGE * Math.sqrt(3));
    const lens = Math.round(side * 3.2);
    const view = this.view();
    const spin = this.spin;
    const turned = spin === null ? view : multiply(view, rotation(spin.axis, spin.radians));
    const { slots } = cubeSlots(this.n);
    // The pieces a turn makes, numbered from the axis's negative side, and whether that side is the far one.
    const pieceOf: number[] = [];
    if (spin !== null && !spin.layers.has("all")) {
      for (let layer = 0, piece = 0; layer < this.n; layer += 1) {
        if (layer > 0 && spin.layers.has(layer) !== spin.layers.has(layer - 1)) piece += 1;
        pieceOf.push(piece);
      }
    }
    const pieces = pieceOf.length === 0 ? 1 : pieceOf[pieceOf.length - 1] + 1;
    const nearIsPositive = spin === null || apply(view, axisVector(spin.axis))[2] >= 0;
    const scaled = (m: Mat3, v: Vec3) => apply(m, v).map((value) => value * scale) as unknown as Vec3;
    const elements = turningOnly ? ([...this.turning.children] as HTMLElement[]) : [...this.places.keys()];
    for (const element of elements) {
      const place = this.places.get(element);
      if (place === undefined) continue;
      const m = element.parentElement === this.turning ? turned : view;
      const at = scaled(m, place.at);
      const out = apply(m, place.out);
      // Facing the eye, which sits `lens` pixels in front of the cube's centre.
      const facing = -out[0] * at[0] - out[1] * at[1] + out[2] * (lens - at[2]) > 1e-6;
      const transform = facing ? `perspective(${lens}px) ${placement(scaled(m, place.right), scaled(m, place.down), out, at)}` : (place.drawn?.transform ?? "");
      let z = "0";
      if (facing && spin !== null && pieces > 1) {
        const piece = pieceOf[place.slot === undefined ? place.layer! : layerOf(slots[place.slot].centre, spin.axis, this.n)];
        z = String(nearIsPositive ? piece : pieces - 1 - piece);
      }
      // Only what changed is written: most of a cube stands still through a turn, and a style written is work for the page.
      const was = place.drawn;
      if (was?.visible !== facing) element.style.visibility = facing ? "" : "hidden";
      if (was?.transform !== transform) element.style.transform = transform;
      if (was?.z !== z) element.style.zIndex = z;
      // A cube's corner is rounded only where it is on the outline: where all three faces that meet at it face the eye,
      // it is in the middle of the picture, and three rounded corners there would leave a hole to the felt behind.
      let round = "";
      if (facing && place.corners !== undefined && place.corners.length > 0) {
        const corner = this.corner();
        const radii = place.corners.map((one) => {
          const inside = one.vertex.every((sign, axis) => {
            const normal = [0, 0, 0] as [number, number, number];
            normal[axis] = sign;
            return apply(m, normal)[2] > 1e-6;
          });
          return inside ? "0px" : corner;
        });
        round = radii.join("|");
        if (was?.round !== round) place.corners.forEach((one, k) => (element.style[one.property] = radii[k]));
      }
      place.drawn = { transform, visible: facing, z, round: round || (was?.round ?? "") };
    }
    if (!turningOnly) this.drawHint(view, scale, lens);
  }

  /** The turning group turned this far about the spin's axis, and drawn. */
  private spinTo(radians: number): void {
    if (this.spin === null) return;
    this.spin = { ...this.spin, radians };
    this.draw(true);
  }

  /** How long a quarter turn takes now: no time at all on a device that asks for reduced motion. */
  private quarterMs(): number {
    const calm = this.host.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    return calm ? 0 : this.options.turnMs;
  }

  /** The stickers of one layer gathered into the turning group, with the plastic that fills the gap: what a turn and a drag both start with. */
  private lift(move: CubeMove, others: readonly CubeMove[] = []): { moving: number[]; covers: HTMLDivElement[] } {
    const { slots } = cubeSlots(this.n);
    const layers = new Set([move, ...others].map((one) => one.layer));
    const moving = slots.map((slot, at) => (layers.has("all") || layers.has(layerOf(slot.centre, move.axis, this.n)) ? at : -1)).filter((at) => at >= 0);
    for (const at of moving) this.turning.append(this.stickers[at]);
    const covers = this.covers(move, layers);
    this.spin = { axis: move.axis, radians: 0, layers };
    this.draw();
    return { moving, covers };
  }

  /** The turning group put back as it was, its stickers still again. */
  private lower(): void {
    for (const sticker of [...this.turning.children]) if ((sticker as HTMLElement).dataset.slot !== undefined) this.still.append(sticker);
    this.turning.replaceChildren();
    for (const cover of [...this.still.children]) if ((cover as HTMLElement).dataset.cover !== undefined) cover.remove();
    for (const element of [...this.places.keys()]) if (element.dataset.cover !== undefined) this.places.delete(element);
    this.spin = null;
    this.draw();
  }

  /** The pixels a pointer goes to drag a layer a quarter turn: seven tenths of the cube's edge as it is drawn. */
  private quarterPx(): number {
    return ((this.side * this.options.fill) / Math.sqrt(3)) * 0.7;
  }

  private commitAngle(): number {
    return Math.max(5, Math.min(85, this.options.commitAngle));
  }

  /** Whether the held layer is past the point of no return, said on the cube and shown on the layer. */
  private markCommitted(committed: boolean): void {
    this.root.dataset.committed = String(committed);
    if (this.drag === null) delete this.root.dataset.angle;
    for (const sticker of [...this.turning.children] as HTMLElement[]) {
      if (sticker.dataset.slot === undefined) continue;
      (sticker.firstChild as HTMLDivElement).style.filter = committed ? `var(--kyuubu-commit-filter, ${COMMIT_FILTER})` : "";
    }
  }

  /** A drag has picked its layer: every turn still on its way is finished at once, and the layer is lifted to follow the pointer. */
  private beginDrag(pick: DragPick, at: number): void {
    this.settleDrag();
    if (this.animating || this.queue.length > 0) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
    }
    this.lift({ axis: pick.axis, layer: pick.layer, turns: 1 });
    // Where the pointer went down counts as the first place the layer was: a flick is measured from there.
    this.drag = { pick, angle: 0, committed: false, samples: [{ at, angle: 0 }] };
    this.root.dataset.turning = "true";
    this.root.dataset.dragging = "true";
  }

  /** The held layer turned to where the pointer now has it. Nothing is a move yet. */
  private followDrag(angle: number, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    drag.angle = angle;
    this.root.dataset.angle = String(Math.round(angle));
    drag.samples.push({ at, angle });
    while (drag.samples.length > 1 && at - drag.samples[0].at > SPEED_WINDOW * 2) drag.samples.shift();
    this.spinTo((angle * Math.PI) / 180);
    const committed = pastCommit(angle, this.commitAngle());
    if (committed !== drag.committed) {
      drag.committed = committed;
      this.markCommitted(committed);
    }
  }

  /**
   * The pointer has let go, or the drag was given up: the layer snaps to the
   * nearest quarter turn the rules allow, or back, and only then, if it
   * turned, is it a move and told to `onTurn`.
   */
  private endDrag(released: boolean, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    this.drag = null;
    const since = drag.samples.find((sample) => at - sample.at <= SPEED_WINDOW);
    const speed = since === undefined ? 0 : (drag.angle - since.angle) / Math.max(at - since.at, 16);
    const quarters = released ? quartersForRelease(drag.angle, speed, this.commitAngle()) : 0;
    const move = moveForRelease(drag.pick, quarters);
    this.markCommitted(false);
    this.root.dataset.dragging = "false";
    const from = drag.angle;
    const to = quarters * 90;
    const duration = this.quarterMs() * (Math.abs(to - from) / 90) ** 0.6;
    this.animating = true;
    const finish = () => {
      cancelAnimationFrame(this.frame);
      this.finishSnap = null;
      this.lower();
      if (move !== null) {
        this.depth = 1;
        this.target = turnCube(this.target, this.n, move);
        this.shown = this.target;
        this.paint();
      }
      this.animating = false;
      this.root.dataset.turning = "false";
      if (move !== null) this.told(move);
    };
    this.finishSnap = finish;
    const started = performance.now();
    const step = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      this.spinTo(((from + (to - from) * eased) * Math.PI) / 180);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      finish();
      this.next();
    };
    this.frame = requestAnimationFrame(step);
  }

  /** Before anything else changes the cube: a layer still held is put back, and one still snapping is finished at once, its move made. */
  private settleDrag(): void {
    if (this.drag !== null) {
      this.drag = null;
      if (this.gesture !== null) this.gesture.done = true;
      this.markCommitted(false);
      this.root.dataset.dragging = "false";
      this.root.dataset.turning = "false";
      this.lower();
    }
    this.finishSnap?.();
  }

  private next(): void {
    let job = this.queue.shift();
    let move: CubeMove | undefined;
    let quarters = 0;
    let duration = 0;
    // A turn given no time at all (reduced motion, or turns set to take none) is made at once, with every one waiting
    // behind it that is given none either: nothing to see, so nothing to wait a frame of the screen for.
    let jumped = false;
    for (; job !== undefined; job = this.queue.shift()) {
      move = job.moves[0];
      quarters = move.turns === 3 ? -1 : move.turns;
      const calm = this.quarterMs() === 0 && this.options.turnMs !== 0;
      // Faster while turns are waiting behind this one, so a typed sequence never lags the hands; a turn given its own time keeps it.
      duration = job.ms !== undefined ? (calm ? 0 : job.ms) : (this.quarterMs() * Math.abs(quarters) ** 0.6) / (1 + this.queue.length);
      if (duration > 0) break;
      for (const one of job.moves) this.shown = turnCube(this.shown, this.n, one);
      jumped = true;
    }
    if (jumped) this.paint();
    if (job === undefined || move === undefined) {
      this.animating = false;
      this.root.dataset.turning = "false";
      return;
    }
    this.animating = true;
    this.root.dataset.turning = "true";
    this.lift(move, job.moves.slice(1));
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / Math.max(duration, 1));
      const eased = 1 - (1 - t) ** 3;
      this.spinTo((eased * quarters * Math.PI) / 2);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      for (const one of job.moves) this.shown = turnCube(this.shown, this.n, one);
      this.lower();
      this.paint();
      this.next();
    };
    this.frame = requestAnimationFrame(step);
  }

  private stopTurn(): void {
    cancelAnimationFrame(this.frame);
    this.animating = false;
    this.finishSnap = null;
    if (this.drag !== null) {
      this.drag = null;
      if (this.gesture !== null) this.gesture.done = true;
    }
    this.markCommitted(false);
    this.root.dataset.dragging = "false";
    this.root.dataset.turning = "false";
    this.lower();
  }

  /**
   * THE INSIDE OF THE CUBE, while a layer turns: a black square on each side
   * of the gap the turn opens, one turning and one still, so the reader sees
   * plastic where the layers part and never through the cube.
   */
  private covers(move: CubeMove, layers: ReadonlySet<number | "all"> = new Set([move.layer])): HTMLDivElement[] {
    if (layers.has("all")) return [];
    const unit = this.unit();
    const out = axisVector(move.axis);
    const frame = FACE_FRAMES[CUBE_FACE_ORDER.find((face) => FACE_FRAMES[face].normal[move.axis] === 1)!];
    const edges: number[] = [];
    // A gap opens wherever a turning layer meets a still one.
    for (let layer = 0; layer < this.n - 1; layer += 1) if (layers.has(layer) !== layers.has(layer + 1)) edges.push(2 * layer - this.n + 2);
    const made: HTMLDivElement[] = [];
    for (const edge of edges) {
      const below = (edge + this.n - 2) / 2;
      // One square closes the piece below the gap, facing up the axis, and one the piece above it, facing down.
      for (const [layer, facing] of [[below, 1], [below + 1, -1]] as const) {
        const group = layers.has(layer) ? this.turning : this.still;
        const cover = document.createElement("div");
        cover.dataset.cover = "";
        Object.assign(cover.style, {
          position: "absolute",
          width: `${EDGE}px`,
          height: `${EDGE}px`,
          left: `${-EDGE / 2}px`,
          top: `${-EDGE / 2}px`,
          background: this.plastic(),
          borderRadius: this.corner(),
          pointerEvents: "none",
        });
        this.places.set(cover, { right: frame.right, down: frame.down, out: out.map((value) => value * facing) as unknown as Vec3, at: out.map((value) => (value * edge * unit) / 2) as unknown as Vec3, layer });
        group.append(cover);
        made.push(cover);
      }
    }
    return made;
  }

  private slotAt(target: EventTarget | null): number | null {
    const sticker = (target as HTMLElement | null)?.closest?.("[data-slot]") as HTMLElement | null;
    return sticker === null || sticker === undefined || !this.root.contains(sticker) ? null : Number(sticker.dataset.slot);
  }

  private personTurns(move: CubeMove): void {
    this.depth = 1;
    this.turn(move, { report: true });
  }

  private bind<K extends keyof HTMLElementEventMap>(element: HTMLElement | Document, type: K, handler: (event: HTMLElementEventMap[K]) => void, passive = true): void {
    const listener = handler as EventListener;
    element.addEventListener(type, listener, { passive });
    this.cleanups.push(() => element.removeEventListener(type, listener));
  }

  private hands(): void {
    // A touch that begins on the cube is the cube's: Safari on a phone scrolls the page up and down, or zooms it on a
    // second tap, from such a touch unless the touch itself is refused, whatever `touch-action` says. The pointer events
    // a drag is read from still come. A touch beside the cube's element is the page's, as ever.
    const refuse = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    this.bind(this.root, "touchstart", refuse, false);
    this.bind(this.root, "touchmove", refuse, false);
    this.bind(this.root, "dblclick", (event) => event.preventDefault(), false);
    this.bind(this.root, "pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.root.setPointerCapture?.(event.pointerId);
      if (this.options.keyboard === "focus") this.root.focus({ preventScroll: true });
      const slot = this.options.interactive ? this.slotAt(event.target) : null;
      this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp, slot, done: false, yaw: this.yaw, pitch: this.pitch };
      this.root.style.cursor = "grabbing";
    });
    this.bind(this.root, "pointermove", (event) => {
      const gesture = this.gesture;
      if (gesture === null || gesture.id !== event.pointerId || gesture.done) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (gesture.slot === null) {
        this.setLook(gesture.yaw + dx * 0.45, gesture.pitch + dy * 0.45);
        return;
      }
      // A drag that wanders well off the cube's element is given up: the layer goes back.
      const box = this.root.getBoundingClientRect();
      const room = Math.max(DRAG_LEAVE_LEAST, Math.min(box.width, box.height) * DRAG_LEAVE);
      if (event.clientX < box.left - room || event.clientX > box.right + room || event.clientY < box.top - room || event.clientY > box.bottom + room) {
        gesture.done = true;
        this.endDrag(false, event.timeStamp);
        return;
      }
      if (this.drag === null) {
        // The layer is picked once, where the drag can be told, and stays picked: the angle is counted from where the pointer went down.
        const pick = pickDrag(cubeSlots(this.n).slots[gesture.slot], this.n, this.view(), dx, dy);
        if (pick === null) return;
        this.beginDrag(pick, gesture.at);
      }
      if (this.drag !== null) this.followDrag(dragAngle(this.drag.pick, dx, dy, this.quarterPx()), event.timeStamp);
    });
    const end = (released: boolean) => (event: PointerEvent) => {
      if (this.gesture?.id !== event.pointerId) return;
      this.gesture = null;
      this.endDrag(released, event.timeStamp);
      this.root.style.cursor = this.options.interactive ? "grab" : "default";
    };
    this.bind(this.root, "pointerup", end(true));
    this.bind(this.root, "pointercancel", end(false));
    // Escape gives a held layer up, wherever the keys are listened for.
    this.bind(this.host.ownerDocument, "keydown", (event) => {
      if (event.key !== "Escape" || this.drag === null) return;
      if (this.gesture !== null) this.gesture.done = true;
      this.endDrag(false, event.timeStamp);
    });
    this.bind(
      this.root,
      "wheel",
      (event) => {
        event.preventDefault();
        const delta = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 400 : 1);
        const slot = this.options.interactive ? this.slotAt(event.target) : null;
        if (slot === null) {
          if (event.ctrlKey) this.setLook(this.yaw, this.pitch + delta * 0.25);
          else this.setLook(this.yaw + delta * 0.25, this.pitch);
          return;
        }
        this.wheelSum += delta;
        if (Math.abs(this.wheelSum) < WHEEL_STEP) return;
        const down = this.wheelSum > 0;
        this.wheelSum = 0;
        // A wheel that spins freely would queue turns for seconds; two waiting is enough.
        if (this.queue.length >= 2) return;
        const way = event.shiftKey ? "face" : event.ctrlKey ? "upDown" : "across";
        this.personTurns(moveForWheel(cubeSlots(this.n).slots[slot], this.n, this.view(), way, down));
      },
      false,
    );
    if (this.options.keyboard === "none") return;
    if (this.options.keyboard === "focus") this.root.tabIndex = 0;
    const keysOn: HTMLElement | Document = this.options.keyboard === "page" ? document : this.root;
    this.bind(
      keysOn,
      "keydown",
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const from = event.target as HTMLElement | null;
        if (from !== null && from !== this.root && (from.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(from.tagName))) return;
        const looks: Record<string, [number, number]> = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -15], ArrowDown: [0, 15] };
        if (looks[event.key] !== undefined) {
          event.preventDefault();
          this.setLook(this.yaw + looks[event.key][0], this.pitch + looks[event.key][1]);
          return;
        }
        if (!this.options.interactive) return;
        const read = readKey(event.key, event.shiftKey, this.n, this.depth);
        if (read === null) return;
        event.preventDefault();
        if ("depth" in read) this.depth = read.depth;
        else this.personTurns(read.move);
      },
      false,
    );
  }
}
