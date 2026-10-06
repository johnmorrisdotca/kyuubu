import { CUBE_FACE_ORDER, FACE_FRAMES, faceOfNormal } from "../cube.ts";
import type { CubeAxis, StickerSlot, Vec3 } from "../types.ts";
import { COMMIT_ANGLE } from "../view/gestures.ts";
import { apply, axisVector, multiply, placement, rotation, viewMatrix, type Mat3 } from "../view/geometry.ts";
import { DEFAULT_COLOURS, FACE_PROPERTIES, DEFAULT_PLASTIC, type CubeTheme } from "../view/view.ts";
import { fill, languageOf, type KyuubuLanguage } from "../words.ts";
import type { CubeFace } from "../cube.ts";

import { cuboidDragAngle, cuboidMoveForRelease, cuboidPastCommit, cuboidQuartersForRelease, pickCuboidDrag, readCuboidKey, type CuboidDragPick } from "./gestures.ts";
import { cuboidFaces, cuboidLayerOf, cuboidMoveLegal, cuboidName, cuboidSlots, isCuboidDims, solvedCuboid, turnCuboid, type CuboidDims, type CuboidMove } from "./model.ts";
import { CUBOID_WORDS } from "./words.ts";

/**
 * THE CUBOID ON THE SCREEN, drawn the way the cube is (`view/view.ts`): in
 * plain DOM and CSS with no canvas and no WebGL, a sticker a square element
 * given its whole place on the screen in one `matrix3d`, nothing nested in 3D,
 * so no browser can draw it flat. The sticker's size is one for every side:
 * the longest side of the puzzle is as long as a 3×3 is, so a cuboid is a cube
 * with some of it taken away, not a smaller picture.
 *
 * Every hand does what it does on a cube, with the cuboid's rule on top:
 * - drag a sticker and the layer that carries it that way turns with the
 *   pointer; a layer whose slice is not square follows to a half turn and no
 *   less, and snaps back if it is let go before the middle of the way;
 * - drag the space round it to turn the whole puzzle and look at it;
 * - keys in cubers' notation, which on a layer that only half turns turn it a
 *   half; the arrows look round it. The wheel over the puzzle looks round it.
 */

/** Everything a cuboid on the screen can be told when it is made. Only `dims` is needed. */
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

/** What a cuboid tells the listeners `on` adds: a turn a person made, with the stickers after it; and the view turned, in degrees. */
export type CuboidViewEvents = {
  turn: (move: CuboidMove, state: string) => void;
  look: (yaw: number, pitch: number) => void;
};

const EDGE = 300;
const DRAG_LEAVE = 0.25;
const DRAG_LEAVE_LEAST = 32;
const SPEED_WINDOW = 100;
const COMMIT_FILTER = "brightness(1.14)";

type RoundCorner = { property: "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius"; vertex: Vec3 };
type Placed = { right: Vec3; down: Vec3; out: Vec3; at: Vec3; slot?: number; layer?: number; corners?: RoundCorner[]; drawn?: { transform: string; visible: boolean; z: string; round: string } };
type Spin = { axis: CubeAxis; radians: number; layer: number };
type Queued = { move: CuboidMove; report: boolean; ms?: number };
type LiveDrag = { pick: CuboidDragPick; angle: number; committed: boolean; samples: { at: number; angle: number }[] };

/**
 * A cuboid on the screen. `new CuboidView(element, { dims: [2, 3, 3] })` draws
 * it in the element, which it fills, so the element needs a size; `destroy()`
 * takes it away again with every listener. A turn the puzzle cannot make
 * throws a `RangeError`, as `turnCuboid` does.
 *
 * @example
 * const view = new CuboidView(document.getElementById("puzzle"), { dims: [3, 3, 1], onTurn: (move, state) => save(state) });
 * view.turn(parseCuboidMove("U2", [3, 3, 1])!);
 */
export class CuboidView {
  /** The element the puzzle was made in. */
  readonly host: HTMLElement;
  private options: Required<Pick<CuboidViewOptions, "interactive" | "keyboard" | "turnMs" | "commitAngle" | "fill" | "rounded">> & Pick<CuboidViewOptions, "onTurn" | "onLook" | "label">;
  private theme: { colours: Partial<Record<CubeFace, string>>; plastic?: string; stickerInset?: string; stickerRadius?: string; cornerRadius?: string };
  private readonly listeners: { turn: Set<CuboidViewEvents["turn"]>; look: Set<CuboidViewEvents["look"]> } = { turn: new Set(), look: new Set() };
  private language: KyuubuLanguage;
  private sides: CuboidDims;
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
  private gesture: { id: number; x: number; y: number; at: number; slot: number | null; done: boolean; yaw: number; pitch: number } | null = null;
  private drag: LiveDrag | null = null;
  private finishSnap: (() => void) | null = null;
  private readonly resize: ResizeObserver | null;
  private side = 0;
  private coloured = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(host: HTMLElement, options: CuboidViewOptions) {
    if (!isCuboidDims(options.dims)) throw new RangeError("A cuboid has three sides, each a whole number from 1 to 7, and is not 1×1×1");
    this.host = host;
    this.options = {
      interactive: options.interactive ?? true,
      keyboard: options.keyboard ?? "focus",
      turnMs: options.turnMs ?? 160,
      commitAngle: options.commitAngle ?? COMMIT_ANGLE,
      fill: options.fill ?? 0.9,
      rounded: options.rounded ?? true,
      onTurn: options.onTurn,
      onLook: options.onLook,
      label: options.label,
    };
    const given = <T extends object>(from: T | undefined) => Object.fromEntries(Object.entries(from ?? {}).filter(([, value]) => value !== undefined)) as Partial<T>;
    this.theme = {
      ...given(options.theme),
      colours: { ...given(options.theme?.colours), ...given(options.colours) },
      ...(options.plastic === undefined ? {} : { plastic: options.plastic }),
    };
    this.language = options.locale ?? languageOf(host.ownerDocument?.documentElement?.lang);
    this.sides = options.dims;
    this.target = options.state ?? solvedCuboid(this.sides);
    this.shown = this.target;
    this.yaw = options.yaw ?? -35;
    this.pitch = options.pitch ?? 28;

    this.root = document.createElement("div");
    this.root.setAttribute("role", "application");
    this.root.setAttribute("aria-label", this.label());
    this.root.dataset.kyuubuCuboid = "";
    this.root.dataset.dims = cuboidName(this.sides);
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
    this.measureSide();
    this.build();
    this.resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            this.measureSide();
            this.draw();
          });
    this.resize?.observe(host);
    // Safari on a phone can let go of the 3D layers of a puzzle that is out of sight: building them again as it returns is nothing a person can see.
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

  /** The puzzle's width, height and depth. */
  get dims(): CuboidDims {
    return this.sides;
  }

  /** Whether a turn is on its way or a layer is held. */
  get busy(): boolean {
    return this.animating || this.queue.length > 0 || this.drag !== null;
  }

  /** The way the puzzle is looked at now, in degrees. */
  get looking(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  /** Change how the puzzle looks, at once and without redrawing it. What is left out of `theme` stays as it is. */
  setTheme(theme: CubeTheme): void {
    const defined = Object.fromEntries(Object.entries(theme).filter(([key, value]) => value !== undefined && key !== "colours"));
    const colours = Object.fromEntries(Object.entries(theme.colours ?? {}).filter(([, value]) => value !== undefined));
    this.theme = { ...this.theme, ...defined, colours: { ...this.theme.colours, ...colours } };
    this.dress();
    this.coloured = false;
    this.paint();
  }

  /** The language of the puzzle's accessible name. A `label` given when it was made is left as it is. */
  setLocale(locale: KyuubuLanguage): void {
    this.language = locale;
    this.root.setAttribute("aria-label", this.label());
  }

  /** Whether a person can turn it now. */
  setInteractive(interactive: boolean): void {
    this.options.interactive = interactive;
    this.root.style.cursor = interactive ? "grab" : "default";
  }

  /** How long a quarter turn takes, in milliseconds, from now on. */
  setTurnMs(ms: number): void {
    this.options.turnMs = Math.max(0, ms);
  }

  private label(): string {
    return this.options.label ?? fill(CUBOID_WORDS[this.language].cuboidLabel, { dims: cuboidName(this.sides) });
  }

  private plastic(): string {
    return this.theme.plastic ?? `var(--kyuubu-plastic, ${DEFAULT_PLASTIC})`;
  }

  private colourOf(letter: string): string {
    if (!(letter in DEFAULT_COLOURS)) return this.plastic();
    const face = letter as CubeFace;
    return this.theme.colours[face] ?? `var(${FACE_PROPERTIES[face]}, ${DEFAULT_COLOURS[face]})`;
  }

  /** One cubie's edge as it is drawn: the longest side of the puzzle is `EDGE`, as a cube's is. */
  private unit(): number {
    return EDGE / Math.max(...this.sides);
  }

  /** How round the puzzle's corners are drawn: never more than nearly half a sticker, and nothing when it is not rounded. */
  private corner(): string {
    if (!this.options.rounded) return "";
    return `min(${this.theme.cornerRadius ?? "var(--kyuubu-corner-radius, 15px)"}, ${Math.round(this.unit() * 0.45)}px)`;
  }

  private layer(): HTMLDivElement {
    const div = document.createElement("div");
    Object.assign(div.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0" });
    return div;
  }

  private measureSide(): void {
    const fallback = EDGE * 1.8;
    this.side = Math.min(this.host.clientWidth || fallback, this.host.clientHeight || this.host.clientWidth || fallback);
  }

  private surface(slot: StickerSlot): Vec3 {
    const half = this.unit() / 2;
    return slot.centre.map((value, at) => (value + slot.normal[at]) * half) as unknown as Vec3;
  }

  /** Every sticker, placed once; a turn only moves them in groups and repaints them. */
  private build(): void {
    this.still.replaceChildren();
    this.turning.replaceChildren();
    this.places.clear();
    const unit = this.unit();
    const { slots } = cuboidSlots(this.sides);
    this.stickers = slots.map((slot, at) => {
      const frame = FACE_FRAMES[faceOfNormal(slot.normal)];
      const sticker = document.createElement("div");
      sticker.dataset.slot = String(at);
      Object.assign(sticker.style, { position: "absolute", width: `${unit}px`, height: `${unit}px`, left: `${-unit / 2}px`, top: `${-unit / 2}px` });
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

  /** The plastic and the shape of every sticker, as the theme has them now. */
  private dress(): void {
    const plastic = this.plastic();
    const corner = this.corner();
    const { slots } = cuboidSlots(this.sides);
    const faces = new Map(cuboidFaces(this.sides).map((one) => [one.face, one]));
    for (const sticker of this.stickers) {
      sticker.style.background = plastic;
      const slot = slots[Number(sticker.dataset.slot)];
      const face = faceOfNormal(slot.normal);
      const frame = FACE_FRAMES[face];
      const { cols, rows } = faces.get(face)!;
      const col = (frame.right.reduce((sum, value, k) => sum + value * slot.centre[k], 0) + cols - 1) / 2;
      const row = (frame.down.reduce((sum, value, k) => sum + value * slot.centre[k], 0) + rows - 1) / 2;
      // A corner of a face that is a corner of the puzzle is rounded where it is on the outline (`draw` decides).
      const corners: RoundCorner[] = [];
      const at = (across: number, down: number): Vec3 => frame.normal.map((value, k) => value + across * frame.right[k] + down * frame.down[k]) as unknown as Vec3;
      if (row === 0 && col === 0) corners.push({ property: "borderTopLeftRadius", vertex: at(-1, -1) });
      if (row === 0 && col === cols - 1) corners.push({ property: "borderTopRightRadius", vertex: at(1, -1) });
      if (row === rows - 1 && col === 0) corners.push({ property: "borderBottomLeftRadius", vertex: at(-1, 1) });
      if (row === rows - 1 && col === cols - 1) corners.push({ property: "borderBottomRightRadius", vertex: at(1, 1) });
      for (const property of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"] as const) sticker.style[property] = "";
      const place = this.places.get(sticker);
      if (place !== undefined) {
        place.corners = corner === "" ? [] : corners;
        if (place.drawn !== undefined) place.drawn = { ...place.drawn, round: "" };
      }
      const inner = sticker.firstChild as HTMLDivElement;
      inner.style.inset = this.theme.stickerInset ?? "var(--kyuubu-sticker-inset, 6%)";
      inner.style.borderRadius = this.theme.stickerRadius ?? "var(--kyuubu-sticker-radius, 14%)";
    }
  }

  private paint(): void {
    this.stickers.forEach((sticker, at) => {
      const letter = this.shown[at];
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

  /**
   * Every element given its place on the screen: turned the way the puzzle is
   * looked at, and a turning layer's by how far it has gone. An element facing
   * away is hidden. While a layer turns, the puzzle is in up to three pieces
   * along its axis (below the layer, the layer, above it), each a block whose
   * faces never cover one another; the one nearer the eye is drawn over the
   * one behind. Only the turning group is redrawn when `turningOnly`.
   */
  private draw(turningOnly = false): void {
    const side = this.side;
    const [dx, dy, dz] = this.sides;
    const scale = (side * this.options.fill) / (this.unit() * Math.sqrt(dx * dx + dy * dy + dz * dz));
    const lens = Math.round(side * 3.2);
    const view = this.view();
    const spin = this.spin;
    const turned = spin === null ? view : multiply(view, rotation(spin.axis, spin.radians));
    const { slots } = cuboidSlots(this.sides);
    const nearIsPositive = spin === null || apply(view, axisVector(spin.axis))[2] >= 0;
    const pieceOf = (layer: number) => (spin === null ? 0 : layer < spin.layer ? 0 : layer === spin.layer ? 1 : 2);
    const scaled = (m: Mat3, v: Vec3) => apply(m, v).map((value) => value * scale) as unknown as Vec3;
    const elements = turningOnly ? ([...this.turning.children] as HTMLElement[]) : [...this.places.keys()];
    for (const element of elements) {
      const place = this.places.get(element);
      if (place === undefined) continue;
      const m = element.parentElement === this.turning ? turned : view;
      const at = scaled(m, place.at);
      const out = apply(m, place.out);
      // Facing the eye, which sits `lens` pixels in front of the puzzle's centre.
      const facing = -out[0] * at[0] - out[1] * at[1] + out[2] * (lens - at[2]) > 1e-6;
      const transform = facing ? `perspective(${lens}px) ${placement(scaled(m, place.right), scaled(m, place.down), out, at)}` : (place.drawn?.transform ?? "");
      let z = "0";
      if (facing && spin !== null) {
        const piece = pieceOf(place.slot === undefined ? place.layer! : cuboidLayerOf(slots[place.slot].centre, spin.axis, this.sides));
        z = String(nearIsPositive ? piece : 2 - piece);
      }
      const was = place.drawn;
      if (was?.visible !== facing) element.style.visibility = facing ? "" : "hidden";
      if (was?.transform !== transform) element.style.transform = transform;
      if (was?.z !== z) element.style.zIndex = z;
      // A corner is rounded only where it is on the outline: where all three faces that meet at it face the eye it is in the middle of the picture.
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
  }

  private spinTo(radians: number): void {
    if (this.spin === null) return;
    this.spin = { ...this.spin, radians };
    this.draw(true);
  }

  private quarterMs(): number {
    const calm = this.host.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    return calm ? 0 : this.options.turnMs;
  }

  /** The stickers of one layer gathered into the turning group, with the plastic that fills the gap: what a turn and a drag both start with. */
  private lift(axis: CubeAxis, layer: number): void {
    const { slots } = cuboidSlots(this.sides);
    slots.forEach((slot, at) => {
      if (cuboidLayerOf(slot.centre, axis, this.sides) === layer) this.turning.append(this.stickers[at]);
    });
    this.covers(axis, layer);
    this.spin = { axis, radians: 0, layer };
    this.draw();
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

  /**
   * THE INSIDE OF THE PUZZLE, while a layer turns: a black rectangle on each
   * side of each gap the turn opens, one turning and one still, as long and as
   * wide as the slice, so the reader sees plastic where the layers part and
   * never through the puzzle.
   */
  private covers(axis: CubeAxis, layer: number): void {
    const unit = this.unit();
    const depth = this.sides[axis];
    const out = axisVector(axis);
    const frame = FACE_FRAMES[CUBE_FACE_ORDER.find((face) => FACE_FRAMES[face].normal[axis] === 1)!];
    const across = (vector: Vec3) => this.sides[vector[0] !== 0 ? 0 : vector[1] !== 0 ? 1 : 2] * unit;
    const edges: number[] = [];
    // A gap opens wherever the turning layer meets a still one.
    for (const below of [layer - 1, layer]) if (below >= 0 && below < depth - 1) edges.push(below);
    for (const below of edges) {
      const edge = 2 * below - depth + 2;
      for (const [one, facing] of [[below, 1], [below + 1, -1]] as const) {
        const cover = document.createElement("div");
        cover.dataset.cover = "";
        Object.assign(cover.style, {
          position: "absolute",
          width: `${across(frame.right)}px`,
          height: `${across(frame.down)}px`,
          left: `${-across(frame.right) / 2}px`,
          top: `${-across(frame.down) / 2}px`,
          background: this.plastic(),
          borderRadius: this.corner(),
          pointerEvents: "none",
        });
        this.places.set(cover, { right: frame.right, down: frame.down, out: out.map((value) => value * facing) as unknown as Vec3, at: out.map((value) => (value * edge * unit) / 2) as unknown as Vec3, layer: one });
        (one === layer ? this.turning : this.still).append(cover);
      }
    }
  }

  /** Put the stickers as given, at once, dropping any turn still to come. Another `dims` draws another puzzle. */
  setState(state: string, dims: CuboidDims = this.sides): void {
    this.settleDrag();
    this.queue = [];
    this.stopTurn();
    this.target = state;
    this.shown = state;
    if (dims.some((side, at) => side !== this.sides[at])) {
      if (!isCuboidDims(dims)) throw new RangeError("A cuboid has three sides, each a whole number from 1 to 7, and is not 1×1×1");
      this.sides = dims;
      this.root.setAttribute("aria-label", this.label());
      this.root.dataset.dims = cuboidName(dims);
      this.build();
    }
    this.paint();
  }

  /** Turn a layer, animated after any turns already on their way. Told to `onTurn` only when `report` says so. A turn the puzzle cannot make throws a `RangeError`. */
  turn(move: CuboidMove, { report = false, animate = true, ms }: { report?: boolean; animate?: boolean; ms?: number } = {}): void {
    if (!cuboidMoveLegal(this.sides, move)) throw new RangeError(`The ${cuboidName(this.sides)} cuboid cannot make that turn`);
    this.settleDrag();
    this.target = turnCuboid(this.target, this.sides, move);
    if (report) this.told(move);
    if (!animate) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
      return;
    }
    this.queue.push({ move, report, ms });
    if (!this.animating) this.next();
  }

  /** The same as `turn`, one move: for a replay, which plays steps made of several layers on a cube. */
  turnTogether(moves: readonly CuboidMove[], options: { animate?: boolean; ms?: number } = {}): void {
    for (const move of moves) this.turn(move, options);
  }

  private told(move: CuboidMove): void {
    this.options.onTurn?.(move, this.target);
    for (const listener of this.listeners.turn) listener(move, this.target);
  }

  /** Listen for a turn a person made (`turn`) or the view turned (`look`). Returns the call that stops listening. */
  on<K extends keyof CuboidViewEvents>(type: K, listener: CuboidViewEvents[K]): () => void {
    const set = this.listeners[type] as Set<CuboidViewEvents[K]>;
    set.add(listener);
    return () => set.delete(listener);
  }

  /** Turn the view to look at the puzzle from here. The pitch stays between −90 and 90 degrees. */
  setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-90, Math.min(90, pitch));
    this.draw();
    this.options.onLook?.(this.yaw, this.pitch);
    for (const listener of this.listeners.look) listener(this.yaw, this.pitch);
  }

  /** Back to the way the puzzle was first looked at. */
  resetLook(): void {
    this.setLook(-35, 28);
  }

  /** Build the 3D layers again, as a browser that let go of them needs. */
  redraw(): void {
    for (const place of this.places.values()) place.drawn = undefined;
    this.draw();
  }

  /** Take the puzzle off the page, with every listener it added. */
  destroy(): void {
    this.listeners.turn.clear();
    this.listeners.look.clear();
    this.stopTurn();
    this.resize?.disconnect();
    for (const clean of this.cleanups) clean();
    this.root.remove();
  }

  private quarterPx(): number {
    return ((this.side * this.options.fill) / Math.sqrt(3)) * 0.7;
  }

  private commitAngle(): number {
    return Math.max(5, Math.min(85, this.options.commitAngle));
  }

  private markCommitted(committed: boolean): void {
    this.root.dataset.committed = String(committed);
    if (this.drag === null) delete this.root.dataset.angle;
    for (const sticker of [...this.turning.children] as HTMLElement[]) {
      if (sticker.dataset.slot === undefined) continue;
      (sticker.firstChild as HTMLDivElement).style.filter = committed ? `var(--kyuubu-commit-filter, ${COMMIT_FILTER})` : "";
    }
  }

  private beginDrag(pick: CuboidDragPick, at: number): void {
    this.settleDrag();
    if (this.animating || this.queue.length > 0) {
      this.queue = [];
      this.stopTurn();
      this.shown = this.target;
      this.paint();
    }
    this.lift(pick.axis, pick.layer);
    this.drag = { pick, angle: 0, committed: false, samples: [{ at, angle: 0 }] };
    this.root.dataset.turning = "true";
    this.root.dataset.dragging = "true";
    this.root.dataset.halfOnly = String(pick.halfOnly);
  }

  private followDrag(angle: number, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    drag.angle = angle;
    this.root.dataset.angle = String(Math.round(angle));
    drag.samples.push({ at, angle });
    while (drag.samples.length > 1 && at - drag.samples[0].at > SPEED_WINDOW * 2) drag.samples.shift();
    this.spinTo((angle * Math.PI) / 180);
    const committed = cuboidPastCommit(angle, drag.pick.halfOnly, this.commitAngle());
    if (committed !== drag.committed) {
      drag.committed = committed;
      this.markCommitted(committed);
    }
  }

  /** The pointer has let go, or the drag was given up: the layer snaps to the nearest turn the rules allow, or back, and only then, if it turned, is it a move and told to `onTurn`. */
  private endDrag(released: boolean, at: number): void {
    const drag = this.drag;
    if (drag === null) return;
    this.drag = null;
    const since = drag.samples.find((sample) => at - sample.at <= SPEED_WINDOW);
    const speed = since === undefined ? 0 : (drag.angle - since.angle) / Math.max(at - since.at, 16);
    const quarters = released ? cuboidQuartersForRelease(drag.angle, speed, drag.pick.halfOnly, this.commitAngle()) : 0;
    const move = cuboidMoveForRelease(drag.pick, quarters);
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
        this.target = turnCuboid(this.target, this.sides, move);
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
    let jumped = false;
    let quarters = 0;
    let duration = 0;
    // A turn given no time at all (reduced motion) is made at once, with every one waiting behind it that is given none either.
    for (; job !== undefined; job = this.queue.shift()) {
      quarters = job.move.turns === 3 ? -1 : job.move.turns;
      const calm = this.quarterMs() === 0 && this.options.turnMs !== 0;
      duration = job.ms !== undefined ? (calm ? 0 : job.ms) : (this.quarterMs() * Math.abs(quarters) ** 0.6) / (1 + this.queue.length);
      if (duration > 0) break;
      this.shown = turnCuboid(this.shown, this.sides, job.move);
      jumped = true;
    }
    if (jumped) this.paint();
    if (job === undefined) {
      this.animating = false;
      this.root.dataset.turning = "false";
      return;
    }
    const running = job;
    this.animating = true;
    this.root.dataset.turning = "true";
    this.lift(running.move.axis, running.move.layer);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / Math.max(duration, 1));
      const eased = 1 - (1 - t) ** 3;
      this.spinTo((eased * quarters * Math.PI) / 2);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      this.shown = turnCuboid(this.shown, this.sides, running.move);
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

  private slotAt(target: EventTarget | null): number | null {
    const sticker = (target as HTMLElement | null)?.closest?.("[data-slot]") as HTMLElement | null;
    return sticker === null || sticker === undefined || !this.root.contains(sticker) ? null : Number(sticker.dataset.slot);
  }

  private bind<K extends keyof HTMLElementEventMap>(element: HTMLElement | Document, type: K, handler: (event: HTMLElementEventMap[K]) => void, passive = true): void {
    const listener = handler as EventListener;
    element.addEventListener(type, listener, { passive });
    this.cleanups.push(() => element.removeEventListener(type, listener));
  }

  private hands(): void {
    // A touch that begins on the puzzle is the puzzle's: Safari on a phone scrolls the page or zooms it from such a touch unless the touch itself is refused.
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
      // A drag that wanders well off the puzzle's element is given up: the layer goes back.
      const box = this.root.getBoundingClientRect();
      const room = Math.max(DRAG_LEAVE_LEAST, Math.min(box.width, box.height) * DRAG_LEAVE);
      if (event.clientX < box.left - room || event.clientX > box.right + room || event.clientY < box.top - room || event.clientY > box.bottom + room) {
        gesture.done = true;
        this.endDrag(false, event.timeStamp);
        return;
      }
      if (this.drag === null) {
        const pick = pickCuboidDrag(cuboidSlots(this.sides).slots[gesture.slot], this.sides, this.view(), dx, dy);
        if (pick === null) return;
        this.beginDrag(pick, gesture.at);
      }
      if (this.drag !== null) this.followDrag(cuboidDragAngle(this.drag.pick, dx, dy, this.quarterPx()), event.timeStamp);
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
        if (event.ctrlKey) this.setLook(this.yaw, this.pitch + delta * 0.25);
        else this.setLook(this.yaw + delta * 0.25, this.pitch);
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
        const read = readCuboidKey(event.key, event.shiftKey, this.sides, this.depth);
        if (read === null) return;
        event.preventDefault();
        if ("depth" in read) this.depth = read.depth;
        else {
          this.depth = 1;
          this.turn(read.move, { report: true });
        }
      },
      false,
    );
  }
}
