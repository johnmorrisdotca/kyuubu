/**
 * Where each sticker and the plastic sit on the cube.
 * The hint arrow, the seams, the hands that turn it, and CubeView itself, are built on this.
 */
import { type CubeFace, cubeSlots, FACE_FRAMES, faceOfNormal, layerOf, solvedCube } from "../cube.ts";
import { CUBE_SCALE_INTERACTIVE, type CubeScale } from "../scale.ts";
import type { CubeMove, StickerSlot, Vec3 } from "../types.ts";
import { fill, type KyuubuLanguage, languageOf, WORDS } from "../words.ts";

import { apply, axisVector, type Mat3, multiply, placement, rotation, viewMatrix } from "./geometry.ts";
import { COMMIT_ANGLE, type Seam } from "./gestures.ts";
import type { DragHint } from "./hint.ts";
import {
  type CubeViewEvents,
  type CubeViewOptions,
  DEFAULT_COLOURS,
  DEFAULT_PLASTIC,
  EDGE,
  FACE_PROPERTIES,
  HINT_COLOUR,
  HINT_DIM,
  type LiveDrag,
  type Placed,
  type Queued,
  type RoundCorner,
  type Spin,
} from "./view-types.ts";

/** Where each sticker and the plastic sit. The hint arrow, the seams, the hands that turn the cube, and CubeView itself, are built on this. */
export abstract class CubeViewScene {
  /** The element the cube was made in. */
  readonly host: HTMLElement;
  protected options: Required<
    Omit<
      CubeViewOptions,
      "state" | "onTurn" | "onLook" | "colours" | "plastic" | "theme" | "label" | "locale" | "scale" | "width"
    >
  > &
    Pick<CubeViewOptions, "onTurn" | "onLook" | "label">;
  protected theme: {
    colours: Partial<Record<CubeFace, string>>;
    plastic?: string;
    stickerInset?: string;
    stickerRadius?: string;
    cornerRadius?: string;
  };
  protected readonly listeners: { turn: Set<CubeViewEvents["turn"]>; look: Set<CubeViewEvents["look"]> } = {
    turn: new Set(),
    look: new Set(),
  };
  /** The turn a hint is shown for, and what it came to from where the cube is looked at now. */
  protected hintMoves: CubeMove[] | null = null;
  protected hintNow: DragHint | null = null;
  protected arrow: HTMLDivElement | null = null;
  protected arrowKey = "";
  protected language: KyuubuLanguage;
  protected n: number;
  protected target: string;
  protected shown: string;
  protected yaw: number;
  protected pitch: number;
  protected readonly root: HTMLDivElement;
  protected readonly pivot: HTMLDivElement;
  protected readonly still: HTMLDivElement;
  protected readonly turning: HTMLDivElement;
  protected stickers: HTMLDivElement[] = [];
  protected readonly places = new Map<HTMLElement, Placed>();
  protected spin: Spin | null = null;
  protected queue: Queued[] = [];
  protected animating = false;
  protected frame = 0;
  protected depth = 1;
  protected wheelSum = 0;
  protected gesture: {
    id: number;
    x: number;
    y: number;
    at: number;
    slot: number | null;
    done: boolean;
    yaw: number;
    pitch: number;
    /** Where the pointer is now. */
    now: [number, number];
    /** The seams between layers the pointer went down on, nearest first. */
    seams: Seam[];
    /** A second finger, down on another sticker: with the first it takes two neighbouring layers. */
    partner: { id: number; slot: number; x: number; y: number; now: [number, number] } | null;
  } | null = null;
  /** The layer the pointer is holding, turned as far as it has been dragged. */
  protected drag: LiveDrag | null = null;
  /** What ends a layer's snap after it is let go, run early when something cannot wait for it. */
  protected finishSnap: (() => void) | null = null;
  protected sized = { width: "", height: "", maxWidth: "", aspectRatio: "" };
  protected sizedByScale = false;
  protected readonly resize: ResizeObserver | null;
  /**
   * The side of the box the cube is drawn in, measured when the box changes size and not in every frame of a turn: reading
   * it asks the page to work out its styles and layout there and then, in the middle of the frame, which on a big cube
   * on a phone is the longest thing a frame does.
   */
  protected side = 0;
  /** Whether a sticker is marked as the one a hint says to take hold of, so a draw with no hint has nothing to take the mark off. */
  protected grabbed = false;
  /** Whether every sticker has been given its colour once, after which `paint` writes only the ones that changed (a new theme resets it). */
  protected coloured = false;
  protected readonly cleanups: (() => void)[] = [];
  abstract setScale(scale?: CubeScale, width?: number): void;
  abstract redraw(): void;
  protected abstract hands(): void;
  protected abstract drawHint(view: Mat3, scale: number, lens: number): void;

  constructor(host: HTMLElement, options: CubeViewOptions) {
    this.host = host;
    this.options = {
      interactive: options.scale === undefined ? true : CUBE_SCALE_INTERACTIVE[options.scale],
      keyboard: "focus",
      turnMs: 160,
      animateScramble: true,
      commitAngle: COMMIT_ANGLE,
      yaw: -35,
      pitch: 28,
      fill: 0.9,
      rounded: true,
      // An option passed as undefined, as a wrapper passes every prop it was not given, leaves the default standing.
      ...(Object.fromEntries(
        Object.entries(options).filter(
          ([key, value]) => value !== undefined && !["colours", "plastic", "theme", "locale"].includes(key),
        ),
      ) as CubeViewOptions),
    };
    const given = <T extends object>(from: T | undefined) =>
      Object.fromEntries(Object.entries(from ?? {}).filter(([, value]) => value !== undefined)) as Partial<T>;
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
    Object.assign(this.root.style, {
      position: "absolute",
      inset: "0",
      touchAction: "none",
      userSelect: "none",
      outline: "none",
      cursor: "grab",
    });
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

  protected label(): string {
    return this.options.label ?? fill(WORDS[this.language].cubeLabel, { n: this.n });
  }

  protected plastic(): string {
    return this.theme.plastic ?? `var(--kyuubu-plastic, ${DEFAULT_PLASTIC})`;
  }

  protected colourOf(letter: string): string {
    if (!(letter in DEFAULT_COLOURS)) return this.plastic();
    const face = letter as CubeFace;
    return this.theme.colours[face] ?? `var(${FACE_PROPERTIES[face]}, ${DEFAULT_COLOURS[face]})`;
  }

  /** The plastic and the shape of every sticker, as the theme has them now. */
  protected dress(): void {
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
      const at = (across: number, down: number): Vec3 =>
        frame.normal.map((value, k) => value + across * frame.right[k] + down * frame.down[k]) as unknown as Vec3;
      if (row === 0 && col === 0) corners.push({ property: "borderTopLeftRadius", vertex: at(-1, -1) });
      if (row === 0 && col === last) corners.push({ property: "borderTopRightRadius", vertex: at(1, -1) });
      if (row === last && col === 0) corners.push({ property: "borderBottomLeftRadius", vertex: at(-1, 1) });
      if (row === last && col === last) corners.push({ property: "borderBottomRightRadius", vertex: at(1, 1) });
      for (const property of [
        "borderTopLeftRadius",
        "borderTopRightRadius",
        "borderBottomLeftRadius",
        "borderBottomRightRadius",
      ] as const)
        sticker.style[property] = "";
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
  protected corner(): string {
    if (!this.options.rounded) return "";
    return `min(${this.theme.cornerRadius ?? "var(--kyuubu-corner-radius, 15px)"}, ${Math.round(this.unit() * 0.45)}px)`;
  }

  /** The box's smaller side as it is now, or a size to draw at where it has none yet (a box that is hidden). */
  protected measureSide(): void {
    const fallback = EDGE * 1.8;
    this.side = Math.min(
      this.host.clientWidth || fallback,
      this.host.clientHeight || this.host.clientWidth || fallback,
    );
  }

  protected layer(): HTMLDivElement {
    const div = document.createElement("div");
    Object.assign(div.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0" });
    return div;
  }

  protected unit(): number {
    return EDGE / this.n;
  }

  /** Every sticker, placed once; a turn only moves them in groups and repaints them. */
  protected build(): void {
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
      this.places.set(sticker, {
        right: frame.right,
        down: frame.down,
        out: frame.normal,
        at: this.surface(slot),
        slot: at,
      });
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
  protected light(): void {
    const moves = this.hintMoves;
    const layers = new Set(
      moves === null || moves.some((move) => move.layer === "all") ? [] : moves.map((move) => move.layer as number),
    );
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

  protected surface(slot: StickerSlot): Vec3 {
    const half = this.unit() / 2;
    return slot.centre.map((value, at) => (value + slot.normal[at]) * half) as unknown as Vec3;
  }

  protected paint(): void {
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

  protected view(): Mat3 {
    return viewMatrix(this.yaw, this.pitch);
  }

  /** Fit the cube to its space and turn it the way it is looked at. */
  protected look(): void {
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
  protected draw(turningOnly = false): void {
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
      // An element that has never faced the eye is kept at no size, hidden: left as it is laid out, the plastic across a turning gap would be a 300 pixel box that makes the page scroll sideways.
      const transform = facing
        ? `perspective(${lens}px) ${placement(scaled(m, place.right), scaled(m, place.down), out, at)}`
        : (place.drawn?.transform ?? "scale(0)");
      let z = "0";
      if (facing && spin !== null && pieces > 1) {
        const piece =
          pieceOf[place.slot === undefined ? place.layer! : layerOf(slots[place.slot].centre, spin.axis, this.n)];
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
        if (was?.round !== round) {
          place.corners.forEach((one, k) => {
            element.style[one.property] = radii[k];
          });
        }
      }
      place.drawn = { transform, visible: facing, z, round: round || (was?.round ?? "") };
    }
    if (!turningOnly) this.drawHint(view, scale, lens);
  }
}
