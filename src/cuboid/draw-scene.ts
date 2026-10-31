/**
 * Where each sticker and the plastic sit on a cuboid.
 * The hands that turn it, and CuboidView itself, are built on this.
 */
import type { CubeFace } from "../cube.ts";
import { FACE_FRAMES, faceOfNormal } from "../cube.ts";
import type { StickerSlot, Vec3 } from "../types.ts";
import { apply, axisVector, type Mat3, multiply, placement, rotation, viewMatrix } from "../view/geometry.ts";
import { COMMIT_ANGLE } from "../view/gestures.ts";
import { DEFAULT_COLOURS, DEFAULT_PLASTIC, FACE_PROPERTIES } from "../view/view.ts";
import { fill, type KyuubuLanguage, languageOf } from "../words.ts";
import {
  type CuboidViewEvents,
  type CuboidViewOptions,
  EDGE,
  type LiveDrag,
  type Placed,
  type Queued,
  type RoundCorner,
  type Spin,
} from "./draw-types.ts";
import {
  type CuboidDims,
  cuboidFaces,
  cuboidLayerOf,
  cuboidName,
  cuboidSlots,
  isCuboidDims,
  solvedCuboid,
} from "./model.ts";
import { CUBOID_WORDS } from "./words.ts";

/** Where each sticker and the plastic sit. The hands that turn a cuboid, and CuboidView itself, are built on this. */
export abstract class CuboidViewScene {
  /** The element the puzzle was made in. */
  readonly host: HTMLElement;
  protected options: Required<
    Pick<CuboidViewOptions, "interactive" | "keyboard" | "turnMs" | "commitAngle" | "fill" | "rounded">
  > &
    Pick<CuboidViewOptions, "onTurn" | "onLook" | "label">;
  protected theme: {
    colours: Partial<Record<CubeFace, string>>;
    plastic?: string;
    stickerInset?: string;
    stickerRadius?: string;
    cornerRadius?: string;
  };
  protected readonly listeners: { turn: Set<CuboidViewEvents["turn"]>; look: Set<CuboidViewEvents["look"]> } = {
    turn: new Set(),
    look: new Set(),
  };
  protected language: KyuubuLanguage;
  protected sides: CuboidDims;
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
  protected gesture: {
    id: number;
    x: number;
    y: number;
    at: number;
    slot: number | null;
    done: boolean;
    yaw: number;
    pitch: number;
  } | null = null;
  protected drag: LiveDrag | null = null;
  protected finishSnap: (() => void) | null = null;
  protected readonly resize: ResizeObserver | null;
  protected side = 0;
  protected coloured = false;
  protected readonly cleanups: (() => void)[] = [];
  abstract redraw(): void;
  protected abstract hands(): void;

  constructor(host: HTMLElement, options: CuboidViewOptions) {
    if (!isCuboidDims(options.dims))
      throw new RangeError("A cuboid has three sides, each a whole number from 1 to 7, and is not 1×1×1");
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
    const given = <T extends object>(from: T | undefined) =>
      Object.fromEntries(Object.entries(from ?? {}).filter(([, value]) => value !== undefined)) as Partial<T>;
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

  protected label(): string {
    return this.options.label ?? fill(CUBOID_WORDS[this.language].cuboidLabel, { dims: cuboidName(this.sides) });
  }

  protected plastic(): string {
    return this.theme.plastic ?? `var(--kyuubu-plastic, ${DEFAULT_PLASTIC})`;
  }

  protected colourOf(letter: string): string {
    if (!(letter in DEFAULT_COLOURS)) return this.plastic();
    const face = letter as CubeFace;
    return this.theme.colours[face] ?? `var(${FACE_PROPERTIES[face]}, ${DEFAULT_COLOURS[face]})`;
  }

  /** One cubie's edge as it is drawn: the longest side of the puzzle is `EDGE`, as a cube's is. */
  protected unit(): number {
    return EDGE / Math.max(...this.sides);
  }

  /** How round the puzzle's corners are drawn: never more than nearly half a sticker, and nothing when it is not rounded. */
  protected corner(): string {
    if (!this.options.rounded) return "";
    return `min(${this.theme.cornerRadius ?? "var(--kyuubu-corner-radius, 15px)"}, ${Math.round(this.unit() * 0.45)}px)`;
  }

  protected layer(): HTMLDivElement {
    const div = document.createElement("div");
    Object.assign(div.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0" });
    return div;
  }

  protected measureSide(): void {
    const fallback = EDGE * 1.8;
    this.side = Math.min(
      this.host.clientWidth || fallback,
      this.host.clientHeight || this.host.clientWidth || fallback,
    );
  }

  protected surface(slot: StickerSlot): Vec3 {
    const half = this.unit() / 2;
    return slot.centre.map((value, at) => (value + slot.normal[at]) * half) as unknown as Vec3;
  }

  /** Every sticker, placed once; a turn only moves them in groups and repaints them. */
  protected build(): void {
    this.still.replaceChildren();
    this.turning.replaceChildren();
    this.places.clear();
    const unit = this.unit();
    const { slots } = cuboidSlots(this.sides);
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
    this.paint();
    this.draw();
  }

  /** The plastic and the shape of every sticker, as the theme has them now. */
  protected dress(): void {
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
      const at = (across: number, down: number): Vec3 =>
        frame.normal.map((value, k) => value + across * frame.right[k] + down * frame.down[k]) as unknown as Vec3;
      if (row === 0 && col === 0) corners.push({ property: "borderTopLeftRadius", vertex: at(-1, -1) });
      if (row === 0 && col === cols - 1) corners.push({ property: "borderTopRightRadius", vertex: at(1, -1) });
      if (row === rows - 1 && col === 0) corners.push({ property: "borderBottomLeftRadius", vertex: at(-1, 1) });
      if (row === rows - 1 && col === cols - 1) corners.push({ property: "borderBottomRightRadius", vertex: at(1, 1) });
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
      const inner = sticker.firstChild as HTMLDivElement;
      inner.style.inset = this.theme.stickerInset ?? "var(--kyuubu-sticker-inset, 6%)";
      inner.style.borderRadius = this.theme.stickerRadius ?? "var(--kyuubu-sticker-radius, 14%)";
    }
  }

  protected paint(): void {
    this.stickers.forEach((sticker, at) => {
      const letter = this.shown[at];
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

  /**
   * Every element given its place on the screen: turned the way the puzzle is
   * looked at, and a turning layer's by how far it has gone. An element facing
   * away is hidden. While a layer turns, the puzzle is in up to three pieces
   * along its axis (below the layer, the layer, above it), each a block whose
   * faces never cover one another; the one nearer the eye is drawn over the
   * one behind. Only the turning group is redrawn when `turningOnly`.
   */
  protected draw(turningOnly = false): void {
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
      const transform = facing
        ? `perspective(${lens}px) ${placement(scaled(m, place.right), scaled(m, place.down), out, at)}`
        : (place.drawn?.transform ?? "");
      let z = "0";
      if (facing && spin !== null) {
        const piece = pieceOf(
          place.slot === undefined ? place.layer! : cuboidLayerOf(slots[place.slot].centre, spin.axis, this.sides),
        );
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
        if (was?.round !== round) {
          place.corners.forEach((one, k) => {
            element.style[one.property] = radii[k];
          });
        }
      }
      place.drawn = { transform, visible: facing, z, round: round || (was?.round ?? "") };
    }
  }
}
