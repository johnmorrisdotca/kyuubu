import { CUBE_FACE_ORDER, FACE_FRAMES, cubeSlots, faceOfNormal, layerOf, solvedCube, turnCube, type CubeFace } from "../cube.ts";
import { WORDS, fill, languageOf, type KyuubuLanguage } from "../words.ts";
import type { CubeAxis, CubeMove, StickerSlot, Vec3 } from "../types.ts";

import { apply, axisVector, multiply, placement, rotation, viewMatrix, type Mat3 } from "./geometry.ts";
import { COMMIT_ANGLE, dragAngle, moveForRelease, moveForWheel, pastCommit, pickDrag, quartersForRelease, type DragPick } from "./gestures.ts";
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
  /** The language of the cube's accessible name: English or Japanese. Left out, it follows the page's `lang`. */
  locale?: KyuubuLanguage;
  /** Whether a person can turn it. A look-only cube still turns when asked (`turn`). */
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

type LiveDrag = { pick: DragPick; angle: number; committed: boolean; samples: { at: number; angle: number }[] };

/** One step of the queue: a turn, or several layers about one axis turned as one (a wide turn), and how long it should take when that was asked for. */
type Queued = { moves: CubeMove[]; report: boolean; ms?: number };
/** Where an element sits on the cube, before the cube is turned to be looked at: its own x, y and z as model vectors, its centre in pixels, and, for the plastic across a turning gap, the layer it closes. */
type Placed = { right: Vec3; down: Vec3; out: Vec3; at: Vec3; slot?: number; layer?: number };
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
  private options: Required<Omit<CubeViewOptions, "state" | "onTurn" | "onLook" | "colours" | "plastic" | "theme" | "label" | "locale">> & Pick<CubeViewOptions, "onTurn" | "onLook" | "label">;
  private theme: { colours: Partial<Record<CubeFace, string>>; plastic?: string; stickerInset?: string; stickerRadius?: string };
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
  private readonly resize: ResizeObserver | null;
  private readonly cleanups: (() => void)[] = [];

  constructor(host: HTMLElement, options: CubeViewOptions) {
    this.host = host;
    this.options = {
      interactive: true,
      keyboard: "focus",
      turnMs: 160,
      commitAngle: COMMIT_ANGLE,
      yaw: -35,
      pitch: 28,
      fill: 0.9,
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

    this.build();
    this.look();
    this.resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.look());
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
    this.listen();
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
    for (const sticker of this.stickers) {
      sticker.style.background = plastic;
      const face = sticker.firstChild as HTMLDivElement;
      face.style.inset = this.theme.stickerInset ?? "var(--kyuubu-sticker-inset, 6%)";
      face.style.borderRadius = this.theme.stickerRadius ?? "var(--kyuubu-sticker-radius, 14%)";
    }
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
      this.root.setAttribute("aria-label", this.label());
      this.build();
    }
    this.paint();
  }

  /** Turn a layer, animated after any turns already on their way. Told to `onTurn` only when `report` says so. */
  turn(move: CubeMove, { report = false, animate = true }: { report?: boolean; animate?: boolean } = {}): void {
    this.settleDrag();
    this.target = turnCube(this.target, this.n, move);
    if (report) this.options.onTurn?.(move, this.target);
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
    this.paint();
    this.draw();
  }

  private surface(slot: StickerSlot): Vec3 {
    const half = this.unit() / 2;
    return slot.centre.map((value, at) => (value + slot.normal[at]) * half) as unknown as Vec3;
  }

  private paint(): void {
    this.stickers.forEach((sticker, at) => {
      const letter = this.shown[at];
      (sticker.firstChild as HTMLDivElement).style.background = this.colourOf(letter);
      sticker.dataset.face = letter;
    });
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
    const side = Math.min(this.host.clientWidth || EDGE * 1.8, this.host.clientHeight || this.host.clientWidth || EDGE * 1.8);
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
      element.style.visibility = facing ? "" : "hidden";
      if (!facing) continue;
      element.style.transform = `perspective(${lens}px) ${placement(scaled(m, place.right), scaled(m, place.down), out, at)}`;
      if (spin === null || pieces === 1) {
        element.style.zIndex = "0";
        continue;
      }
      const layer = place.slot === undefined ? place.layer! : layerOf(slots[place.slot].centre, spin.axis, this.n);
      const piece = pieceOf[layer];
      element.style.zIndex = String(nearIsPositive ? piece : pieces - 1 - piece);
    }
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
    const side = Math.min(this.host.clientWidth || EDGE * 1.8, this.host.clientHeight || this.host.clientWidth || EDGE * 1.8);
    return ((side * this.options.fill) / Math.sqrt(3)) * 0.7;
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
      if (move !== null) this.options.onTurn?.(move, this.target);
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
    const job = this.queue.shift();
    if (job === undefined) {
      this.animating = false;
      this.root.dataset.turning = "false";
      return;
    }
    this.animating = true;
    this.root.dataset.turning = "true";
    const move = job.moves[0];
    this.lift(move, job.moves.slice(1));
    const quarters = move.turns === 3 ? -1 : move.turns;
    const calm = this.quarterMs() === 0 && this.options.turnMs !== 0;
    // Faster while turns are waiting behind this one, so a typed sequence never lags the hands; a turn given its own time keeps it.
    const duration = job.ms !== undefined ? (calm ? 0 : job.ms) : (this.quarterMs() * Math.abs(quarters) ** 0.6) / (1 + this.queue.length);
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

  private on<K extends keyof HTMLElementEventMap>(element: HTMLElement | Document, type: K, handler: (event: HTMLElementEventMap[K]) => void, passive = true): void {
    const listener = handler as EventListener;
    element.addEventListener(type, listener, { passive });
    this.cleanups.push(() => element.removeEventListener(type, listener));
  }

  private listen(): void {
    // A touch that begins on the cube is the cube's: Safari on a phone scrolls the page up and down, or zooms it on a
    // second tap, from such a touch unless the touch itself is refused, whatever `touch-action` says. The pointer events
    // a drag is read from still come. A touch beside the cube's element is the page's, as ever.
    const refuse = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    this.on(this.root, "touchstart", refuse, false);
    this.on(this.root, "touchmove", refuse, false);
    this.on(this.root, "dblclick", (event) => event.preventDefault(), false);
    this.on(this.root, "pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.root.setPointerCapture?.(event.pointerId);
      if (this.options.keyboard === "focus") this.root.focus({ preventScroll: true });
      const slot = this.options.interactive ? this.slotAt(event.target) : null;
      this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp, slot, done: false, yaw: this.yaw, pitch: this.pitch };
      this.root.style.cursor = "grabbing";
    });
    this.on(this.root, "pointermove", (event) => {
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
    this.on(this.root, "pointerup", end(true));
    this.on(this.root, "pointercancel", end(false));
    // Escape gives a held layer up, wherever the keys are listened for.
    this.on(this.host.ownerDocument, "keydown", (event) => {
      if (event.key !== "Escape" || this.drag === null) return;
      if (this.gesture !== null) this.gesture.done = true;
      this.endDrag(false, event.timeStamp);
    });
    this.on(
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
    this.on(
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
