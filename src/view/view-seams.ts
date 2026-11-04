/**
 * The plastic that fills the gap a turn opens, and the seams between layers a pointer takes hold of.
 * The hands that turn the cube are built on this.
 */
import { CUBE_FACE_ORDER, cubeSlots, FACE_FRAMES, layerOf } from "../cube.ts";
import type { CubeAxis, CubeMove, StickerSlot, Vec3 } from "../types.ts";

import { axisVector } from "./geometry.ts";
import { type Seam, seamsAt } from "./gestures.ts";
import { CubeViewArrow } from "./view-arrow.ts";
import { EDGE, HINT_COLOUR } from "./view-types.ts";

/** The plastic that fills the gap a turn opens, and the seams between layers a pointer takes hold of. The hands that turn the cube are built on this. */
export abstract class CubeViewSeams extends CubeViewArrow {
  /**
   * THE INSIDE OF THE CUBE, while a layer turns: a black square on each side
   * of the gap the turn opens, one turning and one still, so the reader sees
   * plastic where the layers part and never through the cube.
   */
  protected covers(move: CubeMove, layers: ReadonlySet<number | "all"> = new Set([move.layer])): HTMLDivElement[] {
    if (layers.has("all")) return [];
    const unit = this.unit();
    const out = axisVector(move.axis);
    const frame = FACE_FRAMES[CUBE_FACE_ORDER.find((face) => FACE_FRAMES[face].normal[move.axis] === 1)!];
    const edges: number[] = [];
    // A gap opens wherever a turning layer meets a still one.
    for (let layer = 0; layer < this.n - 1; layer += 1)
      if (layers.has(layer) !== layers.has(layer + 1)) edges.push(2 * layer - this.n + 2);
    const made: HTMLDivElement[] = [];
    for (const edge of edges) {
      const below = (edge + this.n - 2) / 2;
      // One square closes the piece below the gap, facing up the axis, and one the piece above it, facing down.
      for (const [layer, facing] of [
        [below, 1],
        [below + 1, -1],
      ] as const) {
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
        this.places.set(cover, {
          right: frame.right,
          down: frame.down,
          out: out.map((value) => value * facing) as unknown as Vec3,
          at: out.map((value) => (value * edge * unit) / 2) as unknown as Vec3,
          layer,
        });
        group.append(cover);
        made.push(cover);
      }
    }
    return made;
  }

  /** The seams between layers a pointer at this place on this sticker is taking hold of, nearest first. */
  protected seamsUnder(slot: number, clientX: number, clientY: number): Seam[] {
    const box = this.root.getBoundingClientRect();
    // A cube drawn inside something scaled (a zoomed page) is measured in its own pixels.
    const zoom = box.width / (this.root.offsetWidth || box.width) || 1;
    const pointer: [number, number] = [
      (clientX - (box.left + box.width / 2)) / zoom,
      (clientY - (box.top + box.height / 2)) / zoom,
    ];
    const scale = (this.side * this.options.fill) / (EDGE * Math.sqrt(3));
    return seamsAt(
      cubeSlots(this.n).slots[slot],
      this.n,
      this.view(),
      pointer,
      (this.unit() / 2) * scale,
      Math.round(this.side * 3.2),
    );
  }

  /** The seams two fingers, down on two stickers, take hold of: each axis about which the layers of the two are neighbours. */
  protected pairSeams(a: StickerSlot, b: StickerSlot): Seam[] {
    return ([0, 1, 2] as CubeAxis[]).flatMap((axis) => {
      const [la, lb] = [layerOf(a.centre, axis, this.n), layerOf(b.centre, axis, this.n)];
      return Math.abs(la - lb) === 1 && this.n >= 3 ? [{ axis, beside: lb }] : [];
    });
  }

  /** The two layers a touch on a seam would turn, drawn with a ring on each of their stickers before anything moves; or none. */
  protected lightSeam(seam: Seam | null, slot: number | null): void {
    const slots = cubeSlots(this.n).slots;
    const layers =
      seam === null || slot === null ? null : new Set([layerOf(slots[slot].centre, seam.axis, this.n), seam.beside]);
    const ring = `2px solid var(--kyuubu-hint-colour, ${HINT_COLOUR})`;
    this.stickers.forEach((sticker, at) => {
      const face = sticker.firstChild as HTMLDivElement;
      const lit = layers !== null && seam !== null && layers.has(layerOf(slots[at].centre, seam.axis, this.n));
      if (lit) {
        face.style.outline = ring;
        face.style.outlineOffset = "-2px";
        sticker.dataset.seamLit = "";
      } else if (sticker.dataset.seamLit !== undefined) {
        face.style.outline = "";
        face.style.outlineOffset = "";
        delete sticker.dataset.seamLit;
      }
    });
    if (layers === null) {
      if (this.root.dataset.seam === "near") delete this.root.dataset.seam;
    } else this.root.dataset.seam = "near";
  }

  protected slotAt(target: EventTarget | null): number | null {
    const sticker = (target as HTMLElement | null)?.closest?.("[data-slot]") as HTMLElement | null;
    return sticker === null || sticker === undefined || !this.root.contains(sticker)
      ? null
      : Number(sticker.dataset.slot);
  }
}
