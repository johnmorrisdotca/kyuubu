import { CUBE_FACE_ORDER, FACE_FRAMES, cubeSlots, faceOfNormal, layerOf, solvedCube, turnCube, type CubeFace } from "../cube.ts";
import { WORDS, fill, languageOf, type KyuubuLanguage } from "../words.ts";
import type { CubeMove, StickerSlot, Vec3 } from "../types.ts";

import { axisVector, cssMatrix, placement, rotation, viewMatrix, type Mat3 } from "./geometry.ts";
import { moveForDrag, moveForWheel } from "./gestures.ts";
import { readKey } from "./keys.ts";

/**
 * THE CUBE ON THE SCREEN, in plain DOM and CSS 3D: no canvas, no WebGL, no
 * framework. A sticker is a square element placed in 3D with a `matrix3d`;
 * a turn gathers the stickers of its layer into a group and turns the group,
 * then puts every colour where it landed and the group back as it was.
 *
 * Every hand does something:
 * - drag a sticker across the cube to turn the layer that carries it that way;
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
  /** How long a quarter turn takes, in milliseconds. */
  turnMs?: number;
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
const DRAG_START = 9;
const WHEEL_STEP = 60;

type Queued = { move: CubeMove; report: boolean };

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
  private queue: Queued[] = [];
  private animating = false;
  private frame = 0;
  private depth = 1;
  private wheelSum = 0;
  private gesture: { id: number; x: number; y: number; slot: number | null; done: boolean; yaw: number; pitch: number } | null = null;
  private readonly resize: ResizeObserver | null;
  private readonly cleanups: (() => void)[] = [];

  constructor(host: HTMLElement, options: CubeViewOptions) {
    this.host = host;
    this.options = {
      interactive: true,
      keyboard: "focus",
      turnMs: 160,
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
    Object.assign(this.root.style, { position: "absolute", inset: "0", touchAction: "none", userSelect: "none", outline: "none", overflow: "hidden", cursor: "grab" });
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
    this.target = turnCube(this.target, this.n, move);
    if (report) this.options.onTurn?.(move, this.target);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ move, report });
    if (!this.animating) this.next();
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
    Object.assign(div.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d" });
    return div;
  }

  private unit(): number {
    return EDGE / this.n;
  }

  /** Every sticker, placed once; a turn only moves them in groups and repaints them. */
  private build(): void {
    this.still.replaceChildren();
    this.turning.replaceChildren();
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
        backfaceVisibility: "hidden",
        transform: placement(frame.right, frame.down, frame.normal, this.surface(slot)),
      });
      const face = document.createElement("div");
      Object.assign(face.style, { position: "absolute", pointerEvents: "none" });
      sticker.append(face);
      this.still.append(sticker);
      return sticker;
    });
    this.dress();
    this.paint();
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
    const side = Math.min(this.host.clientWidth || EDGE * 1.8, this.host.clientHeight || this.host.clientWidth || EDGE * 1.8);
    const scale = (side * this.options.fill) / (EDGE * Math.sqrt(3));
    this.root.style.perspective = `${Math.round(side * 3.2)}px`;
    this.pivot.style.transform = cssMatrix(this.view(), scale);
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
    const { move } = job;
    const { slots } = cubeSlots(this.n);
    const moving = slots.map((slot, at) => (move.layer === "all" || layerOf(slot.centre, move.axis, this.n) === move.layer ? at : -1)).filter((at) => at >= 0);
    for (const at of moving) this.turning.append(this.stickers[at]);
    const covers = this.covers(move);
    const quarters = move.turns === 3 ? -1 : move.turns;
    // Faster while turns are waiting behind this one, so a typed sequence never lags the hands.
    const duration = (this.options.turnMs * Math.abs(quarters) ** 0.6) / (1 + this.queue.length);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / Math.max(duration, 1));
      const eased = 1 - (1 - t) ** 3;
      this.turning.style.transform = cssMatrix(rotation(move.axis, (eased * quarters * Math.PI) / 2));
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      this.shown = turnCube(this.shown, this.n, move);
      this.turning.style.transform = "";
      for (const at of moving) this.still.append(this.stickers[at]);
      for (const cover of covers) cover.remove();
      this.paint();
      this.next();
    };
    this.frame = requestAnimationFrame(step);
  }

  private stopTurn(): void {
    cancelAnimationFrame(this.frame);
    this.animating = false;
    this.root.dataset.turning = "false";
    this.turning.style.transform = "";
    for (const sticker of [...this.turning.children]) if ((sticker as HTMLElement).dataset.slot !== undefined) this.still.append(sticker);
    this.turning.replaceChildren();
    for (const cover of [...this.still.children]) if ((cover as HTMLElement).dataset.cover !== undefined) cover.remove();
  }

  /**
   * THE INSIDE OF THE CUBE, while a layer turns: a black square on each side
   * of the gap the turn opens, one turning and one still, so the reader sees
   * plastic where the layers part and never through the cube.
   */
  private covers(move: CubeMove): HTMLDivElement[] {
    if (move.layer === "all") return [];
    const unit = this.unit();
    const out = axisVector(move.axis);
    const frame = FACE_FRAMES[CUBE_FACE_ORDER.find((face) => FACE_FRAMES[face].normal[move.axis] === 1)!];
    const edges: number[] = [];
    if (move.layer > 0) edges.push(2 * move.layer - this.n);
    if (move.layer < this.n - 1) edges.push(2 * move.layer - this.n + 2);
    const made: HTMLDivElement[] = [];
    for (const edge of edges) {
      for (const group of [this.still, this.turning]) {
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
          transform: placement(frame.right, frame.down, out, out.map((value) => (value * edge * unit) / 2) as unknown as Vec3),
        });
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
    this.on(this.root, "pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      this.root.setPointerCapture?.(event.pointerId);
      if (this.options.keyboard === "focus") this.root.focus({ preventScroll: true });
      const slot = this.options.interactive ? this.slotAt(event.target) : null;
      this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, slot, done: false, yaw: this.yaw, pitch: this.pitch };
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
      if (Math.hypot(dx, dy) < DRAG_START) return;
      gesture.done = true;
      this.personTurns(moveForDrag(cubeSlots(this.n).slots[gesture.slot], this.n, this.view(), dx, dy));
    });
    const end = (event: PointerEvent) => {
      if (this.gesture?.id !== event.pointerId) return;
      this.gesture = null;
      this.root.style.cursor = this.options.interactive ? "grab" : "default";
    };
    this.on(this.root, "pointerup", end);
    this.on(this.root, "pointercancel", end);
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
